// ocp Registro de temperaturas de motores (carcasa, rodamientos, salida aire)
import { supabase } from '../../supabase-client.js';

export async function renderizarMotores(contenedor, rol) {
    contenedor.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Registrar Temperatura de Motor</h3>
                <form id="form-motores" class="space-y-4">
                    <div>
                        <label class="block text-slate-400 text-sm">TAG Equipo / Motor</label>
                        <input type="text" id="mot-tag" placeholder="Ej: SOPLADOR-01, BOMBA-P205" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white uppercase" required>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">Tipo de medición</label>
                        <select id="mot-tipo" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                            <option value="carcasa">Carcasa</option>
                            <option value="rodamiento1">Rodamiento 1</option>
                            <option value="rodamiento2">Rodamiento 2</option>
                            <option value="salida_aire">Salida de aire (soplador)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">Temperatura (°C)</label>
                        <input type="number" step="0.1" id="mot-temp" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">Guardar</button>
                </form>
            </div>
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Últimos registros</h3>
                <div id="lista-motores" class="space-y-2 max-h-96 overflow-y-auto">
                    <p class="text-slate-400 animate-pulse">Cargando...</p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('form-motores').addEventListener('submit', async (e) => {
        e.preventDefault();
        const tag = document.getElementById('mot-tag').value.trim().toUpperCase();
        const tipo = document.getElementById('mot-tipo').value;
        const temp = parseFloat(document.getElementById('mot-temp').value);
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from('temperaturas_motores').insert([{
            tag_equipo: tag,
            tipo_medicion: tipo,
            temperatura: temp,
            registrado_por: user.id,
            fecha_registro: new Date().toISOString().split('T')[0]
        }]);

        if (error) return alert('Error: ' + error.message);
        alert('Registro guardado.');
        document.getElementById('form-motores').reset();
        cargarListaMotores();
    });

    await cargarListaMotores();
}

async function cargarListaMotores() {
    const container = document.getElementById('lista-motores');
    const { data, error } = await supabase.from('temperaturas_motores').select('*').order('fecha_registro', { ascending: false }).limit(10);
    if (error) { container.innerHTML = '<p class="text-red-500">Error.</p>'; return; }
    if (!data.length) { container.innerHTML = '<p class="text-slate-400">Sin registros.</p>'; return; }

    container.innerHTML = data.map(r => `
        <div class="bg-slate-800 p-2 rounded text-sm">
            <span class="text-slate-400">${r.fecha_registro}</span>
            <span class="ml-2 font-bold text-white">${r.tag_equipo}</span>
            <span class="ml-2 text-blue-400">${r.tipo_medicion}: ${r.temperatura}°C</span>
        </div>
    `).join('');
}