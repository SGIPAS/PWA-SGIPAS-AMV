// ocp Submódulo de Fundición con trazabilidad y anulación
import { supabase } from '../../supabase-client.js';
import { escapeHtml } from '../../utils-storage.js';
import { mapearNombresUsuarios, formatearFechaHora, abrirModalAnulacion } from '../operaciones/utils.js';

export async function renderizarFundicion(contenedor, rol) {
    contenedor.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Registro Diario de Fundición</h3>
                <form id="form-fundicion" class="space-y-4">
                    <div>
                        <label class="block text-slate-400 text-sm">Big Bags Fundidos</label>
                        <input type="number" step="1" id="fund-bigbags" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">Guardar Día</button>
                </form>
            </div>
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Últimos registros</h3>
                <div id="lista-fundicion" class="space-y-2 max-h-96 overflow-y-auto">
                    <p class="text-slate-400 animate-pulse">Cargando...</p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('form-fundicion').addEventListener('submit', async (e) => {
        e.preventDefault();
        const bigBags = parseInt(document.getElementById('fund-bigbags').value);
        const { data: { user } } = await supabase.auth.getUser();
        const fechaHoy = new Date().toISOString().split('T')[0];

        const { error } = await supabase
            .from('fundicion_diaria')
            .upsert({
                fecha_registro: fechaHoy,
                big_bags: bigBags,
                registrado_por: user.id
            }, { onConflict: 'fecha_registro' });

        if (error) return alert('Error: ' + error.message);
        alert('Registro guardado.');
        document.getElementById('form-fundicion').reset();
        cargarListaFundicion(rol);
    });

    await cargarListaFundicion(rol);
}

async function cargarListaFundicion(rol) {
    const container = document.getElementById('lista-fundicion');
    const { data, error } = await supabase
        .from('fundicion_diaria')
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
                    <span class="font-bold text-white">${escapeHtml(r.fecha_registro)}</span>
                    <span class="ml-2 text-blue-400">Big Bags: ${r.big_bags}</span>
                </div>
                ${esAdmin ? `<button class="btn-anular text-red-400 hover:text-red-300 text-xs" data-id="${r.id}">🗑️ Anular</button>` : ''}
            </div>
        </div>
    `).join('');

    if (esAdmin) {
        container.querySelectorAll('.btn-anular').forEach(btn => {
            btn.addEventListener('click', () => {
                abrirModalAnulacion('fundicion_diaria', btn.dataset.id, () => cargarListaFundicion(rol));
            });
        });
    }
}
