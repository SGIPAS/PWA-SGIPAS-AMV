// ocp Panel de Control – semáforos y KPIs completos (v5 con tres tarjetas grandes en línea)
import { supabase } from '../../supabase-client.js';
import { UMBRALES, colorSemaforo, colorClase } from './utils.js';

export async function renderizarPanel(contenedor, rol) {
    try {
        const [
            acidoRes, phRes, otRes, consumoRes, emisionesRes, motoresRes, fundicionRes, inventarioRes,
            certAcidoRes, certAzufreRes
        ] = await Promise.all([
            supabase.from('analisis_acido').select('*').order('created_at', { ascending: false }).limit(1),
            supabase.from('ph_aguas').select('*').order('created_at', { ascending: false }).limit(50),
            supabase.from('ordenes_trabajo').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente'),
            supabase.from('consumo_agua').select('*').order('fecha_registro', { ascending: false }).limit(10),
            supabase.from('emisiones_so2').select('*').order('created_at', { ascending: false }).limit(1),
            supabase.from('mediciones_motores').select('temperatura, punto_medicion!inner(tag_equipo)').order('created_at', { ascending: false }).limit(200),
            supabase.from('fundicion_diaria').select('*').order('fecha_registro', { ascending: false }).limit(1),
            supabase.from('inventario_movimientos').select('*').order('fecha_movimiento', { ascending: false }).limit(50),
            supabase.from('certificaciones_acido').select('*').order('fecha_analisis', { ascending: false }).limit(4),
            supabase.from('fundicion_diaria').select('*').order('fecha_registro', { ascending: false }).limit(1)
        ]);

        const ultimoAcido = acidoRes.data?.[0];
        const phTodos = phRes.data || [];
        const pendientes = otRes.count ?? 0;

        const ultimoPH = {};
        phTodos.forEach(p => { if (!ultimoPH[p.punto_muestreo]) ultimoPH[p.punto_muestreo] = p.valor_ph; });

        const ultimoConsumo = {};
        (consumoRes.data || []).forEach(c => { if (!ultimoConsumo[c.tipo]) ultimoConsumo[c.tipo] = c.valor_m3; });

        const ultimaEmision = emisionesRes.data?.[0];

        const ultimoMotorTemp = {};
        (motoresRes.data || []).forEach(m => {
            const tag = m.punto_medicion?.tag_equipo;
            if (tag && !ultimoMotorTemp[tag]) ultimoMotorTemp[tag] = m.temperatura;
        });

        const ultimaFundicion = fundicionRes.data?.[0];

        const hoy = new Date().toISOString().split('T')[0];
        let entradaAzufre = 0, salidaAcido = 0;
        (inventarioRes.data || []).forEach(m => {
            const fecha = m.fecha_movimiento?.split('T')[0];
            if (fecha === hoy) {
                if (m.tipo_movimiento === 'recepcion_solido' || m.tipo_movimiento === 'recepcion_liquido') {
                    entradaAzufre += (m.peso_neto || 0);
                } else if (m.tipo_movimiento === 'despacho_sulfato' || m.tipo_movimiento === 'despacho_cisterna') {
                    salidaAcido += (m.toneladas_despachadas || 0);
                }
            }
        });

        const certsAcido = certAcidoRes.data || [];
        const certPorTanque = {};
        certsAcido.forEach(c => { if (!certPorTanque[c.tanque]) certPorTanque[c.tanque] = c; });

        const azufre = certAzufreRes.data?.[0] || {};

        // ---- Cuadrícula superior con tarjetas pequeñas ----
        let html = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">`;

        // Tarjeta Ácido
        html += `
        <div class="bg-slate-900 p-4 rounded border border-slate-700">
            <h3 class="text-sm text-slate-400">Ácido Sulfúrico</h3>
            <p class="text-2xl font-bold">${ultimoAcido?.concentracion?.toFixed(2) ?? '--'} %</p>
            <span class="inline-block px-2 py-1 text-xs rounded ${colorClase(colorSemaforo(ultimoAcido?.concentracion, UMBRALES.acido))}">
                ${ultimoAcido?.concentracion ? '●' : 'Sin datos'}
            </span>
        </div>`;

        // Tarjetas pH
        const puntosPH = [
            { nombre: 'caldera de acido', key: 'ph_caldera_acido' },
            { nombre: 'calderin', key: 'ph_calderin' },
            { nombre: 'torre enfriamiento', key: 'ph_torre_enfriamiento' }
        ];
        puntosPH.forEach(p => {
            const valor = ultimoPH[p.nombre];
            const umbral = UMBRALES[p.key] || null;
            const semaforo = colorSemaforo(valor, umbral);
            html += `
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-sm text-slate-400">pH ${p.nombre}</h3>
                <p class="text-2xl font-bold">${valor?.toFixed(2) ?? '--'}</p>
                <span class="inline-block px-2 py-1 text-xs rounded ${colorClase(semaforo)}">${valor ? '●' : 'Sin datos'}</span>
            </div>`;
        });

        // Tarjeta OTs Pendientes
        html += `
        <div class="bg-slate-900 p-4 rounded border border-slate-700">
            <h3 class="text-sm text-slate-400">OTs Pendientes</h3>
            <p class="text-2xl font-bold">${pendientes}</p>
            <span class="text-xs ${pendientes > 5 ? 'text-red-400' : 'text-green-400'}">
                ${pendientes > 5 ? '⚠️ Atención' : '✅ Bajo control'}
            </span>
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

        // Tarjeta Fundición
        html += `
        <div class="bg-slate-900 p-4 rounded border border-slate-700">
            <h3 class="text-sm text-slate-400">Fundición (hoy)</h3>
            <p class="text-2xl font-bold">${ultimaFundicion?.big_bags ?? '--'} BB</p>
            <span class="text-xs text-slate-400">Acidez TQ-A: ${ultimaFundicion?.acidez_tq_a ?? '--'}%</span>
        </div>`;

        // Tarjeta Inventario
        html += `
        <div class="bg-slate-900 p-4 rounded border border-slate-700">
            <h3 class="text-sm text-slate-400">Inventario (hoy)</h3>
            <p class="text-sm">Entrada Azufre: <span class="font-bold">${entradaAzufre.toFixed(1)} ton</span></p>
            <p class="text-sm">Salida Ácido: <span class="font-bold">${salidaAcido.toFixed(1)} ton</span></p>
        </div>`;

        html += `</div>`; // Fin de la cuadrícula de tarjetas pequeñas

        // ---- Fila de tres tarjetas grandes (Consumo, Motores, Laboratorio) ----
        html += `<div class="grid grid-cols-1 md:grid-cols-3 gap-4">`;

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

        // Motores
        const equiposMotor = Object.keys(ultimoMotorTemp).sort();
        html += `
        <div class="bg-slate-900 p-4 rounded border border-slate-700">
            <h3 class="text-sm text-slate-400 mb-2">Temperatura de Motores (°C)</h3>
            ${equiposMotor.length ? `
            <div class="grid grid-cols-2 gap-1 text-sm">
                ${equiposMotor.map(tag => `
                    <div><span class="text-slate-300">${tag}:</span> <span class="font-bold">${ultimoMotorTemp[tag]?.toFixed(1)}</span></div>
                `).join('')}
            </div>` : '<p class="text-sm text-slate-400">Sin datos de motores.</p>'}
        </div>`;

        // Laboratorio
        html += `
        <div class="bg-slate-900 p-4 rounded border border-slate-700">
            <h3 class="text-sm text-slate-400 mb-2">🔬 Laboratorio</h3>
            <div class="space-y-3">
                <div>
                    <h4 class="text-xs font-semibold text-slate-300 mb-1">Certificaciones de Ácido</h4>
                    ${['A','B','C','D'].map(tq => {
                        const cert = certPorTanque[tq];
                        if (!cert) return `<p class="text-xs text-slate-500">TQ-${tq}: Sin certificación</p>`;
                        const vencimiento = new Date(cert.fecha_vigencia);
                        const hoy = new Date();
                        const diasRestantes = Math.ceil((vencimiento - hoy) / (1000*60*60*24));
                        const vencido = diasRestantes < 0;
                        return `
                        <div class="flex items-center justify-between text-xs py-1">
                            <span class="font-medium">TQ-${tq}: ${cert.concentracion}%</span>
                            <span class="${vencido ? 'text-red-400' : 'text-green-400'}">
                                ${vencido ? 'Vencido' : `Vence en ${diasRestantes} días`}
                            </span>
                        </div>`;
                    }).join('')}
                </div>
                <div>
                    <h4 class="text-xs font-semibold text-slate-300 mb-1">Acidez de Azufre</h4>
                    <div class="grid grid-cols-2 gap-1 text-xs">
                        <div>TQ-A: <span class="font-bold">${azufre.acidez_tq_a ?? '--'}%</span></div>
                        <div>TQ-B: <span class="font-bold">${azufre.acidez_tq_b ?? '--'}%</span></div>
                        <div>TQ-C: <span class="font-bold">${azufre.acidez_tq_c ?? '--'}%</span></div>
                        <div>TQ-D: <span class="font-bold">${azufre.acidez_tq_d ?? '--'}%</span></div>
                    </div>
                </div>
            </div>
        </div>`;

        html += `</div>`; // Fin de la fila de tres

        contenedor.innerHTML = html;

    } catch (err) {
        contenedor.innerHTML = `<p class="text-red-500">Error al obtener datos: ${err.message}</p>`;
        console.error(err);
    }
}
