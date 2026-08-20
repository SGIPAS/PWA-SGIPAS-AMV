// ocp Disposición de Ácido
import { supabase } from '../../supabase-client.js';
import { puedeRegistrar, notificarATodos } from './utils.js';

export async function renderizarDispAcido(contenedor, rol) {
    const puede = puedeRegistrar(rol);
    contenedor.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Registrar Disposición</h3>
                ${puede ? `
                <form id="form-disp-acido" class="space-y-4">
                    <div>
                        <label class="block text-slate-400 text-sm">Tipo</label>
                        <select id="disp-tipo" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                            <option value="entrada">Ácido Retenido (entrada)</option>
                            <option value="salida">Devuelto a Proceso (salida)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">Cantidad (litros)</label>
                        <input type="number" step="0.1" id="disp-cantidad" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">Motivo</label>
                        <textarea id="disp-motivo" rows="2" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"></textarea>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">Guardar</button>
                </form>` : '<p class="text-slate-400 italic">Solo analistas pueden registrar.</p>'}
            </div>
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Saldo Actual</h3>
                <div id="saldo-disp-acido" class="text-2xl font-bold text-white mb-4">-- litros</div>
                <h3 class="text-lg font-semibold text-white mb-2">Últimos Movimientos</h3>
                <div id="lista-disp-acido" class="space-y-2 max-h-72 overflow-y-auto">
                    <p class="text-slate-400 animate-pulse">Cargando...</p>
                </div>
            </div>
        </div>
    `;

    await actualizarSaldoDisp();
    await cargarListaDispAcido();

    if (puede) {
        document.getElementById('form-disp-acido').addEventListener('submit', async (e) => {
            e.preventDefault();
            const tipo = document.getElementById('disp-tipo').value;
            const cantidad = parseFloat(document.getElementById('disp-cantidad').value);
            const motivo = document.getElementById('disp-motivo')?.value.trim() || null;
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase.from('disposicion_acido').insert([{
                tipo, cantidad_litros: cantidad, motivo,
                fecha: new Date().toISOString().split('T')[0],
                registrado_por: user.id
            }]);
            if (error) return alert('Error: ' + error.message);
            alert('Movimiento registrado.');
            document.getElementById('form-disp-acido').reset();
            actualizarSaldoDisp();
            cargarListaDispAcido();
            await notificarATodos('Disposición de Ácido', 'Se ha registrado un nuevo movimiento de disposición de ácido.');
        });
    }
}

async function actualizarSaldoDisp() {
    const { data } = await supabase.from('disposicion_acido').select('*');
    const entradas = (data || []).filter(d => d.tipo === 'entrada').reduce((s, d) => s + d.cantidad_litros, 0);
    const salidas = (data || []).filter(d => d.tipo === 'salida').reduce((s, d) => s + d.cantidad_litros, 0);
    const saldo = entradas - salidas;
    document.getElementById('saldo-disp-acido').textContent = `${saldo.toFixed(1)} litros`;
}

async function cargarListaDispAcido() {
    const container = document.getElementById('lista-disp-acido');
    const { data, error } = await supabase.from('disposicion_acido')
        .select('*')
        .eq('anulado', false) // solo activos
        .order('fecha', { ascending: false })
        .limit(10);
    if (error) { container.innerHTML = '<p class="text-red-500">Error.</p>'; return; }
    if (!data.length) { container.innerHTML = '<p class="text-slate-400">Sin movimientos.</p>'; return; }
    container.innerHTML = data.map(d => `
        <div class="bg-slate-800 p-2 rounded text-sm flex justify-between">
            <span>${d.fecha} - ${d.tipo === 'entrada' ? '🔻 Retenido' : '🔺 Devuelto'}</span>
            <span class="font-bold">${d.cantidad_litros} L</span>
            ${d.motivo ? `<p class="text-xs text-slate-400 w-full">${d.motivo}</p>` : ''}
        </div>
    `).join('');
}