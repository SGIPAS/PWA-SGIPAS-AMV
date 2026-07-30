// ocp Analizador de Procesos – múltiples parámetros simultáneos con filtros de fechas y equipos
import { supabase } from '../../supabase-client.js';

let parametrosAgregados = [];

export async function renderizarHistoricos(contenedor) {
    // Obtener listas para selectores secundarios
    const { data: puntosPH } = await supabase.from('ph_aguas').select('punto_muestreo').order('punto_muestreo');
    const { data: equiposMotor } = await supabase.from('puntos_medicion_motores').select('tag_equipo').order('tag_equipo');
    const phPuntos = [...new Set((puntosPH || []).map(p => p.punto_muestreo))].filter(p => p !== 'caldera auxiliar');
    const motorTags = [...new Set((equiposMotor || []).map(e => e.tag_equipo))];

    contenedor.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h2 class="text-2xl font-bold text-white">Analizador de Procesos</h2>
                <button id="btn-agregar-parametro" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">+ Agregar Parámetro</button>
            </div>
            <div id="lista-parametros" class="space-y-4"></div>
            <button id="btn-generar-graficos" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">Generar Gráficos</button>
            <div id="contenedor-graficos" class="space-y-6"></div>
        </div>
    `;

    document.getElementById('btn-agregar-parametro').addEventListener('click', () => agregarParametro(phPuntos, motorTags));
    document.getElementById('btn-generar-graficos').addEventListener('click', generarGraficos);
}

function agregarParametro(phPuntos, motorTags) {
    const id = Date.now();
    parametrosAgregados.push({ id, tipo: 'acido', desde: '', hasta: '', punto: null, motorTag: null });

    const div = document.createElement('div');
    div.className = 'bg-slate-800 p-4 rounded border border-slate-700 flex flex-wrap gap-4 items-end';
    div.setAttribute('data-id', id);
    div.innerHTML = `
        <div>
            <label class="block text-sm text-slate-400">Parámetro</label>
            <select class="param-tipo bg-slate-900 border border-slate-700 rounded p-2 text-white" data-id="${id}">
                <option value="acido">Ácido Sulfúrico</option>
                <option value="ph">pH</option>
                <option value="consumo">Consumo de Agua</option>
                <option value="emisiones">Emisiones SO₂</option>
                <option value="motores">Temperatura de Motores</option>
                <option value="fundicion">Fundición (Big Bags)</option>
            </select>
        </div>
        <div class="param-selector-secundario" data-id="${id}"></div>
        <div>
            <label class="block text-sm text-slate-400">Desde</label>
            <input type="date" class="param-desde bg-slate-900 border border-slate-700 rounded p-2 text-white" data-id="${id}">
        </div>
        <div>
            <label class="block text-sm text-slate-400">Hasta</label>
            <input type="date" class="param-hasta bg-slate-900 border border-slate-700 rounded p-2 text-white" data-id="${id}">
        </div>
        <button class="btn-eliminar-param text-red-400 hover:text-red-300 text-sm" data-id="${id}">🗑️ Quitar</button>
    `;

    document.getElementById('lista-parametros').appendChild(div);

    const tipoSelect = div.querySelector('.param-tipo');
    const selectorSecundario = div.querySelector('.param-selector-secundario');

    const actualizarSelector = () => {
        const tipo = tipoSelect.value;
        if (tipo === 'ph') {
            selectorSecundario.innerHTML = `<label class="block text-sm text-slate-400">Punto</label><select class="param-punto bg-slate-900 border border-slate-700 rounded p-2 text-white" data-id="${id}">${phPuntos.map(p => `<option value="${p}">${p}</option>`).join('')}</select>`;
        } else if (tipo === 'motores') {
            selectorSecundario.innerHTML = `<label class="block text-sm text-slate-400">Equipo</label><select class="param-motor bg-slate-900 border border-slate-700 rounded p-2 text-white" data-id="${id}">${motorTags.map(t => `<option value="${t}">${t}</option>`).join('')}</select>`;
        } else if (tipo === 'consumo') {
            selectorSecundario.innerHTML = `<label class="block text-sm text-slate-400">Tipo</label><select class="param-consumo-tipo bg-slate-900 border border-slate-700 rounded p-2 text-white" data-id="${id}">
                <option value="general">General</option><option value="planta acido">Planta Ácido</option><option value="caldera acido">Caldera Ácido</option><option value="caldera de sulfato">Caldera Sulfato</option><option value="planta sulfato">Planta Sulfato</option></select>`;
        } else {
            selectorSecundario.innerHTML = '';
        }
    };

    tipoSelect.addEventListener('change', actualizarSelector);
    actualizarSelector();

    div.querySelector('.param-desde').addEventListener('change', e => {
        const item = parametrosAgregados.find(p => p.id == id);
        if (item) item.desde = e.target.value;
    });
    div.querySelector('.param-hasta').addEventListener('change', e => {
        const item = parametrosAgregados.find(p => p.id == id);
        if (item) item.hasta = e.target.value;
    });
    div.querySelector('.btn-eliminar-param').addEventListener('click', () => {
        parametrosAgregados = parametrosAgregados.filter(p => p.id != id);
        div.remove();
    });
}

async function generarGraficos() {
    const contenedor = document.getElementById('contenedor-graficos');
    contenedor.innerHTML = '<p class="text-slate-400 animate-pulse">Generando gráficos...</p>';

    // Limpiar gráficos anteriores
    if (window.graficos) window.graficos.forEach(g => g.destroy());
    window.graficos = [];

    for (const param of parametrosAgregados) {
        const tipo = document.querySelector(`.param-tipo[data-id="${param.id}"]`)?.value;
        const desde = document.querySelector(`.param-desde[data-id="${param.id}"]`)?.value;
        const hasta = document.querySelector(`.param-hasta[data-id="${param.id}"]`)?.value;
        if (!desde || !hasta) continue;

        let datos = [];
        let etiqueta = '';

        switch (tipo) {
            case 'acido': {
                const { data } = await supabase.from('analisis_acido').select('concentracion, fecha_registro').gte('fecha_registro', desde).lte('fecha_registro', hasta).order('fecha_registro', { ascending: true });
                datos = data?.map(a => ({ x: a.fecha_registro, y: a.concentracion })) || [];
                etiqueta = 'Ácido (% concentración)';
                break;
            }
            case 'ph': {
                const punto = document.querySelector(`.param-punto[data-id="${param.id}"]`)?.value;
                const { data } = await supabase.from('ph_aguas').select('valor_ph, fecha_registro').eq('punto_muestreo', punto).gte('fecha_registro', desde).lte('fecha_registro', hasta).order('fecha_registro', { ascending: true });
                datos = data?.map(p => ({ x: p.fecha_registro, y: p.valor_ph })) || [];
                etiqueta = `pH ${punto}`;
                break;
            }
            case 'consumo': {
                const tipoConsumo = document.querySelector(`.param-consumo-tipo[data-id="${param.id}"]`)?.value;
                const { data } = await supabase.from('consumo_agua').select('valor_m3, fecha_registro').eq('tipo', tipoConsumo).gte('fecha_registro', desde).lte('fecha_registro', hasta).order('fecha_registro', { ascending: true });
                datos = data?.map(c => ({ x: c.fecha_registro, y: c.valor_m3 })) || [];
                etiqueta = `Consumo ${tipoConsumo} (m³)`;
                break;
            }
            case 'emisiones': {
                const { data } = await supabase.from('emisiones_so2').select('ppm_so2, fecha_registro').gte('fecha_registro', desde).lte('fecha_registro', hasta).order('fecha_registro', { ascending: true });
                datos = data?.map(e => ({ x: e.fecha_registro, y: e.ppm_so2 })) || [];
                etiqueta = 'Emisiones SO₂ (ppm)';
                break;
            }
            case 'motores': {
                const motor = document.querySelector(`.param-motor[data-id="${param.id}"]`)?.value;
                const { data } = await supabase.from('mediciones_motores')
                    .select('temperatura, fecha_registro, punto_medicion!inner(tag_equipo)')
                    .eq('punto_medicion.tag_equipo', motor)
                    .gte('fecha_registro', desde)
                    .lte('fecha_registro', hasta)
                    .order('fecha_registro', { ascending: true });
                datos = data?.map(m => ({ x: m.fecha_registro, y: m.temperatura })) || [];
                etiqueta = `Temp. ${motor} (°C)`;
                break;
            }
            case 'fundicion': {
                const { data } = await supabase.from('fundicion_diaria').select('big_bags, fecha_registro').gte('fecha_registro', desde).lte('fecha_registro', hasta).order('fecha_registro', { ascending: true });
                datos = data?.map(f => ({ x: f.fecha_registro, y: f.big_bags })) || [];
                etiqueta = 'Fundición (Big Bags)';
                break;
            }
        }

        // Crear un canvas para este parámetro
        const canvasId = `chart-${param.id}`;
        const div = document.createElement('div');
        div.className = 'bg-slate-900 p-4 rounded border border-slate-700';
        div.innerHTML = `<h3 class="text-sm font-semibold text-slate-300 mb-2">${etiqueta}</h3><canvas id="${canvasId}" width="400" height="150"></canvas>`;
        contenedor.appendChild(div);

        const ctx = document.getElementById(canvasId).getContext('2d');
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: etiqueta,
                    data: datos,
                    borderColor: '#38bdf8',
                    tension: 0.2,
                    pointRadius: 2
                }]
            },
            options: {
                scales: {
                    x: { type: 'time', time: { unit: 'day' } },
                    y: { beginAtZero: false }
                }
            }
        });
        window.graficos.push(chart);
    }

    if (contenedor.children.length === 1) {
        contenedor.innerHTML = '<p class="text-slate-400">No se encontraron datos para los parámetros seleccionados.</p>';
    }
}
