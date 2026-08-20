// ocp Panel de Control – semáforos, KPIs, balance de azufre, inventario compacto HMI
import { supabase } from '../../supabase-client.js';
import { UMBRALES, colorSemaforo, colorClase } from './utils.js';

export async function renderizarPanel(contenedor, rol) {
    try {
        const hoy = new Date().toISOString().split('T')[0];

        // Consultas en paralelo
        const [
            acidoRes, phRes, otRes, consumoRes, emisionesRes, fundicionRes,
            acidezAzufreRes, prodHoyRes, stockRes
        ] = await Promise.all([
            supabase.from('analisis_acido').select('*').order('created_at', { ascending: false }).limit(1),
            supabase.from('ph_aguas').select('*').order('created_at', { ascending: false }).limit(60),
            supabase.from('ordenes_trabajo').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente'),
            supabase.from('consumo_agua').select('*').order('fecha_registro', { ascending: false }).limit(10),
            supabase.from('emisiones_so2').select('*').order('created_at', { ascending: false }).limit(1),
            supabase.from('fundicion_diaria').select('*').order('fecha_registro', { ascending: false }).limit(1),
            supabase.rpc('ultima_acidez_azufre'),
            supabase.from('produccion_diaria').select('toneladas').eq('fecha', hoy),
            supabase.rpc('stock_actual_acido')
        ]);

        const ultimoAcido = acidoRes.data?.[0];
        const phTodos = phRes.data || [];
        const pendientes = otRes.count ?? 0;
        const ultimoPH = {};
        phTodos.forEach(p => { if (!ultimoPH[p.punto_muestreo]) ultimoPH[p.punto_muestreo] = p.valor_ph; });
        const ultimoConsumo = {};
        (consumoRes.data || []).forEach(c => { if (!ultimoConsumo[c.tipo]) ultimoConsumo[c.tipo] = c.valor_m3; });
        const ultimaEmision = emisionesRes.data?.[0];
        const ultimaFundicion = fundicionRes.data?.[0];

        // Balance de azufre
        const bigBagsHoy = ultimaFundicion?.big_bags || 0;
        const azufreConsumido = bigBagsHoy * 1.2;
        const acidoProducido = (prodHoyRes.data || []).reduce((s, p) => s + p.toneladas, 0);
        const factorConversion = 3.0;
        const rendimiento = azufreConsumido > 0 ? (acidoProducido / (azufreConsumido * factorConversion)) * 100 : 0;
        const merma = 100 - rendimiento;

        // Acidez de azufre
        const acidezAzufreData = acidezAzufreRes.data || [];
        const acidezPorTanque = {};
        acidezAzufreData.forEach(row => {
            acidezPorTanque[row.tanque] = row.acidez;
        });

        // ==================== CERTIFICACIONES DE ÁCIDO (5 puntos) ====================
        const puntosAcido = ['TQ-3101','TQ-3102','TQ-3103','TQ-3104','LINEA-1201'];
        const { data: certsAcidoReciente } = await supabase
            .from('certificaciones_acido')
            .select('*')
            .order('fecha_analisis', { ascending: false })
            .limit(50);

        const certPorPunto = {};
        (certsAcidoReciente || []).forEach(c => {
            if (!certPorPunto[c.tanque]) certPorPunto[c.tanque] = c;
        });

        const filasAcido = puntosAcido.map(punto => {
            const cert = certPorPunto[punto];
            if (!cert) return `<tr class="border-b border-slate-800"><td class="py-1 pr-2 font-medium text-white">${punto}</td><td colspan="4" class="py-1 text-slate-500">Sin certificación</td></tr>`;
            const vencimiento = new Date(cert.fecha_vigencia);
            const diasRestantes = Math.ceil((vencimiento - new Date()) / (1000*60*60*24));
            const vencido = diasRestantes < 0;
            return `
            <tr class="border-b border-slate-800 last:border-0">
                <td class="py-1 pr-2 font-medium text-white">${punto}</td>
                <td class="py-1 pr-2 text-right">${cert.concentracion}%</td>
                <td class="py-1 pr-2 text-right">${cert.ntu ?? '--'}</td>
                <td class="py-1 pr-2 text-right">${cert.ppm_fe ?? '--'}</td>
                <td class="py-1 text-right ${vencido ? 'text-red-400' : 'text-green-400'}">${vencido ? 'Vencido' : diasRestantes + 'd'}</td>
            </tr>`;
        }).join('');

        // ==================== DATOS DE INVENTARIO ====================
        const stockData = stockRes.data || [];
        const stockPorTanque = {};
        let stockTotal = 0;
        if (stockData.length > 0) {
            stockTotal = parseFloat(stockData[0].total_general || 0);
            stockData.forEach(s => {
                stockPorTanque[s.tanque] = parseFloat(s.stock || 0);
            });
        }

        // ==================== HTML ====================
        let html = '';

        // ---- PRIMERA FILA: Laboratorio (1), Balance (2), pH (3) ----
        html += `<div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">`;

        // 1. Laboratorio (tabla compacta)
        html += `
        <div class="bg-slate-900 p-3 rounded-lg border border-slate-700 shadow-md">
            <h3 class="text-xs uppercase tracking-wider text-slate-400 mb-1">🔬 Laboratorio</h3>
            <div class="overflow-x-auto">
                <table class="w-full text-[10px] md:text-[11px]">
                    <thead class="text-slate-400 border-b border-slate-700">
                        <tr>
                            <th class="py-1 pr-2 text-left">Punto</th>
                            <th class="py-1 pr-2 text-right">Conc.</th>
                            <th class="py-1 pr-2 text-right">NTU</th>
                            <th class="py-1 pr-2 text-right">Fe</th>
                            <th class="py-1 text-right">Vence</th>
                        </tr>
                    </thead>
                    <tbody class="text-slate-300">
                        ${filasAcido}
                    </tbody>
                </table>
            </div>
            <div class="mt-2 pt-2 border-t border-slate-700">
                <h4 class="text-[10px] font-semibold text-slate-400 mb-1">Acidez de Azufre</h4>
                <div class="grid grid-cols-2 gap-x-2 text-[10px] text-slate-300">
                    <div>TQ-A: <span class="font-bold">${acidezPorTanque['TQ-4302A']?.toFixed(4) ?? '--'}%</span></div>
                    <div>TQ-B: <span class="font-bold">${acidezPorTanque['TQ-4302B']?.toFixed(4) ?? '--'}%</span></div>
                    <div>TQ-C: <span class="font-bold">${acidezPorTanque['TQ-4302C']?.toFixed(4) ?? '--'}%</span></div>
                    <div>TQ-D: <span class="font-bold">${acidezPorTanque['TQ-4302D']?.toFixed(4) ?? '--'}%</span></div>
                    <div class="col-span-2">Horno: <span class="font-bold">${acidezPorTanque['HORNO-AZUFRE']?.toFixed(4) ?? '--'}%</span></div>
                </div>
            </div>
        </div>`;

        // 2. Balance de Azufre (compacto)
        html += `
        <div class="bg-slate-900 p-3 rounded-lg border border-slate-700 shadow-md">
            <h3 class="text-xs uppercase tracking-wider text-slate-400 mb-1">⚖️ Balance de Azufre</h3>
            <div class="flex items-center justify-between">
                <div class="space-y-1">
                    <p class="text-[11px]">Big Bags: <span class="font-bold text-white">${bigBagsHoy}</span></p>
                    <p class="text-[11px]">Azufre cons.: <span class="font-bold text-white">${azufreConsumido.toFixed(1)} ton</span></p>
                    <p class="text-[11px]">Ácido prod.: <span class="font-bold text-white">${acidoProducido.toFixed(1)} ton</span></p>
                    <p class="text-[11px]">Rendimiento: <span class="font-bold ${rendimiento >= 99.2 ? 'text-green-400' : 'text-yellow-400'}">${rendimiento.toFixed(1)}%</span></p>
                    <p class="text-[11px]">Merma: <span class="font-bold text-red-400">${merma.toFixed(1)}%</span></p>
                </div>
                <div class="relative w-14 h-14">
                    <svg viewBox="0 0 36 36" class="w-full h-full transform -rotate-90">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#374151" stroke-width="3" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831" fill="none" stroke="${rendimiento >= 99.2 ? '#22c55e' : '#eab308'}" stroke-width="3" stroke-dasharray="${Math.min(rendimiento, 100).toFixed(0)}, 100" />
                    </svg>
                    <span class="absolute inset-0 flex items-center justify-center text-[10px] font-bold">${Math.min(rendimiento, 100).toFixed(0)}%</span>
                </div>
            </div>
        </div>`;

        // 3. pH de Aguas (compacto)
        const phKeys = [
            { nombre: 'caldera de acido', key: 'ph_caldera_acido' },
            { nombre: 'calderin', key: 'ph_calderin' },
            { nombre: 'torre enfriamiento', key: 'ph_torre_enfriamiento' },
            { nombre: 'caldera sulfato', key: 'ph_caldera_sulfato' },
            { nombre: 'tanque elevado', key: 'ph_tanque_elevado' }
        ];
        html += `
        <div class="bg-slate-900 p-3 rounded-lg border border-slate-700 shadow-md">
            <h3 class="text-xs uppercase tracking-wider text-slate-400 mb-2">💧 pH de Aguas</h3>
            <div class="space-y-1">
                ${phKeys.map(p => {
                    const valor = ultimoPH[p.nombre];
                    const umbral = UMBRALES[p.key] || null;
                    const semaforo = colorSemaforo(valor, umbral);
                    return `
                    <div class="flex items-center justify-between text-[11px]">
                        <span class="text-slate-300">${p.nombre}</span>
                        <span class="font-bold text-white">${valor?.toFixed(2) ?? '--'}</span>
                        <span class="inline-block w-2 h-2 rounded-full ${colorClase(semaforo)}" title="${semaforo}"></span>
                    </div>`;
                }).join('')}
            </div>
        </div>`;

        html += `</div>`; // Fin primera fila

        // ---- SEGUNDA FILA: Ácido, OTs, Emisiones, Consumo, Inventario ----
        html += `<div class="grid grid-cols-2 md:grid-cols-5 gap-3">`;

        // Tarjeta Ácido
        const acidoVal = ultimoAcido?.concentracion;
        const acidoSem = colorSemaforo(acidoVal, UMBRALES.acido);
        html += `
        <div class="bg-slate-900 p-3 rounded-lg border border-slate-700 shadow-md">
            <div class="flex items-center justify-between">
                <h3 class="text-xs uppercase tracking-wider text-slate-400">Ácido</h3>
                <span class="inline-block w-2 h-2 rounded-full ${colorClase(acidoSem)}"></span>
            </div>
            <p class="text-2xl md:text-3xl font-bold text-white mt-1">${acidoVal?.toFixed(2) ?? '--'}<span class="text-sm font-medium text-slate-400">%</span></p>
            <p class="text-[11px] text-slate-400">NTU: ${ultimoAcido?.turbidez_ntu?.toFixed(2) ?? '--'}</p>
        </div>`;

        // Tarjeta OTs Pendientes
        html += `
        <div class="bg-slate-900 p-3 rounded-lg border border-slate-700 shadow-md">
            <div class="flex items-center justify-between">
                <h3 class="text-xs uppercase tracking-wider text-slate-400">OTs Pendientes</h3>
                <span class="inline-block w-2 h-2 rounded-full ${pendientes > 5 ? 'bg-red-500' : 'bg-green-500'}"></span>
            </div>
            <p class="text-2xl md:text-3xl font-bold text-white mt-1">${pendientes}</p>
            <p class="text-[11px] ${pendientes > 5 ? 'text-red-400' : 'text-green-400'}">${pendientes > 5 ? '⚠️ Atención' : '✅ Bajo control'}</p>
        </div>`;

        // Tarjeta Emisiones SO₂
        const so2Val = ultimaEmision?.ppm_so2;
        const so2Sem = colorSemaforo(so2Val, UMBRALES.so2);
        html += `
        <div class="bg-slate-900 p-3 rounded-lg border border-slate-700 shadow-md">
            <div class="flex items-center justify-between">
                <h3 class="text-xs uppercase tracking-wider text-slate-400">Emisiones SO₂</h3>
                <span class="inline-block w-2 h-2 rounded-full ${colorClase(so2Sem)}"></span>
            </div>
            <p class="text-2xl md:text-3xl font-bold text-white mt-1">${so2Val?.toFixed(1) ?? '--'}<span class="text-sm font-medium text-slate-400">ppm</span></p>
        </div>`;

        // Tarjeta Consumo de Agua (último valor principal)
        const ultimoConsumoGeneral = ultimoConsumo['general'];
        html += `
        <div class="bg-slate-900 p-3 rounded-lg border border-slate-700 shadow-md">
            <div class="flex items-center justify-between">
                <h3 class="text-xs uppercase tracking-wider text-slate-400">Consumo Agua</h3>
                <span class="text-slate-500">💧</span>
            </div>
            <p class="text-2xl md:text-3xl font-bold text-white mt-1">${ultimoConsumoGeneral?.toFixed(1) ?? '--'}<span class="text-sm font-medium text-slate-400">m³</span></p>
            <div class="grid grid-cols-2 gap-x-2 mt-1 text-[10px] text-slate-400">
                <div>Planta Ácido: <span class="font-bold text-slate-300">${ultimoConsumo['planta acido']?.toFixed(1) ?? '--'}</span></div>
                <div>Caldera Sulfato: <span class="font-bold text-slate-300">${ultimoConsumo['caldera de sulfato']?.toFixed(1) ?? '--'}</span></div>
            </div>
        </div>`;

        // Tarjeta Inventario de Ácido (stock general)
        html += `
        <div class="bg-slate-900 p-3 rounded-lg border border-slate-700 shadow-md">
            <div class="flex items-center justify-between">
                <h3 class="text-xs uppercase tracking-wider text-slate-400">Inventario Ácido</h3>
                <span class="text-slate-500">📦</span>
            </div>
            <p class="text-2xl md:text-3xl font-bold text-white mt-1">${stockTotal.toFixed(2)}<span class="text-sm font-medium text-slate-400">ton</span></p>
            <div class="grid grid-cols-2 gap-x-2 mt-1 text-[10px] text-slate-400">
                ${Object.entries(stockPorTanque).map(([tanque, stock]) => `
                    <div>${tanque}: <span class="font-bold text-slate-300">${stock.toFixed(2)}</span></div>
                `).join('')}
            </div>
        </div>`;

        html += `</div>`; // Fin segunda fila

        contenedor.innerHTML = html;

    } catch (err) {
        contenedor.innerHTML = `<p class="text-red-500">Error al obtener datos: ${err.message}</p>`;
        console.error(err);
    }
}
