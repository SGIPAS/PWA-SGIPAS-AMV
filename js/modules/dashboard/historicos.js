// ocp Analizador de Procesos – tendencias múltiples agrupadas y altura controlada
import { supabase } from '../../supabase-client.js';

export async function renderizarHistoricos(contenedor) {
    const hoy = new Date();
    const hace7dias = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);
    const desdeInicial = hace7dias.toISOString().split('T')[0];
    const hastaInicial = hoy.toISOString().split('T')[0];

    contenedor.innerHTML = `
        <div class="space-y-4">
            <div class="flex gap-4 items-end flex-wrap">
                <div>
                    <label class="block text-sm text-slate-400">Desde</label>
                    <input type="date" id="hist-desde" class="bg-slate-800 border border-slate-700 rounded p-2 text-white" value="${desdeInicial}">
                </div>
                <div>
                    <label class="block text-sm text-slate-400">Hasta</label>
                    <input type="date" id="hist-hasta" class="bg-slate-800 border border-slate-700 rounded p-2 text-white" value="${hastaInicial}">
                </div>
                <button id="btn-actualizar-hist" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Actualizar Gráficos</button>
            </div>
            <div id="contenedor-graficos" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <p class="text-slate-400 animate-pulse col-span-full">Cargando tendencias...</p>
            </div>
        </div>
    `;

    cargarTodosGraficos(desdeInicial, hastaInicial);

    document.getElementById('btn-actualizar-hist').addEventListener('click', () => {
        const desde = document.getElementById('hist-desde').value;
        const hasta = document.getElementById('hist-hasta').value;
        if (!desde || !hasta) return alert('Seleccione ambas fechas.');
        cargarTodosGraficos(desde, hasta);
    });
}

