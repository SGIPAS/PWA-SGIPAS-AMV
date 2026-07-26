// ocp Dashboard de tendencias operacionales (versión corregida)
import { supabase } from '../../supabase-client.js';

export async function renderizarTendencias(contenedor, rol) {
    contenedor.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <p class="text-slate-400 text-sm">Concentración promedio (últ. 7 días)</p>
                <p class="text-2xl font-bold text-green-400" id="kpi-conc">-</p>
            </div>
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <p class="text-slate-400 text-sm">Novedades sin OT</p>
                <p class="text-2xl font-bold text-yellow-400" id="kpi-novedades">-</p>
            </div>
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <p class="text-slate-400 text-sm">Próximo registro de agua (10:00)</p>
                <p class="text-2xl font-bold text-blue-400" id="kpi-alerta-agua">-</p>
            </div>
        </div>
        <div class="bg-slate-900 p-4 rounded border border-slate-700">
            <h2 class="text-lg font-semibold text-white mb-4">Concentración de Ácido (7 días)</h2>
            <canvas id="chart-acido" width="400" height="150"></canvas>
        </div>
    `;

    // ocp Cargar KPIs con verificación de existencia de elementos
    const kpiConc = document.getElementById('kpi-conc');
    const kpiNovedades = document.getElementById('kpi-novedades');
    const kpiAlerta = document.getElementById('kpi-alerta-agua');

    if (kpiConc) {
        const { data: acido } = await supabase.from('analisis_acido').select('concentracion').gte('fecha_registro', new Date(Date.now() - 7 * 86400000).toISOString());
        if (acido?.length) {
            const avg = (acido.reduce((s, a) => s + a.concentracion, 0) / acido.length).toFixed(1);
            kpiConc.textContent = `${avg}%`;
        } else {
            kpiConc.textContent = '--';
        }
    }

    if (kpiNovedades) {
        const { count } = await supabase.from('novedades').select('*', { count: 'exact', head: true }).eq('genera_ot', false);
        kpiNovedades.textContent = count ?? 0;
    }

    if (kpiAlerta) kpiAlerta.textContent = '—';

    // ocp Gráfico con Chart.js (solo si existe el canvas)
    if (typeof Chart !== 'undefined') {
        const ctx = document.getElementById('chart-acido')?.getContext('2d');
        if (ctx) {
            const { data: acido } = await supabase.from('analisis_acido').select('concentracion').gte('fecha_registro', new Date(Date.now() - 7 * 86400000).toISOString()).order('fecha_registro', { ascending: true });
            const labels = acido?.map((_, i) => `Día ${i + 1}`) || [];
            const valores = acido?.map(a => a.concentracion) || [];

            new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: '% Concentración',
                        data: valores,
                        borderColor: '#38bdf8',
                        tension: 0.2
                    }]
                },
                options: {
                    scales: { y: { beginAtZero: false } }
                }
            });
        }
    }
}