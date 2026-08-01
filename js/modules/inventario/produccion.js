// ocp Submódulo de Producción Diaria y Stock Actual
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
                <h3 class="text-lg font-semibold text-white mb-2">Resumen de Inventario</h3>
                <div id="resumen-stock" class="text-sm text-slate-300 space-y-1">
                    <p class="animate-pulse">Calculando...</p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('prod-fecha').value = new Date().toISOString().split('T')[0];

    document.getElementById('form-produccion').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fecha = document.getElementById('prod-fecha').value;
        const toneladas = parseFloat(document.getElementById('prod-toneladas').value);
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from('produccion_diaria').upsert({
            fecha,
            toneladas,
            registrado_por: user.id
        }, { onConflict: 'fecha' });

        if (error) return alert('Error: ' + error.message);
        alert('Producción registrada.');
        document.getElementById('form-produccion').reset();
        document.getElementById('prod-fecha').value = new Date().toISOString().split('T')[0];
        cargarListaProduccion();
        actualizarResumenStock();
    });

    async function cargarListaProduccion() {
        const container = document.getElementById('lista-produccion');
        const { data, error } = await supabase.from('produccion_diaria').select('*').order('fecha', { ascending: false }).limit(10);
        if (error) { container.innerHTML = '<p class="text-red-500">Error.</p>'; return; }
        if (!data.length) { container.innerHTML = '<p class="text-slate-400">Sin registros.</p>'; return; }
        container.innerHTML = data.map(p => `
            <div class="bg-slate-800 p-2 rounded text-sm flex justify-between">
                <span>${p.fecha}</span>
                <span class="font-bold text-green-400">${p.toneladas.toFixed(3)} ton</span>
            </div>
        `).join('');
    }

    async function actualizarResumenStock() {
        const container = document.getElementById('resumen-stock');
        const { data: produccion } = await supabase.from('produccion_diaria').select('toneladas');
        const totalProducido = produccion?.reduce((s, p) => s + p.toneladas, 0) || 0;
        const { data: movimientos } = await supabase.from('inventario_movimientos').select('tipo_movimiento, toneladas_despachadas');
        let totalDespachado = 0;
        movimientos?.forEach(m => {
            if (m.tipo_movimiento === 'despacho_sulfato' || m.tipo_movimiento === 'despacho_cisterna') {
                totalDespachado += (m.toneladas_despachadas || 0);
            }
        });
        const stock = totalProducido - totalDespachado;
        container.innerHTML = `
            <p>Producción acumulada: <span class="font-bold text-green-400">${totalProducido.toFixed(3)} ton</span></p>
            <p>Despachos acumulados: <span class="font-bold text-yellow-400">${totalDespachado.toFixed(3)} ton</span></p>
            <p class="text-lg font-bold text-blue-400">Stock estimado: ${stock.toFixed(3)} ton</p>
        `;
    }

    await cargarListaProduccion();
    await actualizarResumenStock();
}