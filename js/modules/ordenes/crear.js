// ocp Formulario de creación de nueva OT (con correlativo, multi-depto, vínculo novedades)
import { supabase } from '../../supabase-client.js';
import { irATablero } from './index.js';
import { obtenerCorrelativo } from '../utils.js';
import { enviarPushARoles } from '../../push.js';

const DEPARTAMENTOS = ['mecanico', 'electrico', 'instrumentacion', 'fabricacion', 'servicios generales'];

export async function renderizarCrear(rol) {
    const contenedor = document.getElementById('app-content');
    const { data: equipos } = await supabase.from('equipos').select('id, codigo, nombre').order('codigo');
    const { data: novedadesPendientes } = await supabase.from('novedades')
        .select('id, tag_equipo_area, descripcion, fecha_novedad')
        .eq('anulado', false)
        .eq('estado_cierre', 'pendiente')
        .order('fecha_novedad', { ascending: false });

    contenedor.innerHTML = `
        <div class="max-w-3xl mx-auto">
            <h1 class="text-2xl font-bold text-white mb-6">Nueva Orden de Trabajo</h1>
            <form id="form-nueva-ot" class="bg-slate-800 p-6 rounded-lg shadow-xl border border-slate-700 space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Equipo (catálogo)</label>
                        <select id="ot-equipo" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                            <option value="">-- o ingrese texto libre abajo --</option>
                            ${equipos?.map(e => `<option value="${e.id}">${e.codigo} - ${e.nombre}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Código equipo (texto libre)</label>
                        <input type="text" id="ot-codigo-libre" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" placeholder="Ej: TQ-3101">
                    </div>
                </div>
                <div>
                    <label class="block text-slate-400 text-sm mb-1">Equipo (texto libre)</label>
                    <input type="text" id="ot-equipo-libre" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Tipo</label>
                        <select id="ot-tipo" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" required>
                            <option value="correctiva">Correctiva</option>
                            <option value="preventiva">Preventiva</option>
                            <option value="predictiva">Predictiva</option>
                            <option value="emergencia">Emergencia</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Prioridad</label>
                        <select id="ot-prioridad" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                            <option value="programado">Programado</option>
                            <option value="urgente">Urgente</option>
                            <option value="otro">Otro</option>
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
                        <label class="block text-slate-400 text-sm mb-1">Origen</label>
                        <input type="text" id="ot-origen" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" placeholder="Ej: Inspección operador">
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Fecha inicio prevista</label>
                        <input type="datetime-local" id="ot-inicio-prev" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                    </div>
                </div>
                <div>
                    <label class="block text-slate-400 text-sm mb-2">Departamentos ejecutores</label>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                        ${DEPARTAMENTOS.map(d => `
                            <label class="flex items-center text-slate-300 text-sm">
                                <input type="checkbox" class="ot-depto h-4 w-4 text-blue-600 bg-slate-700 border-slate-600 rounded" value="${d}">
                                <span class="ml-2 capitalize">${d}</span>
                            </label>`).join('')}
                    </div>
                </div>
                <div class="flex items-center space-x-6 flex-wrap gap-2">
                    <label class="flex items-center text-slate-300">
                        <input type="checkbox" id="ot-req-pts" class="h-4 w-4 text-blue-600 bg-slate-700 border-slate-600 rounded" checked>
                        <span class="ml-2">Requiere PTS</span>
                    </label>
                    <label class="flex items-center text-slate-300">
                        <input type="checkbox" id="ot-req-loto" class="h-4 w-4 text-blue-600 bg-slate-700 border-slate-600 rounded">
                        <span class="ml-2">Aplica LOTO</span>
                    </label>
                    <label class="flex items-center text-slate-300">
                        <input type="checkbox" id="ot-es-parada" class="h-4 w-4 text-red-600 bg-slate-700 border-slate-600 rounded">
                        <span class="ml-2">Es parada de planta</span>
                    </label>
                </div>
                <div id="bloque-novedades" class="bg-slate-900 p-3 rounded border border-slate-700">
                    <p id="titulo-novedades" class="text-sm font-semibold text-slate-300 mb-2">Novedades pendientes a vincular (opcional)</p>
                    <div class="max-h-60 overflow-y-auto space-y-1">
                        ${(novedadesPendientes || []).map(n => `
                            <label class="flex items-start text-slate-300 text-xs">
                                <input type="checkbox" class="nov-vincular h-4 w-4 mt-0.5 text-blue-600 bg-slate-700 border-slate-600 rounded" value="${n.id}">
                                <span class="ml-2">${n.tag_equipo_area}: ${n.descripcion}</span>
                            </label>`).join('') || '<p class="text-slate-500 text-xs">Sin novedades pendientes.</p>'}
                    </div>
                </div>
                <div class="flex justify-end space-x-3 pt-4 border-t border-slate-700">
                    <button type="button" id="btn-cancelar-crear" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded">Cancelar</button>
                    <button type="submit" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold">Crear OT</button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('ot-es-parada').addEventListener('change', (e) => {
        const titulo = document.getElementById('titulo-novedades');
        titulo.textContent = e.target.checked
            ? 'Novedades pendientes a vincular (se cerrarán al cerrar la OT de parada)'
            : 'Novedades pendientes a vincular (opcional)';
    });

    document.getElementById('btn-cancelar-crear').addEventListener('click', irATablero);
    document.getElementById('form-nueva-ot').addEventListener('submit', async (e) => {
        e.preventDefault();
        await crearOT();
    });
}

