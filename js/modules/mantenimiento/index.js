// ocp Módulo de Mantenimiento y Activos — orquestador con sub-tabs
import { cargarVistaEquipos } from './equipos/index.js';
import { cargarVistaRepuestos } from './repuestos/index.js';
import { cargarVistaMovimientosGlobal } from './movimientos/index.js';

export async function cargarMantenimiento(rol) {
    const contenedor = document.getElementById('app-content');
    if (!contenedor) return;

    contenedor.innerHTML = `
        <div class="mb-6">
            <h1 class="text-3xl font-bold text-slate-100">Mantenimiento y Activos</h1>
            <p class="text-slate-400 mt-1">Gestión de activos, repuestos y confiabilidad según SGI-PAS / ISO 55001.</p>
        </div>

        <div class="border-b border-slate-700 mb-6 bg-slate-900 rounded-t-lg px-2 pt-2">
            <nav class="-mb-px flex space-x-4 overflow-x-auto" id="tab-nav-mtto">
                <button data-tab="equipos" class="tab-btn border-blue-500 text-blue-500 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors">⚙️ Equipos</button>
                <button data-tab="repuestos" class="tab-btn border-transparent text-slate-400 hover:text-slate-200 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors">📦 Repuestos</button>
                <button data-tab="movimientos" class="tab-btn border-transparent text-slate-400 hover:text-slate-200 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors">📋 Movimientos</button>
                <button data-tab="predictivo" class="tab-btn border-transparent text-slate-400 hover:text-slate-200 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors">📊 Predictivo</button>
                <button data-tab="rca" class="tab-btn border-transparent text-slate-400 hover:text-slate-200 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors">🔍 Causa Raíz</button>
            </nav>
        </div>

        <div id="tab-content-mtto" class="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-6"></div>
    `;

    const tabs = document.querySelectorAll('#tab-nav-mtto .tab-btn');
    const tabContent = document.getElementById('tab-content-mtto');

    async function activarPestana(name) {
        tabs.forEach(t => {
            t.classList.remove('border-blue-500', 'text-blue-500');
            t.classList.add('border-transparent', 'text-slate-400');
        });
        const activa = document.querySelector(`#tab-nav-mtto [data-tab="${name}"]`);
        if (activa) {
            activa.classList.remove('border-transparent', 'text-slate-400');
            activa.classList.add('border-blue-500', 'text-blue-500');
        }

        try {
            switch (name) {
                case 'equipos':
                    await cargarVistaEquipos(tabContent, rol);
                    break;
                case 'repuestos':
                    await cargarVistaRepuestos(tabContent, rol);
                    break;
                case 'movimientos':
                    await cargarVistaMovimientosGlobal(tabContent, rol);
                    break;
                case 'predictivo':
                    tabContent.innerHTML = '<p class="text-slate-400 italic">Mediciones predictivas — próximo a implementar.</p>';
                    break;
                case 'rca':
                    tabContent.innerHTML = '<p class="text-slate-400 italic">Análisis de causa raíz — próximo a implementar.</p>';
                    break;
            }
        } catch (err) {
            tabContent.innerHTML = `<p class="text-red-500">Error al cargar: ${err.message}</p>`;
            console.error(err);
        }
    }

    tabs.forEach(t => t.addEventListener('click', (e) => activarPestana(e.target.dataset.tab)));
    await activarPestana('equipos');
}
