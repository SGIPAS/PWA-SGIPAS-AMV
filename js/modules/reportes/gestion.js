// ocp Informe de Gestión Operacional – checklist de parámetros con fechas independientes y cintillo
import { supabase } from '../../supabase-client.js';
import { exportarAExcel } from './utils.js';

let checklistEstado = {};

export async function renderizarInformeGestion(contenedor, rol) {
    // Obtener listas para selectores secundarios
    const { data: puntosPH } = await supabase.from('ph_aguas').select('punto_muestreo').order('punto_muestreo');
    const { data: equiposMotor } = await supabase.from('puntos_medicion_motores').select('tag_equipo').order('tag_equipo');
    const { data: difPuntos } = await supabase.from('diferenciales_presion').select('punto_medicion, tag_equipo').order('tag_equipo');

    const phPuntos = [...new Set((puntosPH || []).map(p => p.punto_muestreo))].filter(p => p !== 'caldera auxiliar');
    const motorTags = [...new Set((equiposMotor || []).map(e => e.tag_equipo))];
    const difUnicos = [...new Set((difPuntos || []).map(d => `${d.tag_equipo} - ${d.punto_medicion}`))];

    // Definir estructura del checklist
    const grupos = [
        {
            nombre: 'Ácido Sulfúrico',
            items: [
                { id: 'acido_conc', etiqueta: 'Concentración (%)', tipo: 'acido', campo: 'concentracion' },
                { id: 'acido_ntu', etiqueta: 'Turbidez (NTU)', tipo: 'acido', campo: 'turbidez_ntu' },
                { id: 'acido_dens', etiqueta: 'Densidad', tipo: 'acido', campo: 'densidad' },
                { id: 'acido_temp', etiqueta: 'Temperatura (°C)', tipo: 'acido', campo: 'temperatura' }
            ]
        },
        {
            nombre: 'pH de Aguas',
            items: phPuntos.map(p => ({
                id: `ph_${p.replace(/\s+/g, '_')}`,
                etiqueta: `pH ${p}`,
                tipo: 'ph',
                punto: p
            }))
        },
        {
            nombre: 'Consumo de Agua',
            items: ['general', 'planta acido', 'caldera acido', 'caldera de sulfato', 'planta sulfato'].map(t => ({
                id: `consumo_${t.replace(/\s+/g, '_')}`,
                etiqueta: `Consumo ${t}`,
                tipo: 'consumo',
                consumoTipo: t
            }))
        },
        {
            nombre: 'Emisiones SO₂',
            items: [
                { id: 'so2_ppm', etiqueta: 'ppm SO₂', tipo: 'emisiones', campo: 'ppm_so2' },
                { id: 'so2_o2', etiqueta: '% O₂', tipo: 'emisiones', campo: 'porcentaje_o2' },
                { id: 'so2_temp', etiqueta: 'Temperatura gases (°C)', tipo: 'emisiones', campo: 'temperatura' }
            ]
        },
        {
            nombre: 'Temperatura de Motores',
            items: motorTags.map(tag => ({
                id: `motor_${tag.replace(/\s+/g, '_')}`,
                etiqueta: `Motor ${tag}`,
                tipo: 'motores',
                motorTag: tag
            }))
        },
        {
            nombre: 'Fundición',
            items: [
                { id: 'fund_bb', etiqueta: 'Big Bags', tipo: 'fundicion', campo: 'big_bags' },
                { id: 'fund_tqa', etiqueta: 'Acidez TQ-A', tipo: 'fundicion', campo: 'acidez_tq_a' },
                { id: 'fund_tqb', etiqueta: 'Acidez TQ-B', tipo: 'fundicion', campo: 'acidez_tq_b' },
                { id: 'fund_tqc', etiqueta: 'Acidez TQ-C', tipo: 'fundicion', campo: 'acidez_tq_c' },
                { id: 'fund_tqd', etiqueta: 'Acidez TQ-D', tipo: 'fundicion', campo: 'acidez_tq_d' }
            ]
        },
        {
            nombre: 'Inventario',
            items: [
                { id: 'inv_entrada', etiqueta: 'Entrada Azufre (ton)', tipo: 'inventario', campo: 'entrada' },
                { id: 'inv_salida', etiqueta: 'Salida Ácido (ton)', tipo: 'inventario', campo: 'salida' }
            ]
        },
        {
            nombre: 'Órdenes de Trabajo',
            items: [
                { id: 'ot_total', etiqueta: 'Total OTs', tipo: 'ots', campo: 'total' },
                { id: 'ot_cerradas', etiqueta: 'OTs Cerradas', tipo: 'ots', campo: 'cerradas' },
                { id: 'ot_pendientes', etiqueta: 'OTs Pendientes', tipo: 'ots', campo: 'pendientes' }
            ]
        },
        {
            nombre: 'Novedades',
            items: [
                { id: 'nov_cant', etiqueta: 'Cantidad de novedades', tipo: 'novedades', campo: 'cantidad' }
            ]
        },
        {
            nombre: 'Paradas de Planta',
            items: [
                { id: 'par_horas', etiqueta: 'Horas de parada', tipo: 'paradas', campo: 'horas' }
            ]
        },
        {
            nombre: 'Diferenciales de Presión',
            items: difUnicos.map(p => ({
                id: `dif_${p.replace(/\s+/g, '_')}`,
                etiqueta: `Dif. ${p}`,
                tipo: 'diferenciales',
                punto: p
            }))
        }
    ];

    let checklistHTML = '';
    grupos.forEach(grupo => {
        checklistHTML += `<div class="mb-4">
            <h3 class="text-md font-semibold text-slate-200 mb-2 border-b border-slate-700 pb-1">${grupo.nombre}</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">`;
        grupo.items.forEach(item => {
            checklistHTML += `
                <div class="flex items-center gap-2 bg-slate-800 p-2 rounded">
                    <input type="checkbox" id="chk_${item.id}" class="check-param h-4 w-4 text-blue-600 bg-slate-700 border-slate-600 rounded" data-id="${item.id}">
                    <label for="chk_${item.id}" class="text-sm text-slate-300 flex-1">${item.etiqueta}</label>
                    <div id="fechas_${item.id}" class="hidden flex gap-1 items-center">
                        <input type="date" class="param-desde bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs w-28" data-id="${item.id}" placeholder="Desde">
                        <input type="date" class="param-hasta bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs w-28" data-id="${item.id}" placeholder="Hasta">
                    </div>
                </div>`;
        });
        checklistHTML += `</div></div>`;
    });

    contenedor.innerHTML = `
        <div class="space-y-6">
            <h2 class="text-2xl font-bold text-white">Informe de Gestión Operacional</h2>
            <div class="bg-slate-800 rounded-lg p-4 border border-slate-700 max-h-96 overflow-y-auto">
                ${checklistHTML}
            </div>
            <div class="flex gap-4">
                <button id="btn-generar-informe" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded">Generar Informe</button>
                <button id="btn-exportar-excel" class="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-6 rounded hidden">📥 Exportar Excel</button>
            </div>
            <div id="vista-informe-gestion"></div>
        </div>
    `;

    // Inicializar estado de los checkboxes
    document.querySelectorAll('.check-param').forEach(chk => {
        const id = chk.dataset.id;
        checklistEstado[id] = checklistEstado[id] || { marcado: false, desde: '', hasta: '' };
        chk.addEventListener('change', function() {
            checklistEstado[id].marcado = this.checked;
            const fechasDiv = document.getElementById(`fechas_${id}`);
            if (this.checked) {
                fechasDiv.classList.remove('hidden');
                if (!checklistEstado[id].desde) {
                    const hoy = new Date();
                    const hace7 = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);
                    checklistEstado[id].desde = hace7.toISOString().split('T')[0];
                    checklistEstado[id].hasta = hoy.toISOString().split('T')[0];
                    fechasDiv.querySelector('.param-desde').value = checklistEstado[id].desde;
                    fechasDiv.querySelector('.param-hasta').value = checklistEstado[id].hasta;
                }
            } else {
                fechasDiv.classList.add('hidden');
            }
        });
        const fechasDiv = document.getElementById(`fechas_${id}`);
        if (fechasDiv) {
            fechasDiv.querySelector('.param-desde').addEventListener('change', e => checklistEstado[id].desde = e.target.value);
            fechasDiv.querySelector('.param-hasta').addEventListener('change', e => checklistEstado[id].hasta = e.target.value);
        }
    });

    document.getElementById('btn-generar-informe').addEventListener('click', () => generarInforme(grupos));
    document.getElementById('btn-exportar-excel').addEventListener('click', exportarInformeExcel);
}

