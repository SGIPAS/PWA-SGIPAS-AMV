// ocp Listado completo de OTs con filtros
import { supabase } from '../../supabase-client.js';
import { irATablero, irADetalle } from './index.js';
import { badgeEstado, formatearFecha } from './utils.js';

export async function renderizarListado(rol) {
    const contenedor = document.getElementById('app-content');
    contenedor.innerHTML = `
        <div class="mb-6 flex justify-between items-center">
            <h1 class="text-2xl font-bold text-white">Listado de Órdenes de Trabajo</h1>
            <button id="btn-volver-tablero" class="bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded">← Tablero</button>
        </div>
        <div class="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-4 mb-4 flex flex-wrap gap-4 items-center">
            <input type="text" id="filtro-busqueda" placeholder="Buscar #OT o título..." class="bg-slate-900 border border-slate-700 rounded p-2 text-white w-64">
            <select id="filtro-estado" class="bg-slate-900 border border-slate-700 rounded p-2 text-white">
                <option value="">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="aprobada_seguridad">Aprobada seguridad</option>
                <option value="en_ejecucion">En ejecución</option>
                <option value="finalizada_ejecutor">Finalizada ejecutor</option>
                <option value="en_auditoria">En auditoría</option>
                <option value="cerrada">Cerrada</option>
                <option value="cancelada">Cancelada</option>
            </select>
            <button id="btn-filtrar" class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded">Filtrar</button>
        </div>
        <div id="tabla-listado" class="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-4 overflow-x-auto">
            <p class="text-slate-400 animate-pulse">Cargando listado...</p>
        </div>
    `;

    document.getElementById('btn-volver-tablero').addEventListener('click', irATablero);
    document.getElementById('btn-filtrar').addEventListener('click', () => cargarListado(rol));

    await cargarListado(rol);
}

async function cargarListado(rol) {
    const container = document.getElementById('tabla-listado');
    const busqueda = document.getElementById('filtro-busqueda')?.value.trim() || '';
    const estado = document.getElementById('filtro-estado')?.value || '';

    let query = supabase.from('ordenes_trabajo').select('*').order('created_at', { ascending: false });
    if (estado) query = query.eq('estado', estado);
    if (busqueda) query = query.or(`numero_ot.ilike.%${busqueda}%,titulo.ilike.%${busqueda}%`);

    const { data, error } = await query;
    if (error) {
        container.innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`;
        return;
    }
    if (!data.length) {
        container.innerHTML = '<p class="text-slate-400 text-center">Sin resultados.</p>';
        return;
    }

    let html = `
        <table class="w-full text-left border-collapse text-sm">
            <thead class="bg-slate-900 text-slate-400 uppercase tracking-wider">
                <tr>
                    <th class="p-3">#OT</th>
                    <th class="p-3">Título</th>
                    <th class="p-3">Tipo</th>
                    <th class="p-3">Estado</th>
                    <th class="p-3">Solicitud</th>
                    <th class="p-3">Acción</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-700 text-slate-300">
    `;
    data.forEach(ot => {
        html += `
            <tr class="hover:bg-slate-700/50">
                <td class="p-3 font-mono">${ot.numero_ot}</td>
                <td class="p-3">${ot.titulo}</td>
                <td class="p-3">${ot.tipo}</td>
                <td class="p-3">${badgeEstado(ot.estado)}</td>
                <td class="p-3">${formatearFecha(ot.fecha_solicitud)}</td>
                <td class="p-3"><button class="text-blue-400 hover:underline ver-detalle" data-id="${ot.id}">Ver</button></td>
            </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;

    container.querySelectorAll('.ver-detalle').forEach(btn => {
        btn.addEventListener('click', () => irADetalle(btn.dataset.id));
    });
}