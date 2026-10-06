// ocp Listado y filtros de equipos
import { supabase } from '../../../supabase-client.js';
import { escapeHtml } from '../../../utils-storage.js';
import {
    AREAS_PLANTA,
    CRITICIDADES,
    ESTADOS_EQUIPO,
    TIPOS_EQUIPO,
    badgeCriticidad,
    badgeEstado,
    labelArea
} from '../utils.js';

// ocp Estado interno de filtros
let filtros = {
    busqueda: '',
    area: '',
    criticidad: '',
    estado: '',
    tipo: ''
};

// ocp Renderizar barra de filtros
export function renderizarFiltrosEquipos(contenedor, rol) {
    contenedor.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
                <label class="block text-xs text-slate-400 mb-1">Búsqueda</label>
                <input type="text" id="filtro-busqueda-eq" placeholder="TAG o nombre..." value="${escapeHtml(filtros.busqueda)}"
                    class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm">
            </div>
            <div>
                <label class="block text-xs text-slate-400 mb-1">Área</label>
                <select id="filtro-area-eq" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm">
                    <option value="">Todas</option>
                    ${AREAS_PLANTA.map(a => `<option value="${a.value}" ${filtros.area === a.value ? 'selected' : ''}>${escapeHtml(a.label)}</option>`).join('')}
                </select>
            </div>
            <div>
                <label class="block text-xs text-slate-400 mb-1">Criticidad</label>
                <select id="filtro-criticidad-eq" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm">
                    <option value="">Todas</option>
                    ${CRITICIDADES.map(c => `<option value="${c.value}" ${filtros.criticidad === c.value ? 'selected' : ''}>${escapeHtml(c.label)}</option>`).join('')}
                </select>
            </div>
            <div>
                <label class="block text-xs text-slate-400 mb-1">Estado</label>
                <select id="filtro-estado-eq" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm">
                    <option value="">Todos</option>
                    ${ESTADOS_EQUIPO.map(e => `<option value="${e.value}" ${filtros.estado === e.value ? 'selected' : ''}>${escapeHtml(e.label)}</option>`).join('')}
                </select>
            </div>
            <div>
                <label class="block text-xs text-slate-400 mb-1">Tipo</label>
                <select id="filtro-tipo-eq" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm">
                    <option value="">Todos</option>
                    ${TIPOS_EQUIPO.map(t => `<option value="${t}" ${filtros.tipo === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}
                </select>
            </div>
        </div>
        <div class="flex justify-between items-center mt-3">
            <span id="equipos-contador" class="text-xs text-slate-400"></span>
            <button id="btn-limpiar-filtros-eq" class="text-xs text-slate-400 hover:text-white transition">Limpiar filtros</button>
        </div>
    `;

    const btnLimpiar = document.getElementById('btn-limpiar-filtros-eq');
    const inputBusqueda = document.getElementById('filtro-busqueda-eq');
    const selArea = document.getElementById('filtro-area-eq');
    const selCriticidad = document.getElementById('filtro-criticidad-eq');
    const selEstado = document.getElementById('filtro-estado-eq');
    const selTipo = document.getElementById('filtro-tipo-eq');

    let debounceTimer;
    inputBusqueda.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            filtros.busqueda = inputBusqueda.value.trim();
            renderizarListaEquipos(rol);
        }, 350);
    });

    selArea.addEventListener('change', () => { filtros.area = selArea.value; renderizarListaEquipos(rol); });
    selCriticidad.addEventListener('change', () => { filtros.criticidad = selCriticidad.value; renderizarListaEquipos(rol); });
    selEstado.addEventListener('change', () => { filtros.estado = selEstado.value; renderizarListaEquipos(rol); });
    selTipo.addEventListener('change', () => { filtros.tipo = selTipo.value; renderizarListaEquipos(rol); });

    btnLimpiar.addEventListener('click', () => {
        filtros = { busqueda: '', area: '', criticidad: '', estado: '', tipo: '' };
        inputBusqueda.value = '';
        selArea.value = '';
        selCriticidad.value = '';
        selEstado.value = '';
        selTipo.value = '';
        renderizarListaEquipos(rol);
    });
}

