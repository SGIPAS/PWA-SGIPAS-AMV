// ocp Tablero principal con KPIs y listado rápido
import { supabase } from '../../supabase-client.js';
import { irAListado, irACrear, irADetalle } from './index.js';
import { badgeEstado, formatearFecha } from './utils.js';

export async function renderizarTablero(rol) {
    const contenedor = document.getElementById('app-content');
    const puedeCrear = ['operador', 'supervisor', 'admin'].includes(rol);

    contenedor.innerHTML = `
        <div class="mb-6 flex justify-between items-center">
            <div>
                <h1 class="text-3xl font-bold text-slate-100">Control del Mantenimiento</h1>
                <p class="text-slate-400 mt-1">Órdenes de trabajo y KPIs de gestión.</p>
            </div>
            <div class="flex space-x-3">
                <button id="btn-tablero" class="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded transition">Tablero</button>
                <button id="btn-listado" class="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded transition">Listado OT</button>
                ${puedeCrear ? `<button id="btn-crear-ot" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition">+ Nueva OT</button>` : ''}
            </div>
        </div>

        <!-- KPIs -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6" id="kpi-container">
            <div class="bg-slate-800 p-4 rounded shadow border border-slate-700">
                <p class="text-slate-400 text-sm">Pendientes</p>
                <p class="text-2xl font-bold text-yellow-400" id="kpi-pendientes">-</p>
            </div>
            <div class="bg-slate-800 p-4 rounded shadow border border-slate-700">
                <p class="text-slate-400 text-sm">En ejecución</p>
                <p class="text-2xl font-bold text-blue-400" id="kpi-ejecucion">-</p>
            </div>
            <div class="bg-slate-800 p-4 rounded shadow border border-slate-700">
                <p class="text-slate-400 text-sm">Cerradas (30d)</p>
                <p class="text-2xl font-bold text-green-400" id="kpi-cerradas">-</p>
            </div>
            <div class="bg-slate-800 p-4 rounded shadow border border-slate-700">
                <p class="text-slate-400 text-sm">Tiempo medio respuesta (h)</p>
                <p class="text-2xl font-bold text-purple-400" id="kpi-tmr">-</p>
            </div>
        </div>

        <!-- OT recientes -->
        <div class="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-4">
            <h2 class="text-xl font-semibold text-white mb-4">Órdenes recientes</h2>
            <div id="tabla-ot-recientes" class="overflow-x-auto">
                <p class="text-slate-400 animate-pulse">Cargando...</p>
            </div>
        </div>
    `;

    document.getElementById('btn-listado').addEventListener('click', irAListado);
    if (puedeCrear) document.getElementById('btn-crear-ot').addEventListener('click', irACrear);
    document.getElementById('btn-tablero').addEventListener('click', () => renderizarTablero(rol));

    await cargarKPIs();
    await cargarRecientes(rol);
}

async function cargarKPIs() {
    const { count: pendientes } = await supabase.from('ordenes_trabajo').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente');
    const { count: ejecucion } = await supabase.from('ordenes_trabajo').select('*', { count: 'exact', head: true }).eq('estado', 'en_ejecucion');
    const desde = new Date(Date.now() - 30*24*60*60*1000).toISOString();
    const { count: cerradas } = await supabase.from('ordenes_trabajo').select('*', { count: 'exact', head: true }).eq('estado', 'cerrada').gte('fecha_cierre', desde);

    // Calcular tiempo medio de respuesta (pendiente -> en_ejecucion) en horas
    const { data: ots } = await supabase.from('ordenes_trabajo')
        .select('fecha_solicitud, fecha_inicio_real')
        .not('fecha_inicio_real', 'is', null)
        .not('fecha_solicitud', 'is', null);
    let tmr = 0;
    if (ots && ots.length > 0) {
        const total = ots.reduce((acc, ot) => {
            const diff = new Date(ot.fecha_inicio_real) - new Date(ot.fecha_solicitud);
            return acc + diff / (1000 * 60 * 60);
        }, 0);
        tmr = (total / ots.length).toFixed(1);
    }

    document.getElementById('kpi-pendientes').textContent = pendientes ?? 0;
    document.getElementById('kpi-ejecucion').textContent = ejecucion ?? 0;
    document.getElementById('kpi-cerradas').textContent = cerradas ?? 0;
    document.getElementById('kpi-tmr').textContent = tmr;
}

async function cargarRecientes(rol) {
    const container = document.getElementById('tabla-ot-recientes');
    const { data, error } = await supabase.from('ordenes_trabajo').select('*').order('created_at', { ascending: false }).limit(10);
    if (error) {
        container.innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`;
        return;
    }
    if (!data.length) {
        container.innerHTML = '<p class="text-slate-400 text-center">No hay OT registradas.</p>';
        return;
    }

    let html = `
        <table class="w-full text-left border-collapse text-sm">
            <thead class="bg-slate-900 text-slate-400 uppercase tracking-wider">
                <tr>
                    <th class="p-3">#OT</th>
                    <th class="p-3">Título</th>
                    <th class="p-3">Estado</th>
                    <th class="p-3">Solicitud</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-700 text-slate-300">
    `;
    data.forEach(ot => {
        html += `
            <tr class="hover:bg-slate-700/50 cursor-pointer" data-id="${ot.id}">
                <td class="p-3 font-mono">${ot.numero_ot}</td>
                <td class="p-3">${ot.titulo}</td>
                <td class="p-3">${badgeEstado(ot.estado)}</td>
                <td class="p-3">${formatearFecha(ot.fecha_solicitud)}</td>
            </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;

    // Evento para ir al detalle
    container.querySelectorAll('tr[data-id]').forEach(row => {
        row.addEventListener('click', () => irADetalle(row.dataset.id));
    });
}