async function crearOT() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert('Sin sesión');

    const equipo_id = document.getElementById('ot-equipo').value;
    const codigo_libre = document.getElementById('ot-codigo-libre').value.trim();
    const equipo_libre = document.getElementById('ot-equipo-libre').value.trim();
    const titulo = document.getElementById('ot-titulo').value.trim();
    const desc = document.getElementById('ot-desc').value.trim();
    const tipo = document.getElementById('ot-tipo').value;
    const prioridad = document.getElementById('ot-prioridad').value;
    const origen = document.getElementById('ot-origen').value.trim();
    const inicio = document.getElementById('ot-inicio-prev').value;
    const reqPTS = document.getElementById('ot-req-pts').checked;
    const reqLOTO = document.getElementById('ot-req-loto').checked;
    const esParada = document.getElementById('ot-es-parada').checked;
    const departamentos = Array.from(document.querySelectorAll('.ot-depto:checked')).map(c => c.value);
    const novedadesVinculadas = Array.from(document.querySelectorAll('.nov-vincular:checked')).map(c => c.value);

    const numero_ot = await obtenerCorrelativo(
        esParada ? 'OT_PARADA' : 'OT',
        esParada ? 'OT-PA-P' : 'OT-PA'
    );

    const payload = {
        numero_ot, titulo, descripcion: desc, tipo,
        tipo_ot: esParada ? 'parada' : 'programada',
        prioridad, estado: 'pendiente',
        equipo_id: equipo_id || null,
        codigo_equipo: codigo_libre || null,
        equipo: equipo_libre || null,
        solicitante_id: user.id, creado_por: user.id,
        requiere_pts: reqPTS, aplica_loto: reqLOTO, origen,
        fecha_inicio_prevista: inicio ? new Date(inicio).toISOString() : null,
        fecha_solicitud: new Date().toISOString()
    };

    const { data: otInsertada, error } = await supabase.from('ordenes_trabajo').insert([payload]).select().single();
    if (error) return alert('Error al crear OT: ' + error.message);

    if (departamentos.length > 0) {
        await supabase.from('ordenes_trabajo_departamentos').insert(
            departamentos.map(d => ({ orden_id: otInsertada.id, departamento: d }))
        );
    }
    if (novedadesVinculadas.length > 0) {
        await supabase.from('ot_novedades').insert(
            novedadesVinculadas.map(nid => ({ orden_id: otInsertada.id, novedad_id: nid, vinculado_por: user.id }))
        );
    }

    alert('OT creada exitosamente: ' + numero_ot);
    await enviarPushARoles(
        ['inspector_ssl', 'ejecutor', 'supervisor'],
        `Nueva OT ${numero_ot} creada${esParada ? ' (PARADA)' : ''}: ${titulo}`
    );
    irATablero();
}