// ocp Renderizar listado de equipos con filtros aplicados
export async function renderizarListaEquipos(rol) {
    const contenedor = document.getElementById('equipos-lista');
    const contador = document.getElementById('equipos-contador');
    if (!contenedor) return;

    contenedor.innerHTML = '<p class="text-slate-400 animate-pulse text-center py-8">Cargando equipos...</p>';

    let query = supabase.from('equipos').select('*', { count: 'exact' }).eq('activo', true);

    if (filtros.busqueda) {
        const f = `%${filtros.busqueda}%`;
        query = query.or(`codigo.ilike.${f},nombre.ilike.${f}`);
    }
    if (filtros.area) query = query.eq('area', filtros.area);
    if (filtros.criticidad) query = query.eq('clase_criticidad', filtros.criticidad);
    if (filtros.estado) query = query.eq('estado', filtros.estado);
    if (filtros.tipo) query = query.eq('tipo', filtros.tipo);

    query = query.order('codigo', { ascending: true });

    const { data, error, count } = await query;

    if (error) {
        contenedor.innerHTML = `<p class="text-red-500 text-center py-8">Error: ${escapeHtml(error.message)}</p>`;
        return;
    }

    if (contador) contador.textContent = `Mostrando ${data?.length || 0} de ${count || 0} equipos`;

    if (!data || data.length === 0) {
        contenedor.innerHTML = '<p class="text-slate-400 text-center py-8">No hay equipos que coincidan con los filtros.</p>';
        return;
    }

    const puedeEditar = ['admin', 'planificador', 'supervisor'].includes(rol);

    contenedor.innerHTML = `
        <div class="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse text-sm">
                    <thead class="bg-slate-800 text-slate-400 uppercase text-xs">
                        <tr>
                            <th class="p-3 font-semibold">TAG</th>
                            <th class="p-3 font-semibold">Nombre</th>
                            <th class="p-3 font-semibold">Tipo</th>
                            <th class="p-3 font-semibold">Área</th>
                            <th class="p-3 font-semibold text-center">Crit.</th>
                            <th class="p-3 font-semibold">Estado</th>
                            <th class="p-3 font-semibold text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-800 text-slate-300">
                        ${data.map(eq => `
                            <tr class="hover:bg-slate-800/50">
                                <td class="p-3 font-mono font-semibold text-white">${escapeHtml(eq.codigo)}</td>
                                <td class="p-3">${escapeHtml(eq.nombre)}</td>
                                <td class="p-3 capitalize">${escapeHtml(eq.tipo || '—')}</td>
                                <td class="p-3 text-slate-400">${escapeHtml(eq.area || '—')}</td>
                                <td class="p-3 text-center">${badgeCriticidad(eq.clase_criticidad)}</td>
                                <td class="p-3">${badgeEstado(eq.estado)}</td>
                                <td class="p-3 text-right whitespace-nowrap">
                                    <button class="btn-ver-equipo text-blue-400 hover:underline text-xs mr-2" data-id="${eq.id}">👁️ Ver</button>
                                    ${puedeEditar ? `<button class="btn-editar-equipo text-yellow-400 hover:underline text-xs" data-id="${eq.id}">✏️ Editar</button>` : ''}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    contenedor.querySelectorAll('.btn-ver-equipo').forEach(btn => {
        btn.addEventListener('click', async () => {
            const { abrirDetalleEquipo } = await import('./detalle.js').catch(() => ({ abrirDetalleEquipo: null }));
            if (abrirDetalleEquipo) {
                abrirDetalleEquipo(btn.dataset.id, rol);
            } else {
                alert('Vista de detalle en construcción. ID: ' + btn.dataset.id);
            }
        });
    });

    contenedor.querySelectorAll('.btn-editar-equipo').forEach(btn => {
        btn.addEventListener('click', async () => {
            const { abrirModalEditarEquipo } = await import('./formulario.js');
            abrirModalEditarEquipo(btn.dataset.id, rol);
        });
    });
}