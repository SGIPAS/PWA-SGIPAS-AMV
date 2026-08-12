// ocp Panel de Control – semáforos, KPIs, balance de azufre (con pH unificado, laboratorio mejorado, con línea de ácido)
import { supabase } from '../../supabase-client.js';
import { UMBRALES, colorSemaforo, colorClase } from './utils.js';

export async function renderizarPanel(contenedor, rol) {
    try {
        const hoy = new Date().toISOString().split('T')[0];

        // Consultas en paralelo (sin certificaciones_acido aquí)
        const [
            acidoRes, phRes, otRes, consumoRes, emisionesRes, fundicionRes,
            acidezAzufreRes, prodHoyRes
        ] = await Promise.all([
            supabase.from('analisis_acido').select('*').order('created_at', { ascending: false }).limit(1),
            supabase.from('ph_aguas').select('*').order('created_at', { ascending: false }).limit(60),
            supabase.from('ordenes_trabajo').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente'),
            supabase.from('consumo_agua').select('*').order('fecha_registro', { ascending: false }).limit(10),
            supabase.from('emisiones_so2').select('*').order('created_at', { ascending: false }).limit(1),
            supabase.from('fundicion_diaria').select('*').order('fecha_registro', { ascending: false }).limit(1),
            supabase.rpc('ultima_acidez_azufre'),
            supabase.from('produccion_diaria').select('toneladas').eq('fecha', hoy)
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
            if (!cert) return `<tr><td class="py-1 pr-2 font-medium">${punto}</td><td colspan="4" class="py-1 text-slate-500">Sin certificación</td></tr>`;
            const vencimiento = new Date(cert.fecha_vigencia);
            const diasRestantes = Math.ceil((vencimiento - new Date()) / (1000*60*60*24));
            const vencido = diasRestantes < 0;
            return `
            <tr class="border-b border-slate-800 last:border-0">
                <td class="py-1 pr-2 font-medium">${punto}</td>
                <td class="py-1 pr-2 text-right">${cert.concentracion}%</td>
                <td class="py-1 pr-2 text-right">${cert.ntu ?? '--'}</td>
                <td class="py-1 pr-2 text-right">${cert.ppm_fe ?? '--'}</td>
                <td class="py-1 text-right ${vencido ? 'text-red-400' : 'text-green-400'}">${vencido ? 'Vencido' : diasRestantes + 'd'}</td>
            </tr>`;
        }).join('');

        // ==================== HTML ====================
        let html = '';

        // ---- PRIMERA FILA: Laboratorio (1), Balance (2), pH (3) ----
        html += `<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">`;

        // 1. Laboratorio (versión completa con tabla de 5 filas)
        html += `
        <div class="bg-slate-900 p-4 rounded border border-slate-700">
            <h3 class="text-sm text-slate-400 mb-2">🔬 Laboratorio</h3>
            <div class="overflow-x-auto">
                <table class="w-full text-xs">
                    <thead class="text-slate-400 border-b border-slate-700">
                        <tr>
                            <th class="py-1 pr-2 text-left">Tanque / Línea</th>
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
            <div class="mt-3 pt-3 border-t border-slate-700">
                <h4 class="text-xs font-semibold text-slate-400 mb-1">Acidez de Azufre</h4>
                <div class="grid grid-cols-2 gap-1 text-xs text-slate-300">
                    <div>TQ-4302A: <span class="font-bold">${acidezPorTanque['TQ-4302A']?.toFixed(4) ?? '--'}%</span></div>
                    <div>TQ-4302B: <span class="font-bold">${acidezPorTanque['TQ-4302B']?.toFixed(4) ?? '--'}%</span></div>
                    <div>TQ-4302C: <span class="font-bold">${acidezPorTanque['TQ-4302C']?.toFixed(4) ?? '--'}%</span></div>
                    <div>TQ-4302D: <span class="font-bold">${acidezPorTanque['TQ-4302D']?.toFixed(4) ?? '--'}%</span></div>
                </div>
            </div>
        </div>`;

        // 2. Balance de Azufre + Fundición
        html += `
        <div class="bg-slate-900 p-4 rounded border border-slate-700">
            <h3 class="text-sm text-slate-400">Balance de Azufre (hoy)</h3>
            <div class="flex items-center justify-between mt-2">
                <div>
                    <p class="text-xs">Big Bags: <span class="font-bold">${bigBagsHoy}</span></p>
                    <p class="text-xs">Azufre cons.: <span class="font-bold">${azufreConsumido.toFixed(1)} ton</span></p>
                    <p class="text-xs">Ácido prod.: <span class="font-bold">${acidoProducido.toFixed(1)} ton</span></p>
                    <p class="text-xs">Rendimiento: <span class="font-bold ${rendimiento >= 99.2 ? 'text-green-400' : 'text-yellow-400'}">${rendimiento.toFixed(1)}%</span></p>
                    <p class="text-xs">Merma: <span class="font-bold text-red-400">${merma.toFixed(1)}%</span></p>
                </div>
                <div class="relative w-16 h-16">
                    <svg viewBox="0 0 36 36" class="w-full h-full transform -rotate-90">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#374151" stroke-width="3" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831" fill="none" stroke="${rendimiento >= 99.2 ? '#22c55e' : '#eab308'}" stroke-width="3" stroke-dasharray="${Math.min(rendimiento, 100).toFixed(0)}, 100" />
                    </svg>
                    <span class="absolute inset-0 flex items-center justify-center text-xs font-bold">${Math.min(rendimiento, 100).toFixed(0)}%</span>
                </div>
            </div>
        </div>`;

        // 3. pH de Aguas (unificada con 5 puntos)
        const phKeys = [
            { nombre: 'caldera de acido', key: 'ph_caldera_acido' },
            { nombre: 'calderin', key: 'ph_calderin' },
            { nombre: 'torre enfriamiento', key: 'ph_torre_enfriamiento' },
            { nombre: 'caldera sulfato', key: 'ph_caldera_sulfato' },
            { nombre: 'tanque elevado', key: 'ph_tanque_elevado' }
        ];
        html += `
        <div class="bg-slate-900 p-4 rounded border border-slate-700">
            <h3 class="text-sm text-slate-400 mb-3">pH de Aguas</h3>
            <div class="space-y-2">
                ${phKeys.map(p => {
                    const valor = ultimoPH[p.nombre];
                    const umbral = UMBRALES[p.key] || null;
                    const semaforo = colorSemaforo(valor, umbral);
                    return `
                    <div class="flex items-center justify-between">
                        <span class="text-sm text-slate-300">${p.nombre}</span>
                        <span class="text-sm font-bold ${valor !== undefined ? 'text-white' : 'text-slate-500'}">${valor?.toFixed(2) ?? '--'}</span>
                        <span class="inline-block w-3 h-3 rounded-full ${colorClase(semaforo)}" title="${semaforo}"></span>
                    </div>`;
                }).join('')}
            </div>
        </div>`;

        html += `</div>`; // Fin primera fila (3 columnas)

        // ---- SEGUNDA FILA: Ácido, OTs, Emisiones, Consumo (4 columnas) ----
        html += `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">`;

        // Tarjeta Ácido con NTU
        html += `
        <div class="bg-slate-900 p-4 rounded border border-slate-700">
            <h3 class="text-sm text-slate-400">Ácido Sulfúrico</h3>
            <p class="text-2xl font-bold">${ultimoAcido?.concentracion?.toFixed(2) ?? '--'} %</p>
            <p class="text-xs text-slate-400">NTU: ${ultimoAcido?.turbidez_ntu?.toFixed(2) ?? '--'}</p>
            <span class="inline-block px-2 py-1 text-xs rounded ${colorClase(colorSemaforo(ultimoAcido?.concentracion, UMBRALES.acido))}">${ultimoAcido?.concentracion ? '●' : 'Sin datos'}</span>
        </div>`;

        // Tarjeta OTs Pendientes
        html += `
        <div class="bg-slate-900 p-4 rounded border border-slate-700">
            <h3 class="text-sm text-slate-400">OTs Pendientes</h3>
            <p class="text-2xl font-bold">${pendientes}</p>
            <span class="text-xs ${pendientes > 5 ? 'text-red-400' : 'text-green-400'}">${pendientes > 5 ? '⚠️ Atención' : '✅ Bajo control'}</span>
        </div>`;

        // Tarjeta Emisiones SO₂
        const so2Val = ultimaEmision?.ppm_so2;
        const so2Sem = colorSemaforo(so2Val, UMBRALES.so2);
        html += `
        <div class="bg-slate-900 p-4 rounded border border-slate-700">
            <h3 class="text-sm text-slate-400">Emisiones SO₂</h3>
            <p class="text-2xl font-bold">${so2Val?.toFixed(1) ?? '--'} ppm</p>
            <span class="inline-block px-2 py-1 text-xs rounded ${colorClase(so2Sem)}">${so2Val ? '●' : 'Sin datos'}</span>
        </div>`;

        // Consumo de Agua
        html += `
        <div class="bg-slate-900 p-4 rounded border border-slate-700">
            <h3 class="text-sm text-slate-400 mb-2">Consumo de Agua (último registro, m³)</h3>
            <div class="grid grid-cols-2 gap-1 text-sm">
                ${['general','planta acido','caldera de sulfato','caldera acido','planta sulfato'].map(tipo => `
                    <div><span class="text-slate-300 capitalize">${tipo}:</span> <span class="font-bold">${ultimoConsumo[tipo]?.toFixed(1) ?? '--'}</span></div>
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
