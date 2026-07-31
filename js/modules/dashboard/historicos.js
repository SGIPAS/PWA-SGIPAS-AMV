// ocp Analizador de Procesos – vista de tendencias múltiples con filtro de fechas
import { supabase } from '../../supabase-client.js';

export async function renderizarHistoricos(contenedor) {
    // Fechas por defecto: últimos 7 días
    const hoy = new Date();
    const hace7dias = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);
    const desdeInicial = hace7dias.toISOString().split('T')[0];
    const hastaInicial = hoy.toISOString().split('T')[0];

    contenedor.innerHTML = `
        <div class="space-y-6">
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

    // Cargar gráficos iniciales
    cargarTodosGraficos(desdeInicial, hastaInicial);

    // Evento del botón Actualizar
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

    // Destruir gráficos anteriores
    if (window.histGraficos) window.histGraficos.forEach(g => g.destroy());
    window.histGraficos = [];

    try {
        // Obtener datos de todas las fuentes en paralelo
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

        // Limpiar contenedor
        contenedor.innerHTML = '';

        // ---- Gráfico Ácido ----
        if (acidoRes.data?.length) {
            const datos = acidoRes.data.map(a => ({ x: a.fecha_registro, y: a.concentracion }));
            agregarGrafico(contenedor, 'Ácido Sulfúrico (%)', datos, '38bdf8');
        }

        // ---- Gráficos pH (uno por punto) ----
        const puntosPH = [...new Set((phRes.data || []).map(p => p.punto_muestreo))];
        puntosPH.forEach(punto => {
            const datos = (phRes.data || []).filter(p => p.punto_muestreo === punto).map(p => ({ x: p.fecha_registro, y: p.valor_ph }));
            if (datos.length) agregarGrafico(contenedor, `pH ${punto}`, datos, '34d399');
        });

        // ---- Gráficos Consumo de Agua (uno por tipo) ----
        const tiposConsumo = [...new Set((consumoRes.data || []).map(c => c.tipo))];
        tiposConsumo.forEach(tipo => {
            const datos = (consumoRes.data || []).filter(c => c.tipo === tipo).map(c => ({ x: c.fecha_registro, y: c.valor_m3 }));
            if (datos.length) agregarGrafico(contenedor, `Consumo ${tipo} (m³)`, datos, 'f59e0b');
        });

        // ---- Gráfico Emisiones SO₂ ----
        if (emisionesRes.data?.length) {
            const datos = emisionesRes.data.map(e => ({ x: e.fecha_registro, y: e.ppm_so2 }));
            agregarGrafico(contenedor, 'Emisiones SO₂ (ppm)', datos, 'ef4444');
        }

        // ---- Gráficos Motores (uno por equipo) ----
        const equiposMotor = [...new Set((motoresRes.data || []).map(m => m.punto_medicion?.tag_equipo))];
        equiposMotor.forEach(equipo => {
            const datos = (motoresRes.data || []).filter(m => m.punto_medicion?.tag_equipo === equipo).map(m => ({ x: m.fecha_registro, y: m.temperatura }));
            if (datos.length) agregarGrafico(contenedor, `Temp. ${equipo} (°C)`, datos, '8b5cf6');
        });

        // ---- Gráfico Fundición ----
        if (fundicionRes.data?.length) {
            const datos = fundicionRes.data.map(f => ({ x: f.fecha_registro, y: f.big_bags }));
            agregarGrafico(contenedor, 'Fundición (Big Bags)', datos, 'ec4899');
        }

        // ---- Gráfico OTs (cantidad por día) ----
        if (otsRes.data?.length) {
            const conteoOT = {};
            otsRes.data.forEach(o => {
                const fecha = o.fecha_solicitud?.split('T')[0];
                if (fecha) conteoOT[fecha] = (conteoOT[fecha] || 0) + 1;
            });
            const datosOT = Object.entries(conteoOT).map(([fecha, cantidad]) => ({ x: fecha, y: cantidad }));
            agregarGrafico(contenedor, 'Órdenes de Trabajo (cantidad/día)', datosOT, '06b6d4');
        }

        // ---- Gráfico Novedades (cantidad por día) ----
        if (novedadesRes.data?.length) {
            const conteoNovedades = {};
            novedadesRes.data.forEach(n => {
                const fecha = n.fecha_novedad?.split('T')[0];
                if (fecha) conteoNovedades[fecha] = (conteoNovedades[fecha] || 0) + 1;
            });
            const datosNovedades = Object.entries(conteoNovedades).map(([fecha, cantidad]) => ({ x: fecha, y: cantidad }));
            agregarGrafico(contenedor, 'Novedades Reportadas (cantidad/día)', datosNovedades, '84cc16');
        }

        if (contenedor.children.length === 0) {
            contenedor.innerHTML = '<p class="text-slate-400 col-span-full">No hay datos en el período seleccionado.</p>';
        }

    } catch (err) {
        contenedor.innerHTML = `<p class="text-red-500 col-span-full">Error al cargar gráficos: ${err.message}</p>`;
        console.error(err);
    }
}

function agregarGrafico(contenedor, titulo, datos, color) {
    const canvasId = `chart-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const div = document.createElement('div');
    div.className = 'bg-slate-900 p-4 rounded border border-slate-700';
    div.innerHTML = `<h3 class="text-sm font-semibold text-slate-300 mb-2">${titulo}</h3><canvas id="${canvasId}" width="400" height="150"></canvas>`;
    contenedor.appendChild(div);

    const ctx = document.getElementById(canvasId).getContext('2d');
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: titulo,
                data: datos,
                borderColor: `#${color}`,
                backgroundColor: `#${color}20`,
                tension: 0.2,
                pointRadius: 2,
                borderWidth: 1.5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { type: 'time', time: { unit: 'day' }, title: { display: false } },
                y: { beginAtZero: false, title: { display: false } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
    window.histGraficos.push(chart);
}