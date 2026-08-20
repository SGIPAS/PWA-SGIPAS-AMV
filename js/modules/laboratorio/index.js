// ocp Punto de entrada del módulo de Laboratorio
import { supabase } from '../../supabase-client.js';
import { renderizarCertAcido } from './acido.js';
import { renderizarCertAzufre } from './azufre.js';
import { renderizarCertAgua } from './agua.js';
import { renderizarDispAcido } from './disposicion.js';

let currentUserRole = null;

export async function cargarLaboratorio() {
    const contenedor = document.getElementById('app-content');
    if (!contenedor) return;

    const { data: { user } } = await supabase.auth.getUser();
    currentUserRole = user?.user_metadata?.rol;

    contenedor.innerHTML = `
        <div class="mb-6">
            <h1 class="text-3xl font-bold text-slate-100">Laboratorio</h1>
            <p class="text-slate-400 mt-1">Certificaciones de calidad y control de disposición final.</p>
        </div>
        <div class="border-b border-slate-700 mb-6 bg-slate-900 rounded-t-lg px-2 pt-2">
            <nav class="-mb-px flex space-x-4 overflow-x-auto" id="tab-nav">
                <button data-tab="cert-acido" class="tab-btn border-blue-500 text-blue-500 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors">🧪 Cert. Ácido</button>
                <button data-tab="cert-azufre" class="tab-btn border-transparent text-slate-400 hover:text-slate-200 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors">🧴 Cert. Azufre</button>
                <button data-tab="cert-agua" class="tab-btn border-transparent text-slate-400 hover:text-slate-200 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors">💧 Cert. Agua</button>
                <button data-tab="disp-acido" class="tab-btn border-transparent text-slate-400 hover:text-slate-200 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors">♻️ Disposición Ácido</button>
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
        switch (name) {
            case 'cert-acido': await renderizarCertAcido(tabContent, currentUserRole); break;
            case 'cert-azufre': await renderizarCertAzufre(tabContent, currentUserRole); break;
            case 'cert-agua': await renderizarCertAgua(tabContent, currentUserRole); break;
            case 'disp-acido': await renderizarDispAcido(tabContent, currentUserRole); break;
        }
    }

    tabs.forEach(t => t.addEventListener('click', (e) => activarPestana(e.target.dataset.tab)));
    await activarPestana('cert-acido');
}