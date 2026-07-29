// ocp Módulo de Motores – registro basado en puntos de medición predefinidos
import { supabase } from '../../supabase-client.js';

export async function renderizarMotores(contenedor, rol) {
    // Obtener lista de puntos de medición
    const { data: puntos } = await supabase.from('puntos_medicion_motores').select('*').order('tag_equipo');

    contenedor.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Registrar Medición</h3>
                <form id="form-motor" class="space-y-4">
                    <div>
                        <label class="block text-slate-400 text-sm">Equipo</label>
                        <select id="motor-tag" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                            <option value="">Seleccione equipo...</option>
                            ${[...new Set(puntos?.map(p => p.tag_equipo))].map(tag => `<option value="${tag}">${tag}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">Punto de medición</label>
                        <select id="motor-punto" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                            <option value="">Primero seleccione equipo</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">Temperatura (°C)</label>
                        <input type="number" step="0.1" id="motor-temp" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">Vibración (opcional)</label>
                        <input type="number" step="0.01" id="motor-vib" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">Guardar</button>
                </form>
            </div>
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Últimas Mediciones</h3>
                <div id="lista-motores" class="space-y-2 max-h-96 overflow-y-auto">
                    <p class="text-slate-400 animate-pulse">Cargando...</p>
                </div>
            </div>
        </div>
    `;

    // Actualizar puntos de medición al seleccionar equipo
    const tagSelect = document.getElementById('motor-tag');
    const puntoSelect = document.getElementById('motor-punto');
    tagSelect.addEventListener('change', () => {
        const tag = tagSelect.value;
        const puntosFiltrados = (puntos || []).filter(p => p.tag_equipo === tag);
        puntoSelect.innerHTML = puntosFiltrados.map(p => `<option value="${p.id}">${p.descripcion} (${p.tipo_medicion})</option>`).join('');
    });

    // Envío del formulario
    document.getElementById('form-motor').addEventListener('submit', async (e) => {
        e.preventDefault();
        const punto_id = puntoSelect.value;
        const temperatura = parseFloat(document.getElementById('motor-temp').value);
        const vibracion = parseFloat(document.getElementById('motor-vib')?.value) || null;
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from('mediciones_motores').insert([{
            punto_medicion_id: punto_id,
            temperatura: temperatura,
            vibracion: vibracion,
            registrado_por: user.id,
            fecha_registro: new Date().toISOString().split('T')[0]
        }]);

        if (error) return alert('Error: ' + error.message);
        alert('Medición guardada.');
        document.getElementById('form-motor').reset();
        cargarListaMotores();
    });

    await cargarListaMotores();
}

async function cargarListaMotores() {
    const container = document.getElementById('lista-motores');
    const { data, error } = await supabase
        .from('mediciones_motores')
        .select('*, punto_medicion:puntos_medicion_motores(tag_equipo, descripcion)')
        .order('fecha_registro', { ascending: false })
        .limit(20);

    if (error) { container.innerHTML = '<p class="text-red-500">Error.</p>'; return; }
    if (!data.length) { container.innerHTML = '<p class="text-slate-400">Sin mediciones.</p>'; return; }

    container.innerHTML = data.map(m => `
        <div class="bg-slate-800 p-2 rounded text-sm">
            <span class="text-slate-400">${m.fecha_registro}</span>
            <span class="ml-2 font-bold text-white">${m.punto_medicion?.tag_equipo}</span>
            <span class="ml-2 text-blue-400">${m.punto_medicion?.descripcion}: ${m.temperatura}°C</span>
            ${m.vibracion ? `<span class="ml-2 text-yellow-400">Vib: ${m.vibracion}</span>` : ''}
        </div>
    `).join('');
}