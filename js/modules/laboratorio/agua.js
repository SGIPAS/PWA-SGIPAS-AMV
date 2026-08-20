// ocp Certificación de Agua Industrial
import { supabase } from '../../supabase-client.js';
import { puedeRegistrar, notificarLaboratorio } from './utils.js';
import { renderizarListaCertificaciones } from './lista.js';

export async function renderizarCertAgua(contenedor, rol) {
    const puede = puedeRegistrar(rol);
    const puntosAgua = ['ENTRADA-AMV', 'TANQUE-ELEVADO', 'CALDERA-ACIDO-CA-1201', 'CONDENSADO-TRAMPA', 'TORRE-ENFRIAMIENTO'];
    const esCaldera = punto => punto.includes('CALDERA');

    contenedor.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-slate-900 p-4 rounded border border-slate-700 lg:col-span-1">
                <h3 class="text-lg font-semibold text-white mb-4">Certificación de Agua Industrial</h3>
                ${puede ? `
                <form id="form-cert-agua" class="space-y-4">
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead class="text-slate-400 border-b border-slate-700">
                                <tr>
                                    <th class="py-2 px-2 text-left">Punto</th>
                                    <th class="py-2 px-2 text-right">pH</th>
                                    <th class="py-2 px-2 text-right">Conductividad (µS/cm)</th>
                                    <th class="py-2 px-2 text-right">Dureza Total (vol)</th>
                                    <th class="py-2 px-2 text-right">Dureza Total (ppm)</th>
                                    <th class="py-2 px-2 text-right">Cloruros</th>
                                    <th class="py-2 px-2 text-right">Alc. Metílica (vol)</th>
                                    <th class="py-2 px-2 text-right">Alc. Metílica (ppm)</th>
                                    <th class="py-2 px-2 text-right">Turbidez</th>
                                    <th class="py-2 px-2 text-right">T.D.S.</th>
                                    <th class="py-2 px-2 text-right">Alc. Fosfórica (vol) *</th>
                                    <th class="py-2 px-2 text-right">Alc. Fosfórica (ppm) *</th>
                                </tr>
                            </thead>
                            <tbody id="tabla-cert-agua">
                                ${puntosAgua.map(punto => `
                                <tr class="border-b border-slate-800">
                                    <td class="py-2 px-2 font-medium text-white">${punto}</td>
                                    <td class="py-2 px-2"><input type="number" step="any" name="ph-${punto}" class="w-16 bg-slate-800 border border-slate-700 rounded p-1 text-white text-right"></td>
                                    <td class="py-2 px-2"><input type="number" step="any" name="conductividad-${punto}" class="w-20 bg-slate-800 border border-slate-700 rounded p-1 text-white text-right"></td>
                                    <td class="py-2 px-2"><input type="number" step="any" name="dureza_vol-${punto}" class="w-20 bg-slate-800 border border-slate-700 rounded p-1 text-white text-right"></td>
                                    <td class="py-2 px-2"><input type="number" step="any" name="dureza_ppm-${punto}" class="w-20 bg-slate-800 border border-slate-700 rounded p-1 text-white text-right"></td>
                                    <td class="py-2 px-2"><input type="number" step="any" name="cloruros-${punto}" class="w-20 bg-slate-800 border border-slate-700 rounded p-1 text-white text-right"></td>
                                    <td class="py-2 px-2"><input type="number" step="any" name="alc_met_vol-${punto}" class="w-20 bg-slate-800 border border-slate-700 rounded p-1 text-white text-right"></td>
                                    <td class="py-2 px-2"><input type="number" step="any" name="alc_met_ppm-${punto}" class="w-20 bg-slate-800 border border-slate-700 rounded p-1 text-white text-right"></td>
                                    <td class="py-2 px-2"><input type="number" step="any" name="turbidez-${punto}" class="w-20 bg-slate-800 border border-slate-700 rounded p-1 text-white text-right"></td>
                                    <td class="py-2 px-2"><input type="number" step="any" name="tds-${punto}" class="w-20 bg-slate-800 border border-slate-700 rounded p-1 text-white text-right"></td>
                                    ${esCaldera(punto) ? `
                                    <td class="py-2 px-2"><input type="number" step="any" name="alc_fos_vol-${punto}" class="w-20 bg-slate-800 border border-slate-700 rounded p-1 text-white text-right"></td>
                                    <td class="py-2 px-2"><input type="number" step="any" name="alc_fos_ppm-${punto}" class="w-20 bg-slate-800 border border-slate-700 rounded p-1 text-white text-right"></td>` : '<td colspan="2" class="text-center text-slate-500">--</td>'}
                                </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    <p class="text-xs text-slate-400">* Solo para calderas. Solo se guardarán los puntos con al menos un valor ingresado.</p>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">Guardar Certificaciones</button>
                </form>` : '<p class="text-slate-400 italic">Solo analistas pueden registrar.</p>'}
            </div>
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Últimas Certificaciones</h3>
                <div id="lista-cert-agua" class="space-y-2 max-h-96 overflow-y-auto">
                    <p class="text-slate-400 animate-pulse">Cargando...</p>
                </div>
            </div>
        </div>
    `;

    if (puede) {
        document.getElementById('form-cert-agua').addEventListener('submit', async (e) => {
            e.preventDefault();
            const { data: { user } } = await supabase.auth.getUser();
            const fechaAnalisis = new Date().toISOString().split('T')[0];

            const inserciones = [];
            for (const punto of puntosAgua) {
                const campos = {};
                const nombres = {
                    ph: 'ph', conductividad: 'conductividad', dureza_vol: 'dureza_vol', dureza_ppm: 'dureza_ppm',
                    cloruros: 'cloruros', alc_met_vol: 'alc_met_vol', alc_met_ppm: 'alc_met_ppm',
                    turbidez: 'turbidez', tds: 'tds', alc_fos_vol: 'alc_fos_vol', alc_fos_ppm: 'alc_fos_ppm'
                };
                let tieneDato = false;
                for (const [key, nombre] of Object.entries(nombres)) {
                    const input = document.querySelector(`[name="${nombre}-${punto}"]`);
                    if (input && input.value.trim() !== '') {
                        const val = parseFloat(input.value);
                        if (!isNaN(val)) {
                            campos[nombre] = val;
                            tieneDato = true;
                        }
                    }
                }
                if (tieneDato) {
                    inserciones.push({
                        punto_muestreo: punto,
                        ...campos,
                        fecha_analisis: fechaAnalisis,
                        registrado_por: user.id
                    });
                }
            }

            if (inserciones.length === 0) return alert('Ingrese al menos un valor.');

            const { error } = await supabase.from('certificaciones_agua').insert(inserciones);
            if (error) return alert('Error al guardar: ' + error.message);

            alert('Certificaciones de agua guardadas.');
            document.getElementById('form-cert-agua').reset();
            await renderizarListaCertificaciones('certificaciones_agua', 'lista-cert-agua', ['ph','conductividad']);
            await notificarLaboratorio('Resultado de Laboratorio', `Certificación de agua: ${inserciones.map(i => i.punto_muestreo).join(', ')}`);
        });
    }

    await renderizarListaCertificaciones('certificaciones_agua', 'lista-cert-agua', ['ph','conductividad']);
}
