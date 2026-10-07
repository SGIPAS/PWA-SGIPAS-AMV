// ocp Listado y filtros de repuestos
import { supabase } from '../../../supabase-client.js';
import { escapeHtml } from '../../../utils-storage.js';

let filtros = {
    busqueda: '',
    categoria: '',
    solo_alerta: false
};

// ocp Categorías predefinidas
const CATEGORIAS = [
    'rodamiento', 'sello', 'empaque', 'valvula', 'electrica',
    'instrumentacion', 'lubricante', 'tuberia', 'quimico', 'otro'
];

// ocp Barra de filtros
export function renderizarFiltrosRepuestos(contenedor, rol) {
    contenedor.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div class="md:col-span-2">
                <label class="block text-xs text-slate-400 mb-1">Búsqueda</label>
                <input type="text" id="filtro-busqueda-rep" placeholder="Código o descripción..." value="${escapeHtml(filtros.busqueda)}"
                    class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm">
            </div>
            <div>
                <label class="block text-xs text-slate-400 mb-1">Categoría</label>
                <select id="filtro-categoria-rep" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm">
                    <option value="">Todas</option>
                    ${CATEGORIAS.map(c => `<option value="${c}" ${filtros.categoria === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
                </select>
            </div>
            <div class="flex items-end">
                <label class="flex items-center text-slate-300 text-sm cursor-pointer">
                    <input type="checkbox" id="filtro-alerta-rep" ${filtros.solo_alerta ? 'checked' : ''}
                        class="h-4 w-4 mr-2 text-red-600 bg-slate-700 border-slate-600 rounded">
                    Solo stock bajo/alerta
                </label>
            </div>
        </div>
        <div class="flex justify-between items-center mt-3">
            <span id="repuestos-contador" class="text-xs text-slate-400"></span>
            <button id="btn-limpiar-filtros-rep" class="text-xs text-slate-400 hover:text-white transition">Limpiar filtros</button>
        </div>
    `;

    const inputBusqueda = document.getElementById('filtro-busqueda-rep');
    const selCategoria = document.getElementById('filtro-categoria-rep');
    const chkAlerta = document.getElementById('filtro-alerta-rep');

    let debounceTimer;
    inputBusqueda.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            filtros.busqueda = inputBusqueda.value.trim();
            renderizarListaRepuestos(rol);
        }, 350);
    });

    selCategoria.addEventListener('change', () => {
        filtros.categoria = selCategoria.value;
        renderizarListaRepuestos(rol);
    });

    chkAlerta.addEventListener('change', () => {
        filtros.solo_alerta = chkAlerta.checked;
        renderizarListaRepuestos(rol);
    });

    document.getElementById('btn-limpiar-filtros-rep').addEventListener('click', () => {
        filtros = { busqueda: '', categoria: '', solo_alerta: false };
        inputBusqueda.value = '';
        selCategoria.value = '';
        chkAlerta.checked = false;
        renderizarListaRepuestos(rol);
    });
}

