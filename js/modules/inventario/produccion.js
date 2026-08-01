// ocp Submódulo de Producción Diaria y Stock Actual (con desglose por tanque y certificaciones)
import { supabase } from '../../supabase-client.js';

export async function renderizarProduccion(contenedor) {
    contenedor.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Registrar Producción Diaria</h3>
                <form id="form-produccion" class="space-y-4">
                    <div>
                        <label class="block text-slate-400 text-sm">Fecha</label>
                        <input type="date" id="prod-fecha" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">Tanque</label>
                        <select id="prod-tanque" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
                            <option value="">Seleccione...</option>
                            <option value="A">TQ-A</option>
                            <option value="B">TQ-B</option>
                            <option value="C">TQ-C</option>
                            <option value="D">TQ-D</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">Toneladas Producidas</label>
                        <input type="number" step="0.001" id="prod-toneladas" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">Guardar Producción</button>
                </form>
            </div>
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Últimos Registros</h3>
                <div id="lista-produccion" class="space-y-2 max-h-48 overflow-y-auto mb-4">
                    <p class="text-slate-400 animate-pulse">Cargando...</p>
                </div>
                <h3 class="text-lg font-semibold text-white mb-2">Inventario Actual por Tanque</h3>
                <div id="resumen-stock" class="text-sm text-slate-300 space-y-2">
                    <p class="animate-pulse">Calculando...</p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('prod-fecha').value = new Date().toISOString().split('T')[0];

    document.getElementById('form-produccion').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fecha = document.getElementById('prod-fecha').value;
        const tanque = document.getElementById('prod-tanque').value;
        const toneladas = parseFloat(document.getElementById('prod-toneladas').value);
        const { data: { user } } = await supabase.auth.getUser();

        if (!tanque) return alert('Seleccione un tanque.');

        // Insertar o actualizar producción para ese día y tanque (podría haber múltiples registros por día si se produce en varios tanques)
        const { error } = await supabase.from('produccion_diaria').insert({
            fecha,
            tanque,
            toneladas,
            registrado_por: user.id
        });

        if (error) return alert('Error: ' + error.message);
        alert('Producción registrada.');
        document.getElementById('form-produccion').reset();
        document.getElementById('prod-fecha').value = new Date().toISOString().split('T')[0];
        cargarListaProduccion();
        actualizarResumenStock();
    });

    await cargarListaProduccion();
    await actualizarResumenStock();
}

// ocp Carga la lista de últimas producciones registradas
async function cargarListaProduccion() {
    const container = document.getElementById('lista-produccion');
    const { data, error } = await supabase.from('produccion_diaria').select('*').order('fecha', { ascending: false }).limit(10);
    if (error) { container.innerHTML = '<p class="text-red-500">Error.</p>'; return; }
    if (!data.length) { container.innerHTML = '<p class="text-slate-400">Sin registros.</p>'; return; }
    container.innerHTML = data.map(p => `
        <div class="bg-slate-800 p-2 rounded text-sm flex justify-between">
            <span>${p.fecha} (TQ-${p.tanque || '?'})</span>
            <span class="font-bold text-green-400">${p.toneladas.toFixed(3)} ton</span>
        </div>
    `).join('');
}

// ocp Calcula y muestra el stock por tanque, incluyendo certificaciones
async function actualizarResumenStock() {
    const container = document.getElementById('resumen-stock');

    // Obtener producción agrupada por tanque
    const { data: produccion } = await supabase.from('produccion_diaria').select('tanque, toneladas');
    const prodPorTanque = { A: 0, B: 0, C: 0, D: 0 };
    produccion?.forEach(p => {
        if (p.tanque && prodPorTanque.hasOwnProperty(p.tanque)) {
            prodPorTanque[p.tanque] += p.toneladas;
        }
    });

    // Obtener despachos que tengan tanque_origen definido
    const { data: despachos } = await supabase
        .from('inventario_movimientos')
        .select('tanque_origen, toneladas_despachadas')
        .in('tipo_movimiento', ['despacho_sulfato', 'despacho_cisterna'])
        .not('tanque_origen', 'is', null);

    const despPorTanque = { A: 0, B: 0, C: 0, D: 0 };
    despachos?.forEach(d => {
        if (d.tanque_origen && despPorTanque.hasOwnProperty(d.tanque_origen)) {
            despPorTanque[d.tanque_origen] += (d.toneladas_despachadas || 0);
        }
    });

    // Obtener últimas certificaciones por tanque (la más reciente de cada uno)
    const { data: certificaciones } = await supabase
        .from('certificaciones_acido')
        .select('*')
        .order('fecha_analisis', { ascending: false });

    // Agrupar última certificación por tanque
    const certPorTanque = {};
    certificaciones?.forEach(c => {
        if (!certPorTanque[c.tanque]) {
            certPorTanque[c.tanque] = c;
        }
    });

    let html = '';
    let totalGeneral = 0;
    const tanques = ['A', 'B', 'C', 'D'];

    tanques.forEach(tq => {
        const stock = prodPorTanque[tq] - despPorTanque[tq];
        totalGeneral += stock;
        const cert = certPorTanque[tq];
        const vigente = cert && new Date(cert.fecha_vigencia) >= new Date();
        html += `
            <div class="border border-slate-600 rounded p-2">
                <p class="font-bold text-white">Tanque ${tq}: ${stock.toFixed(3)} ton</p>
                ${cert ? `
                    <p class="text-xs text-slate-400">
                        Cert: ${cert.concentracion}% | Fe: ${cert.ppm_fe ?? '--'} ppm | NTU: ${cert.ntu ?? '--'} 
                        <br>Vence: ${new Date(cert.fecha_vigencia).toLocaleDateString('es-VE')}
                        ${!vigente ? '<span class="text-red-500 ml-1">(Vencida)</span>' : ''}
                    </p>
                ` : '<p class="text-xs text-slate-500">Sin certificación</p>'}
            </div>
        `;
    });

    html += `<div class="border-t border-slate-600 pt-2 mt-2 font-bold text-lg text-blue-400">
        Stock General: ${totalGeneral.toFixed(3)} ton
    </div>`;

    container.innerHTML = html;
}