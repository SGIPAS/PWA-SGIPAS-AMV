// ocp Cierre de conformidad (Operaciones) con cierre de novedades vinculadas
import { supabase } from '../../supabase-client.js';
import { enviarPushARoles } from '../../push.js';

export async function cargarVistaCierres(otId, rol, contenedor) {
    const { data: ot } = await supabase.from('ordenes_trabajo')
        .select('estado, numero_ot, tipo_ot').eq('id', otId).single();
    const puedeCerrar = ot?.estado === 'finalizada_ejecutor' && ['admin', 'supervisor'].includes(rol);

    let novedadesVinculadas = [];
    if (ot?.tipo_ot === 'parada') {
        const { data } = await supabase.from('ot_novedades')
            .select('novedad_id, novedades(tag_equipo_area, descripcion)')
            .eq('orden_id', otId);
        novedadesVinculadas = data || [];
    }

    contenedor.innerHTML = `
        <div class="max-w-2xl mx-auto">
            ${puedeCerrar ? `
            <form id="form-cierre" class="bg-slate-900 p-6 rounded-lg border border-slate-700 space-y-4">
                <h3 class="text-xl font-semibold text-white">Auditoría de Conformidad</h3>
                ${novedadesVinculadas.length ? `
                <div class="bg-yellow-900 border border-yellow-700 rounded p-3">
                    <p class="text-yellow-200 text-sm font-semibold mb-2">Esta OT es PARADA y cerrará automáticamente:</p>
                    <ul class="text-xs text-yellow-100 list-disc list-inside">
                        ${novedadesVinculadas.map(n => `<li>${n.novedades?.tag_equipo_area}: ${n.novedades?.descripcion}</li>`).join('')}
                    </ul>
                </div>` : ''}
                <div class="space-y-2">
                    <label class="flex items-center text-slate-300"><input type="checkbox" id="chk-limpieza" class="h-4 w-4 text-green-600 bg-slate-700 border-slate-600 rounded" required><span class="ml-2">Área limpia y libre de obstrucciones</span></label>
                    <label class="flex items-center text-slate-300"><input type="checkbox" id="chk-loto" class="h-4 w-4 text-green-600 bg-slate-700 border-slate-600 rounded" required><span class="ml-2">LOTO retirado</span></label>
                    <label class="flex items-center text-slate-300"><input type="checkbox" id="chk-pruebas" class="h-4 w-4 text-green-600 bg-slate-700 border-slate-600 rounded" required><span class="ml-2">Pruebas funcionales satisfactorias</span></label>
                </div>
                <div>
                    <label class="block text-slate-400 text-sm">Observaciones finales</label>
                    <textarea id="cierre-obs" rows="3" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required></textarea>
                </div>
                <button type="submit" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded">Firmar Conformidad y Cerrar OT</button>
            </form>` : `<p class="text-slate-400 italic">La OT debe estar en estado "Finalizada por ejecutor" para poder cerrarla.</p>`}
        </div>
    `;

    if (puedeCerrar) {
        document.getElementById('form-cierre').addEventListener('submit', async (e) => {
            e.preventDefault();
            const obs = document.getElementById('cierre-obs').value;
            const { data: { user } } = await supabase.auth.getUser();
            const ahora = new Date().toISOString();

            await supabase.from('avances_ot').insert([{
                orden_id: otId, usuario_id: user.id, tipo: 'cierre',
                comentario: `Cierre de conformidad. Checklist OK. Obs: ${obs}`,
                metadata: { checklist: ['limpieza', 'loto', 'pruebas'] }
            }]);

            await supabase.from('ordenes_trabajo').update({
                estado: 'cerrada', fecha_cierre: ahora, observaciones_cierre: obs,
                conformidad: true, fecha_verificacion: ahora, recibido_por: user.id
            }).eq('id', otId);

            if (ot?.tipo_ot === 'parada' && novedadesVinculadas.length > 0) {
                await supabase.from('novedades').update({
                    estado_cierre: 'cerrada_por_parada',
                    fecha_cierre: ahora,
                    ot_cierre_id: otId
                }).in('id', novedadesVinculadas.map(n => n.novedad_id));
            }

            await enviarPushARoles(
                ['ejecutor', 'inspector_ssl', 'directivos'],
                `OT ${ot.numero_ot} cerrada por Operaciones.`
            );

            alert('OT cerrada exitosamente.' + (novedadesVinculadas.length ? ` Se cerraron ${novedadesVinculadas.length} novedades.` : ''));
            const { irATablero } = await import('./index.js');
            irATablero();
        });
    }
}
