// ocp Informe de Emisiones SO₂ – plantilla mensual con respaldo fotográfico
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

        const { data: emisiones } = await supabase.from('emisiones_so2').select('*').gte('fecha_registro', inicioSel).lte('fecha_registro', finSel).order('fecha_registro', { ascending: true });

        // Obtener fotos de emisiones del mes
        const { data: fotos } = await supabase.from('emisiones_so2').select('foto_url, fecha_registro').not('foto_url', 'is', null).gte('fecha_registro', inicioSel).lte('fecha_registro', finSel).order('fecha_registro', { ascending: true });

        const nombreMes = new Date(anioSel, mesSel-1).toLocaleDateString('es-VE', { month: 'long', year: 'numeric' });

        let html = `
        <div id="reporte-emisiones-print" class="text-slate-800 bg-white p-6 rounded shadow max-w-4xl mx-auto">
            <style>
                @media print { body * { visibility: hidden; } #reporte-emisiones-print, #reporte-emisiones-print * { visibility: visible; } #reporte-emisiones-print { position: absolute; left: 0; top: 0; width: 100%; } }
            </style>
            <p class="text-right">FECHA: ${ahora.toLocaleDateString('es-VE')}</p>
            <h2 class="text-xl font-bold text-center mb-4">INFORME DE EMISIONES DE ${nombreMes.toUpperCase()}</h2>
            <p class="text-sm mb-4">Se realizaron pruebas de emisiones atmosféricas según el programa de seguimiento con frecuencia semanal los días jueves de cada semana, reportando los siguientes valores:</p>
            <table class="w-full text-sm border mb-4">
                <thead><tr class="bg-gray-200"><th class="border p-1">FECHA</th><th class="border p-1">TASA DE PRODUCCIÓN (TON/DIA)</th><th class="border p-1">FLUJO DE SISTEMA (m³/h)</th><th class="border p-1">EMISIONES MEDIDAS (ppm SO₂)</th><th class="border p-1">OBSERVACIONES</th></tr></thead>
                <tbody>
                ${emisiones?.length ? emisiones.map(e => `
                    <tr>
                        <td class="border p-1">${new Date(e.fecha_registro + 'T00:00:00').toLocaleDateString('es-VE')}</td>
                        <td class="border p-1">${e.temperatura ?? '--'}</td>
                        <td class="border p-1">${e.flujo_sistema ?? e.porcentaje_o2 ?? '--'}</td>
                        <td class="border p-1">${e.ppm_so2 ?? '--'}</td>
                        <td class="border p-1">${e.foto_url ? 'Con evidencia fotográfica' : ''}</td>
                    </tr>
                `).join('') : '<tr><td colspan="5" class="border p-1 text-center">Sin datos</td></tr>'}
                </tbody>
            </table>
            <p class="text-sm"><strong>EQUIPO DE MEDICIÓN UTILIZADO:</strong> ANALIZADOR DE GASES TESTO MODELO 340 CALIBRADO EN OCTUBRE 2025</p>
            <p class="text-sm mb-4"><strong>Observaciones:</strong> En medición se observan emisiones que superan los límites legales según el decreto vigente No. 638 del 25 de abril de 1995 que establece para producción de ácido sulfúrico un límite de emisiones de 1450 mg/m³ equivalente a 554 ppm.</p>
            
            ${fotos?.length ? `
            <div class="mb-4">
                <h3 class="font-bold text-sm mb-2">Respaldo Fotográfico</h3>
                <div class="grid grid-cols-3 gap-2">
                    ${fotos.map(f => `
                        <div>
                            <img src="${supabase.storage.from('biblioteca').getPublicUrl(f.foto_url).data.publicUrl}" class="w-full h-auto rounded">
                            <p class="text-xs text-center">${new Date(f.fecha_registro + 'T00:00:00').toLocaleDateString('es-VE')}</p>
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
        document.getElementById('vista-informe-emisiones').innerHTML = html;
    });
}