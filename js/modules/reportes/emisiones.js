// ocp Informe de Emisiones SO₂ – con cintillo corporativo público
import { supabase } from '../../supabase-client.js';

export async function renderizarInformeEmisiones(contenedor) {
    const ahora = new Date();
    const mes = ahora.getMonth();
    const anio = ahora.getFullYear();
    const inicio = new Date(anio, mes, 1).toISOString().split('T')[0];
    const fin = new Date(anio, mes + 1, 0).toISOString().split('T')[0];

    contenedor.innerHTML = `
        <div class="space-y-4">
            <div class="flex gap-4 items-end">
                <div>
                    <label class="block text-sm text-slate-400">Mes</label>
                    <input type="month" id="mes-emisiones" class="bg-slate-800 border border-slate-700 rounded p-2 text-white" value="${anio}-${String(mes+1).padStart(2,'0')}">
                </div>
                <button id="btn-generar-emisiones" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Generar Informe</button>
            </div>
            <div id="vista-informe-emisiones"></div>
        </div>
    `;

    document.getElementById('btn-generar-emisiones').addEventListener('click', async () => {
        const mesVal = document.getElementById('mes-emisiones').value;
        const [anioSel, mesSel] = mesVal.split('-');
        const inicioSel = new Date(anioSel, mesSel-1, 1).toISOString().split('T')[0];
        const finSel = new Date(anioSel, mesSel, 0).toISOString().split('T')[0];

        const { data: emisiones } = await supabase
            .from('emisiones_so2')
            .select('*')
            .gte('fecha_registro', inicioSel)
            .lte('fecha_registro', finSel)
            .order('fecha_registro', { ascending: true });

        const { data: fotos } = await supabase
            .from('emisiones_so2')
            .select('foto_url, fecha_registro')
            .not('foto_url', 'is', null)
            .gte('fecha_registro', inicioSel)
            .lte('fecha_registro', finSel)
            .order('fecha_registro', { ascending: true });

        const nombreMes = new Date(anioSel, mesSel-1).toLocaleDateString('es-VE', { month: 'long', year: 'numeric' });

        let html = `
        <div id="reporte-emisiones-print" style="background: white; color: #1e293b; padding: 1.5rem; border-radius: 0.5rem; max-width: 1000px; margin: 0 auto; font-family: Arial, sans-serif;">
            <style>
                @media print {
                    body * { visibility: hidden; }
                    #reporte-emisiones-print, #reporte-emisiones-print * { visibility: visible; }
                    #reporte-emisiones-print { position: absolute; left: 0; top: 0; width: 100%; padding: 0.5cm; }
                    .no-print { display: none; }
                }
            </style>
            
            <!-- Cintillo corporativo (URL pública permanente) -->
            <div style="width: 100%; margin-bottom: 1rem; border-bottom: 2px solid #1e3a8a; padding-bottom: 0.5rem;">
                <img src="https://dhxeyusfpuwzpksxmguo.supabase.co/storage/v1/object/public/cintillo/cintillo/cintillo_superior.png" 
                     style="width: 100%; height: auto; display: block;" 
                     onerror="this.style.display='none'">
            </div>

            <p style="text-align: right; font-size: 0.8rem;">FECHA: ${ahora.toLocaleDateString('es-VE')}</p>
            <h2 style="text-align: center; font-size: 1.2rem; font-weight: bold; margin-bottom: 0.75rem;">INFORME DE EMISIONES DE ${nombreMes.toUpperCase()}</h2>
            <p style="font-size: 0.85rem; margin-bottom: 0.75rem;">Se realizaron pruebas de emisiones atmosféricas según el programa de seguimiento con frecuencia semanal los días jueves de cada semana, reportando los siguientes valores:</p>
            <table style="width: 100%; font-size: 0.8rem; border-collapse: collapse; margin-bottom: 1rem;">
                <thead><tr style="background: #e2e8f0;"><th style="border: 1px solid #cbd5e1; padding: 0.25rem;">FECHA</th><th style="border: 1px solid #cbd5e1; padding: 0.25rem;">TASA DE PRODUCCIÓN (TON/DIA)</th><th style="border: 1px solid #cbd5e1; padding: 0.25rem;">FLUJO DE SISTEMA (m³/h)</th><th style="border: 1px solid #cbd5e1; padding: 0.25rem;">EMISIONES MEDIDAS (ppm SO₂)</th><th style="border: 1px solid #cbd5e1; padding: 0.25rem;">OBSERVACIONES</th></tr></thead>
                <tbody>
                ${emisiones?.length ? emisiones.map(e => `
                    <tr>
                        <td style="border: 1px solid #e2e8f0; padding: 0.25rem;">${new Date(e.fecha_registro + 'T00:00:00').toLocaleDateString('es-VE')}</td>
                        <td style="border: 1px solid #e2e8f0; padding: 0.25rem;">${e.temperatura ?? '--'}</td>
                        <td style="border: 1px solid #e2e8f0; padding: 0.25rem;">${e.porcentaje_o2 ?? '--'}</td>
                        <td style="border: 1px solid #e2e8f0; padding: 0.25rem;">${e.ppm_so2 ?? '--'}</td>
                        <td style="border: 1px solid #e2e8f0; padding: 0.25rem;">${e.foto_url ? 'Con evidencia fotográfica' : ''}</td>
                    </tr>
                `).join('') : '<tr><td colspan="5" style="border: 1px solid #e2e8f0; padding: 0.25rem; text-align: center;">Sin datos</td></tr>'}
                </tbody>
            </table>
            <p style="font-size: 0.8rem;"><strong>EQUIPO DE MEDICIÓN UTILIZADO:</strong> ANALIZADOR DE GASES TESTO MODELO 340 CALIBRADO EN OCTUBRE 2025</p>
            <p style="font-size: 0.8rem; margin-bottom: 1rem;"><strong>Observaciones:</strong> En medición se observan emisiones que superan los límites legales según el decreto vigente No. 638 del 25 de abril de 1995 que establece para producción de ácido sulfúrico un límite de emisiones de 1450 mg/m³ equivalente a 554 ppm.</p>
            
            ${fotos?.length ? `
            <div style="margin-bottom: 1rem;">
                <h3 style="font-size: 0.9rem; font-weight: bold; margin-bottom: 0.5rem;">Respaldo Fotográfico</h3>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;">
                    ${fotos.map(f => `
                        <div>
                            <img src="${supabase.storage.from('biblioteca').getPublicUrl(f.foto_url).data.publicUrl}" style="width: 100%; height: auto; border-radius: 0.25rem;">
                            <p style="font-size: 0.7rem; text-align: center;">${new Date(f.fecha_registro + 'T00:00:00').toLocaleDateString('es-VE')}</p>
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
        document.getElementById('vista-informe-emisiones').innerHTML = html;
    });
}