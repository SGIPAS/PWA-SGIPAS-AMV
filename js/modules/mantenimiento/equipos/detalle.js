// ocp Vista de detalle completo de un equipo
import { supabase } from '../../../supabase-client.js';
import { escapeHtml } from '../../../utils-storage.js';
import {
    badgeCriticidad,
    badgeEstado,
    labelArea,
    formatearFecha,
    formatearFechaCorta,
    SISTEMAS_PLANTA,
    ESTRATEGIAS_MANTENIMIENTO
} from '../utils.js';

// ocp Abrir modal con el detalle del equipo
export async function abrirDetalleEquipo(id, rol) {
    const modal = document.getElementById('modal-equipo');
    if (!modal) return;

    modal.classList.remove('hidden');
    modal.innerHTML = `
        <div class="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
            <p class="text-slate-400 animate-pulse text-center py-12">Cargando detalle del equipo...</p>
        </div>
    `;

    const { data: equipo, error } = await supabase
        .from('equipos')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !equipo) {
        modal.innerHTML = `
            <div class="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 w-full max-w-md p-6">
                <p class="text-red-400">Equipo no encontrado.</p>
                <button id="btn-cerrar-detalle" class="mt-4 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded">Cerrar</button>
            </div>
        `;
        document.getElementById('btn-cerrar-detalle').addEventListener('click', cerrarDetalle);
        return;
    }

    // Cargar eventos del equipo
    const { data: eventos } = await supabase
        .from('eventos_equipo')
        .select('*')
        .eq('equipo_id', id)
        .order('fecha_evento', { ascending: false })
        .limit(20);

    const puedeEditar = ['admin', 'planificador', 'supervisor'].includes(rol);
    const puedeAgregarEvento = ['admin', 'planificador', 'supervisor', 'ejecutor'].includes(rol);

    // Sistemas formateados
    const sistemasTexto = (equipo.sistemas || []).length
        ? equipo.sistemas.map(s => `<span class="inline-block bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded mr-1 mb-1">${escapeHtml(s)}</span>`).join('')
        : '<span class="text-slate-500 text-sm italic">Sin sistemas asignados</span>';

    // Estrategias formateadas
    const estrategiasTexto = (equipo.estrategia_mtto || []).length
        ? equipo.estrategia_mtto.map(e => {
            const item = ESTRATEGIAS_MANTENIMIENTO.find(x => x.value === e);
            return `<span class="inline-block bg-blue-900/50 text-blue-300 text-xs px-2 py-1 rounded mr-1 mb-1">${escapeHtml(item?.label || e)}</span>`;
        }).join('')
        : '<span class="text-slate-500 text-sm italic">Sin estrategias asignadas</span>';

    // Ficha técnica (placeholder hasta que exista el sistema de fichas)
    const fichaTecnicaHTML = equipo.ficha_tecnica_url
        ? `<a href="${escapeHtml(equipo.ficha_tecnica_url)}" target="_blank" rel="noopener"
              class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 px-4 rounded">
              📄 Abrir ficha técnica (PDF)
           </a>`
        : `<div class="bg-slate-900 border border-dashed border-slate-600 rounded p-4 text-center">
              <p class="text-slate-500 text-sm">Sin ficha técnica adjunta</p>
              <p class="text-slate-600 text-xs mt-1">Disponible cuando se implemente el módulo de fichas (MTTO-PA-F-8910)</p>
           </div>`;

    // Historial de eventos
    const eventosHTML = eventos && eventos.length
        ? eventos.map(ev => `
            <div class="border-l-4 ${colorEvento(ev.tipo_evento)} bg-slate-900 p-3 rounded-r">
                <div class="flex justify-between items-start mb-1 flex-wrap gap-2">
                    <span class="font-semibold text-white text-sm capitalize">${escapeHtml(ev.tipo_evento.replace(/_/g, ' '))}</span>
                    <span class="text-xs text-slate-400">${formatearFecha(ev.fecha_evento)}</span>
                </div>
                <p class="text-sm text-slate-300">${escapeHtml(ev.descripcion)}</p>
                ${ev.horas_parada ? `<p class="text-xs text-red-300 mt-1">⏱️ Parada: ${ev.horas_parada} h</p>` : ''}
                ${ev.horas_hombre ? `<p class="text-xs text-slate-400">👷 Horas hombre: ${ev.horas_hombre} h</p>` : ''}
            </div>
        `).join('')
        : `<p class="text-slate-500 text-sm italic text-center py-4">Sin eventos registrados aún.</p>`;

    modal.innerHTML = `
        <div class="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
            <div class="flex justify-between items-start mb-6 border-b border-slate-700 pb-4 flex-wrap gap-3">
                <div>
                    <h2 class="text-2xl font-bold text-white font-mono">${escapeHtml(equipo.codigo)}</h2>
                    <p class="text-slate-300 mt-1">${escapeHtml(equipo.nombre)}</p>
                    <div class="flex gap-2 mt-2 flex-wrap">
                        ${badgeCriticidad(equipo.clase_criticidad)}
                        ${badgeEstado(equipo.estado)}
                        ${equipo.tipo ? `<span class="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded capitalize">${escapeHtml(equipo.tipo)}</span>` : ''}
                    </div>
                </div>
                <button id="btn-cerrar-detalle" class="text-slate-400 hover:text-white text-2xl font-bold leading-none">✕</button>
            </div>

            <!-- Datos generales -->
            <div class="mb-6">
                <h3 class="text-sm font-semibold text-slate-400 uppercase mb-3">Datos generales</h3>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                        <p class="text-slate-500 text-xs">Área de planta</p>
                        <p class="text-slate-200">${escapeHtml(labelArea(equipo.area))}</p>
                    </div>
                    <div>
                        <p class="text-slate-500 text-xs">Ubicación específica</p>
                        <p class="text-slate-200">${escapeHtml(equipo.ubicacion || '—')}</p>
                    </div>
                    <div>
                        <p class="text-slate-500 text-xs">Fecha de instalación</p>
                        <p class="text-slate-200">${formatearFechaCorta(equipo.fecha_instalacion)}</p>
                    </div>
                    <div class="col-span-2 md:col-span-3">
                        <p class="text-slate-500 text-xs">Descripción</p>
                        <p class="text-slate-200 whitespace-pre-wrap">${escapeHtml(equipo.descripcion || '—')}</p>
                    </div>
                </div>
            </div>

            <!-- Datos técnicos -->
            <div class="mb-6">
                <h3 class="text-sm font-semibold text-slate-400 uppercase mb-3">Datos técnicos</h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                        <p class="text-slate-500 text-xs">Fabricante</p>
                        <p class="text-slate-200">${escapeHtml(equipo.fabricante || '—')}</p>
                    </div>
                    <div>
                        <p class="text-slate-500 text-xs">Modelo</p>
                        <p class="text-slate-200">${escapeHtml(equipo.modelo || '—')}</p>
                    </div>
                    <div>
                        <p class="text-slate-500 text-xs">N° de serie</p>
                        <p class="text-slate-200 font-mono">${escapeHtml(equipo.numero_serie || '—')}</p>
                    </div>
                    <div>
                        <p class="text-slate-500 text-xs">Vida útil estimada</p>
                        <p class="text-slate-200">${equipo.vida_util_anios ? equipo.vida_util_anios + ' años' : '—'}</p>
                    </div>
                </div>
            </div>

            <!-- Sistemas y estrategias -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <h3 class="text-sm font-semibold text-slate-400 uppercase mb-3">Sistemas asociados</h3>
                    <div>${sistemasTexto}</div>
                </div>
                <div>
                    <h3 class="text-sm font-semibold text-slate-400 uppercase mb-3">Estrategias aplicadas</h3>
                    <div>${estrategiasTexto}</div>
                </div>
            </div>

            <!-- Ficha técnica -->
            <div class="mb-6">
                <h3 class="text-sm font-semibold text-slate-400 uppercase mb-3">Ficha técnica</h3>
                ${fichaTecnicaHTML}
            </div>

            <!-- Historial de eventos -->
            <div class="mb-6">
                <div class="flex justify-between items-center mb-3 flex-wrap gap-2">
                    <h3 class="text-sm font-semibold text-slate-400 uppercase">Historial de eventos (${eventos?.length || 0})</h3>
                    ${puedeAgregarEvento ? `<button id="btn-agregar-evento" class="text-xs bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded">+ Agregar evento</button>` : ''}
                </div>
                <div class="space-y-2 max-h-72 overflow-y-auto">
                    ${eventosHTML}
                </div>
            </div>

            <!-- Notas -->
            ${equipo.notas ? `
            <div class="mb-6">
                <h3 class="text-sm font-semibold text-slate-400 uppercase mb-2">Notas</h3>
                <p class="text-slate-300 text-sm whitespace-pre-wrap bg-slate-900 p-3 rounded">${escapeHtml(equipo.notas)}</p>
            </div>` : ''}

            <!-- Acciones -->
            <div class="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button id="btn-cerrar-detalle-2" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded">Cerrar</button>
                ${puedeEditar ? `<button id="btn-editar-desde-detalle" class="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded font-bold">✏️ Editar equipo</button>` : ''}
            </div>
        </div>
    `;

    // Event listeners
    document.getElementById('btn-cerrar-detalle').addEventListener('click', cerrarDetalle);
    document.getElementById('btn-cerrar-detalle-2').addEventListener('click', cerrarDetalle);

    document.getElementById('btn-editar-desde-detalle')?.addEventListener('click', async () => {
        cerrarDetalle();
        const { abrirModalEditarEquipo } = await import('./formulario.js');
        abrirModalEditarEquipo(id, rol);
    });

    document.getElementById('btn-agregar-evento')?.addEventListener('click', async () => {
        const { abrirFormularioEvento } = await import('./evento-form.js');
        abrirFormularioEvento(equipo, rol, async () => {
            // Recargar el detalle para mostrar el nuevo evento
            await abrirDetalleEquipo(id, rol);
        });
    });
}

// ocp Cerrar modal de detalle
function cerrarDetalle() {
    const modal = document.getElementById('modal-equipo');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.innerHTML = '';
}

// ocp Color del borde según tipo de evento
function colorEvento(tipo) {
    const colores = {
        falla: 'border-red-500',
        reparacion: 'border-green-500',
        preventivo: 'border-blue-500',
        predictivo: 'border-cyan-500',
        inspeccion: 'border-slate-500',
        cambio_repuesto: 'border-yellow-500',
        ajuste: 'border-purple-500',
        arranque: 'border-green-400',
        parada: 'border-orange-500',
        baja: 'border-slate-600',
        reactivacion: 'border-teal-400'
    };
    return colores[tipo] || 'border-slate-500';
}
