// ocp Vista global de movimientos de repuestos (kardex general)
import { supabase } from '../../../supabase-client.js';
import { escapeHtml } from '../../../utils-storage.js';
import { formatearFecha } from '../utils.js';

// ocp Vista principal
export async function cargarVistaMovimientosGlobal(contenedor, rol) {
    contenedor.innerHTML = `
        <div class="mb-4 flex justify-between items-center flex-wrap gap-3">
            <div>
                <h2 class="text-xl font-bold text-white">Movimientos de Repuestos</h2>
                <p class="text-slate-400 text-sm mt-1">Kardex general — historial cronológico de entradas, salidas y ajustes.</p>
            </div>
            <button id="btn-refrescar-movs" class="bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold py-2 px-3 rounded transition">🔄 Refrescar</button>
        </div>

        <div id="movs-filtros" class="bg-slate-900 rounded-lg p-4 mb-4 border border-slate-700">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                    <label class="block text-xs text-slate-400 mb-1">Tipo de movimiento</label>
                    <select id="filtro-tipo-mov" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm">
                        <option value="">Todos</option>
                        <option value="entrada">Entradas</option>
                        <option value="salida">Salidas</option>
                        <option value="ajuste_positivo">Ajustes positivos</option>
                        <option value="ajuste_negativo">Ajustes negativos</option>
                        <option value="devolucion">Devoluciones</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs text-slate-400 mb-1">Repuesto</label>
                    <input type="text" id="filtro-repuesto-mov" placeholder="Código del repuesto..."
                        class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm">
                </div>
                <div>
                    <label class="block text-xs text-slate-400 mb-1">Desde (fecha)</label>
                    <input type="date" id="filtro-fecha-mov"
                        class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm">
                </div>
            </div>
            <div class="flex justify-between items-center mt-3">
                <span id="movs-contador" class="text-xs text-slate-400"></span>
                <button id="btn-limpiar-filtros-mov" class="text-xs text-slate-400 hover:text-white transition">Limpiar filtros</button>
            </div>
        </div>

        <div id="movs-lista"></div>
    `;

    const selTipo = document.getElementById('filtro-tipo-mov');
    const inputRepuesto = document.getElementById('filtro-repuesto-mov');
    const inputFecha = document.getElementById('filtro-fecha-mov');

    let debounceTimer;
    inputRepuesto.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => cargarMovimientos(rol), 350);
    });
    selTipo.addEventListener('change', () => cargarMovimientos(rol));
    inputFecha.addEventListener('change', () => cargarMovimientos(rol));

    document.getElementById('btn-refrescar-movs').addEventListener('click', () => cargarMovimientos(rol));

    document.getElementById('btn-limpiar-filtros-mov').addEventListener('click', () => {
        selTipo.value = '';
        inputRepuesto.value = '';
        inputFecha.value = '';
        cargarMovimientos(rol);
    });

    await cargarMovimientos(rol);
}

// ocp Cargar movimientos con filtros
async function cargarMovimientos(rol) {
    const contenedor = document.getElementById('movs-lista');
    const contador = document.getElementById('movs-contador');
    if (!contenedor) return;

    contenedor.innerHTML = '<p class="text-slate-400 animate-pulse text-center py-8">Cargando movimientos...</p>';

    const tipo = document.getElementById('filtro-tipo-mov').value;
    const codRepuesto = document.getElementById('filtro-repuesto-mov').value.trim();
    const fecha = document.getElementById('filtro-fecha-mov').value;

    // Query con join a repuestos
    let query = supabase
        .from('movimientos_repuestos')
        .select('*, repuesto:repuestos(codigo, descripcion, unidad_medida)', { count: 'exact' })
        .order('fecha_movimiento', { ascending: false })
        .limit(200);

    if (tipo) query = query.eq('tipo_movimiento', tipo);
    if (fecha) query = query.gte('fecha_movimiento', fecha + 'T00:00:00');

    const { data, error, count } = await query;

    if (error) {
        contenedor.innerHTML = `<p class="text-red-500 text-center py-8">Error: ${escapeHtml(error.message)}</p>`;
        return;
    }

    // Filtrar por código de repuesto en cliente (join ya trae el código)
    let items = data || [];
    if (codRepuesto) {
        const f = codRepuesto.toLowerCase();
        items = items.filter(m => m.repuesto?.codigo?.toLowerCase().includes(f));
    }

    if (contador) contador.textContent = `Mostrando ${items.length} movimientos`;

    if (items.length === 0) {
        contenedor.innerHTML = '<p class="text-slate-400 text-center py-8">No hay movimientos que coincidan con los filtros.</p>';
        return;
    }

    contenedor.innerHTML = `
        <div class="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse text-sm">
                    <thead class="bg-slate-800 text-slate-400 uppercase text-xs">
                        <tr>
                            <th class="p-3 font-semibold">Fecha</th>
                            <th class="p-3 font-semibold">Tipo</th>
                            <th class="p-3 font-semibold">Repuesto</th>
                            <th class="p-3 font-semibold text-right">Cantidad</th>
                            <th class="p-3 font-semibold text-right">Stock ant.</th>
                            <th class="p-3 font-semibold text-right">Stock nvo.</th>
                            <th class="p-3 font-semibold">Motivo</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-800 text-slate-300">
                        ${items.map(m => `
                            <tr class="hover:bg-slate-800/50">
                                <td class="p-3 text-xs text-slate-400 whitespace-nowrap">${formatearFecha(m.fecha_movimiento)}</td>
                                <td class="p-3">${badgeTipoMov(m.tipo_movimiento)}</td>
                                <td class="p-3">
                                    <div class="font-mono text-white text-xs">${escapeHtml(m.repuesto?.codigo || '—')}</div>
                                    <div class="text-slate-400 text-xs">${escapeHtml((m.repuesto?.descripcion || '').substring(0, 40))}</div>
                                </td>
                                <td class="p-3 text-right font-semibold text-white">${Number(m.cantidad).toFixed(2)}</td>
                                <td class="p-3 text-right text-slate-400">${Number(m.stock_anterior).toFixed(2)}</td>
                                <td class="p-3 text-right text-slate-300">${Number(m.stock_nuevo).toFixed(2)}</td>
                                <td class="p-3 text-slate-400 text-xs max-w-xs truncate" title="${escapeHtml(m.motivo || '')}">${escapeHtml(m.motivo || '—')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ocp Badge según tipo de movimiento
function badgeTipoMov(tipo) {
    const map = {
        entrada: { label: '📥 Entrada', cls: 'bg-green-900/50 text-green-300' },
        salida: { label: '📤 Salida', cls: 'bg-blue-900/50 text-blue-300' },
        ajuste_positivo: { label: '➕ Ajuste +', cls: 'bg-cyan-900/50 text-cyan-300' },
        ajuste_negativo: { label: '➖ Ajuste −', cls: 'bg-orange-900/50 text-orange-300' },
        devolucion: { label: '↩️ Devolución', cls: 'bg-purple-900/50 text-purple-300' }
    };
    const item = map[tipo] || { label: tipo, cls: 'bg-slate-700 text-slate-300' };
    return `<span class="px-2 py-0.5 rounded text-xs font-semibold ${item.cls} whitespace-nowrap">${item.label}</span>`;
}