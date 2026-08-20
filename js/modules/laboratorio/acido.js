// ocp Certificación de Ácido
import { supabase } from '../../supabase-client.js';
import { puedeRegistrar, notificarLaboratorio } from './utils.js';
import { renderizarListaCertificaciones } from './lista.js';

export async function renderizarCertAcido(contenedor, rol) {
    const puede = puedeRegistrar(rol);
    contenedor.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-slate-900 p-4 rounded border border-slate-700 lg:col-span-1">
                <h3 class="text-lg font-semibold text-white mb-4">Certificación de Ácido (Tanques + Línea)</h3>
                ${puede ? `
                <form id="form-cert-acido" class="space-y-4">
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead class="text-slate-400 border-b border-slate-700">
                                <tr>
                                    <th class="py-2 px-2 text-left">Punto</th>
                                    <th class="py-2 px-2 text-right">Concentración (%)</th>
                                    <th class="py-2 px-2 text-right">NTU</th>
                                    <th class="py-2 px-2 text-right">Fe (ppm)</th>
                                </tr>
                            </thead>
                            <tbody id="tabla-cert-acido">
                                ${['TQ-3101','TQ-3102','TQ-3103','TQ-3104','LINEA-1201'].map(punto => `
                                <tr class="border-b border-slate-800">
                                    <td class="py-2 px-2 font-medium text-white">${punto}</td>
                                    <td class="py-2 px-2">
                                        <input type="number" step="any" name="conc-${punto}" class="w-20 bg-slate-800 border border-slate-700 rounded p-1 text-white text-right" placeholder="0.00">
                                    </td>
                                    <td class="py-2 px-2">
                                        <input type="number" step="any" name="ntu-${punto}" class="w-20 bg-slate-800 border border-slate-700 rounded p-1 text-white text-right" placeholder="0.00">
                                    </td>
                                    <td class="py-2 px-2">
                                        <input type="number" step="any" name="fe-${punto}" class="w-20 bg-slate-800 border border-slate-700 rounded p-1 text-white text-right" placeholder="0.00">
                                    </td>
                                </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    <p class="text-xs text-slate-400">Solo se guardarán los puntos con concentración ingresada.</p>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">Guardar Certificaciones</button>
                </form>` : '<p class="text-slate-400 italic">Solo analistas pueden registrar.</p>'}
            </div>
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Últimas Certificaciones</h3>
                <div id="lista-cert-acido" class="space-y-2 max-h-96 overflow-y-auto">
                    <p class="text-slate-400 animate-pulse">Cargando...</p>
                </div>
            </div>
        </div>
    `;

    if (puede) {
        document.getElementById('form-cert-acido').addEventListener('submit', async (e) => {
            e.preventDefault();
            const { data: { user } } = await supabase.auth.getUser();
            const fechaAnalisis = new Date().toISOString().split('T')[0];
            const fechaVigencia = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            const puntos = ['TQ-3101','TQ-3102','TQ-3103','TQ-3104','LINEA-1201'];
            const inserciones = [];

            for (const punto of puntos) {
                const conc = parseFloat(document.querySelector(`[name="conc-${punto}"]`)?.value);
                const ntu = parseFloat(document.querySelector(`[name="ntu-${punto}"]`)?.value) || null;
                const fe = parseFloat(document.querySelector(`[name="fe-${punto}"]`)?.value) || null;
                if (!isNaN(conc)) {
                    inserciones.push({
                        tanque: punto,
                        concentracion: conc,
                        ntu,
                        ppm_fe: fe,
                        fecha_analisis: fechaAnalisis,
                        fecha_vigencia: fechaVigencia,
                        registrado_por: user.id
                    });
                }
            }

            if (inserciones.length === 0) return alert('Ingrese al menos una concentración.');

            const { error } = await supabase.from('certificaciones_acido').insert(inserciones);
            if (error) return alert('Error al guardar: ' + error.message);

            alert('Certificaciones guardadas correctamente.');
            document.getElementById('form-cert-acido').reset();
            renderizarListaCertificaciones('certificaciones_acido', 'lista-cert-acido', ['concentracion','ntu','ppm_fe']);
            await notificarLaboratorio('Resultado de Laboratorio', `Certificación de ácido: ${inserciones.map(i => i.tanque).join(', ')}`);
        });
    }

    await renderizarListaCertificaciones('certificaciones_acido', 'lista-cert-acido', ['concentracion','ntu','ppm_fe']);
}
