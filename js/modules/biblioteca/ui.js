// ocp UI de Biblioteca – genera el HTML y asigna eventos (versión con video)
import { abrirModalNuevo, cerrarModal, manejarSubmitDocumento } from './operaciones.js';
import { cargarListaDocumentos } from './operaciones.js';
import { debounce } from './utils.js';

export async function renderizarUI(rol) {
    const contenedor = document.getElementById('app-content');
    const esAdmin = rol === 'admin';

    contenedor.innerHTML = `
        <div class="mb-6 flex justify-between items-center">
            <div>
                <h1 class="text-3xl font-bold text-slate-100">Biblioteca Documental</h1>
                <p class="text-slate-400 mt-1">Documentos normativos, procedimientos, formularios y videos del SGIPAS.</p>
            </div>
            ${esAdmin ? `
            <button id="btn-nuevo-documento" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-150 shadow-lg flex items-center">
                <span class="mr-2">+</span> Subir Documento
            </button>` : ''}
        </div>
        <div class="bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden">
            <div class="p-4 border-b border-slate-700 flex flex-wrap gap-4 items-center">
                <input type="text" id="busqueda-documento" placeholder="Buscar por título..." class="bg-slate-900 border border-slate-700 rounded p-2 text-white w-64 focus:border-blue-500">
                <select id="filtro-categoria" class="bg-slate-900 border border-slate-700 rounded p-2 text-white">
                    <option value="">Todas las categorías</option>
                    <option value="general">General</option>
                    <option value="operaciones">Operaciones</option>
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="seguridad">Seguridad</option>
                    <option value="ambiente">Ambiente</option>
                </select>
                <select id="filtro-tipo" class="bg-slate-900 border border-slate-700 rounded p-2 text-white">
                    <option value="">Todos los tipos</option>
                    <option value="manual">Manual</option>
                    <option value="procedimiento">Procedimiento</option>
                    <option value="formulario">Formulario</option>
                    <option value="registro">Registro</option>
                    <option value="practica">Práctica Operativa</option>
                    <option value="video">Video</option>
                    <option value="otro">Otro</option>
                </select>
                <button id="btn-limpiar-filtros" class="bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded transition">Limpiar</button>
            </div>
            <div id="tabla-documentos-container" class="overflow-x-auto p-4">
                <p class="text-slate-400 animate-pulse">Cargando biblioteca...</p>
            </div>
        </div>

        ${esAdmin ? `
        <div id="modal-documento" class="hidden fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
            <div class="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 w-full max-w-md p-6">
                <h2 id="modal-titulo" class="text-xl font-bold text-white mb-4 border-b border-slate-700 pb-2">Nuevo Documento</h2>
                <form id="form-documento" class="space-y-4">
                    <input type="hidden" id="doc-id">
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Título*</label>
                        <input type="text" id="doc-titulo" required class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Descripción</label>
                        <textarea id="doc-descripcion" rows="2" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"></textarea>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-slate-400 text-sm mb-1">Categoría</label>
                            <select id="doc-categoria" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                                <option value="general">General</option>
                                <option value="operaciones">Operaciones</option>
                                <option value="mantenimiento">Mantenimiento</option>
                                <option value="seguridad">Seguridad</option>
                                <option value="ambiente">Ambiente</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-slate-400 text-sm mb-1">Tipo de Documento</label>
                            <select id="doc-tipo" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                                <option value="manual">Manual</option>
                                <option value="procedimiento">Procedimiento</option>
                                <option value="formulario">Formulario</option>
                                <option value="registro">Registro</option>
                                <option value="practica">Práctica Operativa</option>
                                <option value="video">Video</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Archivo</label>
                        <input type="file" id="doc-archivo" accept=".pdf,.mp4,.webm,.mov" class="w-full text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700">
                        <p id="archivo-actual" class="text-xs text-slate-500 mt-1 hidden"></p>
                    </div>
                    <div id="doc-cambios-group" class="hidden">
                        <label class="block text-slate-400 text-sm mb-1">Descripción de cambios</label>
                        <input type="text" id="doc-cambios" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                    </div>
                    <div class="flex justify-end space-x-3 pt-4 border-t border-slate-700">
                        <button type="button" id="btn-cerrar-modal" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded">Cancelar</button>
                        <button type="submit" id="btn-guardar-doc" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold">Guardar</button>
                    </div>
                </form>
            </div>
        </div>` : ''}
    `;

    if (esAdmin) {
        document.getElementById('btn-nuevo-documento')?.addEventListener('click', () => abrirModalNuevo());
        document.getElementById('btn-cerrar-modal')?.addEventListener('click', cerrarModal);
        document.getElementById('form-documento')?.addEventListener('submit', (e) => {
            e.preventDefault();
            manejarSubmitDocumento(rol);
        });
    }

    document.getElementById('busqueda-documento')?.addEventListener('input', debounce(() => cargarListaDocumentos(rol), 300));
    document.getElementById('filtro-categoria')?.addEventListener('change', () => cargarListaDocumentos(rol));
    document.getElementById('filtro-tipo')?.addEventListener('change', () => cargarListaDocumentos(rol));
    document.getElementById('btn-limpiar-filtros')?.addEventListener('click', () => {
        document.getElementById('busqueda-documento').value = '';
        document.getElementById('filtro-categoria').value = '';
        document.getElementById('filtro-tipo').value = '';
        cargarListaDocumentos(rol);
    });
}
