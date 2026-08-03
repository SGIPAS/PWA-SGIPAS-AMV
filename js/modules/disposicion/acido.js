// ocp Disposición de Ácido (baritanques, devolución a sulfato)
import { supabase } from '../../supabase-client.js';

export async function renderizarDisposicionAcido(contenedor) {
    contenedor.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Registrar Disposición de Ácido</h3>
                <form id="form-acido" class="space-y-4">
                    <div>
                        <label class="block text-slate-400 text-sm">Tipo de Movimiento</label>
                        <select id="acido-tipo" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                            <option value="entrada">Ácido Retenido (entrada al baritanque)</option>
                            <option value="salida">Devuelto a Proceso (salida del baritanque)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">Cantidad (litros)</label>
                        <input type="number" step="0.1" id="acido-cantidad" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">Destino / Origen</label>
                        <select id="acido-destino" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                            <option value="baritanque">Baritanque</option>
                            <option value="sulfato">Cisterna de Sulfato</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">Observaciones</label>
                        <textarea id="acido-obs" rows="2" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"></textarea>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">Registrar</button>
                </form>
            </div>
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Saldo Actual en Baritanques</h3>
                <div id="saldo-acido" class="text-2xl font-bold text-white mb-4">-- litros</div>
                <h3 class="text-lg font-semibold text-white mb-2">Últimos Movimientos</h3>
                <div id="lista-acido" class="space-y-2 max-h-72 overflow-y-auto">
                    <p class="text-slate-400 animate-pulse">Cargando...</p>
                </div>
            </div>
        </div>
    `;

    await actualizarSaldoAcido();
    await cargarListaAcido();

    document.getElementById('form-acido').addEventListener('submit', async (e) => {
        e.preventDefault();
        const tipo = document.getElementById('acido-tipo').value;
        const cantidad = parseFloat(document.getElementById('acido-cantidad').value);
        const destino = document.getElementById('acido-destino')?.value || null;
        const obs = document.getElementById('acido-obs')?.value.trim() || null;
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from('disposicion_final').insert([{
            tipo: 'acido',
            subtipo: tipo === 'entrada' ? 'retencion' : 'devolucion',
            cantidad: cantidad,
            unidad: 'litros',
            fecha: new Date().toISOString().split('T')[0],
            destino: destino,
            observaciones: obs,
            registrado_por: user.id
        }]);

        if (error) return alert('Error: ' + error.message);
        alert('Movimiento registrado.');
        document.getElementById('form-acido').reset();
        actualizarSaldoAcido();
        cargarListaAcido();
    });
}

async function actualizarSaldoAcido() {
    const { data } = await supabase.from('disposicion_final').select('cantidad, subtipo').eq('tipo', 'acido');
    const entradas = (data || []).filter(d => d.subtipo === 'retencion').reduce((s, d) => s + d.cantidad, 0);
    const salidas = (data || []).filter(d => d.subtipo === 'devolucion').reduce((s, d) => s + d.cantidad, 0);
    document.getElementById('saldo-acido').textContent = `${(entradas - salidas).toFixed(1)} litros`;
}

async function cargarListaAcido() {
    const container = document.getElementById('lista-acido');
    const { data, error } = await supabase.from('disposicion_final').select('*').eq('tipo', 'acido').order('fecha', { ascending: false }).limit(10);
    if (error) { container.innerHTML = '<p class="text-red-500">Error.</p>'; return; }
    if (!data.length) { container.innerHTML = '<p class="text-slate-400">Sin movimientos.</p>'; return; }
    container.innerHTML = data.map(d => `
        <div class="bg-slate-800 p-2 rounded text-sm flex justify-between">
            <span>${d.fecha} - ${d.subtipo === 'retencion' ? '🔻 Retenido' : '🔺 Devuelto'}</span>
            <span class="font-bold">${d.cantidad} L</span>
            ${d.observaciones ? `<p class="text-xs text-slate-400 w-full">${d.observaciones}</p>` : ''}
        </div>
    `).join('');
}