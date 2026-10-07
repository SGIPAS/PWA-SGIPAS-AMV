// ocp Detalle de un repuesto con historial de movimientos
import { supabase } from '../../../supabase-client.js';
import { escapeHtml } from '../../../utils-storage.js';
import { formatearFecha, formatearFechaCorta } from '../utils.js';

// ocp Abrir detalle
export async function abrirDetalleRepuesto(id, rol) {
    const modal = document.getElementById('modal-repuesto');
    if (!modal) return;

    modal.classList.remove('hidden');
    modal.innerHTML = `
        <div class="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
            <p class="text-slate-400 animate-pulse text-center py-12">Cargando detalle...</p>
        </div>
    `;

    const { data: rep, error } = await supabase.from('repuestos').select('*').eq('id', id).single();

    if (error || !rep) {
        modal.innerHTML = `
            <div class="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 w-full max-w-md p-6">
                <p class="text-red-400">Repuesto no encontrado.</p>
                <button id="btn-cerrar-det-rep" class="mt-4 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded">Cerrar</button>
            </div>
        `;
        document.getElementById('btn-cerrar-det-rep').addEventListener('click', cerrarDetalle);
        return;
    }

    // Cargar últimos movimientos del repuesto
    const { data: movs } = await supabase
        .from('movimientos_repuestos')
        .select('*')
        .eq('repuesto_id', id)
        .order('fecha_movimiento', { ascending: false })
        .limit(30);

    const stock = Number(rep.stock_actual);
    const min = Number(rep.stock_minimo);
    const max = Number(rep.stock_maximo || 0);

    let estadoStock = { label: 'Óptimo', cls: 'bg-green-900/50 text-green-300' };
    if (stock === 0) estadoStock = { label: 'Agotado', cls: 'bg-red-900/50 text-red-300' };
    else if (stock <= min) estadoStock = { label: 'Bajo mínimo', cls: 'bg-yellow-900/50 text-yellow-300' };
    else if (max && stock > max) estadoStock = { label: 'Exceso', cls: 'bg-blue-900/50 text-blue-300' };

    const puedeMovimiento = ['admin', 'planificador', 'supervisor'].includes(rol);

    // Historial
    const movsHTML = movs && movs.length
        ? movs.map(m => `
            <div class="bg-slate-900 p-3 rounded border-l-4 ${colorMov(m.tipo_movimiento)}">
                <div class="flex justify-between items-start flex-wrap gap-2 mb-1">
                    <span class="font-semibold text-white text-sm">${labelTipo(m.tipo_movimiento)}</span>
                    <span class="text-xs text-slate-400">${formatearFecha(m.fecha_movimiento)}</span>
                </div>
                <div class="grid grid-cols-3 gap-2 text-xs">
                    <div><span class="text-slate-500">Cantidad:</span> <span class="text-white font-semibold">${Number(m.cantidad).toFixed(2)}</span></div>
                    <div><span class="text-slate-500">Antes:</span> <span class="text-slate-300">${Number(m.stock_anterior).toFixed(2)}</span></div>
                    <div><span class="text-slate-500">Después:</span> <span class="text-slate-300">${Number(m.stock_nuevo).toFixed(2)}</span></div>
                </div>
                ${m.motivo ? `<p class="text-xs text-slate-400 mt-1">${escapeHtml(m.motivo)}</p>` : ''}
                ${m.documento_referencia ? `<p class="text-xs text-slate-500">Doc: ${escapeHtml(m.documento_referencia)}</p>` : ''}
            </div>
        `).join('')
        : '<p class="text-slate-500 text-sm italic text-center py-4">Sin movimientos registrados aún.</p>';

    modal.innerHTML = `
        <div class="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
            <div class="flex justify-between items-start mb-6 border-b border-slate-700 pb-4 flex-wrap gap-3">
                <div>
                    <h2 class="text-2xl font-bold text-white font-mono">${escapeHtml(rep.codigo)}</h2>
                    <p class="text-slate-300 mt-1">${escapeHtml(rep.descripcion)}</p>
                    <div class="flex gap-2 mt-2 flex-wrap">
                        ${rep.categoria ? `<span class="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded capitalize">${escapeHtml(rep.categoria)}</span>` : ''}
                        <span class="px-2 py-0.5 rounded text-xs font-semibold ${estadoStock.cls}">${estadoStock.label}</span>
                    </div>
                </div>
                <button id="btn-cerrar-det-rep" class="text-slate-400 hover:text-white text-2xl font-bold leading-none">✕</button>
            </div>

            <!-- Stock -->
            <div class="grid grid-cols-3 gap-3 mb-6">
                <div class="bg-slate-900 p-4 rounded border border-slate-700 text-center">
                    <p class="text-xs text-slate-500 uppercase">Stock actual</p>
                    <p class="text-2xl font-bold text-white mt-1">${stock.toFixed(2)}</p>
                    <p class="text-xs text-slate-400">${escapeHtml(rep.unidad_medida)}</p>
                </div>
                <div class="bg-slate-900 p-4 rounded border border-slate-700 text-center">
                    <p class="text-xs text-slate-500 uppercase">Stock mínimo</p>
                    <p class="text-2xl font-bold text-yellow-400 mt-1">${min.toFixed(2)}</p>
                    <p class="text-xs text-slate-400">${escapeHtml(rep.unidad_medida)}</p>
                </div>
                <div class="bg-slate-900 p-4 rounded border border-slate-700 text-center">
                    <p class="text-xs text-slate-500 uppercase">Stock máximo</p>
                    <p class="text-2xl font-bold text-blue-400 mt-1">${max ? max.toFixed(2) : '—'}</p>
                    <p class="text-xs text-slate-400">${escapeHtml(rep.unidad_medida)}</p>
                </div>
            </div>

            <!-- Datos generales -->
            <div class="mb-6">
                <h3 class="text-sm font-semibold text-slate-400 uppercase mb-3">Información</h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                        <p class="text-slate-500 text-xs">Ubicación</p>
                        <p class="text-slate-200">${escapeHtml(rep.ubicacion || '—')}</p>
                    </div>
                    <div>
                        <p class="text-slate-500 text-xs">Proveedor</p>
                        <p class="text-slate-200">${escapeHtml(rep.proveedor || '—')}</p>
                    </div>
                    <div>
                        <p class="text-slate-500 text-xs">Código proveedor</p>
                        <p class="text-slate-200 font-mono text-xs">${escapeHtml(rep.codigo_proveedor || '—')}</p>
                    </div>
                    <div>
                        <p class="text-slate-500 text-xs">Costo unitario</p>
                        <p class="text-slate-200">${rep.costo_unitario ? Number(rep.costo_unitario).toFixed(2) + ' ' + escapeHtml(rep.moneda || 'USD') : '—'}</p>
                    </div>
                    <div>
                        <p class="text-slate-500 text-xs">Vida útil (meses)</p>
                        <p class="text-slate-200">${rep.vida_util_meses || '—'}</p>
                    </div>
                    <div>
                        <p class="text-slate-500 text-xs">Vida útil (horas)</p>
                        <p class="text-slate-200">${rep.vida_util_horas || '—'}</p>
                    </div>
                </div>
            </div>

            <!-- Historial -->
            <div class="mb-6">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="text-sm font-semibold text-slate-400 uppercase">Historial de movimientos (${movs?.length || 0})</h3>
                    ${puedeMovimiento ? `<button id="btn-mov-desde-detalle" class="text-xs bg-green-600 hover:bg-green-700 text-white py-1.5 px-3 rounded">+ Movimiento</button>` : ''}
                </div>
                <div class="space-y-2 max-h-72 overflow-y-auto">
                    ${movsHTML}
                </div>
            </div>

            <!-- Notas -->
            ${rep.notas ? `
            <div class="mb-6">
                <h3 class="text-sm font-semibold text-slate-400 uppercase mb-2">Notas</h3>
                <p class="text-slate-300 text-sm whitespace-pre-wrap bg-slate-900 p-3 rounded">${escapeHtml(rep.notas)}</p>
            </div>` : ''}

            <!-- Acciones -->
            <div class="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button id="btn-cerrar-det-rep-2" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded">Cerrar</button>
            </div>
        </div>
    `;

    document.getElementById('btn-cerrar-det-rep').addEventListener('click', cerrarDetalle);
    document.getElementById('btn-cerrar-det-rep-2').addEventListener('click', cerrarDetalle);

    document.getElementById('btn-mov-desde-detalle')?.addEventListener('click', async () => {
        cerrarDetalle();
        const { abrirFormularioMovimiento } = await import('./movimiento-form.js');
        abrirFormularioMovimiento(rep, rol, async () => {
            await abrirDetalleRepuesto(id, rol);
        });
    });
}

// ocp Cerrar
function cerrarDetalle() {
    const modal = document.getElementById('modal-repuesto');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.innerHTML = '';
}

// ocp Color de borde por tipo
function colorMov(tipo) {
    const map = {
        entrada: 'border-green-500',
        salida: 'border-blue-500',
        ajuste_positivo: 'border-cyan-500',
        ajuste_negativo: 'border-orange-500',
        devolucion: 'border-purple-500'
    };
    return map[tipo] || 'border-slate-500';
}

// ocp Label por tipo
function labelTipo(tipo) {
    const map = {
        entrada: '📥 Entrada',
        salida: '📤 Salida',
        ajuste_positivo: '➕ Ajuste positivo',
        ajuste_negativo: '➖ Ajuste negativo',
        devolucion: '↩️ Devolución'
    };
    return map[tipo] || tipo;
}