async function generarInforme(grupos) {
    const seleccionados = [];
    grupos.forEach(grupo => {
        grupo.items.forEach(item => {
            const estado = checklistEstado[item.id];
            if (estado && estado.marcado && estado.desde && estado.hasta) {
                seleccionados.push({ ...item, desde: estado.desde, hasta: estado.hasta });
            }
        });
    });

    if (seleccionados.length === 0) {
        alert('Marque al menos un parámetro y configure sus fechas.');
        return;
    }

    const resultados = [];
    for (const param of seleccionados) {
        let datos = null;
        let resumen = '';
        switch (param.tipo) {
            case 'acido': {
                const { data } = await supabase.from('analisis_acido').select('*').gte('fecha_registro', param.desde).lte('fecha_registro', param.hasta);
                if (data?.length) {
                    const vals = data.map(d => d[param.campo]).filter(v => v != null);
                    if (vals.length) {
                        const prom = (vals.reduce((a,b) => a+b,0) / vals.length).toFixed(2);
                        resumen = `Promedio: ${prom}`;
                    }
                    datos = data;
                }
                break;
            }
            case 'ph': {
                const { data } = await supabase.from('ph_aguas').select('valor_ph, fecha_registro').eq('punto_muestreo', param.punto).gte('fecha_registro', param.desde).lte('fecha_registro', param.hasta);
                if (data?.length) {
                    const prom = (data.reduce((s,p) => s+p.valor_ph,0) / data.length).toFixed(2);
                    resumen = `pH promedio: ${prom}`;
                    datos = data;
                }
                break;
            }
            case 'consumo': {
                const { data } = await supabase.from('consumo_agua').select('valor_m3, fecha_registro').eq('tipo', param.consumoTipo).gte('fecha_registro', param.desde).lte('fecha_registro', param.hasta);
                if (data?.length) {
                    const prom = (data.reduce((s,c) => s+c.valor_m3,0) / data.length).toFixed(2);
                    resumen = `Promedio: ${prom} m³`;
                    datos = data;
                }
                break;
            }
            case 'emisiones': {
                const { data } = await supabase.from('emisiones_so2').select('*').gte('fecha_registro', param.desde).lte('fecha_registro', param.hasta);
                if (data?.length) {
                    const vals = data.map(d => d[param.campo]).filter(v => v != null);
                    if (vals.length) {
                        const prom = (vals.reduce((a,b) => a+b,0) / vals.length).toFixed(2);
                        resumen = `Promedio: ${prom}`;
                    }
                    datos = data;
                }
                break;
            }
            case 'motores': {
                const { data } = await supabase.from('mediciones_motores')
                    .select('temperatura, fecha_registro, punto_medicion!inner(tag_equipo)')
                    .eq('punto_medicion.tag_equipo', param.motorTag)
                    .gte('fecha_registro', param.desde).lte('fecha_registro', param.hasta);
                if (data?.length) {
                    const prom = (data.reduce((s,m) => s+m.temperatura,0) / data.length).toFixed(1);
                    resumen = `Temp. promedio: ${prom}°C`;
                    datos = data;
                }
                break;
            }
            case 'fundicion': {
                const { data } = await supabase.from('fundicion_diaria').select('*').gte('fecha_registro', param.desde).lte('fecha_registro', param.hasta);
                if (data?.length) {
                    const vals = data.map(d => d[param.campo]).filter(v => v != null);
                    if (vals.length) {
                        const total = param.campo === 'big_bags' ? vals.reduce((a,b) => a+b,0) : (vals.reduce((a,b) => a+b,0) / vals.length).toFixed(2);
                        resumen = param.campo === 'big_bags' ? `Total: ${total} BB` : `Promedio: ${total}%`;
                    }
                    datos = data;
                }
                break;
            }
            case 'inventario': {
                const { data } = await supabase.from('inventario_movimientos').select('*').gte('fecha_movimiento', param.desde).lte('fecha_movimiento', param.hasta);
                if (data?.length) {
                    if (param.campo === 'entrada') {
                        const total = data.filter(m => m.tipo_movimiento.startsWith('recepcion')).reduce((s,m) => s+(m.peso_neto||0),0);
                        resumen = `Total entrada: ${total.toFixed(1)} ton`;
                    } else {
                        const total = data.filter(m => m.tipo_movimiento.startsWith('despacho')).reduce((s,m) => s+(m.toneladas_despachadas||0),0);
                        resumen = `Total salida: ${total.toFixed(1)} ton`;
                    }
                    datos = data;
                }
                break;
            }
            case 'ots': {
                const { data } = await supabase.from('ordenes_trabajo').select('*').gte('fecha_solicitud', param.desde).lte('fecha_solicitud', param.hasta);
                if (data?.length) {
                    const total = data.length;
                    const cerradas = data.filter(o => o.estado === 'cerrada').length;
                    const pendientes = data.filter(o => o.estado === 'pendiente').length;
                    if (param.campo === 'total') resumen = `Total: ${total}`;
                    else if (param.campo === 'cerradas') resumen = `Cerradas: ${cerradas}`;
                    else resumen = `Pendientes: ${pendientes}`;
                    datos = data;
                }
                break;
            }
            case 'novedades': {
                const { data } = await supabase.from('novedades').select('*').gte('fecha_novedad', param.desde).lte('fecha_novedad', param.hasta);
                if (data?.length) {
                    resumen = `Cantidad: ${data.length}`;
                    datos = data;
                }
                break;
            }
            case 'paradas': {
                const { data } = await supabase.from('paradas_planta').select('*').gte('fecha_inicio', param.desde).lte('fecha_inicio', param.hasta);
                if (data?.length) {
                    const horas = data.reduce((s,p) => s + ((p.fecha_fin ? new Date(p.fecha_fin) - new Date(p.fecha_inicio) : 0)/3600000), 0);
                    resumen = `Horas: ${horas.toFixed(1)}`;
                    datos = data;
                }
                break;
            }
            case 'diferenciales': {
                const [tagEquipo, punto] = param.punto.split(' - ');
                const { data } = await supabase.from('diferenciales_presion').select('*').eq('tag_equipo', tagEquipo).eq('punto_medicion', punto).gte('fecha_registro', param.desde).lte('fecha_registro', param.hasta);
                if (data?.length) {
                    const prom = (data.reduce((s,d) => s+d.valor,0) / data.length).toFixed(2);
                    resumen = `Promedio: ${prom} ${data[0].unidad || ''}`;
                    datos = data;
                }
                break;
            }
        }
        if (resumen) {
            resultados.push({
                parametro: param.etiqueta,
                desde: param.desde,
                hasta: param.hasta,
                resumen,
                data: datos
            });
        }
    }

    const vista = document.getElementById('vista-informe-gestion');
    if (resultados.length === 0) {
        vista.innerHTML = '<p class="text-slate-400">No se encontraron datos para los parámetros seleccionados.</p>';
        document.getElementById('btn-exportar-excel').classList.add('hidden');
        return;
    }

    let html = `<div id="reporte-gestion-print" class="bg-white text-slate-800 p-4 rounded shadow max-w-5xl mx-auto">
        <div style="width: 100%; margin-bottom: 1rem; border-bottom: 2px solid #1e3a8a; padding-bottom: 0.5rem;">
            <img src="cintillo_superior.png" style="width: 100%; height: auto; display: block;" onerror="this.style.display='none'">
        </div>
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
    window.resultadosInforme = resultados;
}

function exportarInformeExcel() {
    if (!window.resultadosInforme || !window.resultadosInforme.length) return;
    const wb = XLSX.utils.book_new();
    for (const r of window.resultadosInforme) {
        if (r.data && r.data.length > 0) {
            const ws = XLSX.utils.json_to_sheet(r.data);
            XLSX.utils.book_append_sheet(wb, ws, r.parametro.substring(0, 31));
        } else {
            const ws = XLSX.utils.json_to_sheet([{ Resumen: r.resumen }]);
            XLSX.utils.book_append_sheet(wb, ws, r.parametro.substring(0, 31));
        }
    }
    XLSX.writeFile(wb, `gestion_operacional_${new Date().toISOString().slice(0,10)}.xlsx`);
}
