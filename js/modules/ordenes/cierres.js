// ocp Submódulo de cierre de conformidad (Operaciones)
import { supabase } from '../../supabase-client.js';
import { notificarARoles } from '../../notificaciones.js'; // ocp para alertas

export async function cargarVistaCierres(otId, rol, contenedor) {
    const { data: ot } = await supabase.from('ordenes_trabajo').select('estado, numero_ot').eq('id', otId).single();
    const puedeCerrar = ot?.estado === 'finalizada_ejecutor' && ['admin', 'supervisor', 'operador'].includes(rol);

    contenedor.innerHTML = `
        <div class="max-w-2xl mx-auto">
            ${puedeCerrar ? `
            <form id="form-cierre" class="bg-slate-900 p-6 rounded-lg border border-slate-700 space-y-4">
                <h3 class="text-xl font-semibold text-white">Auditoría de Conformidad</h3>
                <div class="space-y-2">
                    <label class="flex items-center text-slate-300">
                        <input type="checkbox" id="chk-limpieza" class="h-4 w-4 text-green-600 bg-slate-700 border-slate-600 rounded" required>
                        <span class="ml-2">Área limpia y libre de obstrucciones</span>
                    </label>
                    <label class="flex items-center text-slate-300">
                        <input type="checkbox" id="chk-loto" class="h-4 w-4 text-green-600 bg-slate-700 border-slate-600 rounded" required>
                        <span class="ml-2">LOTO retirado</span>
                    </label>
                    <label class="flex items-center text-slate-300">
                        <input type="checkbox" id="chk-pruebas" class="h-4 w-4 text-green-600 bg-slate-700 border-slate-600 rounded" required>
                        <span class="ml-2">Pruebas funcionales satisfactorias</span>
                    </label>
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

            // Insertar avance de cierre
            await supabase.from('avances_ot').insert([{
                orden_id: otId,
                usuario_id: user.id,
                tipo: 'cierre',
                comentario: `Cierre de conformidad. Checklist OK. Obs: ${obs}`,
                metadata: { checklist: ['limpieza', 'loto', 'pruebas'] }
            }]);

            // Actualizar estado y fecha de cierre
            await supabase.from('ordenes_trabajo').update({
                estado: 'cerrada',
                fecha_cierre: new Date().toISOString(),
                observaciones_cierre: obs
            }).eq('id', otId);

            // ocp Notificar a ejecutor y ssl
            await notificarARoles(['ejecutor', 'inspector_ssl'],
                `OT ${ot.numero_ot} cerrada por Operaciones. Trabajo conforme.`);

            alert('OT cerrada exitosamente.');
            const { irATablero } = await import('./index.js');
            irATablero();
        });
    }
}