async function cargarTodosGraficos(desde, hasta) {
    const contenedor = document.getElementById('contenedor-graficos');
    contenedor.innerHTML = '<p class="text-slate-400 animate-pulse col-span-full">Actualizando gráficos...</p>';

    if (window.histGraficos) window.histGraficos.forEach(g => g.destroy());
    window.histGraficos = [];

    try {
        const [
            acidoRes, phRes, consumoRes, emisionesRes, motoresRes, fundicionRes, otsRes, novedadesRes
        ] = await Promise.all([
            supabase.from('analisis_acido').select('*').gte('fecha_registro', desde).lte('fecha_registro', hasta).order('fecha_registro', { ascending: true }),
            supabase.from('ph_aguas').select('*').gte('fecha_registro', desde).lte('fecha_registro', hasta).order('fecha_registro', { ascending: true }),
            supabase.from('consumo_agua').select('*').gte('fecha_registro', desde).lte('fecha_registro', hasta).order('fecha_registro', { ascending: true }),
            supabase.from('emisiones_so2').select('*').gte('fecha_registro', desde).lte('fecha_registro', hasta).order('fecha_registro', { ascending: true }),
            supabase.from('mediciones_motores').select('temperatura, fecha_registro, punto_medicion!inner(tag_equipo)').gte('fecha_registro', desde).lte('fecha_registro', hasta).order('fecha_registro', { ascending: true }),
            supabase.from('fundicion_diaria').select('*').gte('fecha_registro', desde).lte('fecha_registro', hasta).order('fecha_registro', { ascending: true }),
            supabase.from('ordenes_trabajo').select('fecha_solicitud').gte('fecha_solicitud', desde).lte('fecha_solicitud', hasta).order('fecha_solicitud', { ascending: true }),
            supabase.from('novedades').select('fecha_novedad').gte('fecha_novedad', desde).lte('fecha_novedad', hasta).order('fecha_novedad', { ascending: true })
        ]);

        contenedor.innerHTML = '';

        // ---- Ácido Sulfúrico (multilínea: concentración, NTU, densidad, temperatura) ----
        if (acidoRes.data?.length) {
            const datasets = [
                { label: 'Concentración (%)', data: acidoRes.data.map(a => ({ x: a.fecha_registro, y: a.concentracion })), borderColor: '#38bdf8' },
                { label: 'NTU', data: acidoRes.data.filter(a => a.turbidez_ntu != null).map(a => ({ x: a.fecha_registro, y: a.turbidez_ntu })), borderColor: '#f59e0b', hidden: true },
                { label: 'Densidad', data: acidoRes.data.filter(a => a.densidad != null).map(a => ({ x: a.fecha_registro, y: a.densidad })), borderColor: '#10b981', hidden: true },
                { label: 'Temperatura (°C)', data: acidoRes.data.filter(a => a.temperatura != null).map(a => ({ x: a.fecha_registro, y: a.temperatura })), borderColor: '#ef4444', hidden: true }
            ];
            crearGrafico(contenedor, 'Ácido Sulfúrico', datasets);
        }

        // ---- pH (todas las líneas de puntos) ----
        const puntosPH = [...new Set((phRes.data || []).map(p => p.punto_muestreo))];
        if (puntosPH.length) {
            const datasets = puntosPH.map(punto => ({
                label: punto,
                data: (phRes.data || []).filter(p => p.punto_muestreo === punto).map(p => ({ x: p.fecha_registro, y: p.valor_ph })),
                borderColor: colorAleatorio()
            }));
            crearGrafico(contenedor, 'pH de Aguas', datasets);
        }

        // ---- Consumo de Agua (todas las líneas de tipos) ----
        const tiposConsumo = [...new Set((consumoRes.data || []).map(c => c.tipo))];
        if (tiposConsumo.length) {
            const datasets = tiposConsumo.map(tipo => ({
                label: tipo,
                data: (consumoRes.data || []).filter(c => c.tipo === tipo).map(c => ({ x: c.fecha_registro, y: c.valor_m3 })),
                borderColor: colorAleatorio()
            }));
            crearGrafico(contenedor, 'Consumo de Agua (m³)', datasets);
        }

        // ---- Emisiones SO₂ ----
        if (emisionesRes.data?.length) {
            const datasets = [{
                label: 'ppm SO₂',
                data: emisionesRes.data.map(e => ({ x: e.fecha_registro, y: e.ppm_so2 })),
                borderColor: '#ef4444'
            }];
            crearGrafico(contenedor, 'Emisiones SO₂', datasets);
        }

        // ---- Temperaturas de Motores (un gráfico por equipo, pero agrupado dentro de un solo gráfico con todas las líneas de ese equipo) ----
        const equiposMotor = [...new Set((motoresRes.data || []).map(m => m.punto_medicion?.tag_equipo))];
        if (equiposMotor.length) {
            // Agrupamos todos los motores en un mismo gráfico con muchas líneas? Podría ser confuso.
            // Mejor un gráfico por equipo con sus puntos de medición (carcasa, rodamientos)
            equiposMotor.forEach(equipo => {
                const mediciones = (motoresRes.data || []).filter(m => m.punto_medicion?.tag_equipo === equipo);
                if (mediciones.length) {
                    const datasets = [{
                        label: 'Temperatura (°C)',
                        data: mediciones.map(m => ({ x: m.fecha_registro, y: m.temperatura })),
                        borderColor: colorAleatorio()
                    }];
                    crearGrafico(contenedor, `Temp. ${equipo}`, datasets);
                }
            });
        }

        // ---- Fundición ----
        if (fundicionRes.data?.length) {
            const datasets = [{
                label: 'Big Bags',
                data: fundicionRes.data.map(f => ({ x: f.fecha_registro, y: f.big_bags })),
                borderColor: '#ec4899'
            }];
            crearGrafico(contenedor, 'Fundición', datasets);
        }

        // ---- OTs (cantidad por día) ----
        if (otsRes.data?.length) {
            const conteoOT = {};
            otsRes.data.forEach(o => {
                const fecha = o.fecha_solicitud?.split('T')[0];
                if (fecha) conteoOT[fecha] = (conteoOT[fecha] || 0) + 1;
            });
            const datasets = [{
                label: 'OTs creadas',
                data: Object.entries(conteoOT).map(([fecha, cantidad]) => ({ x: fecha, y: cantidad })),
                borderColor: '#06b6d4',
                backgroundColor: '#06b6d440',
                fill: true
            }];
            crearGrafico(contenedor, 'Órdenes de Trabajo (cantidad/día)', datasets, true);
        }

        // ---- Novedades (cantidad por día) ----
        if (novedadesRes.data?.length) {
            const conteoNov = {};
            novedadesRes.data.forEach(n => {
                const fecha = n.fecha_novedad?.split('T')[0];
                if (fecha) conteoNov[fecha] = (conteoNov[fecha] || 0) + 1;
            });
            const datasets = [{
                label: 'Novedades',
                data: Object.entries(conteoNov).map(([fecha, cantidad]) => ({ x: fecha, y: cantidad })),
                borderColor: '#84cc16',
                backgroundColor: '#84cc1640',
                fill: true
            }];
            crearGrafico(contenedor, 'Novedades Reportadas (cantidad/día)', datasets, true);
        }

        if (contenedor.children.length === 0) {
            contenedor.innerHTML = '<p class="text-slate-400 col-span-full">No hay datos en el período seleccionado.</p>';
        }

    } catch (err) {
        contenedor.innerHTML = `<p class="text-red-500 col-span-full">Error al cargar gráficos: ${err.message}</p>`;
        console.error(err);
    }
}

function crearGrafico(contenedor, titulo, datasets, fill = false) {
    const canvasId = `chart-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const div = document.createElement('div');
    div.className = 'bg-slate-900 p-4 rounded border border-slate-700 flex flex-col';
    div.style.height = '16rem'; // altura fija
    div.innerHTML = `<h3 class="text-sm font-semibold text-slate-300 mb-2 truncate" title="${titulo}">${titulo}</h3>
                     <div class="flex-1"><canvas id="${canvasId}"></canvas></div>`;
    contenedor.appendChild(div);

    const ctx = document.getElementById(canvasId).getContext('2d');
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: datasets.map(ds => ({
                ...ds,
                tension: 0.2,
                pointRadius: 2,
                borderWidth: 1.5,
                fill: fill ? true : false
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { type: 'time', time: { unit: 'day' }, title: { display: false } },
                y: { beginAtZero: false, title: { display: false } }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12, padding: 10, font: { size: 10 } }
                }
            }
        }
    });
    window.histGraficos.push(chart);
}

// Genera colores HSL para distinguir series
let colorIndex = 0;
function colorAleatorio() {
    const hue = (colorIndex * 137.508) % 360; // distribución dorada
    colorIndex++;
    return `hsl(${hue}, 70%, 60%)`;
}
