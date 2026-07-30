// ocp Informe de Gestión Operacional – personalizable, con impresión mejorada y exportación detallada a Excel
import { supabase } from '../../supabase-client.js';
import { colorSemaforo, colorClase, generarSparkline, exportarAExcel } from './utils.js';

let parametrosAgregados = [];

export async function renderizarInformeGestion(contenedor, rol) {
    const { data: puntosPH } = await supabase.from('ph_aguas').select('punto_muestreo').order('punto_muestreo');
    const { data: equiposMotor } = await supabase.from('puntos_medicion_motores').select('tag_equipo').order('tag_equipo');
    const phPuntos = [...new Set((puntosPH || []).map(p => p.punto_muestreo))].filter(p => p !== 'caldera auxiliar');
    const motorTags = [...new Set((equiposMotor || []).map(e => e.tag_equipo))];

    contenedor.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h2 class="text-2xl font-bold text-white">Informe de Gestión Operacional</h2>
                <button id="btn-agregar-parametro" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">+ Agregar Parámetro</button>
            </div>
            <div id="lista-parametros" class="space-y-4"></div>
            <div class="flex gap-4">
                <button id="btn-generar-informe" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded">Generar Informe</button>
                <button id="btn-exportar-excel" class="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-6 rounded hidden">📥 Exportar Excel</button>
            </div>
            <div id="vista-informe-gestion"></div>
        </div>
    `;

    document.getElementById('btn-agregar-parametro').addEventListener('click', () => agregarParametro(phPuntos, motorTags));
    document.getElementById('btn-generar-informe').addEventListener('click', generarInforme);
    document.getElementById('btn-exportar-excel').addEventListener('click', exportarInformeExcel);
}

function agregarParametro(phPuntos, motorTags) {
    const id = Date.now();
    parametrosAgregados.push({ id, tipo: 'acido', desde: '', hasta: '', punto: null, motorTag: null, consumoTipo: null });

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
                <option value="ots">Órdenes de Trabajo</option>
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

    div.querySelector('.param-desde').addEventListener('change', (e) => {
        const item = parametrosAgregados.find(p => p.id == id);
        if (item) item.desde = e.target.value;
    });
    div.querySelector('.param-hasta').addEventListener('change', (e) => {
        const item = parametrosAgregados.find(p => p.id == id);
        if (item) item.hasta = e.target.value;
    });

    div.querySelector('.btn-eliminar-param').addEventListener('click', () => {
        parametrosAgregados = parametrosAgregados.filter(p => p.id != id);
        div.remove();
    });
}

async function generarInforme() {
    const resultados = [];
    for (const param of parametrosAgregados) {
        const tipo = document.querySelector(`.param-tipo[data-id="${param.id}"]`)?.value;
        const desde = document.querySelector(`.param-desde[data-id="${param.id}"]`)?.value;
        const hasta = document.querySelector(`.param-hasta[data-id="${param.id}"]`)?.value;
        if (!desde || !hasta) return alert('Complete todas las fechas.');

        let datos = null;
        let etiqueta = '';

        switch (tipo) {
            case 'acido': {
                const { data } = await supabase.from('analisis_acido').select('*').gte('fecha_registro', desde).lte('fecha_registro', hasta);
                if (data?.length) {
                    const prom = (data.reduce((s, a) => s + a.concentracion, 0) / data.length).toFixed(2);
                    const ntu = (data.reduce((s, a) => s + (a.turbidez_ntu || 0), 0) / data.length).toFixed(2);
                    resultados.push({
                        parametro: 'Ácido Sulfúrico',
                        desde,
                        hasta,
                        resumen: `Conc: ${prom}%, NTU: ${ntu}`,
                        data // guardamos todos los registros para Excel
                    });
                }
                break;
            }
            case 'ph': {
                const punto = document.querySelector(`.param-punto[data-id="${param.id}"]`)?.value;
                const { data } = await supabase.from('ph_aguas').select('*').eq('punto_muestreo', punto).gte('fecha_registro', desde).lte('fecha_registro', hasta);
                if (data?.length) {
                    const prom = (data.reduce((s, p) => s + p.valor_ph, 0) / data.length).toFixed(2);
                    resultados.push({
                        parametro: `pH ${punto}`,
                        desde,
                        hasta,
                        resumen: `Promedio: ${prom}`,
                        data
                    });
                }
                break;
            }
            case 'consumo': {
                const tipoConsumo = document.querySelector(`.param-consumo-tipo[data-id="${param.id}"]`)?.value;
                const { data } = await supabase.from('consumo_agua').select('*').eq('tipo', tipoConsumo).gte('fecha_registro', desde).lte('fecha_registro', hasta);
                if (data?.length) {
                    const prom = (data.reduce((s, c) => s + c.valor_m3, 0) / data.length).toFixed(2);
                    resultados.push({
                        parametro: `Consumo ${tipoConsumo}`,
                        desde,
                        hasta,
                        resumen: `Promedio: ${prom} m³`,
                        data
                    });
                }
                break;
            }
            case 'emisiones': {
                const { data } = await supabase.from('emisiones_so2').select('*').gte('fecha_registro', desde).lte('fecha_registro', hasta);
                if (data?.length) {
                    const prom = (data.reduce((s, e) => s + e.ppm_so2, 0) / data.length).toFixed(1);
                    resultados.push({
                        parametro: 'Emisiones SO₂',
                        desde,
                        hasta,
                        resumen: `ppm: ${prom}`,
                        data
                    });
                }
                break;
            }
            case 'motores': {
                const motor = document.querySelector(`.param-motor[data-id="${param.id}"]`)?.value;
                const { data } = await supabase
                    .from('mediciones_motores')
                    .select('*, punto_medicion!inner(tag_equipo)')
                    .eq('punto_medicion.tag_equipo', motor)
                    .gte('fecha_registro', desde)
                    .lte('fecha_registro', hasta);
                if (data?.length) {
                    const prom = (data.reduce((s, m) => s + m.temperatura, 0) / data.length).toFixed(1);
                    resultados.push({
                        parametro: `Motor ${motor}`,
                        desde,
                        hasta,
                        resumen: `Temp: ${prom}°C`,
                        data
                    });
                }
                break;
            }
            case 'fundicion': {
                const { data } = await supabase.from('fundicion_diaria').select('*').gte('fecha_registro', desde).lte('fecha_registro', hasta);
                if (data?.length) {
                    const total = data.reduce((s, f) => s + (f.big_bags || 0), 0);
                    resultados.push({
                        parametro: 'Fundición',
                        desde,
                        hasta,
                        resumen: `Total: ${total} BB`,
                        data
                    });
                }
                break;
            }
            case 'ots': {
                const { data } = await supabase.from('ordenes_trabajo').select('*').gte('fecha_solicitud', desde).lte('fecha_solicitud', hasta);
                if (data?.length) {
                    const total = data.length;
                    const cerradas = data.filter(o => o.estado === 'cerrada').length;
                    resultados.push({
                        parametro: 'Órdenes de Trabajo',
                        desde,
                        hasta,
                        resumen: `Total: ${total}, Cerradas: ${cerradas}`,
                        data
                    });
                }
                break;
            }
        }
    }

    const vista = document.getElementById('vista-informe-gestion');
    if (resultados.length === 0) {
        vista.innerHTML = '<p class="text-slate-400">No se encontraron datos.</p>';
        document.getElementById('btn-exportar-excel').classList.add('hidden');
        return;
    }

    let html = `<div id="reporte-gestion-print" class="bg-white text-slate-800 p-4 rounded shadow max-w-5xl mx-auto">
        <h2 class="text-xl font-bold mb-4 text-center">INFORME DE GESTIÓN OPERACIONAL</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">`;
    resultados.forEach(r => {
        html += `<div class="border rounded p-3 bg-gray-50">
            <h3 class="font-bold text-sm">${r.parametro}</h3>
            <p class="text-xs text-gray-500">${r.desde} – ${r.hasta}</p>
            <p class="text-sm mt-1">${r.resumen}</p>
        </div>`;
    });
    html += `</div>
        <div class="text-center mt-4 no-print">
            <button onclick="window.print()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2">🖨️ Imprimir</button>
        </div>
    </div>`;

    vista.innerHTML = html;
    document.getElementById('btn-exportar-excel').classList.remove('hidden');
    window.resultadosInforme = resultados; // guardamos con datos completos
}

function exportarInformeExcel() {
    if (!window.resultadosInforme || !window.resultadosInforme.length) return;
    const wb = XLSX.utils.book_new();
    for (const r of window.resultadosInforme) {
        if (r.data && r.data.length > 0) {
            const ws = XLSX.utils.json_to_sheet(r.data);
            XLSX.utils.book_append_sheet(wb, ws, r.parametro.substring(0, 31)); // nombre de hoja limitado
        } else {
            // Crear hoja con el resumen
            const ws = XLSX.utils.json_to_sheet([{ Resumen: r.resumen }]);
            XLSX.utils.book_append_sheet(wb, ws, r.parametro.substring(0, 31));
        }
    }
    XLSX.writeFile(wb, `gestion_operacional_${new Date().toISOString().slice(0,10)}.xlsx`);
}