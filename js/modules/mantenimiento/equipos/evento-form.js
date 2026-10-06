// ocp Formulario para registrar eventos de un equipo
import { supabase } from '../../../supabase-client.js';
import { escapeHtml } from '../../../utils-storage.js';
import { enviarPushARoles } from '../../../push.js';
import { ESTRATEGIAS_MANTENIMIENTO } from '../utils.js';

// ocp Tipos de evento según SGI-PAS
const TIPOS_EVENTO = [
    { value: 'falla', label: '🔴 Falla' },
    { value: 'reparacion', label: '🔧 Reparación' },
    { value: 'preventivo', label: '📅 Preventivo' },
    { value: 'predictivo', label: '📊 Predictivo' },
    { value: 'inspeccion', label: '🔍 Inspección' },
    { value: 'cambio_repuesto', label: '📦 Cambio de repuesto' },
    { value: 'ajuste', label: '🔩 Ajuste' },
    { value: 'arranque', label: '▶️ Arranque' },
    { value: 'parada', label: '⏸️ Parada' },
    { value: 'baja', label: '⛔ Baja' },
    { value: 'reactivacion', label: '🔄 Reactivación' }
];

// ocp Prioridades según SGI-PAS
const PRIORIDADES = [
    { value: 1, label: '1 — Emergencia (inmediato)' },
    { value: 2, label: '2 — Urgente (72 horas)' },
    { value: 3, label: '3 — Programable (semanal)' },
    { value: 4, label: '4 — Diferible (próxima parada)' }
];

// ocp Abrir formulario de evento
export function abrirFormularioEvento(equipo, rol, onSuccess) {
    // Crear modal en el body (independiente del modal-equipo)
    let modal = document.getElementById('modal-evento');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-evento';
        modal.className = 'hidden fixed inset-0 bg-black/70 flex items-center justify-center z-[60] backdrop-blur-sm';
        document.body.appendChild(modal);
    }

    modal.classList.remove('hidden');

    // Fecha/hora actual en formato datetime-local
    const ahora = new Date();
    const offset = ahora.getTimezoneOffset() * 60000;
    const fechaLocal = new Date(ahora.getTime() - offset).toISOString().slice(0, 16);

    modal.innerHTML = `
        <div class="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div class="flex justify-between items-start mb-4 border-b border-slate-700 pb-3">
                <div>
                    <h2 class="text-xl font-bold text-white">Registrar Evento</h2>
                    <p class="text-slate-400 text-sm mt-1 font-mono">${escapeHtml(equipo.codigo)} — ${escapeHtml(equipo.nombre)}</p>
                </div>
                <button id="btn-cerrar-evento" class="text-slate-400 hover:text-white text-2xl font-bold leading-none">✕</button>
            </div>

            <form id="form-evento" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Tipo de evento *</label>
                        <select id="ev-tipo" required class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                            <option value="">— Seleccionar —</option>
                            ${TIPOS_EVENTO.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Fecha y hora *</label>
                        <input type="datetime-local" id="ev-fecha" required value="${fechaLocal}"
                            class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                    </div>
                </div>

                <div id="bloque-prioridad" class="hidden">
                    <label class="block text-slate-400 text-sm mb-1">Prioridad</label>
                    <select id="ev-prioridad" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                        <option value="">— Seleccionar —</option>
                        ${PRIORIDADES.map(p => `<option value="${p.value}">${p.label}</option>`).join('')}
                    </select>
                </div>

                <div>
                    <label class="block text-slate-400 text-sm mb-1">Estrategia de mantenimiento</label>
                    <select id="ev-estrategia" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                        <option value="">— No aplica —</option>
                        ${ESTRATEGIAS_MANTENIMIENTO.map(e => `<option value="${e.value}">${escapeHtml(e.label)}</option>`).join('')}
                    </select>
                </div>

                <div>
                    <label class="block text-slate-400 text-sm mb-1">Descripción del evento *</label>
                    <textarea id="ev-descripcion" required rows="3" minlength="10"
                        placeholder="Ej: Se detectó fuga en sello mecánico durante recorrido de turno"
                        class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"></textarea>
                    <p class="text-xs text-slate-500 mt-1">Mínimo 10 caracteres.</p>
                </div>

                <div>
                    <label class="block text-slate-400 text-sm mb-1">Diagnóstico técnico</label>
                    <textarea id="ev-diagnostico" rows="2"
                        placeholder="Ej: Desgaste de cara de sello por operación en seco"
                        class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"></textarea>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Horas de parada</label>
                        <input type="number" id="ev-horas-parada" min="0" step="0.5"
                            placeholder="0.0" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Horas hombre</label>
                        <input type="number" id="ev-horas-hombre" min="0" step="0.5"
                            placeholder="0.0" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Costo estimado (USD)</label>
                        <input type="number" id="ev-costo" min="0" step="0.01"
                            placeholder="0.00" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                    </div>
                </div>

                <div>
                    <label class="block text-slate-400 text-sm mb-1">Observaciones</label>
                    <textarea id="ev-observaciones" rows="2"
                        placeholder="Notas adicionales, repuestos usados, etc."
                        class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"></textarea>
                </div>

                <p id="ev-error" class="text-red-400 text-sm hidden"></p>

                <div class="flex justify-end gap-3 pt-4 border-t border-slate-700">
                    <button type="button" id="btn-cancelar-evento" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded">Cancelar</button>
                    <button type="submit" id="btn-guardar-evento" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold">Registrar evento</button>
                </div>
            </form>
        </div>
    `;

    // ocp Mostrar/ocultar prioridad según tipo de evento
    const selTipo = document.getElementById('ev-tipo');
    const bloquePrioridad = document.getElementById('bloque-prioridad');

    selTipo.addEventListener('change', () => {
        const tipo = selTipo.value;
        if (tipo === 'falla' || tipo === 'parada') {
            bloquePrioridad.classList.remove('hidden');
        } else {
            bloquePrioridad.classList.add('hidden');
            document.getElementById('ev-prioridad').value = '';
        }
    });

    // ocp Botones
    const cerrar = () => {
        modal.classList.add('hidden');
        modal.innerHTML = '';
    };

    document.getElementById('btn-cerrar-evento').addEventListener('click', cerrar);
    document.getElementById('btn-cancelar-evento').addEventListener('click', cerrar);

    // ocp Submit
    document.getElementById('form-evento').addEventListener('submit', async (e) => {
        e.preventDefault();
        await guardarEvento(equipo, rol, cerrar, onSuccess);
    });
}

