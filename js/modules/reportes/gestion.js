// ocp Informe de Gestión Operacional – resumen con fotos de novedades
import { supabase } from '../../supabase-client.js';
import { colorSemaforo, colorClase, generarSparkline, generarVelocimetro } from './utils.js';

const UMBRALES = {
  acido: { verde: [98.0, 98.55], amarillo: [[97.5, 98.0], [98.55, 99.0]] }
};

export async function renderizarInformeGestion(contenedor, rol) {
    const hoy = new Date();
    const hace30d = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
    const inicio = hace30d.toISOString().split('T')[0];
    const fin = hoy.toISOString().split('T')[0];

    contenedor.innerHTML = `
        <div class="space-y-4">
            <div class="flex gap-4 items-end flex-wrap">
                <div><label class="block text-sm text-slate-400">Desde</label><input type="date" id="ges-desde" class="bg-slate-800 border border-slate-700 rounded p-2 text-white" value="${inicio}"></div>
                <div><label class="block text-sm text-slate-400">Hasta</label><input type="date" id="ges-hasta" class="bg-slate-800 border border-slate-700 rounded p-2 text-white" value="${fin}"></div>
                <button id="btn-generar-gestion" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Generar Informe</button>
            </div>
            <div id="vista-informe-gestion"></div>
        </div>
    `;

    document.getElementById('btn-generar-gestion').addEventListener('click', async () => {
        const desde = document.getElementById('ges-desde').value;
        const hasta = document.getElementById('ges-hasta').value;
        if (!desde || !hasta) return alert('Seleccione fechas.');

        const [acidoRes, novedadesRes, otRes, fundicionRes] = await Promise.all([
            supabase.from('analisis_acido').select('*').gte('fecha_registro', desde).lte('fecha_registro', hasta).order('fecha_registro', { ascending: true }),
            supabase.from('novedades').select('*').gte('fecha_novedad', desde).lte('fecha_novedad', hasta).order('fecha_novedad', { ascending: false }),
            supabase.from('ordenes_trabajo').select('*').gte('fecha_solicitud', desde).lte('fecha_solicitud', hasta).order('fecha_solicitud', { ascending: false }),
            supabase.from('fundicion_diaria').select('*').gte('fecha_registro', desde).lte('fecha_registro', hasta).order('fecha_registro', { ascending: true })
        ]);

        const acidoDatos = acidoRes.data || [];
        const promedioAcido = acidoDatos.length ? (acidoDatos.reduce((s, a) => s + a.concentracion, 0) / acidoDatos.length).toFixed(2) : '--';
        const semaforoAcido = colorSemaforo(parseFloat(promedioAcido), UMBRALES.acido);
        const colorAcido = colorClase(semaforoAcido);
        const sparklineAcido = generarSparkline(acidoDatos.map(a => a.concentracion), 150, 35, colorAcido);

        const totalOT = otRes.data?.length || 0;
        const cerradas = otRes.data?.filter(o => o.estado === 'cerrada').length || 0;
        const bigBags = fundicionRes.data?.reduce((s, f) => s + (f.big_bags || 0), 0) || 0;

        let html = `
        <div id="reporte-gestion-print" class="text-slate-800 bg-white p-4 rounded shadow max-w-4xl mx-auto">
            <style>
                @media print { body * { visibility: hidden; } #reporte-gestion-print, #reporte-gestion-print * { visibility: visible; } #reporte-gestion-print { position: absolute; left: 0; top: 0; width: 100%; } }
            </style>
            <h2 class="text-xl font-bold text-center mb-4">INFORME DE GESTIÓN OPERACIONAL</h2>
            <p class="text-sm text-center mb-4">Período: ${desde} – ${hasta}</p>
            
            <div class="grid grid-cols-4 gap-4 mb-4">
                <div class="text-center border p-2 rounded">
                    <p class="text-sm font-bold">Ácido (% promedio)</p>
                    <div class="text-2xl font-bold" style="color:${colorAcido}">${promedioAcido}%</div>
                    ${sparklineAcido}
                </div>
                <div class="text-center border p-2 rounded">
                    <p class="text-sm font-bold">Big Bags Fundidos</p>
                    <div class="text-2xl">${bigBags}</div>
                </div>
                <div class="text-center border p-2 rounded">
                    <p class="text-sm font-bold">Órdenes de Trabajo</p>
                    <div class="text-2xl">${totalOT}</div>
                    <p class="text-xs">Cerradas: ${cerradas}</p>
                </div>
                <div class="text-center border p-2 rounded">
                    <p class="text-sm font-bold">Velocímetro (OTs cerradas)</p>
                    ${generarVelocimetro(cerradas, totalOT || 1, '#22c55e')}
                </div>
            </div>

            ${novedadesRes.data?.length ? `
            <div class="mb-4">
                <h3 class="font-bold text-sm mb-2">Novedades Relevantes</h3>
                <div class="grid grid-cols-2 gap-2">
                    ${novedadesRes.data.slice(0, 6).map(n => `
                        <div class="border p-2 rounded flex space-x-2">
                            ${n.foto_url ? `<img src="${supabase.storage.from('biblioteca').getPublicUrl(n.foto_url).data.publicUrl}" class="w-12 h-12 object-cover rounded">` : ''}
                            <div>
                                <p class="text-sm font-semibold">${n.tag_equipo_area}</p>
                                <p class="text-xs">${n.descripcion}</p>
                                <p class="text-xs text-gray-500">${new Date(n.fecha_novedad).toLocaleDateString('es-VE')}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>` : ''}

            <div class="mt-8 flex justify-between">
                <div class="text-center"><p class="font-bold">___________________________</p><p class="text-sm">Supervisor de Operaciones</p></div>
                <div class="text-center"><p class="font-bold">___________________________</p><p class="text-sm">Superintendencia de Ácido</p></div>
            </div>
            <div class="text-center mt-6 no-print">
                <button onclick="window.print()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">🖨️ Imprimir Informe</button>
            </div>
        </div>`;
        document.getElementById('vista-informe-gestion').innerHTML = html;
    });
}