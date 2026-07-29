// ocp Vista de detalle de una OT con pestañas de avances y cierre
import { supabase } from '../../supabase-client.js';
import { irATablero } from './index.js';
import { badgeEstado, formatearFecha, obtenerRolUsuario } from './utils.js';
import { cargarVistaAvances } from './avances.js';
import { cargarVistaCierres } from './cierres.js';

export async function mostrarDetalle(otId, rol) {
    const contenedor = document.getElementById('app-content');
    const { data: ot, error } = await supabase.from('ordenes_trabajo').select('*, equipos(codigo, nombre)').eq('id', otId).single();
    if (error || !ot) {
        contenedor.innerHTML = '<p class="text-red-500">OT no encontrada.</p>';
        return;
    }

    contenedor.innerHTML = `
        <div class="mb-6">
            <button id="btn-volver" class="text-blue-400 hover:underline mb-4 inline-block">← Volver al tablero</button>
            <h1 class="text-2xl font-bold text-white">${ot.numero_ot} – ${ot.titulo}</h1>
            <div class="flex flex-wrap gap-4 mt-2 text-slate-400 text-sm">
                <span>Equipo: ${ot.equipos?.codigo || 'N/A'} ${ot.equipos?.nombre || ''}</span>
                <span>Tipo: ${ot.tipo}</span>
                <span>Prioridad: ${ot.prioridad}</span>
                <span>Estado: ${badgeEstado(ot.estado)}</span>
                <span>Solicitado: ${formatearFecha(ot.fecha_solicitud)}</span>
                ${ot.fecha_inicio_real ? `<span>Inicio real: ${formatearFecha(ot.fecha_inicio_real)}</span>` : ''}
                ${ot.fecha_fin_real ? `<span>Fin real: ${formatearFecha(ot.fecha_fin_real)}</span>` : ''}
            </div>
        </div>

        <!-- Pestañas -->
        <div class="bg-slate-800 rounded-lg shadow-xl border border-slate-700">
            <div class="flex border-b border-slate-700">
                <button class="tab-btn active px-4 py-2 text-sm font-semibold text-white bg-slate-700 rounded-tl-lg" data-tab="avances">Avances / Historial</button>
                <button class="tab-btn px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white" data-tab="cierre">Cierre de conformidad</button>
            </div>
            <div id="tab-contenido" class="p-6">
                <!-- Se carga dinámicamente -->
            </div>
        </div>
    `;

    document.getElementById('btn-volver').addEventListener('click', irATablero);

    // Lógica de pestañas
    const tabs = document.querySelectorAll('.tab-btn');
    const contenido = document.getElementById('tab-contenido');

    async function activarPestana(tabName) {
        tabs.forEach(t => t.classList.remove('active', 'bg-slate-700', 'text-white'));
        const activa = Array.from(tabs).find(t => t.dataset.tab === tabName);
        if (activa) activa.classList.add('active', 'bg-slate-700', 'text-white');

        if (tabName === 'avances') {
            await cargarVistaAvances(otId, rol, contenido);
        } else if (tabName === 'cierre') {
            await cargarVistaCierres(otId, rol, contenido);
        }
    }

    tabs.forEach(t => {
        t.addEventListener('click', (e) => activarPestana(e.target.dataset.tab));
    });

    // Cargar avances por defecto
    await activarPestana('avances');
}