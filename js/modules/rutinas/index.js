// ocp Punto de entrada del módulo Rutinas Diarias
import { supabase } from '../../supabase-client.js';
import { renderChecklist } from './checklist.js';
import { renderAuditoria } from './auditoria.js';

export async function cargarRutinas() {
    const contenedor = document.getElementById('app-content');
    if (!contenedor) return;

    const { data: { user } } = await supabase.auth.getUser();
    const rol = user?.user_metadata?.rol;
    const puedeAuditar = ['admin', 'supervisor'].includes(rol);

    contenedor.innerHTML = `
        <div class="mb-6">
            <h1 class="text-3xl font-bold text-slate-100">Rutinas Diarias</h1>
            <p class="text-slate-400 mt-1">Checklist del turno – ${new Date().toLocaleDateString('es-VE', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
        </div>
        <div class="border-b border-slate-700 mb-6 bg-slate-900 rounded-t-lg px-2 pt-2">
            <nav class="-mb-px flex space-x-4 overflow-x-auto" id="tab-nav">
                <button data-tab="diarias" class="tab-btn border-blue-500 text-blue-500 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors">📋 Checklist del día</button>
                ${puedeAuditar ? '<button data-tab="audit" class="tab-btn border-transparent text-slate-400 hover:text-slate-200 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors">🔍 Auditoría</button>' : ''}
            </nav>
        </div>
        <div id="tab-content"></div>
    `;

    const tabContent = document.getElementById('tab-content');
    const tabs = document.querySelectorAll('.tab-btn');

    async function activarTab(name) {
        tabs.forEach(t => {
            t.classList.remove('border-blue-500', 'text-blue-500');
            t.classList.add('border-transparent', 'text-slate-400');
        });
        const activa = document.querySelector(`[data-tab="${name}"]`);
        if (activa) {
            activa.classList.remove('border-transparent', 'text-slate-400');
            activa.classList.add('border-blue-500', 'text-blue-500');
        }
        if (name === 'diarias') await renderChecklist(tabContent, rol);
        else if (name === 'audit') await renderAuditoria(tabContent, rol);
    }

    tabs.forEach(t => t.addEventListener('click', e => activarTab(e.target.dataset.tab)));
    await activarTab('diarias');
}