// ocp Guardar evento
async function guardarEvento(equipo, rol, cerrar, onSuccess) {
    const btn = document.getElementById('btn-guardar-evento');
    const errorEl = document.getElementById('ev-error');
    btn.disabled = true;
    btn.textContent = 'Guardando...';
    errorEl.classList.add('hidden');

    const tipo_evento = document.getElementById('ev-tipo').value;
    const fechaLocal = document.getElementById('ev-fecha').value;
    const prioridadRaw = document.getElementById('ev-prioridad').value;
    const estrategia = document.getElementById('ev-estrategia').value || null;
    const descripcion = document.getElementById('ev-descripcion').value.trim();
    const diagnostico = document.getElementById('ev-diagnostico').value.trim() || null;
    const horas_parada = parseFloat(document.getElementById('ev-horas-parada').value) || null;
    const horas_hombre = parseFloat(document.getElementById('ev-horas-hombre').value) || null;
    const costo_estimado = parseFloat(document.getElementById('ev-costo').value) || null;
    const observaciones = document.getElementById('ev-observaciones').value.trim() || null;

    // Validaciones
    if (!tipo_evento) {
        return mostrarError('Debe seleccionar un tipo de evento.');
    }
    if (descripcion.length < 10) {
        return mostrarError('La descripción debe tener al menos 10 caracteres.');
    }
    if ((tipo_evento === 'falla' || tipo_evento === 'parada') && !prioridadRaw) {
        return mostrarError('Debe asignar una prioridad para fallas o paradas.');
    }

    const prioridad = prioridadRaw ? parseInt(prioridadRaw) : null;
    const fecha_evento = new Date(fechaLocal).toISOString();

    // Obtener usuario autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return mostrarError('Sesión expirada. Recargue la página.');
    }

    const payload = {
        equipo_id: equipo.id,
        tipo_evento,
        estrategia,
        prioridad,
        fecha_evento,
        descripcion,
        diagnostico,
        horas_parada,
        horas_hombre,
        costo_estimado,
        observaciones,
        registrado_por: user.id
    };

    try {
        const { error } = await supabase.from('eventos_equipo').insert(payload);

        if (error) throw error;

        // Push si es falla con prioridad urgente/emergencia (fire-and-forget)
        if (tipo_evento === 'falla' && (prioridad === 1 || prioridad === 2)) {
            const urgencia = prioridad === 1 ? '🚨 EMERGENCIA' : '⚠️ Urgente';
            enviarPushARoles(
                ['admin', 'supervisor', 'planificador'],
                `${urgencia}: Falla en ${equipo.codigo} (${equipo.nombre})`
            );
        }

        // Push si es parada
        if (tipo_evento === 'parada') {
            enviarPushARoles(
                ['admin', 'supervisor', 'planificador'],
                `⏸️ Parada registrada en ${equipo.codigo}`
            );
        }

        // Advertencias post-guardado (para próximas implementaciones)
        setTimeout(() => {
            if (tipo_evento === 'falla' && equipo.clase_criticidad === 'A') {
                alert('Evento registrado. Este equipo es CLASE A (crítico). Se recomienda generar un análisis de causa raíz (RCA).\n\nDisponible en la pestaña "Causa Raíz" del módulo (próximamente).');
            } else if (tipo_evento === 'cambio_repuesto') {
                alert('Evento registrado. Recuerde registrar los repuestos utilizados desde el módulo de Movimientos de repuestos.');
            } else {
                alert('Evento registrado correctamente.');
            }
        }, 100);

        cerrar();

        // Recargar el detalle si hay callback
        if (typeof onSuccess === 'function') {
            await onSuccess();
        }

    } catch (err) {
        console.error('Error al guardar evento:', err);
        errorEl.textContent = 'Error: ' + (err.message || 'No se pudo guardar el evento.');
        errorEl.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Registrar evento';
    }
}

// ocp Mostrar error en el formulario
function mostrarError(mensaje) {
    const errorEl = document.getElementById('ev-error');
    errorEl.textContent = mensaje;
    errorEl.classList.remove('hidden');
    const btn = document.getElementById('btn-guardar-evento');
    btn.disabled = false;
    btn.textContent = 'Registrar evento';
}
