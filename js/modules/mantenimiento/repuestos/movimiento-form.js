// ocp Formulario de movimiento de repuesto (entrada/salida/ajuste)
import { supabase } from '../../../supabase-client.js';
import { escapeHtml } from '../../../utils-storage.js';

const TIPOS_MOV = [
    { value: 'entrada', label: '📥 Entrada (compra/recepción)' },
    { value: 'salida', label: '📤 Salida (uso en OT/mantenimiento)' },
    { value: 'ajuste_positivo', label: '➕ Ajuste positivo (conteo físico)' },
    { value: 'ajuste_negativo', label: '➖ Ajuste negativo (conteo físico)' },
    { value: 'devolucion', label: '↩️ Devolución al almacén' }
];

// ocp Abrir formulario de movimiento
export function abrirFormularioMovimiento(repuesto, rol, onSuccess) {
    let modal = document.getElementById('modal-movimiento');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-movimiento';
        modal.className = 'hidden fixed inset-0 bg-black/70 flex items-center justify-center z-[60] backdrop-blur-sm';
        document.body.appendChild(modal);
    }
    modal.classList.remove('hidden');

    const stockActual = Number(repuesto.stock_actual);

    modal.innerHTML = `
        <div class="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div class="flex justify-between items-start mb-4 border-b border-slate-700 pb-3">
                <div>
                    <h2 class="text-xl font-bold text-white">Registrar Movimiento</h2>
                    <p class="text-slate-400 text-sm mt-1 font-mono">${escapeHtml(repuesto.codigo)} — ${escapeHtml(repuesto.descripcion)}</p>
                    <p class="text-slate-400 text-xs mt-1">Stock actual: <span class="text-white font-bold">${stockActual.toFixed(2)} ${escapeHtml(repuesto.unidad_medida)}</span></p>
                </div>
                <button id="btn-cerrar-mov" class="text-slate-400 hover:text-white text-2xl font-bold leading-none">✕</button>
            </div>

            <form id="form-movimiento" class="space-y-4">
                <div>
                    <label class="block text-slate-400 text-sm mb-1">Tipo de movimiento *</label>
                    <select id="mov-tipo" required class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                        <option value="">— Seleccionar —</option>
                        ${TIPOS_MOV.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
                    </select>
                </div>

                <div>
                    <label class="block text-slate-400 text-sm mb-1">Cantidad *</label>
                    <input type="number" id="mov-cantidad" required min="0.01" step="0.01" placeholder="0.00"
                        class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                    <p class="text-xs text-slate-500 mt-1" id="mov-preview-stock"></p>
                </div>

                <div>
                    <label class="block text-slate-400 text-sm mb-1">Motivo *</label>
                    <input type="text" id="mov-motivo" required placeholder="Ej: Compra según OC-2026-045"
                        class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                </div>

                <div id="bloque-entrada" class="hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Costo unitario</label>
                        <input type="number" id="mov-costo" min="0" step="0.01" value="${repuesto.costo_unitario || ''}"
                            class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Proveedor</label>
                        <input type="text" id="mov-proveedor" value="${escapeHtml(repuesto.proveedor || '')}"
                            class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                    </div>
                </div>

                <div>
                    <label class="block text-slate-400 text-sm mb-1">Documento de referencia</label>
                    <input type="text" id="mov-documento" placeholder="Ej: OC-2026-045 / Factura 12345 / Acta conteo"
                        class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                </div>

                <div>
                    <label class="block text-slate-400 text-sm mb-1">Observaciones</label>
                    <textarea id="mov-observaciones" rows="2" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"></textarea>
                </div>

                <p id="mov-error" class="text-red-400 text-sm hidden"></p>

                <div class="flex justify-end gap-3 pt-4 border-t border-slate-700">
                    <button type="button" id="btn-cancelar-mov" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded">Cancelar</button>
                    <button type="submit" id="btn-guardar-mov" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-bold">Registrar movimiento</button>
                </div>
            </form>
        </div>
    `;

    const selTipo = document.getElementById('mov-tipo');
    const inputCantidad = document.getElementById('mov-cantidad');
    const preview = document.getElementById('mov-preview-stock');
    const bloqueEntrada = document.getElementById('bloque-entrada');

    // ocp Mostrar bloque entrada + preview de stock
    function actualizarPreview() {
        const tipo = selTipo.value;
        const cant = parseFloat(inputCantidad.value) || 0;

        if (tipo === 'entrada' || tipo === 'devolucion') {
            bloqueEntrada.classList.remove('hidden');
            bloqueEntrada.classList.add('grid');
        } else {
            bloqueEntrada.classList.add('hidden');
            bloqueEntrada.classList.remove('grid');
        }

        if (!tipo || cant <= 0) {
            preview.textContent = '';
            return;
        }

        let nuevo = stockActual;
        switch (tipo) {
            case 'entrada':
            case 'ajuste_positivo':
            case 'devolucion':
                nuevo = stockActual + cant;
                break;
            case 'salida':
            case 'ajuste_negativo':
                nuevo = stockActual - cant;
                break;
        }

        if (nuevo < 0) {
            preview.innerHTML = `⚠️ Stock resultante: <span class="text-red-400 font-bold">${nuevo.toFixed(2)}</span> — quedará negativo, revise la cantidad.`;
        } else {
            preview.innerHTML = `Stock resultante: <span class="text-white font-bold">${nuevo.toFixed(2)} ${escapeHtml(repuesto.unidad_medida)}</span>`;
        }
    }

    selTipo.addEventListener('change', actualizarPreview);
    inputCantidad.addEventListener('input', actualizarPreview);

    // ocp Cerrar
    const cerrar = () => {
        modal.classList.add('hidden');
        modal.innerHTML = '';
    };

    document.getElementById('btn-cerrar-mov').addEventListener('click', cerrar);
    document.getElementById('btn-cancelar-mov').addEventListener('click', cerrar);

    // ocp Submit
    document.getElementById('form-movimiento').addEventListener('submit', async (e) => {
        e.preventDefault();
        await guardarMovimiento(repuesto, cerrar, onSuccess);
    });
}

