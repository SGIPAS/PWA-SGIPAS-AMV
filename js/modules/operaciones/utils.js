// ocp Utilidades compartidas del módulo Operaciones
import { supabase, obtenerRolVerificado } from '../../supabase-client.js';

// ocp Obtiene el rol verificado desde perfiles
export async function obtenerRolUsuario() {
    return (await obtenerRolVerificado()) || 'operador';
}

// ocp Devuelve un mapa { usuario_id: nombre_completo } para los IDs presentes en items
export async function mapearNombresUsuarios(items, campo = 'registrado_por') {
    const ids = [...new Set((items || []).map(i => i[campo]).filter(Boolean))];
    if (ids.length === 0) return {};

    const { data, error } = await supabase
        .from('perfiles')
        .select('id, nombre_completo')
        .in('id', ids);

    if (error) {
        console.warn('Error cargando nombres:', error.message);
        return {};
    }

    const mapa = {};
    (data || []).forEach(p => { mapa[p.id] = p.nombre_completo || 'Sin nombre'; });
    return mapa;
}

// ocp Formatear fecha con hora en formato Venezuela
export function formatearFechaHora(fecha) {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleString('es-VE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// ocp Abrir modal de anulación (reusable en todos los módulos)
// tabla: nombre de la tabla en Supabase ('analisis_acido', 'ph_aguas', etc.)
// registroId: id del registro a anular
// onSuccess: callback al anular correctamente
export function abrirModalAnulacion(tabla, registroId, onSuccess) {
    let modal = document.getElementById('modal-anulacion');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-anulacion';
        modal.className = 'hidden fixed inset-0 bg-black/70 flex items-center justify-center z-[80] backdrop-blur-sm';
        document.body.appendChild(modal);
    }
    modal.classList.remove('hidden');

    modal.innerHTML = `
        <div class="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 w-full max-w-md p-6">
            <div class="flex justify-between items-start mb-4 border-b border-slate-700 pb-3">
                <div>
                    <h2 class="text-xl font-bold text-red-400">Anular Registro</h2>
                    <p class="text-slate-400 text-sm mt-1">Esta acción quedará registrada con su usuario y fecha.</p>
                </div>
                <button id="btn-cerrar-anulacion" class="text-slate-400 hover:text-white text-2xl font-bold leading-none">✕</button>
            </div>

            <div class="bg-red-900/30 border border-red-700 rounded p-3 text-xs text-red-200 mb-4">
                <strong>Importante:</strong> el registro no se borra de la base de datos.
                Queda marcado como anulado, con el motivo y su identidad como responsable del cambio.
            </div>

            <form id="form-anulacion" class="space-y-4">
                <div>
                    <label class="block text-slate-300 text-sm mb-1">Motivo de la anulación *</label>
                    <textarea id="anul-motivo" rows="3" minlength="10" required
                        placeholder="Ej: Valor registrado por error, lectura incorrecta del instrumento, duplicado, etc."
                        class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"></textarea>
                    <p class="text-xs text-slate-500 mt-1">Mínimo 10 caracteres. Sea específico para auditorías futuras.</p>
                </div>

                <p id="anul-error" class="text-red-400 text-sm hidden"></p>

                <div class="flex justify-end gap-3 pt-4 border-t border-slate-700">
                    <button type="button" id="btn-cancelar-anulacion"
                        class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded">Cancelar</button>
                    <button type="submit" id="btn-confirmar-anulacion"
                        class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold">
                        Confirmar Anulación
                    </button>
                </div>
            </form>
        </div>
    `;

    const cerrar = () => {
        modal.classList.add('hidden');
        modal.innerHTML = '';
    };

    document.getElementById('btn-cerrar-anulacion').addEventListener('click', cerrar);
    document.getElementById('btn-cancelar-anulacion').addEventListener('click', cerrar);

    document.getElementById('form-anulacion').addEventListener('submit', async (e) => {
        e.preventDefault();
        await confirmarAnulacion(tabla, registroId, cerrar, onSuccess);
    });
}

async function confirmarAnulacion(tabla, registroId, cerrar, onSuccess) {
    const btn = document.getElementById('btn-confirmar-anulacion');
    const errorEl = document.getElementById('anul-error');
    const motivo = document.getElementById('anul-motivo').value.trim();

    if (motivo.length < 10) {
        errorEl.textContent = 'El motivo debe tener al menos 10 caracteres.';
        errorEl.classList.remove('hidden');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Anulando...';
    errorEl.classList.add('hidden');

    try {
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase
            .from(tabla)
            .update({
                anulado: true,
                motivo_anulacion: motivo,
                anulado_por: user.id,
                anulado_en: new Date().toISOString()
            })
            .eq('id', registroId);

        if (error) throw error;

        cerrar();

        if (typeof onSuccess === 'function') {
            await onSuccess();
        }

    } catch (err) {
        console.error('Error al anular:', err);
        errorEl.textContent = 'Error: ' + (err.message || 'No se pudo anular el registro.');
        errorEl.classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = 'Confirmar Anulación';
    }
}
