// ocp Formulario de creación de nueva OT
import { supabase } from '../../supabase-client.js';
import { irATablero } from './index.js';
import { notificarARoles } from '../../notificaciones.js';   // ocp importar notificaciones

export async function renderizarCrear(rol) {
    const contenedor = document.getElementById('app-content');
    const { data: equipos } = await supabase.from('equipos').select('id, codigo, nombre').order('codigo');

    contenedor.innerHTML = `
        <div class="max-w-2xl mx-auto">
            <h1 class="text-2xl font-bold text-white mb-6">Nueva Orden de Trabajo</h1>
            <form id="form-nueva-ot" class="bg-slate-800 p-6 rounded-lg shadow-xl border border-slate-700 space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Equipo</label>
                        <select id="ot-equipo" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" required>
                            <option value="">Seleccione...</option>
                            ${equipos?.map(e => `<option value="${e.id}">${e.codigo} - ${e.nombre}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Tipo</label>
                        <select id="ot-tipo" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" required>
                            <option value="correctiva">Correctiva</option>
                            <option value="preventiva">Preventiva</option>
                            <option value="predictiva">Predictiva</option>
                            <option value="emergencia">Emergencia</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-slate-400 text-sm mb-1">Título</label>
                    <input type="text" id="ot-titulo" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" required>
                </div>
                <div>
                    <label class="block text-slate-400 text-sm mb-1">Descripción</label>
                    <textarea id="ot-desc" rows="3" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" required></textarea>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Prioridad</label>
                        <select id="ot-prioridad" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                            <option value="media">Media</option>
                            <option value="baja">Baja</option>
                            <option value="alta">Alta</option>
                            <option value="critica">Crítica</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Fecha inicio prevista</label>
                        <input type="datetime-local" id="ot-inicio-prev" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                    </div>
                </div>
                <div class="flex items-center space-x-6">
                    <label class="flex items-center text-slate-300">
                        <input type="checkbox" id="ot-req-pts" class="h-4 w-4 text-blue-600 bg-slate-700 border-slate-600 rounded">
                        <span class="ml-2">Requiere PTS</span>
                    </label>
                    <label class="flex items-center text-slate-300">
                        <input type="checkbox" id="ot-req-loto" class="h-4 w-4 text-blue-600 bg-slate-700 border-slate-600 rounded">
                        <span class="ml-2">Aplica LOTO</span>
                    </label>
                </div>
                <div class="flex justify-end space-x-3 pt-4 border-t border-slate-700">
                    <button type="button" id="btn-cancelar-crear" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded">Cancelar</button>
                    <button type="submit" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold">Crear OT</button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('btn-cancelar-crear').addEventListener('click', irATablero);
    document.getElementById('form-nueva-ot').addEventListener('submit', async (e) => {
        e.preventDefault();
        await crearOT();
    });
}

// ocp Lógica para insertar la OT en Supabase
async function crearOT() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert('Sin sesión');

    const equipo_id = document.getElementById('ot-equipo').value;
    const titulo = document.getElementById('ot-titulo').value.trim();
    const desc = document.getElementById('ot-desc').value.trim();
    const tipo = document.getElementById('ot-tipo').value;
    const prioridad = document.getElementById('ot-prioridad').value;
    const inicio = document.getElementById('ot-inicio-prev').value;
    const reqPTS = document.getElementById('ot-req-pts').checked;
    const reqLOTO = document.getElementById('ot-req-loto').checked;

    // Generar número de OT
    const { data: last } = await supabase.from('ordenes_trabajo').select('numero_ot').order('created_at', { ascending: false }).limit(1);
    let nextNum = 1;
    if (last && last.length > 0) {
        const lastNum = parseInt(last[0].numero_ot.split('-')[1]);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    const numero_ot = `OTA-${String(nextNum).padStart(3, '0')}`;

    const payload = {
        numero_ot,
        titulo,
        descripcion: desc,
        tipo,
        prioridad,
        estado: 'pendiente',
        equipo_id: equipo_id || null,
        solicitante_id: user.id,
        creado_por: user.id,
        requiere_pts: reqPTS,
        aplica_loto: reqLOTO,
        fecha_inicio_prevista: inicio ? new Date(inicio).toISOString() : null,
        fecha_solicitud: new Date().toISOString()
    };

    const { error } = await supabase.from('ordenes_trabajo').insert([payload]);
    if (error) {
        alert('Error al crear OT: ' + error.message);
        return;
    }

    alert('OT creada exitosamente: ' + numero_ot);
    // ocp Notificar a inspectores y ejecutores de la nueva OT
    await notificarARoles(['inspector_ssl', 'ejecutor'],
        `Nueva OT ${numero_ot} creada manualmente: ${titulo}.`);

    irATablero();
}