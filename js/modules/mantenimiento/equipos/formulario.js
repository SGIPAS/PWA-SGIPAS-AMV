// ocp Formulario crear/editar equipo
import { supabase } from '../../../supabase-client.js';
import { escapeHtml } from '../../../utils-storage.js';
import { renderizarListaEquipos } from './lista.js';
import {
    AREAS_PLANTA,
    CRITICIDADES,
    ESTADOS_EQUIPO,
    TIPOS_EQUIPO,
    SISTEMAS_PLANTA,
    ESTRATEGIAS_MANTENIMIENTO
} from '../utils.js';

// ocp Abrir modal para crear equipo
export function abrirModalNuevoEquipo(rol) {
    abrirModalEquipo(null, rol);
}

// ocp Abrir modal para editar equipo existente
export async function abrirModalEditarEquipo(id, rol) {
    const { data, error } = await supabase.from('equipos').select('*').eq('id', id).single();
    if (error || !data) {
        alert('Equipo no encontrado.');
        return;
    }
    abrirModalEquipo(data, rol);
}

// ocp Cerrar modal
function cerrarModal() {
    const modal = document.getElementById('modal-equipo');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.innerHTML = '';
}

// ocp Abrir modal (nuevo o edición)
function abrirModalEquipo(equipo, rol) {
    const modal = document.getElementById('modal-equipo');
    if (!modal) return;

    const esEdicion = !!equipo;
    const e = equipo || {
        codigo: '', nombre: '', descripcion: '', tipo: '', area: '',
        clase_criticidad: 'C', estado: 'operativo', sistemas: [],
        ubicacion: '', fabricante: '', modelo: '', numero_serie: '',
        fecha_instalacion: '', vida_util_anios: null, estrategia_mtto: [],
        notas: ''
    };

    modal.classList.remove('hidden');
    modal.innerHTML = `
        <div class="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
            <h2 class="text-xl font-bold text-white mb-4 border-b border-slate-700 pb-2">
                ${esEdicion ? 'Editar Equipo: ' + escapeHtml(e.codigo) : 'Nuevo Equipo'}
            </h2>
            <form id="form-equipo" class="space-y-4">
                <input type="hidden" id="eq-id" value="${escapeHtml(e.id || '')}">

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">TAG *</label>
                        <input type="text" id="eq-codigo" required value="${escapeHtml(e.codigo)}"
                            placeholder="Ej: BA-1201" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono">
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Nombre *</label>
                        <input type="text" id="eq-nombre" required value="${escapeHtml(e.nombre)}"
                            placeholder="Ej: Bomba de ácido principal" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Tipo</label>
                        <select id="eq-tipo" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                            <option value="">— Seleccionar —</option>
                            ${TIPOS_EQUIPO.map(t => `<option value="${t}" ${e.tipo === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Área de planta</label>
                        <select id="eq-area" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                            <option value="">— Seleccionar —</option>
                            ${AREAS_PLANTA.map(a => `<option value="${a.value}" ${e.area === a.value ? 'selected' : ''}>${escapeHtml(a.label)}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Ubicación específica</label>
                        <input type="text" id="eq-ubicacion" value="${escapeHtml(e.ubicacion || '')}"
                            placeholder="Ej: Sala de bombas A" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Clase de criticidad *</label>
                        <select id="eq-clase-criticidad" required class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                            ${CRITICIDADES.map(c => `<option value="${c.value}" ${e.clase_criticidad === c.value ? 'selected' : ''}>${escapeHtml(c.label)}</option>`).join('')}
                        </select>
                        <p class="text-xs text-slate-500 mt-1">A = crítico, B = esencial, C = no crítico.</p>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Estado actual</label>
                        <select id="eq-estado" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                            ${ESTADOS_EQUIPO.map(s => `<option value="${s.value}" ${e.estado === s.value ? 'selected' : ''}>${escapeHtml(s.label)}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div>
                    <label class="block text-slate-400 text-sm mb-1">Descripción</label>
                    <textarea id="eq-descripcion" rows="2" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">${escapeHtml(e.descripcion || '')}</textarea>
                </div>

                <div>
                    <label class="block text-slate-400 text-sm mb-2">Sistemas a los que pertenece</label>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                        ${SISTEMAS_PLANTA.map(s => `
                            <label class="flex items-center text-slate-300 text-xs">
                                <input type="checkbox" class="eq-sistema h-4 w-4 mr-2 text-blue-600 bg-slate-700 border-slate-600 rounded"
                                    value="${escapeHtml(s)}" ${(e.sistemas || []).includes(s) ? 'checked' : ''}>
                                ${escapeHtml(s)}
                            </label>
                        `).join('')}
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Fabricante</label>
                        <input type="text" id="eq-fabricante" value="${escapeHtml(e.fabricante || '')}" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Modelo</label>
                        <input type="text" id="eq-modelo" value="${escapeHtml(e.modelo || '')}" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">N° de serie</label>
                        <input type="text" id="eq-serie" value="${escapeHtml(e.numero_serie || '')}" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Fecha de instalación</label>
                        <input type="date" id="eq-fecha-instalacion" value="${e.fecha_instalacion || ''}" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Vida útil estimada (años)</label>
                        <input type="number" id="eq-vida-util" value="${e.vida_util_anios || ''}" min="0" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                    </div>
                </div>

                <div>
                    <label class="block text-slate-400 text-sm mb-2">Estrategias de mantenimiento aplicables</label>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                        ${ESTRATEGIAS_MANTENIMIENTO.map(es => `
                            <label class="flex items-center text-slate-300 text-xs">
                                <input type="checkbox" class="eq-estrategia h-4 w-4 mr-2 text-blue-600 bg-slate-700 border-slate-600 rounded"
                                    value="${es.value}" ${(e.estrategia_mtto || []).includes(es.value) ? 'checked' : ''}>
                                ${escapeHtml(es.label)}
                            </label>
                        `).join('')}
                    </div>
                </div>

                <div>
                    <label class="block text-slate-400 text-sm mb-1">Notas</label>
                    <textarea id="eq-notas" rows="2" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">${escapeHtml(e.notas || '')}</textarea>
                </div>

                <p id="eq-error" class="text-red-400 text-sm hidden"></p>

                <div class="flex justify-end gap-3 pt-4 border-t border-slate-700">
                    <button type="button" id="btn-cerrar-modal-eq" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded">Cancelar</button>
                    <button type="submit" id="btn-guardar-eq" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold">Guardar</button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('btn-cerrar-modal-eq').addEventListener('click', cerrarModal);

    document.getElementById('form-equipo').addEventListener('submit', async (e) => {
        e.preventDefault();
        await guardarEquipo(rol);
    });
}

// ocp Guardar equipo (insert o update)
async function guardarEquipo(rol) {
    const btn = document.getElementById('btn-guardar-eq');
    const errorEl = document.getElementById('eq-error');
    btn.disabled = true;
    btn.textContent = 'Guardando...';
    errorEl.classList.add('hidden');

    const id = document.getElementById('eq-id').value;
    const codigo = document.getElementById('eq-codigo').value.trim();
    const nombre = document.getElementById('eq-nombre').value.trim();
    const tipo = document.getElementById('eq-tipo').value || null;
    const area = document.getElementById('eq-area').value || null;
    const ubicacion = document.getElementById('eq-ubicacion').value.trim() || null;
    const clase_criticidad = document.getElementById('eq-clase-criticidad').value;
    const estado = document.getElementById('eq-estado').value;
    const descripcion = document.getElementById('eq-descripcion').value.trim() || null;
    const fabricante = document.getElementById('eq-fabricante').value.trim() || null;
    const modelo = document.getElementById('eq-modelo').value.trim() || null;
    const numero_serie = document.getElementById('eq-serie').value.trim() || null;
    const fecha_instalacion = document.getElementById('eq-fecha-instalacion').value || null;
    const vida_util_anios = parseInt(document.getElementById('eq-vida-util').value) || null;
    const notas = document.getElementById('eq-notas').value.trim() || null;

    const sistemas = Array.from(document.querySelectorAll('.eq-sistema:checked')).map(c => c.value);
    const estrategia_mtto = Array.from(document.querySelectorAll('.eq-estrategia:checked')).map(c => c.value);

    const payload = {
        codigo, nombre, tipo, area, ubicacion,
        clase_criticidad, estado, descripcion,
        fabricante, modelo, numero_serie,
        fecha_instalacion, vida_util_anios, notas,
        sistemas: sistemas.length ? sistemas : null,
        estrategia_mtto: estrategia_mtto.length ? estrategia_mtto : null
    };

    try {
        let error;
        if (id) {
            const res = await supabase.from('equipos').update(payload).eq('id', id);
            error = res.error;
        } else {
            const res = await supabase.from('equipos').insert(payload);
            error = res.error;
        }

        if (error) {
            if (error.code === '23505') {
                throw new Error('Ya existe un equipo con ese TAG.');
            }
            throw error;
        }

        cerrarModal();
        await renderizarListaEquipos(rol);

    } catch (err) {
        errorEl.textContent = 'Error: ' + err.message;
        errorEl.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Guardar';
    }
}