// ocp Guardar movimiento
async function guardarMovimiento(repuesto, cerrar, onSuccess) {
    const btn = document.getElementById('btn-guardar-mov');
    const errorEl = document.getElementById('mov-error');
    btn.disabled = true;
    btn.textContent = 'Registrando...';
    errorEl.classList.add('hidden');

    const tipo_movimiento = document.getElementById('mov-tipo').value;
    const cantidad = parseFloat(document.getElementById('mov-cantidad').value) || 0;
    const motivo = document.getElementById('mov-motivo').value.trim();
    const costo_unitario = parseFloat(document.getElementById('mov-costo')?.value) || null;
    const proveedor = document.getElementById('mov-proveedor')?.value.trim() || null;
    const documento_referencia = document.getElementById('mov-documento').value.trim() || null;
    const observaciones = document.getElementById('mov-observaciones').value.trim() || null;

    if (!tipo_movimiento || cantidad <= 0 || !motivo) {
        errorEl.textContent = 'Complete tipo, cantidad y motivo.';
        errorEl.classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = 'Registrar movimiento';
        return;
    }

    try {
        const { data, error } = await supabase.rpc('registrar_movimiento_repuesto', {
            p_repuesto_id: repuesto.id,
            p_tipo_movimiento: tipo_movimiento,
            p_cantidad: cantidad,
            p_motivo: motivo,
            p_costo_unitario: costo_unitario,
            p_proveedor: proveedor,
            p_documento_referencia: documento_referencia,
            p_observaciones: observaciones
        });

        if (error) throw error;

        cerrar();

        // Aviso de alerta si el stock quedó bajo mínimo
        if (data?.alerta_stock_bajo) {
            setTimeout(() => {
                alert(`⚠️ Movimiento registrado.\n\nEl stock actual (${data.stock_nuevo}) está en o por debajo del mínimo configurado. Se recomienda iniciar reposición.`);
            }, 100);
        } else {
            setTimeout(() => alert('Movimiento registrado correctamente.'), 100);
        }

        if (typeof onSuccess === 'function') await onSuccess();

    } catch (err) {
        console.error('Error al registrar movimiento:', err);
        errorEl.textContent = 'Error: ' + (err.message || 'No se pudo registrar el movimiento.');
        errorEl.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Registrar movimiento';
    }
}