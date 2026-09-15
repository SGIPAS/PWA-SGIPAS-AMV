// ocp Módulo Bitácora de Turno – punto de entrada
import { supabase } from '../../supabase-client.js';
import { generarBitacora } from './generar.js';

let entregaActual = null;

export async function cargarBitacora() {
    const contenedor = document.getElementById('app-content');
    if (!contenedor) return;

    const { data: { user } } = await supabase.auth.getUser();
    const rol = user?.user_metadata?.rol;
    if (!['admin', 'supervisor'].includes(rol)) {
        contenedor.innerHTML = `<div class="flex justify-center items-center h-full"><p class="text-red-500 text-xl">Acceso denegado. Solo administradores y supervisores pueden usar esta función.</p></div>`;
        return;
    }

    const ahora = new Date();
    const hora = ahora.getHours();
    let fechaInicio, fechaFin, turnoNombre;
    if (hora >= 7 && hora < 19) {
        fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 7, 0, 0).toISOString();
        fechaFin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 19, 0, 0).toISOString();
        turnoNombre = 'Diurno (07:00 - 19:00)';
    } else {
        const inicioNocturno = hora >= 19
            ? new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 19, 0, 0)
            : new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 1, 19, 0, 0);
        fechaInicio = inicioNocturno.toISOString();
        fechaFin = new Date(inicioNocturno.getTime() + 12 * 60 * 60 * 1000).toISOString();
        turnoNombre = 'Nocturno (19:00 - 07:00)';
    }

    const { data: entregaExistente } = await supabase.from('entregas_turno')
        .select('*').eq('fecha_inicio', fechaInicio).eq('fecha_fin', fechaFin).maybeSingle();

    if (entregaExistente) {
        entregaActual = entregaExistente;
        await generarBitacora(contenedor, user, fechaInicio, fechaFin, turnoNombre, entregaExistente);
    } else {
        mostrarFormularioInicial(contenedor, user, fechaInicio, fechaFin, turnoNombre);
    }
}

function mostrarFormularioInicial(contenedor, user, fechaInicio, fechaFin, turnoNombre) {
    contenedor.innerHTML = `
        <div class="max-w-md mx-auto bg-slate-800 p-6 rounded-lg shadow-xl border border-slate-700">
            <h2 class="text-xl font-bold text-white mb-4">Nueva Entrega de Turno</h2>
            <p class="text-slate-400 mb-4">Ingrese los datos del supervisor saliente.</p>
            <form id="form-inicio-bitacora" class="space-y-4">
                <div>
                    <label class="block text-slate-400 text-sm mb-1">Supervisor Saliente</label>
                    <input type="text" id="supervisor-nombre" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" value="${user.user_metadata?.nombre_completo || ''}" required>
                </div>
                <div>
                    <label class="block text-slate-400 text-sm mb-1">Grupo (A, B, C, D)</label>
                    <select id="supervisor-grupo" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" required>
                        <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                    </select>
                </div>
                <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">Generar Bitácora</button>
            </form>
        </div>
    `;

    document.getElementById('form-inicio-bitacora').addEventListener('submit', async (e) => {
        e.preventDefault();
        const supervisorNombre = document.getElementById('supervisor-nombre').value.trim();
        const grupo = document.getElementById('supervisor-grupo').value;

        const { data: nuevaEntrega, error } = await supabase.from('entregas_turno').insert({
            fecha_inicio: fechaInicio, fecha_fin: fechaFin, turno: turnoNombre,
            supervisor_saliente_id: user.id, grupo_saliente: grupo
        }).select().single();

        if (error) return alert('Error al crear la entrega: ' + error.message);
        entregaActual = nuevaEntrega;
        await generarBitacora(contenedor, user, fechaInicio, fechaFin, turnoNombre, nuevaEntrega, supervisorNombre, grupo);
    });
}