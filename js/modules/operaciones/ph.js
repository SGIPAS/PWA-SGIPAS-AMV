// ocp Registro de pH de aguas con trazabilidad y anulación
import { supabase } from '../../supabase-client.js';
import { escapeHtml } from '../../utils-storage.js';
import { mapearNombresUsuarios, formatearFechaHora, abrirModalAnulacion } from './utils.js';

export async function renderizarPH(contenedor, rol) {
    contenedor.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Registrar pH</h3>
                <form id="form-ph" class="space-y-4">
                    <div>
                        <label class="block text-slate-400 text-sm">Punto de muestreo</label>
                        <select id="ph-punto" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                            <option value="caldera de acido">Caldera de Ácido</option>
                            <option value="calderin">Calderín</option>
                            <option value="torre enfriamiento">Torre Enfriamiento</option>
                            <option value="caldera sulfato">Caldera Sulfato</option>
                            <option value="tanque elevado">Tanque Elevado</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">Valor pH</label>
                        <input type="number" step="0.01" id="ph-valor" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">Soda Cáustica (ml)</label>
                        <input type="number" step="0.1" id="ph-soda" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">Guardar</button>
                </form>
            </div>
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Últimos registros</h3>
                <div id="lista-ph" class="space-y-2 max-h-96 overflow-y-auto">
                    <p class="text-slate-400 animate-pulse">Cargando...</p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('form-ph').addEventListener('submit', async (e) => {
        e.preventDefault();
        const punto = document.getElementById('ph-punto').value;
        const valor = parseFloat(document.getElementById('ph-valor').value);
        const soda = parseFloat(document.getElementById('ph-soda')?.value) || null;
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from('ph_aguas').insert([{
            punto_muestreo: punto,
            valor_ph: valor,
            soda_ml: soda,
            registrado_por: user.id,
            fecha_registro: new Date().toISOString().split('T')[0]
        }]);

        if (error) return alert('Error: ' + error.message);
        alert('Registro guardado.');
        document.getElementById('form-ph').reset();
        cargarListaPH(rol);
    });

    await cargarListaPH(rol);
}

async function cargarListaPH(rol) {
    const container = document.getElementById('lista-ph');
    const { data, error } = await supabase
        .from('ph_aguas')
        .select('*')
        .eq('anulado', false)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) { container.innerHTML = '<p class="text-red-500">Error.</p>'; return; }
    if (!data.length) { container.innerHTML = '<p class="text-slate-400">Sin registros.</p>'; return; }

    const nombres = await mapearNombresUsuarios(data, 'registrado_por');
    const esAdmin = rol === 'admin';

    container.innerHTML = data.map(r => `
        <div class="bg-slate-800 p-2 rounded text-sm">
            <div class="flex justify-between items-start">
                <span class="text-slate-400 text-xs">${escapeHtml(formatearFechaHora(r.created_at))}</span>
                <span class="text-slate-300 text-xs">👤 ${escapeHtml(nombres[r.registrado_por] || 'N/A')}</span>
            </div>
            <div class="mt-1 flex justify-between items-center">
                <div>
                    <span class="font-bold text-white">${escapeHtml(r.punto_muestreo)}</span>
                    <span class="ml-2 text-blue-400">pH ${r.valor_ph}</span>
                    ${r.soda_ml ? `<span class="ml-2 text-yellow-400">Soda: ${r.soda_ml} ml</span>` : ''}
                </div>
                ${esAdmin ? `<button class="btn-anular text-red-400 hover:text-red-300 text-xs" data-id="${r.id}">🗑️ Anular</button>` : ''}
            </div>
        </div>
    `).join('');

    if (esAdmin) {
        container.querySelectorAll('.btn-anular').forEach(btn => {
            btn.addEventListener('click', () => {
                abrirModalAnulacion('ph_aguas', btn.dataset.id, () => cargarListaPH(rol));
            });
        });
    }
}
