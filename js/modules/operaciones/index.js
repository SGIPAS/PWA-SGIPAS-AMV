// ocp Módulo Control Operacional – incluye Paradas de Planta
import { renderizarNovedades } from './novedades.js';
import { renderizarAcido } from './acido.js';
import { renderizarPH } from './ph.js';
import { renderizarConsumo } from './consumo.js';
import { renderizarEmisiones } from './emisiones.js';
import { renderizarMotores } from './motores.js';
import { renderizarDiferenciales } from './diferenciales.js';
import { cargarParadas } from './paradas.js';   // ocp importación correcta (función cargarParadas)
import { obtenerRolUsuario } from './utils.js';

let currentUserRole = null;

export async function cargarModuloOperaciones() {
    const contenedor = document.getElementById('app-content');
    if (!contenedor) return;

    currentUserRole = await obtenerRolUsuario();

    contenedor.innerHTML = `
        <div class="mb-6">
            <h1 class="text-3xl font-bold text-slate-100">Control Operacional</h1>
            <p class="text-slate-400 mt-1">Monitoreo de parámetros críticos, reportes y novedades.</p>
        </div>

        <div class="border-b border-slate-700 mb-6 bg-slate-900 rounded-t-lg px-2 pt-2">
            <nav class="-mb-px flex space-x-4 overflow-x-auto" id="tab-nav">
                <button data-tab="novedades" class="tab-btn border-blue-500 text-blue-500 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors">📸 Novedades</button>
                <button data-tab="acido" class="tab-btn border-transparent text-slate-400 hover:text-slate-200 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors">🧪 Ácido</button>
                <button data-tab="ph" class="tab-btn border-transparent text-slate-400 hover:text-slate-200 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors">💧 pH Aguas</button>
                <button data-tab="consumo" class="tab-btn border-transparent text-slate-400 hover:text-slate-200 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors">💦 Consumo Agua</button>
                <button data-tab="emisiones" class="tab-btn border-transparent text-slate-400 hover:text-slate-200 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors">🌫️ Emisiones SO₂</button>
                <button data-tab="motores" class="tab-btn border-transparent text-slate-400 hover:text-slate-200 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors">🌡️ Motores</button>
                <button data-tab="diferenciales" class="tab-btn border-transparent text-slate-400 hover:text-slate-200 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors">📏 Diferenciales P.</button>
                <!-- Pestaña Paradas de Planta -->
                <button data-tab="paradas" class="tab-btn border-transparent text-slate-400 hover:text-slate-200 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors">🛑 Paradas</button>
            </nav>
        </div>

        <div id="tab-content" class="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-6"></div>
    `;

    const tabs = document.querySelectorAll('.tab-btn');
    const tabContent = document.getElementById('tab-content');

    async function activarPestana(tabName) {
        tabs.forEach(t => {
            t.classList.remove('border-blue-500', 'text-blue-500');
            t.classList.add('border-transparent', 'text-slate-400');
        });
        const activa = document.querySelector(`[data-tab="${tabName}"]`);
        if (activa) {
            activa.classList.remove('border-transparent', 'text-slate-400');
            activa.classList.add('border-blue-500', 'text-blue-500');
        }

        switch (tabName) {
            case 'novedades':      await renderizarNovedades(tabContent, currentUserRole); break;
            case 'acido':          await renderizarAcido(tabContent, currentUserRole); break;
            case 'ph':             await renderizarPH(tabContent, currentUserRole); break;
            case 'consumo':        await renderizarConsumo(tabContent, currentUserRole); break;
            case 'emisiones':      await renderizarEmisiones(tabContent, currentUserRole); break;
            case 'motores':        await renderizarMotores(tabContent, currentUserRole); break;
            case 'diferenciales':  await renderizarDiferenciales(tabContent, currentUserRole); break;
            case 'paradas':        await cargarParadas(tabContent, currentUserRole); break;   // ocp usar cargarParadas
        }
    }

    tabs.forEach(t => t.addEventListener('click', (e) => activarPestana(e.target.dataset.tab)));
    await activarPestana('novedades');
}
