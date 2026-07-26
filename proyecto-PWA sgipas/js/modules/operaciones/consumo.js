// ocp Registro de consumo de agua (5 tipos)
import { supabase } from '../../supabase-client.js';

export async function renderizarConsumo(contenedor, rol) {
    contenedor.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Registrar Consumo (m³)</h3>
                <form id="form-consumo" class="space-y-4">
                    <div>
                        <label class="block text-slate-400 text-sm">Tipo</label>
                        <select id="consumo-tipo" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                            <option value="general">General</option>
                            <option value="planta acido">Planta de Ácido</option>
                            <option value="caldera auxiliar">Caldera Auxiliar</option>
                            <option value="caldera acido">Caldera de Ácido</option>
                            <option value="planta sulfato">Planta de Sulfato</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">Valor (m³)</label>
                        <input type="number" step="0.01" id="consumo-valor" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">Guardar</button>
                </form>
            </div>
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Últimos registros</h3>
                <div id="lista-consumo" class="space-y-2 max-h-96 overflow-y-auto">
                    <p class="text-slate-400 animate-pulse">Cargando...</p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('form-consumo').addEventListener('submit', async (e) => {
        e.preventDefault();
        const tipo = document.getElementById('consumo-tipo').value;
        const valor = parseFloat(document.getElementById('consumo-valor').value);
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from('consumo_agua').insert([{
            tipo,
            valor_m3: valor,
            registrado_por: user.id,
            fecha_registro: new Date().toISOString().split('T')[0]
        }]);

        if (error) return alert('Error: ' + error.message);
        alert('Registro guardado.');
        document.getElementById('form-consumo').reset();
        cargarListaConsumo();
    });

    await cargarListaConsumo();
}

async function cargarListaConsumo() {
    const container = document.getElementById('lista-consumo');
    const { data, error } = await supabase.from('consumo_agua').select('*').order('fecha_registro', { ascending: false }).limit(10);
    if (error) {
        container.innerHTML = '<p class="text-red-500">Error.</p>';
        return;
    }
    if (!data.length) {
        container.innerHTML = '<p class="text-slate-400">Sin registros.</p>';
        return;
    }
    container.innerHTML = data.map(r => `
        <div class="bg-slate-800 p-2 rounded text-sm">
            <span class="text-slate-400">${r.fecha_registro}</span>
            <span class="ml-2 font-bold text-white">${r.tipo}</span>
            <span class="ml-2 text-blue-400">${r.valor_m3} m³</span>
        </div>
    `).join('');
}