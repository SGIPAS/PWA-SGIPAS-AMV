// ocp Vista de equipos — catálogo de activos
import { renderizarListaEquipos } from './lista.js';

export async function cargarVistaEquipos(contenedor, rol) {
    contenedor.innerHTML = `
        <div class="mb-4 flex justify-between items-center flex-wrap gap-3">
            <div>
                <h2 class="text-xl font-bold text-white">Catálogo de Equipos</h2>
                <p class="text-slate-400 text-sm mt-1">Activos físicos de la Planta de Ácido Sulfúrico.</p>
            </div>
            <div class="flex gap-2">
                <button id="btn-refrescar-equipos" class="bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold py-2 px-3 rounded transition">🔄 Refrescar</button>
                <button id="btn-nuevo-equipo" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition">+ Nuevo Equipo</button>
            </div>
        </div>

        <div id="equipos-filtros" class="bg-slate-900 rounded-lg p-4 mb-4 border border-slate-700"></div>
        <div id="equipos-lista"></div>
        <div id="modal-equipo" class="hidden fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm"></div>
    `;

    // Cargar filtros
    const filtrosCont = document.getElementById('equipos-filtros');
    const { renderizarFiltrosEquipos } = await import('./lista.js');
    renderizarFiltrosEquipos(filtrosCont, rol);

    // Cargar listado inicial
    await renderizarListaEquipos(rol);

    // Botones superiores
    document.getElementById('btn-refrescar-equipos').addEventListener('click', () => renderizarListaEquipos(rol));

    document.getElementById('btn-nuevo-equipo').addEventListener('click', async () => {
        const { abrirModalNuevoEquipo } = await import('./formulario.js');
        abrirModalNuevoEquipo(rol);
    });
}