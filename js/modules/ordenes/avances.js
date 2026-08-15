// ocp Submódulo de avances y revalidaciones de OT – con notificación push
import { supabase } from '../../supabase-client.js';
import { formatearFecha } from './utils.js';
import { enviarPushARoles } from '../../push.js';   // <-- nueva importación

export async function cargarVistaAvances(otId, rol, contenedor) {
    const { data: ot } = await supabase.from('ordenes_trabajo').select('estado, requiere_pts, numero_ot').eq('id', otId).single();
    const puedeAvanzar = ['en_ejecucion', 'finalizada_ejecutor', 'aprobada_seguridad'].includes(ot?.estado) && ['admin', 'supervisor', 'ejecutor'].includes(rol);

    contenedor.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-1">
                ${puedeAvanzar ? `
                <form id="form-avance" class="bg-slate-900 p-4 rounded-lg border border-slate-700 space-y-3">
                    <h3 class="text-lg font-semibold text-white">Registrar avance</h3>
                    <div>
                        <label class="block text-slate-400 text-sm">Porcentaje de progreso</label>
                        <input type="number" id="avance-porcentaje" min="1" max="100" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">Descripción</label>
                        <textarea id="avance-desc" rows="3" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required></textarea>
                    </div>
                    ${ot.requiere_pts ? `
                    <div class="bg-yellow-900 border border-yellow-700 p-3 rounded">
                        <label class="flex items-center text-sm text-slate-200">
                            <input type="checkbox" id="chk-revalidar-pts" class="h-4 w-4 text-blue-600 bg-slate-700 border-slate-600 rounded">
                            <span class="ml-2">Revalidar PTS para este turno</span>
                        </label>
                    </div>` : ''}
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">Registrar</button>
                    <hr class="border-slate-700">
                    <button type="button" id="btn-finalizar-ejecutor" class="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 rounded">Finalizar trabajo (Ejecutor)</button>
                </form>` : '<p class="text-slate-400 italic">No se pueden registrar avances en el estado actual.</p>'}
            </div>
            <div class="lg:col-span-2">
                <h3 class="text-lg font-semibold text-white mb-4">Historial de avances</h3>
                <div id="lista-avances" class="space-y-3 max-h-[500px] overflow-y-auto">
                    <p class="text-slate-400 animate-pulse">Cargando...</p>
                </div>
            </div>
        </div>
    `;

    const cargarHistorial = async () => {
        const { data: avances } = await supabase.from('avances_ot').select('*').eq('orden_id', otId).order('created_at', { ascending: true });
        const containerHist = document.getElementById('lista-avances');
        if (!avances?.length) {
            containerHist.innerHTML = '<p class="text-slate-400 italic">Sin avances registrados.</p>';
            return;
        }
        containerHist.innerHTML = avances.map(a => `
            <div class="border-l-4 ${a.tipo === 'cierre' ? 'border-green-500' : 'border-blue-500'} bg-slate-900 p-3 rounded-r-md">
                <div class="flex justify-between text-xs text-slate-400 mb-1">
                    <span class="capitalize font-semibold text-slate-300">${a.tipo.replace(/_/g, ' ')}</span>
                    <span>${formatearFecha(a.created_at)}</span>
                </div>
                <p class="text-sm text-slate-300">${a.comentario}</p>
                ${a.porcentaje !== null ? `<span class="text-xs text-blue-300">${a.porcentaje}%</span>` : ''}
            </div>
        `).join('');
    };

    await cargarHistorial();

    if (puedeAvanzar) {
        document.getElementById('form-avance').addEventListener('submit', async (e) => {
            e.preventDefault();
            const porcentaje = document.getElementById('avance-porcentaje').value;
            const desc = document.getElementById('avance-desc').value;
            const reval = document.getElementById('chk-revalidar-pts')?.checked || false;

            const { data: { user } } = await supabase.auth.getUser();
            const avance = {
                orden_id: otId,
                usuario_id: user.id,
                tipo: reval ? 'revalidacion_pts' : 'avance',
                comentario: desc,
                porcentaje: parseInt(porcentaje)
            };
            const { error } = await supabase.from('avances_ot').insert([avance]);
            if (error) return alert('Error: ' + error.message);

            const { data: otActual } = await supabase.from('ordenes_trabajo').select('estado').eq('id', otId).single();
            if (otActual?.estado === 'aprobada_seguridad') {
                await supabase.from('ordenes_trabajo').update({
                    estado: 'en_ejecucion',
                    fecha_inicio_real: new Date().toISOString()
                }).eq('id', otId);
            }

            await cargarHistorial();
            document.getElementById('form-avance').reset();
        });

        document.getElementById('btn-finalizar-ejecutor').addEventListener('click', async () => {
            if (!confirm('¿Confirma que el trabajo ha sido completado por el ejecutor?')) return;
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('avances_ot').insert([{
                orden_id: otId,
                usuario_id: user.id,
                tipo: 'finalizacion',
                comentario: 'Ejecutor reporta trabajo finalizado.',
                porcentaje: 100
            }]);
            await supabase.from('ordenes_trabajo').update({
                estado: 'finalizada_ejecutor',
                fecha_fin_real: new Date().toISOString()
            }).eq('id', otId);

            alert('Estado actualizado a "Finalizada por ejecutor". Planta debe auditar.');

            // Notificación push (única línea añadida)
            await enviarPushARoles(['admin', 'supervisor', 'inspector_ssl'],
                `✅ Ejecutor finalizó trabajo en OT ${ot.numero_ot}`);

            const { mostrarDetalle } = await import('./detalle.js');
            mostrarDetalle(otId, rol);
        });
    }
}
