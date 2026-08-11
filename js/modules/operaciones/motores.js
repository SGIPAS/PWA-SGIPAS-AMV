// ocp Módulo de Motores – registro simplificado con múltiples puntos por equipo
import { supabase } from '../../supabase-client.js';

export async function renderizarMotores(contenedor, rol) {
    // Obtener lista de equipos únicos desde puntos_medicion_motores
    const { data: equipos } = await supabase
        .from('puntos_medicion_motores')
        .select('tag_equipo')
        .order('tag_equipo');

    const tagsUnicos = [...new Set((equipos || []).map(e => e.tag_equipo))];

    contenedor.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Registrar Temperaturas</h3>
                <form id="form-motor" class="space-y-4">
                    <div>
                        <label class="block text-slate-400 text-sm">Equipo</label>
                        <select id="motor-tag" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
                            <option value="">Seleccione equipo...</option>
                            ${tagsUnicos.map(tag => `<option value="${tag}">${tag}</option>`).join('')}
                        </select>
                    </div>
                    <!-- Contenedor donde aparecerán los puntos de medición dinámicamente -->
                    <div id="puntos-medicion" class="space-y-3">
                        <p class="text-slate-500 text-sm">Seleccione un equipo para ver sus puntos de medición.</p>
                    </div>
                    <button type="submit" id="btn-guardar-motor" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded hidden">Guardar Todas</button>
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

    const tagSelect = document.getElementById('motor-tag');
    const puntosContainer = document.getElementById('puntos-medicion');
    const btnGuardar = document.getElementById('btn-guardar-motor');

    // Al cambiar el equipo, cargar sus puntos de medición
    tagSelect.addEventListener('change', async () => {
        const tag = tagSelect.value;
        if (!tag) {
            puntosContainer.innerHTML = '<p class="text-slate-500 text-sm">Seleccione un equipo para ver sus puntos de medición.</p>';
            btnGuardar.classList.add('hidden');
            return;
        }

        // Obtener puntos de medición para este equipo
        const { data: puntos } = await supabase
            .from('puntos_medicion_motores')
            .select('id, descripcion, tipo_medicion')
            .eq('tag_equipo', tag)
            .order('tipo_medicion');

        if (!puntos || puntos.length === 0) {
            puntosContainer.innerHTML = '<p class="text-slate-500 text-sm">No hay puntos definidos para este equipo.</p>';
            btnGuardar.classList.add('hidden');
            return;
        }

        // Generar campos para cada punto
        puntosContainer.innerHTML = puntos.map(p => `
            <div class="bg-slate-800 p-3 rounded border border-slate-700">
                <label class="block text-slate-400 text-sm mb-1">${p.descripcion} (${p.tipo_medicion})</label>
                <input type="number" step="0.1" class="temp-input w-full bg-slate-700 border border-slate-600 rounded p-2 text-white" data-punto-id="${p.id}" placeholder="Temperatura (°C)">
            </div>
        `).join('');

        btnGuardar.classList.remove('hidden');
    });

    // Guardar todas las temperaturas a la vez
    document.getElementById('form-motor').addEventListener('submit', async (e) => {
        e.preventDefault();
        const tag = tagSelect.value;
        if (!tag) return;

        const inputs = document.querySelectorAll('.temp-input');
        const registros = [];
        const { data: { user } } = await supabase.auth.getUser();

        inputs.forEach(input => {
            const valor = parseFloat(input.value);
            if (!isNaN(valor) && valor > 0) {
                registros.push({
                    punto_medicion_id: input.dataset.puntoId,
                    temperatura: valor,
                    fecha_registro: new Date().toISOString().split('T')[0],
                    registrado_por: user.id
                });
            }
        });

        if (registros.length === 0) {
            alert('Ingrese al menos una temperatura.');
            return;
        }

        const { error } = await supabase.from('mediciones_motores').insert(registros);
        if (error) return alert('Error: ' + error.message);

        alert(`${registros.length} temperatura(s) guardada(s).`);
        document.getElementById('form-motor').reset();
        puntosContainer.innerHTML = '<p class="text-slate-500 text-sm">Seleccione un equipo para ver sus puntos de medición.</p>';
        btnGuardar.classList.add('hidden');
        cargarListaMotores();
    });

    await cargarListaMotores();
}

async function cargarListaMotores() {
    const container = document.getElementById('lista-motores');
    const { data, error } = await supabase
        .from('mediciones_motores')
        .select('*, punto_medicion:puntos_medicion_motores(tag_equipo, descripcion, tipo_medicion)')
        .order('fecha_registro', { ascending: false })
        .limit(20);

    if (error) { container.innerHTML = '<p class="text-red-500">Error.</p>'; return; }
    if (!data.length) { container.innerHTML = '<p class="text-slate-400">Sin mediciones.</p>'; return; }

    container.innerHTML = data.map(m => `
        <div class="bg-slate-800 p-2 rounded text-sm">
            <span class="text-slate-400">${m.fecha_registro}</span>
            <span class="ml-2 font-bold text-white">${m.punto_medicion?.tag_equipo}</span>
            <span class="ml-2 text-blue-400">${m.punto_medicion?.descripcion}: ${m.temperatura}°C</span>
        </div>
    `).join('');
}
