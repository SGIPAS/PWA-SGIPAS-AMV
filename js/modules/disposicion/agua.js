// ocp Disposición de Agua Recuperada (vertida al suelo o reutilizada en torre)
import { supabase } from '../../supabase-client.js';

export async function renderizarDisposicionAgua(contenedor) {
    contenedor.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Registrar Agua Recuperada</h3>
                <form id="form-agua" class="space-y-4">
                    <div>
                        <label class="block text-slate-400 text-sm">Tipo de Movimiento</label>
                        <select id="agua-tipo" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                            <option value="vertedero">Vertida al suelo (disposición final)</option>
                            <option value="torre">Recuperada a torre de enfriamiento</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">Cantidad (m³ o litros)</label>
                        <input type="number" step="0.1" id="agua-cantidad" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">Unidad</label>
                        <select id="agua-unidad" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                            <option value="m3">m³</option>
                            <option value="litros">litros</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">Observaciones</label>
                        <textarea id="agua-obs" rows="2" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"></textarea>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">Registrar</button>
                </form>
            </div>
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Últimos Registros de Agua</h3>
                <div id="lista-agua" class="space-y-2 max-h-96 overflow-y-auto">
                    <p class="text-slate-400 animate-pulse">Cargando...</p>
                </div>
            </div>
        </div>
    `;

    await cargarListaAgua();

    document.getElementById('form-agua').addEventListener('submit', async (e) => {
        e.preventDefault();
        const tipo = document.getElementById('agua-tipo').value;
        const cantidad = parseFloat(document.getElementById('agua-cantidad').value);
        const unidad = document.getElementById('agua-unidad').value;
        const obs = document.getElementById('agua-obs')?.value.trim() || null;
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from('disposicion_final').insert([{
            tipo: 'agua',
            subtipo: tipo,
            cantidad: cantidad,
            unidad: unidad,
            fecha: new Date().toISOString().split('T')[0],
            destino: tipo === 'torre' ? 'torre_enfriamiento' : 'vertedero',
            observaciones: obs,
            registrado_por: user.id
        }]);

        if (error) return alert('Error: ' + error.message);
        alert('Registro guardado.');
        document.getElementById('form-agua').reset();
        cargarListaAgua();
    });
}

async function cargarListaAgua() {
    const container = document.getElementById('lista-agua');
    const { data, error } = await supabase.from('disposicion_final').select('*').eq('tipo', 'agua').order('fecha', { ascending: false }).limit(10);
    if (error) { container.innerHTML = '<p class="text-red-500">Error.</p>'; return; }
    if (!data.length) { container.innerHTML = '<p class="text-slate-400">Sin registros.</p>'; return; }
    container.innerHTML = data.map(d => `
        <div class="bg-slate-800 p-2 rounded text-sm flex justify-between">
            <span>${d.fecha} - ${d.subtipo === 'vertedero' ? '🌊 Vertida' : '🔄 Recuperada a torre'}</span>
            <span class="font-bold">${d.cantidad} ${d.unidad}</span>
            ${d.observaciones ? `<p class="text-xs text-slate-400 w-full">${d.observaciones}</p>` : ''}
        </div>
    `).join('');
}