// ocp Listado principal
export async function renderizarListaRepuestos(rol) {
    const contenedor = document.getElementById('repuestos-lista');
    const contador = document.getElementById('repuestos-contador');
    if (!contenedor) return;

    contenedor.innerHTML = '<p class="text-slate-400 animate-pulse text-center py-8">Cargando repuestos...</p>';

    let query = supabase.from('repuestos').select('*', { count: 'exact' }).eq('activo', true);

    if (filtros.busqueda) {
        const f = `%${filtros.busqueda}%`;
        query = query.or(`codigo.ilike.${f},descripcion.ilike.${f}`);
    }
    if (filtros.categoria) query = query.eq('categoria', filtros.categoria);

    query = query.order('codigo', { ascending: true });

    const { data, error, count } = await query;

    if (error) {
        contenedor.innerHTML = `<p class="text-red-500 text-center py-8">Error: ${escapeHtml(error.message)}</p>`;
        return;
    }

    // Filtrar por stock bajo (post-query)
    let items = data || [];
    if (filtros.solo_alerta) {
        items = items.filter(r => Number(r.stock_actual) <= Number(r.stock_minimo));
    }

    if (contador) contador.textContent = `Mostrando ${items.length} de ${count || 0} repuestos`;

    if (items.length === 0) {
        contenedor.innerHTML = '<p class="text-slate-400 text-center py-8">No hay repuestos que coincidan con los filtros.</p>';
        return;
    }

    const puedeEditar = ['admin', 'planificador'].includes(rol);
    const puedeMovimiento = ['admin', 'planificador', 'supervisor'].includes(rol);

    contenedor.innerHTML = `
        <div class="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse text-sm">
                    <thead class="bg-slate-800 text-slate-400 uppercase text-xs">
                        <tr>
                            <th class="p-3 font-semibold">Código</th>
                            <th class="p-3 font-semibold">Descripción</th>
                            <th class="p-3 font-semibold">Categoría</th>
                            <th class="p-3 font-semibold text-right">Stock</th>
                            <th class="p-3 font-semibold text-right">Mín/Máx</th>
                            <th class="p-3 font-semibold text-right">Ubicación</th>
                            <th class="p-3 font-semibold text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-800 text-slate-300">
                        ${items.map(r => {
                            const stock = Number(r.stock_actual);
                            const min = Number(r.stock_minimo);
                            const max = Number(r.stock_maximo || 0);
                            let stockColor = 'text-green-400';
                            let stockBadge = '';
                            if (stock === 0) {
                                stockColor = 'text-red-400 font-bold';
                                stockBadge = ' 🔴';
                            } else if (stock <= min) {
                                stockColor = 'text-yellow-400 font-bold';
                                stockBadge = ' 🟡';
                            }
                            return `
                                <tr class="hover:bg-slate-800/50">
                                    <td class="p-3 font-mono font-semibold text-white">${escapeHtml(r.codigo)}</td>
                                    <td class="p-3">${escapeHtml(r.descripcion)}</td>
                                    <td class="p-3 capitalize text-slate-400">${escapeHtml(r.categoria || '—')}</td>
                                    <td class="p-3 text-right ${stockColor}">${stock.toFixed(2)} ${escapeHtml(r.unidad_medida)}${stockBadge}</td>
                                    <td class="p-3 text-right text-slate-400 text-xs">${min.toFixed(2)} / ${max ? max.toFixed(2) : '—'}</td>
                                    <td class="p-3 text-right text-slate-400 text-xs">${escapeHtml(r.ubicacion || '—')}</td>
                                    <td class="p-3 text-right whitespace-nowrap">
                                        <button class="btn-ver-repuesto text-blue-400 hover:underline text-xs mr-2" data-id="${r.id}">👁️ Ver</button>
                                        ${puedeMovimiento ? `<button class="btn-movimiento-repuesto text-green-400 hover:underline text-xs mr-2" data-id="${r.id}">📥 Movimiento</button>` : ''}
                                        ${puedeEditar ? `<button class="btn-editar-repuesto text-yellow-400 hover:underline text-xs" data-id="${r.id}">✏️ Editar</button>` : ''}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Listeners
    contenedor.querySelectorAll('.btn-ver-repuesto').forEach(btn => {
        btn.addEventListener('click', async () => {
            const { abrirDetalleRepuesto } = await import('./detalle.js');
            abrirDetalleRepuesto(btn.dataset.id, rol);
        });
    });

    contenedor.querySelectorAll('.btn-editar-repuesto').forEach(btn => {
        btn.addEventListener('click', async () => {
            const { abrirModalEditarRepuesto } = await import('./formulario.js');
            abrirModalEditarRepuesto(btn.dataset.id, rol);
        });
    });

    contenedor.querySelectorAll('.btn-movimiento-repuesto').forEach(btn => {
        btn.addEventListener('click', async () => {
            const { abrirFormularioMovimiento } = await import('./movimiento-form.js');
            // Cargar el repuesto completo
            const { data } = await supabase.from('repuestos').select('*').eq('id', btn.dataset.id).single();
            if (data) abrirFormularioMovimiento(data, rol, () => renderizarListaRepuestos(rol));
        });
    });
}