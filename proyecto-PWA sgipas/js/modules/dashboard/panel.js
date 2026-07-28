// ocp Panel de Control – semáforos y KPIs completos (v2)
import { supabase } from '../../supabase-client.js';
import { UMBRALES, colorSemaforo, colorClase } from './utils.js';

export async function renderizarPanel(contenedor, rol) {
    try {
        // Obtener todos los datos en paralelo
        const [
            acidoRes, phRes, otRes, consumoRes, emisionesRes, motoresRes, fundicionRes, inventarioRes
        ] = await Promise.all([
            supabase.from('analisis_acido').select('*').order('created_at', { ascending: false }).limit(1),
            supabase.from('ph_aguas').select('*').order('created_at', { ascending: false }).limit(50),
            supabase.from('ordenes_trabajo').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente'),
            supabase.from('consumo_agua').select('*').order('fecha_registro', { ascending: false }).limit(10),
            supabase.from('emisiones_so2').select('*').order('created_at', { ascending: false }).limit(1),
            supabase.from('temperaturas_motores').select('*').order('created_at', { ascending: false }).limit(50),
            supabase.from('fundicion_diaria').select('*').order('fecha_registro', { ascending: false }).limit(1),
            supabase.from('inventario_movimientos').select('*').order('fecha_movimiento', { ascending: false }).limit(20)
        ]);

        const ultimoAcido = acidoRes.data?.[0];
        const phTodos = phRes.data || [];
        const pendientes = otRes.count ?? 0;

        // Último pH por punto
        const ultimoPH = {};
        phTodos.forEach(p => {
            if (!ultimoPH[p.punto_muestreo]) ultimoPH[p.punto_muestreo] = p.valor_ph;
        });

        // Consumo: último valor por tipo
        const ultimoConsumo = {};
        (consumoRes.data || []).forEach(c => {
            if (!ultimoConsumo[c.tipo]) ultimoConsumo[c.tipo] = c.valor_m3;
        });

        // Emisiones: último valor
        const ultimaEmision = emisionesRes.data?.[0];

        // Motores: último valor por equipo (tag)
        const ultimoMotor = {};
        (motoresRes.data || []).forEach(m => {
            if (!ultimoMotor[m.tag_equipo]) ultimoMotor[m.tag_equipo] = m.temperatura;
        });

        // Fundición: último día
        const ultimaFundicion = fundicionRes.data?.[0];

        // Inventario: totales del día (entradas de azufre, salidas de ácido)
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

        // Construir HTML
        let html = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">`;

        // ---- Tarjeta Ácido ----
        html += `
        <div class="bg-slate-900 p-4 rounded border border-slate-700">
            <h3 class="text-sm text-slate-400">Ácido Sulfúrico</h3>
            <p class="text-2xl font-bold">${ultimoAcido?.concentracion?.toFixed(2) ?? '--'} %</p>
            <span class="inline-block px-2 py-1 text-xs rounded ${colorClase(colorSemaforo(ultimoAcido?.concentracion, UMBRALES.acido))}">
                ${ultimoAcido?.concentracion ? '●' : 'Sin datos'}
            </span>
        </div>`;

        // ---- Tarjetas pH ----
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
                <span class="inline-block px-2 py-1 text-xs rounded ${colorClase(semaforo)}">
                    ${valor ? '●' : 'Sin datos'}
                </span>
            </div>`;
        });

        // ---- Tarjeta OTs Pendientes ----
        html += `
        <div class="bg-slate-900 p-4 rounded border border-slate-700">
            <h3 class="text-sm text-slate-400">OTs Pendientes</h3>
            <p class="text-2xl font-bold">${pendientes}</p>
            <span class="text-xs ${pendientes > 5 ? 'text-red-400' : 'text-green-400'}">
                ${pendientes > 5 ? '⚠️ Atención' : '✅ Bajo control'}
            </span>
        </div>`;

        // ---- Tarjeta Emisiones SO₂ ----
        const so2Val = ultimaEmision?.ppm_so2;
        const so2Sem = colorSemaforo(so2Val, UMBRALES.so2);
        html += `
        <div class="bg-slate-900 p-4 rounded border border-slate-700">
            <h3 class="text-sm text-slate-400">Emisiones SO₂</h3>
            <p class="text-2xl font-bold">${so2Val?.toFixed(1) ?? '--'} ppm</p>
            <span class="inline-block px-2 py-1 text-xs rounded ${colorClase(so2Sem)}">
                ${so2Val ? '●' : 'Sin datos'}
            </span>
        </div>`;

        // ---- Tarjeta Fundición ----
        html += `
        <div class="bg-slate-900 p-4 rounded border border-slate-700">
            <h3 class="text-sm text-slate-400">Fundición (hoy)</h3>
            <p class="text-2xl font-bold">${ultimaFundicion?.big_bags ?? '--'} BB</p>
            <span class="text-xs text-slate-400">Acidez TQ-A: ${ultimaFundicion?.acidez_tq_a ?? '--'}%</span>
        </div>`;

        // ---- Tarjeta Inventario (balance del día) ----
        html += `
        <div class="bg-slate-900 p-4 rounded border border-slate-700">
            <h3 class="text-sm text-slate-400">Inventario (hoy)</h3>
            <p class="text-sm">Entrada Azufre: <span class="font-bold">${entradaAzufre.toFixed(1)} ton</span></p>
            <p class="text-sm">Salida Ácido: <span class="font-bold">${salidaAcido.toFixed(1)} ton</span></p>
        </div>`;

        // ---- Consumo de Agua (mini tabla) ----
        html += `
        <div class="bg-slate-900 p-4 rounded border border-slate-700 col-span-1 md:col-span-2">
            <h3 class="text-sm text-slate-400 mb-2">Consumo de Agua (último registro, m³)</h3>
            <div class="grid grid-cols-2 gap-1 text-sm">
                ${['general','planta acido','caldera de sulfato','caldera acido','planta sulfato'].map(tipo => `
                    <div><span class="text-slate-300 capitalize">${tipo}:</span> <span class="font-bold">${ultimoConsumo[tipo]?.toFixed(1) ?? '--'}</span></div>
                `).join('')}
            </div>
        </div>`;

        // ---- Motores (lista simple) ----
        const equiposMotor = Object.keys(ultimoMotor).sort();
        html += `
        <div class="bg-slate-900 p-4 rounded border border-slate-700 col-span-1 md:col-span-2">
            <h3 class="text-sm text-slate-400 mb-2">Temperatura de Motores (°C)</h3>
            ${equiposMotor.length ? `
            <div class="grid grid-cols-2 md:grid-cols-3 gap-1 text-sm">
                ${equiposMotor.map(tag => `
                    <div><span class="text-slate-300">${tag}:</span> <span class="font-bold">${ultimoMotor[tag]?.toFixed(1)}</span></div>
                `).join('')}
            </div>` : '<p class="text-sm text-slate-400">Sin datos de motores.</p>'}
        </div>`;

        html += `</div>`;
        contenedor.innerHTML = html;

    } catch (err) {
        contenedor.innerHTML = `<p class="text-red-500">Error al obtener datos: ${err.message}</p>`;
        console.error(err);
    }
}