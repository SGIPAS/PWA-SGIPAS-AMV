// ocp Informe de Gestión Operacional – con cintillo corporativo público
import { supabase } from '../../supabase-client.js';
import { colorSemaforo, colorClase, generarSparkline } from './utils.js';

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

        const pctCierre = totalOT > 0 ? ((cerradas / totalOT) * 100).toFixed(0) : 0;
        const colorCierre = pctCierre >= 80 ? '#22c55e' : pctCierre >= 50 ? '#eab308' : '#ef4444';

        let html = `
        <div id="reporte-gestion-print" style="background: white; color: #1e293b; padding: 1.5rem; border-radius: 0.5rem; max-width: 1000px; margin: 0 auto; font-family: Arial, sans-serif;">
            <style>
                @media print {
                    body * { visibility: hidden; }
                    #reporte-gestion-print, #reporte-gestion-print * { visibility: visible; }
                    #reporte-gestion-print { position: absolute; left: 0; top: 0; width: 100%; padding: 0.5cm; }
                    .no-print { display: none; }
                }
            </style>
            
            <!-- Cintillo corporativo (URL pública permanente) -->
            <div style="width: 100%; margin-bottom: 1rem; border-bottom: 2px solid #1e3a8a; padding-bottom: 0.5rem;">
                <img src="https://dhxeyusfpuwzpksxmguo.supabase.co/storage/v1/object/public/cintillo/cintillo/cintillo_superior.png" 
                     style="width: 100%; height: auto; display: block;" 
                     onerror="this.style.display='none'">
            </div>

            <h2 style="text-align: center; font-size: 1.4rem; font-weight: bold; margin-bottom: 0.5rem;">INFORME DE GESTIÓN OPERACIONAL</h2>
            <p style="text-align: center; font-size: 0.9rem; margin-bottom: 1rem;">Período: ${desde} – ${hasta}</p>
            
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                <div style="border: 1px solid #cbd5e1; border-radius: 0.5rem; padding: 0.75rem; text-align: center;">
                    <p style="font-size: 0.8rem; font-weight: bold;">Ácido (% promedio)</p>
                    <div style="font-size: 1.8rem; font-weight: bold; color: ${colorAcido};">${promedioAcido}%</div>
                    <div style="margin-top: 0.25rem;">${sparklineAcido}</div>
                </div>
                <div style="border: 1px solid #cbd5e1; border-radius: 0.5rem; padding: 0.75rem; text-align: center;">
                    <p style="font-size: 0.8rem; font-weight: bold;">Big Bags Fundidos</p>
                    <div style="font-size: 1.8rem;">${bigBags}</div>
                </div>
                <div style="border: 1px solid #cbd5e1; border-radius: 0.5rem; padding: 0.75rem; text-align: center;">
                    <p style="font-size: 0.8rem; font-weight: bold;">Órdenes de Trabajo</p>
                    <div style="font-size: 1.8rem;">${totalOT}</div>
                    <p style="font-size: 0.7rem;">Cerradas: ${cerradas}</p>
                </div>
                <div style="border: 1px solid #cbd5e1; border-radius: 0.5rem; padding: 0.75rem; text-align: center;">
                    <p style="font-size: 0.8rem; font-weight: bold;">Cierre de OTs</p>
                    <div style="font-size: 1.8rem; color: ${colorCierre};">${pctCierre}%</div>
                    <p style="font-size: 0.7rem;">${cerradas}/${totalOT}</p>
                </div>
            </div>

            ${novedadesRes.data?.length ? `
            <div style="margin-bottom: 1.5rem;">
                <h3 style="font-size: 1rem; font-weight: bold; margin-bottom: 0.5rem;">Novedades Relevantes</h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">
                    ${novedadesRes.data.slice(0, 6).map(n => `
                        <div style="border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.5rem; display: flex; gap: 0.5rem;">
                            ${n.foto_url ? `<img src="${supabase.storage.from('biblioteca').getPublicUrl(n.foto_url).data.publicUrl}" style="width: 3rem; height: 3rem; object-fit: cover; border-radius: 0.25rem;">` : ''}
                            <div>
                                <p style="font-size: 0.85rem; font-weight: bold;">${n.tag_equipo_area}</p>
                                <p style="font-size: 0.75rem;">${n.descripcion}</p>
                                <p style="font-size: 0.7rem; color: #64748b;">${new Date(n.fecha_novedad).toLocaleDateString('es-VE')}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>` : ''}

            <div style="display: flex; justify-content: space-between; margin-top: 2rem;">
                <div style="text-align: center;">
                    <p style="font-weight: bold;">___________________________</p>
                    <p style="font-size: 0.8rem;">Supervisor de Operaciones</p>
                </div>
                <div style="text-align: center;">
                    <p style="font-weight: bold;">___________________________</p>
                    <p style="font-size: 0.8rem;">Superintendencia de Ácido</p>
                </div>
            </div>
            <div style="text-align: center; margin-top: 1.5rem;" class="no-print">
                <button onclick="window.print()" style="background: #2563eb; color: white; font-weight: bold; padding: 0.5rem 1.5rem; border-radius: 0.5rem; border: none; cursor: pointer;">🖨️ Imprimir Informe</button>
            </div>
        </div>`;
        document.getElementById('vista-informe-gestion').innerHTML = html;
    });
}
