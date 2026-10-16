// ocp Modal para apertura de turno (solo supervisores/admin)
import { supabase } from '../../supabase-client.js';
import { refrescarEstadoTurno } from './banner.js';

// ocp Abrir el modal
export async function abrirModalApertura() {
    let modal = document.getElementById('modal-apertura-turno');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-apertura-turno';
        modal.className = 'hidden fixed inset-0 bg-black/70 flex items-center justify-center z-[70] backdrop-blur-sm';
        document.body.appendChild(modal);
    }
    modal.classList.remove('hidden');

    // Consultar qué grupos ya están abiertos
    const { data: abiertos } = await supabase.rpc('listar_turnos_abiertos');
    const gruposOcupados = (abiertos || []).map(t => t.grupo);

    // Detectar tipo de turno según la hora
    const ahora = new Date();
    const hora = ahora.getHours();
    const tipoSugerido = (hora >= 7 && hora < 19) ? 'diurno' : 'nocturno';

    const opcionesGrupo = ['A', 'B', 'C', 'D'].map(g => {
        const ocupado = gruposOcupados.includes(g);
        return `<option value="${g}" ${ocupado ? 'disabled' : ''}>
            Grupo ${g}${ocupado ? ' — (ya abierto)' : ''}
        </option>`;
    }).join('');

    modal.innerHTML = `
        <div class="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 w-full max-w-md p-6">
            <div class="flex justify-between items-start mb-4 border-b border-slate-700 pb-3">
                <div>
                    <h2 class="text-xl font-bold text-white">Abrir Turno</h2>
                    <p class="text-slate-400 text-sm mt-1">Inicie un turno operativo de 12 horas.</p>
                </div>
                <button id="btn-cerrar-apertura" class="text-slate-400 hover:text-white text-2xl font-bold leading-none">✕</button>
            </div>

            ${gruposOcupados.length > 0 ? `
            <div class="bg-blue-900/30 border border-blue-700 rounded p-3 text-xs text-blue-200 mb-4">
                <strong>Grupos ocupados:</strong> ${gruposOcupados.join(', ')}.
                Si necesita estar en uno de ellos, use la opción <em>"Unirse a turno"</em> del banner.
            </div>` : ''}

            <form id="form-apertura-turno" class="space-y-4">
                <div>
                    <label class="block text-slate-400 text-sm mb-1">Grupo de turno *</label>
                    <select id="ap-grupo" required class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                        <option value="">— Seleccionar —</option>
                        ${opcionesGrupo}
                    </select>
                </div>

                <div>
                    <label class="block text-slate-400 text-sm mb-1">Tipo de turno *</label>
                    <select id="ap-tipo" required class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                        <option value="diurno" ${tipoSugerido === 'diurno' ? 'selected' : ''}>Diurno (07:00 - 19:00)</option>
                        <option value="nocturno" ${tipoSugerido === 'nocturno' ? 'selected' : ''}>Nocturno (19:00 - 07:00)</option>
                    </select>
                </div>

                <div>
                    <label class="block text-slate-400 text-sm mb-1">Observaciones de apertura</label>
                    <textarea id="ap-observaciones" rows="3"
                        placeholder="Estado inicial de planta, condiciones especiales, etc."
                        class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"></textarea>
                </div>

                <p id="ap-error" class="text-red-400 text-sm hidden"></p>

                <div class="flex justify-end gap-3 pt-4 border-t border-slate-700">
                    <button type="button" id="btn-cancelar-apertura"
                        class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded">Cancelar</button>
                    <button type="submit" id="btn-confirmar-apertura"
                        class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-bold">
                        Abrir Turno
                    </button>
                </div>
            </form>
        </div>
    `;

    const cerrar = () => {
        modal.classList.add('hidden');
        modal.innerHTML = '';
    };

    document.getElementById('btn-cerrar-apertura').addEventListener('click', cerrar);
    document.getElementById('btn-cancelar-apertura').addEventListener('click', cerrar);

    document.getElementById('form-apertura-turno').addEventListener('submit', async (e) => {
        e.preventDefault();
        await confirmarApertura(cerrar);
    });
}

async function confirmarApertura(cerrar) {
    const btn = document.getElementById('btn-confirmar-apertura');
    const errorEl = document.getElementById('ap-error');
    btn.disabled = true;
    btn.textContent = 'Abriendo...';
    errorEl.classList.add('hidden');

    const grupo = document.getElementById('ap-grupo').value;
    const tipo_turno = document.getElementById('ap-tipo').value;
    const observaciones = document.getElementById('ap-observaciones').value.trim() || null;

    if (!grupo) {
        errorEl.textContent = 'Debe seleccionar un grupo.';
        errorEl.classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = 'Abrir Turno';
        return;
    }

    try {
        const { data: turno, error: turnoError } = await supabase.rpc('abrir_turno', {
            p_grupo: grupo,
            p_tipo_turno: tipo_turno,
            p_observaciones: observaciones
        });

        if (turnoError) throw turnoError;

        const { data: { user } } = await supabase.auth.getUser();
        const { error: perfilError } = await supabase
            .from('perfiles')
            .update({ turno_operativo_id: turno.turno_id })
            .eq('id', user.id);

        if (perfilError) {
            console.warn('Turno creado pero no se asoció al usuario:', perfilError.message);
        }

        cerrar();

        const { obtenerRolVerificado } = await import('../../supabase-client.js');
        const rol = await obtenerRolVerificado();
        await refrescarEstadoTurno(rol);

    } catch (err) {
        console.error('Error al abrir turno:', err);
        errorEl.textContent = err.message || 'No se pudo abrir el turno.';
        errorEl.classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = 'Abrir Turno';
    }
}
