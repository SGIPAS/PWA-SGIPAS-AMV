// ocp Históricos – gráficos de tendencia con selectores de parámetro, equipo y período (corregido)
import { supabase } from '../../supabase-client.js';

export async function renderizarHistoricos(contenedor) {
    // Obtener lista de equipos para motores
    const { data: equiposMotor } = await supabase.from('puntos_medicion_motores').select('tag_equipo').order('tag_equipo');
    const tagsMotor = [...new Set((equiposMotor || []).map(e => e.tag_equipo))];

    contenedor.innerHTML = `
        <div class="space-y-6">
            <div class="flex flex-wrap gap-4 items-end">
                <div>
                    <label class="block text-sm text-slate-400">Parámetro</label>
                    <select id="hist-parametro" class="bg-slate-800 border border-slate-700 rounded p-2 text-white">
                        <option value="acido">Ácido (% concentración)</option>
                        <option value="ph_caldera_acido">pH Caldera de Ácido</option>
                        <option value="ph_calderin">pH Calderín</option>
                        <option value="ph_torre_enfriamiento">pH Torre Enfriamiento</option>
                        <option value="consumo_general">Consumo Agua General</option>
                        <option value="consumo_planta_acido">Consumo Agua Planta Ácido</option>
                        <option value="consumo_caldera_acido">Consumo Agua Caldera Ácido</option>
                        <option value="consumo_caldera_sulfato">Consumo Agua Caldera Sulfato</option>
                        <option value="consumo_planta_sulfato">Consumo Agua Planta Sulfato</option>
                        <option value="emisiones">Emisiones SO₂ (ppm)</option>
                        <option value="fundicion">Fundición (Big Bags)</option>
                        <option value="motores">Temperatura de Motores</option>
                    </select>
                </div>
                <div id="selector-motor" class="hidden">
                    <label class="block text-sm text-slate-400">Equipo</label>
                    <select id="hist-motor" class="bg-slate-800 border border-slate-700 rounded p-2 text-white">
                        ${tagsMotor.map(tag => `<option value="${tag}">${tag}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm text-slate-400">Desde</label>
                    <input type="date" id="hist-desde" class="bg-slate-800 border border-slate-700 rounded p-2 text-white">
                </div>
                <div>
                    <label class="block text-sm text-slate-400">Hasta</label>
                    <input type="date" id="hist-hasta" class="bg-slate-800 border border-slate-700 rounded p-2 text-white">
                </div>
                <button id="btn-cargar-historico" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Cargar</button>
            </div>
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <canvas id="chart-historico" width="400" height="150"></canvas>
            </div>
        </div>
    `;

    // Mostrar/ocultar selector de motor
    const paramSelect = document.getElementById('hist-parametro');
    const motorSelectDiv = document.getElementById('selector-motor');
    paramSelect.addEventListener('change', () => {
        motorSelectDiv.classList.toggle('hidden', paramSelect.value !== 'motores');
    });

    // Fechas por defecto: últimos 7 días
    const hoy = new Date();
    const hace7dias = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);
    document.getElementById('hist-desde').value = hace7dias.toISOString().split('T')[0];
    document.getElementById('hist-hasta').value = hoy.toISOString().split('T')[0];

    document.getElementById('btn-cargar-historico').addEventListener('click', cargarGrafico);

    async function cargarGrafico() {
        const parametro = paramSelect.value;
        let desde = document.getElementById('hist-desde').value;
        let hasta = document.getElementById('hist-hasta').value;

        if (!desde || !hasta) return alert('Seleccione las fechas.');

        // Convertir a formato ISO completo para comparar con timestamps
        desde = new Date(desde).toISOString();           // ej. 2026-07-01T00:00:00.000Z
        hasta = new Date(hasta + 'T23:59:59').toISOString(); // ej. 2026-07-07T23:59:59.000Z

        let datos = [];
        let etiqueta = '';

        try {
            switch (parametro) {
                case 'acido': {
                    const { data, error } = await supabase.from('analisis_acido').select('concentracion, fecha_registro').gte('fecha_registro', desde).lte('fecha_registro', hasta).order('fecha_registro', { ascending: true });
                    if (error) throw error;
                    datos = data?.map(a => ({ x: a.fecha_registro, y: a.concentracion })) || [];
                    etiqueta = '% Concentración';
                    break;
                }
                case 'ph_caldera_acido':
                case 'ph_calderin':
                case 'ph_torre_enfriamiento': {
                    const punto = parametro.replace('ph_', '').replace(/_/g, ' ');
                    const { data, error } = await supabase.from('ph_aguas').select('*').eq('punto_muestreo', punto).gte('fecha_registro', desde).lte('fecha_registro', hasta).order('fecha_registro', { ascending: true });
                    if (error) throw error;
                    datos = data?.map(p => ({ x: p.fecha_registro, y: p.valor_ph })) || [];
                    etiqueta = `pH ${punto}`;
                    break;
                }
                case 'consumo_general':
                case 'consumo_planta_acido':
                case 'consumo_caldera_acido':
                case 'consumo_caldera_sulfato':
                case 'consumo_planta_sulfato': {
                    const tipoMap = {
                        consumo_general: 'general',
                        consumo_planta_acido: 'planta acido',
                        consumo_caldera_acido: 'caldera acido',
                        consumo_caldera_sulfato: 'caldera de sulfato',
                        consumo_planta_sulfato: 'planta sulfato'
                    };
                    const tipo = tipoMap[parametro];
                    const { data, error } = await supabase.from('consumo_agua').select('*').eq('tipo', tipo).gte('fecha_registro', desde).lte('fecha_registro', hasta).order('fecha_registro', { ascending: true });
                    if (error) throw error;
                    datos = data?.map(c => ({ x: c.fecha_registro, y: c.valor_m3 })) || [];
                    etiqueta = `Consumo ${tipo} (m³)`;
                    break;
                }
                case 'emisiones': {
                    const { data, error } = await supabase.from('emisiones_so2').select('ppm_so2, fecha_registro').gte('fecha_registro', desde).lte('fecha_registro', hasta).order('fecha_registro', { ascending: true });
                    if (error) throw error;
                    datos = data?.map(e => ({ x: e.fecha_registro, y: e.ppm_so2 })) || [];
                    etiqueta = 'ppm SO₂';
                    break;
                }
                case 'fundicion': {
                    const { data, error } = await supabase.from('fundicion_diaria').select('big_bags, fecha_registro').gte('fecha_registro', desde).lte('fecha_registro', hasta).order('fecha_registro', { ascending: true });
                    if (error) throw error;
                    datos = data?.map(f => ({ x: f.fecha_registro, y: f.big_bags })) || [];
                    etiqueta = 'Big Bags';
                    break;
                }
                case 'motores': {
                    const motorTag = document.getElementById('hist-motor').value;
                    const { data, error } = await supabase
                        .from('mediciones_motores')
                        .select('temperatura, fecha_registro, punto_medicion!inner(tag_equipo)')
                        .eq('punto_medicion.tag_equipo', motorTag)
                        .gte('fecha_registro', desde)
                        .lte('fecha_registro', hasta)
                        .order('fecha_registro', { ascending: true });
                    if (error) throw error;
                    datos = data?.map(m => ({ x: m.fecha_registro, y: m.temperatura })) || [];
                    etiqueta = `Temp. ${motorTag} (°C)`;
                    break;
                }
            }

            console.log(`Datos obtenidos para ${parametro}:`, datos.length, datos); // depuración

            const ctx = document.getElementById('chart-historico').getContext('2d');
            if (window.miGrafico) window.miGrafico.destroy();

            if (datos.length === 0) {
                contenedor.querySelector('.bg-slate-900').innerHTML = '<p class="text-slate-400">No hay datos para el rango seleccionado.</p>';
                return;
            }

            window.miGrafico = new Chart(ctx, {
                type: 'line',
                data: {
                    datasets: [{
                        label: etiqueta,
                        data: datos,
                        borderColor: '#38bdf8',
                        tension: 0.2,
                        pointRadius: 3
                    }]
                },
                options: {
                    scales: {
                        x: { type: 'time', time: { unit: 'day' } },
                        y: { beginAtZero: false }
                    }
                }
            });
        } catch (err) {
            console.error('Error al cargar gráfico:', err);
            contenedor.querySelector('.bg-slate-900').innerHTML = `<p class="text-red-500">Error: ${err.message}</p>`;
        }
    }

    // Cargar gráfico por defecto
    cargarGrafico();
}