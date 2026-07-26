// ocp Módulo de Gestión de Personal – punto de entrada
import { supabase } from '../../supabase-client.js';
import { renderizarLista } from './lista.js';
import { abrirModalNuevo } from './formulario.js';

export async function cargarModuloUsuarios() {
    const contenedor = document.getElementById('app-content');
    if (!contenedor) return;

    // Solo admin puede ver este módulo
    const { data: { user } } = await supabase.auth.getUser();
    const rol = user?.user_metadata?.rol;
    if (rol !== 'admin') {
        contenedor.innerHTML = `<p class="text-red-500 text-center mt-10">Acceso denegado.</p>`;
        return;
    }

    contenedor.innerHTML = `
        <div class="mb-6 flex justify-between items-center">
            <div>
                <h1 class="text-3xl font-bold text-slate-100">Gestión de Personal</h1>
                <p class="text-slate-400 mt-1">Administración completa de usuarios y roles.</p>
            </div>
            <button id="btn-nuevo-usuario" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-150 shadow-lg flex items-center">
                <span class="mr-2">+</span> Registrar Personal
            </button>
        </div>

        <div class="bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden">
            <div id="tabla-usuarios-container" class="overflow-x-auto p-4">
                <p class="text-slate-400 animate-pulse">Consultando base de datos de personal...</p>
            </div>
        </div>

        <!-- Modal de creación/edición (se llena dinámicamente en formulario.js) -->
        <div id="modal-usuario" class="hidden fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm"></div>
    `;

    // Evento para abrir modal de nuevo usuario
    document.getElementById('btn-nuevo-usuario').addEventListener('click', abrirModalNuevo);

    // Cargar lista inicial
    await renderizarLista();
}