// ocp Módulo de Seguridad Industrial – PTS/ART
import { renderizarEmitirPTS } from './emitir.js';
import { renderizarHistorialPTS } from './historial.js';
import { obtenerRolUsuario } from './utils.js';

let currentUserRole = null;

export async function cargarModuloSSL() {
    const contenedor = document.getElementById('app-content');
    if (!contenedor) return;

    currentUserRole = await obtenerRolUsuario();

    contenedor.innerHTML = `
        <div class="mb-6">
            <h1 class="text-3xl font-bold text-slate-100">Seguridad Industrial (SSL)</h1>
            <p class="text-slate-400 mt-1">Emisión y control de Permisos de Trabajo Seguro (P.T.S.) y A.R.T.</p>
        </div>

        <div class="border-b border-slate-700 mb-6 bg-slate-900 rounded-t-lg px-2 pt-2">
            <nav class="-mb-px flex space-x-4 overflow-x-auto" id="tab-nav">
                <button data-tab="emitir" class="tab-btn border-blue-500 text-blue-500 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors">📝 Emitir PTS</button>
                <button data-tab="historial" class="tab-btn border-transparent text-slate-400 hover:text-slate-200 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors">📋 Historial PTS</button>
            </nav>
        </div>

        <div id="tab-content" class="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-6">
            <!-- Contenido dinámico -->
        </div>
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
            case 'emitir': await renderizarEmitirPTS(tabContent, currentUserRole); break;
            case 'historial': await renderizarHistorialPTS(tabContent, currentUserRole); break;
        }
    }

    tabs.forEach(t => t.addEventListener('click', (e) => activarPestana(e.target.dataset.tab)));
    await activarPestana('emitir');
}