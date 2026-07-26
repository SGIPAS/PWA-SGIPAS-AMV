// ocp Registro de análisis de ácido (% conc., NTU, densidad, temp)
import { supabase } from '../../supabase-client.js';

export async function renderizarAcido(contenedor, rol) {
    contenedor.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Registrar Análisis</h3>
                <form id="form-acido" class="space-y-4">
                    <div>
                        <label class="block text-slate-400 text-sm">Concentración (%)</label>
                        <input type="number" step="0.01" id="acido-conc" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">Turbidez (NTU)</label>
                        <input type="number" step="0.01" id="acido-ntu" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">Densidad (g/ml)</label>
                        <input type="number" step="0.001" id="acido-densidad" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">Temperatura (°C)</label>
                        <input type="number" step="0.1" id="acido-temp" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">Guardar</button>
                </form>
            </div>
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Últimos registros</h3>
                <div id="lista-acido" class="space-y-2 max-h-96 overflow-y-auto">
                    <p class="text-slate-400 animate-pulse">Cargando...</p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('form-acido').addEventListener('submit', async (e) => {
        e.preventDefault();
        const conc = parseFloat(document.getElementById('acido-conc').value);
        const ntu = parseFloat(document.getElementById('acido-ntu').value) || null;
        const densidad = parseFloat(document.getElementById('acido-densidad').value) || null;
        const temp = parseFloat(document.getElementById('acido-temp').value) || null;
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from('analisis_acido').insert([{
            concentracion: conc,
            turbidez_ntu: ntu,
            densidad,
            temperatura: temp,
            registrado_por: user.id,
            fecha_registro: new Date().toISOString().split('T')[0] // solo fecha
        }]);

        if (error) return alert('Error: ' + error.message);
        alert('Análisis registrado.');
        document.getElementById('form-acido').reset();
        cargarListaAcido();
    });

    await cargarListaAcido();
}

async function cargarListaAcido() {
    const container = document.getElementById('lista-acido');
    const { data, error } = await supabase.from('analisis_acido').select('*').order('fecha_registro', { ascending: false }).limit(10);
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
            <span class="ml-2 text-green-400">${r.concentracion}%</span>
            <span class="ml-2 text-slate-300">NTU: ${r.turbidez_ntu ?? '-'}</span>
            <span class="ml-2">D:${r.densidad ?? '-'} T:${r.temperatura ?? '-'}°C</span>
        </div>
    `).join('');
}