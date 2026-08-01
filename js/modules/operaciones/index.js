// ocp Módulo de Inventario y Producción – orquestador con subpestañas (versión corregida)
import { renderizarMovimientos } from './movimientos.js';
import { renderizarProduccion } from './produccion.js';

export async function renderizarInventario(contenedor, rol) {
    contenedor.innerHTML = `
        <div class="mb-6">
            <h1 class="text-3xl font-bold text-slate-100">Inventario y Producción</h1>
            <p class="text-slate-400 mt-1">Recepción, despachos y control diario de producción.</p>
        </div>

        <div class="border-b border-slate-700 mb-6 bg-slate-900 rounded-t-lg px-2 pt-2">
            <nav class="-mb-px flex space-x-4 overflow-x-auto" id="tab-nav">
                <button data-tab="movimientos" class="tab-btn border-blue-500 text-blue-500 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors">📦 Movimientos</button>
                <button data-tab="produccion" class="tab-btn border-transparent text-slate-400 hover:text-slate-200 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors">🏭 Producción y Stock</button>
            </nav>
        </div>

        <div id="tab-content" class="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-6"></div>
    `;

    const tabs = document.querySelectorAll('.tab-btn');
    const tabContent = document.getElementById('tab-content');

    async function activarPestana(name) {
        tabs.forEach(t => {
            t.classList.remove('border-blue-500', 'text-blue-500');
            t.classList.add('border-transparent', 'text-slate-400');
        });
        const activa = document.querySelector(`[data-tab="${name}"]`);
        if (activa) {
            activa.classList.remove('border-transparent', 'text-slate-400');
            activa.classList.add('border-blue-500', 'text-blue-500');
        }
        try {
            switch (name) {
                case 'movimientos': await renderizarMovimientos(tabContent, rol); break;
                case 'produccion': await renderizarProduccion(tabContent); break;
            }
        } catch (err) {
            tabContent.innerHTML = `<p class="text-red-500">Error al cargar: ${err.message}</p>`;
            console.error(err);
        }
    }

    tabs.forEach(t => t.addEventListener('click', (e) => activarPestana(e.target.dataset.tab)));
    await activarPestana('movimientos');
}