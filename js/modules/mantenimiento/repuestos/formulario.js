// ocp Formulario crear/editar repuesto
import { supabase } from '../../../supabase-client.js';
import { escapeHtml } from '../../../utils-storage.js';
import { renderizarListaRepuestos } from './lista.js';

const CATEGORIAS = [
    'rodamiento', 'sello', 'empaque', 'valvula', 'electrica',
    'instrumentacion', 'lubricante', 'tuberia', 'quimico', 'otro'
];

const UNIDADES = ['unidad', 'metro', 'litro', 'kg', 'caja', 'rollo', 'par'];

// ocp Crear
export function abrirModalNuevoRepuesto(rol) {
    abrirModalRepuesto(null, rol);
}

// ocp Editar
export async function abrirModalEditarRepuesto(id, rol) {
    const { data, error } = await supabase.from('repuestos').select('*').eq('id', id).single();
    if (error || !data) {
        alert('Repuesto no encontrado.');
        return;
    }
    abrirModalRepuesto(data, rol);
}

// ocp Cerrar
function cerrarModal() {
    const modal = document.getElementById('modal-repuesto');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.innerHTML = '';
}

// ocp Modal principal
function abrirModalRepuesto(repuesto, rol) {
    const modal = document.getElementById('modal-repuesto');
    if (!modal) return;

    const esEdicion = !!repuesto;
    const r = repuesto || {
        codigo: '', descripcion: '', categoria: '', unidad_medida: 'unidad',
        stock_actual: 0, stock_minimo: 0, stock_maximo: null,
        ubicacion: '', proveedor: '', codigo_proveedor: '',
        costo_unitario: null, moneda: 'USD',
        vida_util_meses: null, vida_util_horas: null, notas: ''
    };

    modal.classList.remove('hidden');
    modal.innerHTML = `
        <div class="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
            <h2 class="text-xl font-bold text-white mb-4 border-b border-slate-700 pb-2">
                ${esEdicion ? 'Editar Repuesto: ' + escapeHtml(r.codigo) : 'Nuevo Repuesto'}
            </h2>
            <form id="form-repuesto" class="space-y-4">
                <input type="hidden" id="rep-id" value="${escapeHtml(r.id || '')}">

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Código *</label>
                        <input type="text" id="rep-codigo" required value="${escapeHtml(r.codigo)}"
                            placeholder="Ej: RP-0001" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono">
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Categoría</label>
                        <select id="rep-categoria" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                            <option value="">— Seleccionar —</option>
                            ${CATEGORIAS.map(c => `<option value="${c}" ${r.categoria === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div>
                    <label class="block text-slate-400 text-sm mb-1">Descripción *</label>
                    <input type="text" id="rep-descripcion" required value="${escapeHtml(r.descripcion)}"
                        placeholder="Ej: Rodamiento SKF 6308 2RS"
                        class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Unidad de medida *</label>
                        <select id="rep-unidad" required class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                            ${UNIDADES.map(u => `<option value="${u}" ${r.unidad_medida === u ? 'selected' : ''}>${escapeHtml(u)}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Stock mínimo *</label>
                        <input type="number" id="rep-stock-min" required min="0" step="0.01" value="${r.stock_minimo}"
                            class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                        <p class="text-xs text-slate-500 mt-1">Dispara alerta cuando el stock baja a este nivel.</p>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Stock máximo</label>
                        <input type="number" id="rep-stock-max" min="0" step="0.01" value="${r.stock_maximo || ''}"
                            class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                    </div>
                </div>

                ${!esEdicion ? `
                <div>
                    <label class="block text-slate-400 text-sm mb-1">Stock inicial</label>
                    <input type="number" id="rep-stock-inicial" min="0" step="0.01" value="0"
                        class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                    <p class="text-xs text-slate-500 mt-1">Si es mayor a 0, se registrará automáticamente como una entrada inicial en el historial.</p>
                </div>` : `
                <div class="bg-slate-900 p-3 rounded border border-slate-700">
                    <p class="text-xs text-slate-400">Stock actual: <span class="text-white font-bold">${Number(r.stock_actual).toFixed(2)} ${escapeHtml(r.unidad_medida)}</span></p>
                    <p class="text-xs text-slate-500 mt-1">Para modificar el stock usa el botón "Movimiento" en la lista.</p>
                </div>`}

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Ubicación en almacén</label>
                        <input type="text" id="rep-ubicacion" value="${escapeHtml(r.ubicacion || '')}"
                            placeholder="Ej: Almacén A - Estante 3 - Nivel 2"
                            class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Proveedor</label>
                        <input type="text" id="rep-proveedor" value="${escapeHtml(r.proveedor || '')}"
                            class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Código del proveedor</label>
                        <input type="text" id="rep-cod-proveedor" value="${escapeHtml(r.codigo_proveedor || '')}"
                            class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Costo unitario</label>
                        <input type="number" id="rep-costo" min="0" step="0.01" value="${r.costo_unitario || ''}"
                            class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Moneda</label>
                        <select id="rep-moneda" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                            <option value="USD" ${r.moneda === 'USD' ? 'selected' : ''}>USD</option>
                            <option value="VES" ${r.moneda === 'VES' ? 'selected' : ''}>VES</option>
                            <option value="EUR" ${r.moneda === 'EUR' ? 'selected' : ''}>EUR</option>
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Vida útil (meses)</label>
                        <input type="number" id="rep-vida-meses" min="0" value="${r.vida_util_meses || ''}"
                            placeholder="Ej: 48"
                            class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Vida útil (horas de operación)</label>
                        <input type="number" id="rep-vida-horas" min="0" value="${r.vida_util_horas || ''}"
                            placeholder="Ej: 20000"
                            class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                    </div>
                </div>

                <div>
                    <label class="block text-slate-400 text-sm mb-1">Notas</label>
                    <textarea id="rep-notas" rows="2" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">${escapeHtml(r.notas || '')}</textarea>
                </div>

                <p id="rep-error" class="text-red-400 text-sm hidden"></p>

                <div class="flex justify-end gap-3 pt-4 border-t border-slate-700">
                    <button type="button" id="btn-cerrar-modal-rep" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded">Cancelar</button>
                    <button type="submit" id="btn-guardar-rep" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold">Guardar</button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('btn-cerrar-modal-rep').addEventListener('click', cerrarModal);

    document.getElementById('form-repuesto').addEventListener('submit', async (e) => {
        e.preventDefault();
        await guardarRepuesto(rol, esEdicion);
    });
}

// ocp Guardar repuesto
async function guardarRepuesto(rol, esEdicion) {
    const btn = document.getElementById('btn-guardar-rep');
    const errorEl = document.getElementById('rep-error');
    btn.disabled = true;
    btn.textContent = 'Guardando...';
    errorEl.classList.add('hidden');

    const id = document.getElementById('rep-id').value;
    const codigo = document.getElementById('rep-codigo').value.trim();
    const descripcion = document.getElementById('rep-descripcion').value.trim();
    const categoria = document.getElementById('rep-categoria').value || null;
    const unidad_medida = document.getElementById('rep-unidad').value;
    const stock_minimo = parseFloat(document.getElementById('rep-stock-min').value) || 0;
    const stock_maximo = parseFloat(document.getElementById('rep-stock-max').value) || null;
    const ubicacion = document.getElementById('rep-ubicacion').value.trim() || null;
    const proveedor = document.getElementById('rep-proveedor').value.trim() || null;
    const codigo_proveedor = document.getElementById('rep-cod-proveedor').value.trim() || null;
    const costo_unitario = parseFloat(document.getElementById('rep-costo').value) || null;
    const moneda = document.getElementById('rep-moneda').value;
    const vida_util_meses = parseInt(document.getElementById('rep-vida-meses').value) || null;
    const vida_util_horas = parseInt(document.getElementById('rep-vida-horas').value) || null;
    const notas = document.getElementById('rep-notas').value.trim() || null;

    if (!codigo || !descripcion) {
        errorEl.textContent = 'Código y descripción son obligatorios.';
        errorEl.classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = 'Guardar';
        return;
    }

    if (stock_maximo !== null && stock_maximo < stock_minimo) {
        errorEl.textContent = 'El stock máximo no puede ser menor al mínimo.';
        errorEl.classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = 'Guardar';
        return;
    }

    const payload = {
        codigo, descripcion, categoria, unidad_medida,
        stock_minimo, stock_maximo, ubicacion, proveedor,
        codigo_proveedor, costo_unitario, moneda,
        vida_util_meses, vida_util_horas, notas,
        updated_at: new Date().toISOString()
    };

    try {
        if (esEdicion && id) {
            const { error } = await supabase.from('repuestos').update(payload).eq('id', id);
            if (error) throw error;
        } else {
            const stockInicial = parseFloat(document.getElementById('rep-stock-inicial').value) || 0;
            payload.stock_actual = stockInicial;

            const { data: nuevo, error } = await supabase.from('repuestos').insert(payload).select().single();
            if (error) throw error;

            // Si hay stock inicial > 0, registrar entrada
            if (stockInicial > 0 && nuevo) {
                const { error: rpcError } = await supabase.rpc('registrar_movimiento_repuesto', {
                    p_repuesto_id: nuevo.id,
                    p_tipo_movimiento: 'entrada',
                    p_cantidad: stockInicial,
                    p_motivo: 'Stock inicial al crear el repuesto'
                });
                if (rpcError) console.error('Error al registrar stock inicial:', rpcError);
            }
        }

        cerrarModal();
        await renderizarListaRepuestos(rol);

    } catch (err) {
        if (err.code === '23505') {
            errorEl.textContent = 'Ya existe un repuesto con ese código.';
        } else {
            errorEl.textContent = 'Error: ' + err.message;
        }
        errorEl.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Guardar';
    }
}