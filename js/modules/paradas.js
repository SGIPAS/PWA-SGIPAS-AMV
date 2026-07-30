// ocp Módulo de Paradas de Planta – registro de horas de producción y paro (v2 robusta)
import { supabase } from '../supabase-client.js';

export async function cargarParadas() {
    console.log('Módulo Paradas de Planta cargado');  // <- para ver en F12

    const contenedor = document.getElementById('app-content');
    if (!contenedor) {
        console.error('No se encontró #app-content');
        return;
    }

    // Verificar rol
    const { data: { user } } = await supabase.auth.getUser();
    const rol = user?.user_metadata?.rol;
    if (!['admin', 'supervisor'].includes(rol)) {
        contenedor.innerHTML = `<p class="text-red-500 text-center mt-10">Acceso denegado.</p>`;
        return;
    }

    contenedor.innerHTML = `
        <div class="mb-6 flex justify-between items-center">
            <div>
                <h1 class="text-3xl font-bold text-slate-100">Paradas de Planta</h1>
                <p class="text-slate-400 mt-1">Registro de horas de producción y paro.</p>
            </div>
            <button id="btn-nueva-parada" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">+ Registrar Parada</button>
        </div>

        <div class="bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden">
            <div id="tabla-paradas-container" class="overflow-x-auto p-4">
                <p class="text-slate-400 animate-pulse">Cargando historial...</p>
            </div>
        </div>

        <!-- Modal para nueva parada -->
        <div id="modal-parada" class="hidden fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
            <div class="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 w-full max-w-md p-6">
                <h2 class="text-xl font-bold text-white mb-4">Nueva Parada</h2>
                <form id="form-parada" class="space-y-4">
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Motivo</label>
                        <select id="parada-motivo" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" required>
                            <option value="">Seleccione...</option>
                            <option value="Mantenimiento Programado">Mantenimiento Programado</option>
                            <option value="Falla de Equipo">Falla de Equipo</option>
                            <option value="Falta de Materia Prima">Falta de Materia Prima</option>
                            <option value="falla electrica">falla electrica (pestañeo)</option>
                            <option value="Otro">Otro</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Observaciones</label>
                        <textarea id="parada-obs" rows="2" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"></textarea>
                    </div>
                    <div class="flex justify-end space-x-3 pt-4 border-t border-slate-700">
                        <button type="button" id="btn-cerrar-modal" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded">Cancelar</button>
                        <button type="submit" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold">Iniciar Parada</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Verificar que los elementos del modal existen antes de asignar eventos
    const btnNueva = document.getElementById('btn-nueva-parada');
    const btnCerrar = document.getElementById('btn-cerrar-modal');
    const modal = document.getElementById('modal-parada');
    const form = document.getElementById('form-parada');

    if (btnNueva && modal) {
        btnNueva.addEventListener('click', () => modal.classList.remove('hidden'));
    } else {
        console.error('Falta btn-nueva-parada o modal');
    }

    if (btnCerrar && modal) {
        btnCerrar.addEventListener('click', () => modal.classList.add('hidden'));
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const motivo = document.getElementById('parada-motivo')?.value;
            const obs = document.getElementById('parada-obs')?.value?.trim() || '';
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase.from('paradas_planta').insert([{
                motivo,
                observaciones: obs,
                registrado_por: user.id
            }]);

            if (error) {
                console.error('Error al insertar parada:', error);
                alert('Error al registrar: ' + error.message);
                return;
            }
            alert('Parada registrada. Recuerde finalizarla cuando termine.');
            modal.classList.add('hidden');
            form.reset();
            cargarListaParadas();
        });
    }

    await cargarListaParadas();
}

async function cargarListaParadas() {
    const container = document.getElementById('tabla-paradas-container');
    if (!container) return;

    const { data, error } = await supabase
        .from('paradas_planta')
        .select('*')
        .order('fecha_inicio', { ascending: false })
        .limit(20);

    if (error) {
        container.innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`;
        return;
    }
    if (!data || !data.length) {
        container.innerHTML = '<p class="text-slate-400 text-center py-4">No hay paradas registradas.</p>';
        return;
    }

    let html = `
        <table class="w-full text-left border-collapse text-sm">
            <thead class="bg-slate-900 text-slate-400 uppercase">
                <tr>
                    <th class="p-3">Inicio</th>
                    <th class="p-3">Fin</th>
                    <th class="p-3">Duración</th>
                    <th class="p-3">Motivo</th>
                    <th class="p-3">Acción</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-700 text-slate-300">
    `;

    data.forEach(p => {
        const inicio = new Date(p.fecha_inicio).toLocaleString();
        const fin = p.fecha_fin ? new Date(p.fecha_fin).toLocaleString() : 'En curso';
        const duracion = p.fecha_fin
            ? Math.round((new Date(p.fecha_fin) - new Date(p.fecha_inicio)) / 3600000 * 10) / 10 + ' h'
            : '--';
        html += `
            <tr class="hover:bg-slate-700/50">
                <td class="p-3">${inicio}</td>
                <td class="p-3">${fin}</td>
                <td class="p-3">${duracion}</td>
                <td class="p-3">${p.motivo}</td>
                <td class="p-3">
                    ${!p.fecha_fin ? `<button class="btn-finalizar text-green-400 hover:underline text-xs" data-id="${p.id}">✅ Finalizar</button>` : ''}
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;

    // Eventos para finalizar parada
    document.querySelectorAll('.btn-finalizar').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            if (!confirm('¿Finalizar esta parada ahora?')) return;
            const { error } = await supabase.from('paradas_planta').update({
                fecha_fin: new Date().toISOString()
            }).eq('id', id);
            if (error) {
                alert('Error al finalizar: ' + error.message);
                return;
            }
            cargarListaParadas();
        });
    });
}
