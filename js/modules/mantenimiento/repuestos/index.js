// ocp Vista de repuestos — catálogo e inventario
import { renderizarListaRepuestos } from './lista.js';

export async function cargarVistaRepuestos(contenedor, rol) {
    contenedor.innerHTML = `
        <div class="mb-4 flex justify-between items-center flex-wrap gap-3">
            <div>
                <h2 class="text-xl font-bold text-white">Catálogo de Repuestos</h2>
                <p class="text-slate-400 text-sm mt-1">Inventario de piezas, insumos y materiales de mantenimiento.</p>
            </div>
            <div class="flex gap-2">
                <button id="btn-refrescar-repuestos" class="bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold py-2 px-3 rounded transition">🔄 Refrescar</button>
                <button id="btn-nuevo-repuesto" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition">+ Nuevo Repuesto</button>
            </div>
        </div>

        <div id="repuestos-filtros" class="bg-slate-900 rounded-lg p-4 mb-4 border border-slate-700"></div>
        <div id="repuestos-lista"></div>
        <div id="modal-repuesto" class="hidden fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm"></div>
        <div id="modal-movimiento" class="hidden fixed inset-0 bg-black/70 flex items-center justify-center z-[60] backdrop-blur-sm"></div>
    `;

    const { renderizarFiltrosRepuestos } = await import('./lista.js');
    renderizarFiltrosRepuestos(document.getElementById('repuestos-filtros'), rol);
    await renderizarListaRepuestos(rol);

    document.getElementById('btn-refrescar-repuestos').addEventListener('click', () => renderizarListaRepuestos(rol));

    document.getElementById('btn-nuevo-repuesto').addEventListener('click', async () => {
        const { abrirModalNuevoRepuesto } = await import('./formulario.js');
        abrirModalNuevoRepuesto(rol);
    });
}