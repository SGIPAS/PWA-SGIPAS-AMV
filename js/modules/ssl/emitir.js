// ocp Formulario para emitir un nuevo PTS/ART – con notificaciones push
//import { supabase } from '../../supabase-client.js';
import { enviarPushARoles } from '../../push.js';

export async function renderizarEmitirPTS(contenedor, rol) {
    const puedeEmitir = ['admin', 'inspector_ssl'].includes(rol);

    contenedor.innerHTML = `
        <div class="max-w-3xl mx-auto">
            ${puedeEmitir ? `
            <div class="bg-slate-900 p-6 rounded-lg border border-slate-700">
                <h3 class="text-xl font-semibold text-white mb-4">Nuevo Permiso de Trabajo Seguro</h3>
                <form id="form-pts" class="space-y-6">
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Orden de Trabajo (pendiente, requiere PTS)</label>
                        <select id="pts-orden" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
                            <option value="">Seleccione una OT...</option>
                        </select>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-slate-400 text-sm mb-1">Hora Inicio</label>
                            <input type="time" id="pts-hora-inicio" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
                        </div>
                        <div>
                            <label class="block text-slate-400 text-sm mb-1">Hora Fin</label>
                            <input type="time" id="pts-hora-fin" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
                        </div>
                    </div>

                    <div class="bg-slate-800 p-4 rounded border border-slate-700">
                        <p class="text-sm font-semibold text-slate-300 mb-3">Matriz de Riesgos (A.R.T.)</p>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <label class="flex items-center text-sm text-slate-300">
                                <input type="checkbox" id="art-loto" class="h-4 w-4 text-red-600 bg-slate-700 border-slate-600 rounded mr-2"> Aislamiento Eléctrico (LOTO)
                            </label>
                            <label class="flex items-center text-sm text-slate-300">
                                <input type="checkbox" id="art-valvulas" class="h-4 w-4 text-red-600 bg-slate-700 border-slate-600 rounded mr-2"> Bloqueo de Válvulas
                            </label>
                            <label class="flex items-center text-sm text-slate-300">
                                <input type="checkbox" id="art-gases" class="h-4 w-4 text-red-600 bg-slate-700 border-slate-600 rounded mr-2"> Prueba de Gases
                            </label>
                            <label class="flex items-center text-sm text-slate-300">
                                <input type="checkbox" id="art-quimicos" class="h-4 w-4 text-red-600 bg-slate-700 border-slate-600 rounded mr-2"> Exposición Químicos
                            </label>
                            <label class="flex items-center text-sm text-slate-300">
                                <input type="checkbox" id="art-caliente" class="h-4 w-4 text-red-600 bg-slate-700 border-slate-600 rounded mr-2"> Trabajo en Caliente
                            </label>
                            <label class="flex items-center text-sm text-slate-300">
                                <input type="checkbox" id="art-bypass" class="h-4 w-4 text-red-600 bg-slate-700 border-slate-600 rounded mr-2"> Bypass en Sistema de Control
                            </label>
                        </div>
                    </div>

                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Observaciones</label>
                        <textarea id="pts-obs" rows="2" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"></textarea>
                    </div>

                    <button type="submit" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded transition shadow-lg">Firmar y Emitir PTS</button>
                </form>
            </div>
            ` : `
            <div class="bg-yellow-900 border border-yellow-700 p-6 rounded-lg text-center">
                <p class="text-yellow-200 text-lg font-semibold">Acceso restringido</p>
                <p class="text-yellow-300 mt-2">Solo personal autorizado (Inspector SSL o Administrador) puede emitir PTS.</p>
            </div>
            `}
        </div>
    `;

    if (!puedeEmitir) return;

    const { data: ots } = await supabase
        .from('ordenes_trabajo')
        .select('id, numero_ot, titulo')
        .eq('estado', 'pendiente')
        .eq('requiere_pts', true);

    const select = document.getElementById('pts-orden');
    if (ots && ots.length > 0) {
        select.innerHTML = '<option value="">Seleccione una OT...</option>' +
            ots.map(ot => `<option value="${ot.id}">${ot.numero_ot} – ${ot.titulo}</option>`).join('');
    } else {
        select.innerHTML = '<option value="">No hay OTs pendientes que requieran PTS</option>';
    }

    document.getElementById('form-pts').addEventListener('submit', async (e) => {
        e.preventDefault();
        const orden_id = select.value;
        if (!orden_id) return alert('Seleccione una OT.');

        const payload = {
            orden_id,
            autorizado_por: (await supabase.auth.getUser()).data.user.id,
            hora_inicio: document.getElementById('pts-hora-inicio').value,
            hora_fin: document.getElementById('pts-hora-fin').value,
            check_loto: document.getElementById('art-loto').checked,
            check_valvulas: document.getElementById('art-valvulas').checked,
            check_gases: document.getElementById('art-gases').checked,
            check_quimicos: document.getElementById('art-quimicos').checked,
            check_caliente: document.getElementById('art-caliente').checked,
            check_bypass_control: document.getElementById('art-bypass').checked,
            observaciones: document.getElementById('pts-obs').value.trim()
        };

        const { error: insError } = await supabase.from('permisos_ssl').insert([payload]);
        if (insError) return alert('Error al guardar PTS: ' + insError.message);

        const { error: updError } = await supabase
            .from('ordenes_trabajo')
            .update({ estado: 'aprobada_seguridad', fecha_aprobacion_seguridad: new Date().toISOString() })
            .eq('id', orden_id);
        if (updError) return alert('Error al actualizar OT: ' + updError.message);

        const { data: otData } = await supabase.from('ordenes_trabajo').select('numero_ot').eq('id', orden_id).single();
        const numOT = otData?.numero_ot || '';

        alert('PTS emitido correctamente. La OT ahora está aprobada para ejecución.');
        //await enviarPushARoles(['ejecutor', 'admin', 'supervisor'],
            `⚠️ PTS emitido para OT ${numOT}`);
        document.getElementById('form-pts').reset();
        location.reload();
    });
}
