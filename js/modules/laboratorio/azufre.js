// ocp Certificación de Azufre
import { supabase } from '../../supabase-client.js';
import { puedeRegistrar, notificarLaboratorio } from './utils.js';
import { renderizarListaCertificaciones } from './lista.js';

export async function renderizarCertAzufre(contenedor, rol) {
    const puede = puedeRegistrar(rol);
    const puntosAzufre = ['TQ-4302A','TQ-4302B','TQ-4302C','TQ-4302D','HORNO-AZUFRE'];

    contenedor.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-slate-900 p-4 rounded border border-slate-700 lg:col-span-1">
                <h3 class="text-lg font-semibold text-white mb-4">Certificación de Azufre (Tanques + Horno)</h3>
                ${puede ? `
                <form id="form-cert-azufre" class="space-y-4">
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead class="text-slate-400 border-b border-slate-700">
                                <tr>
                                    <th class="py-2 px-2 text-left">Punto</th>
                                    <th class="py-2 px-2 text-right">Acidez (%)</th>
                                </tr>
                            </thead>
                            <tbody id="tabla-cert-azufre">
                                ${puntosAzufre.map(punto => `
                                <tr class="border-b border-slate-800">
                                    <td class="py-2 px-2 font-medium text-white">${punto}</td>
                                    <td class="py-2 px-2">
                                        <input type="number" step="any" name="acidez-${punto}" class="w-20 bg-slate-800 border border-slate-700 rounded p-1 text-white text-right" placeholder="0.0000">
                                    </td>
                                </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">Impurezas (general)</label>
                        <textarea id="cert-impurezas" rows="2" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"></textarea>
                    </div>
                    <p class="text-xs text-slate-400">Solo se guardarán los puntos con acidez ingresada.</p>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">Guardar Certificaciones</button>
                </form>` : '<p class="text-slate-400 italic">Solo analistas pueden registrar.</p>'}
            </div>
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Últimas Certificaciones</h3>
                <div id="lista-cert-azufre" class="space-y-2 max-h-96 overflow-y-auto">
                    <p class="text-slate-400 animate-pulse">Cargando...</p>
                </div>
            </div>
        </div>
    `;

    if (puede) {
        document.getElementById('form-cert-azufre').addEventListener('submit', async (e) => {
            e.preventDefault();
            const { data: { user } } = await supabase.auth.getUser();
            const impurezas = document.getElementById('cert-impurezas')?.value.trim() || null;
            const fechaAnalisis = new Date().toISOString().split('T')[0];

            const inserciones = [];
            for (const punto of puntosAzufre) {
                const acidez = parseFloat(document.querySelector(`[name="acidez-${punto}"]`)?.value);
                if (!isNaN(acidez)) {
                    inserciones.push({
                        tanque: punto,
                        acidez,
                        impurezas,
                        fecha_analisis: fechaAnalisis,
                        registrado_por: user.id
                    });
                }
            }

            if (inserciones.length === 0) return alert('Ingrese al menos una acidez.');

            const { error } = await supabase.from('certificaciones_azufre').insert(inserciones);
            if (error) return alert('Error al guardar: ' + error.message);

            alert('Certificaciones de azufre guardadas.');
            document.getElementById('form-cert-azufre').reset();
            await renderizarListaCertificaciones('certificaciones_azufre', 'lista-cert-azufre', ['acidez']);
            await notificarLaboratorio('Resultado de Laboratorio', `Acidez de azufre: ${inserciones.map(i => i.tanque).join(', ')}`);
        });
    }

    await renderizarListaCertificaciones('certificaciones_azufre', 'lista-cert-azufre', ['acidez']);
}
