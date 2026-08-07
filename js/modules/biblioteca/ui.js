// ocp UI de Biblioteca – explorador documental con árbol de categorías y tarjetas
import { abrirModalNuevo, cerrarModal, manejarSubmitDocumento } from './operaciones.js';
import { cargarDocumentosPorCategoria, buscarDocumentos } from './operaciones.js';
import { debounce } from './utils.js';

export async function renderizarUI(rol) {
    const contenedor = document.getElementById('app-content');
    const esAdmin = rol === 'admin';

    // Construir estructura de árbol de categorías (estática por ahora, luego dinámica desde BD)
    const arbolCategorias = [
        { nombre: 'Normativa', subcategorias: ['Legal', 'Decretos', 'Reglamentos'] },
        { nombre: 'SGIPAS', subcategorias: ['Manuales', 'Políticas', 'Objetivos'] },
        { nombre: 'Operaciones', subcategorias: ['Procedimientos', 'Prácticas Operativas', 'Formularios', 'Registros'] },
        { nombre: 'Mantenimiento', subcategorias: ['Fichas Técnicas', 'Planos', 'Manuales de Equipo'] },
        { nombre: 'Seguridad y Salud', subcategorias: ['A.R.T.', 'P.T.S.', 'MSDS', 'Emergencias'] },
        { nombre: 'Ambiente y Energía', subcategorias: ['Monitoreo', 'Informes', 'Procedimientos'] },
        { nombre: 'Laboratorio', subcategorias: ['Métodos', 'Certificaciones', 'Patrones'] },
        { nombre: 'Capacitación', subcategorias: ['Presentaciones', 'Videos', 'Evaluaciones'] },
        { nombre: 'Administrativo', subcategorias: ['Formatos', 'Minutas', 'Comunicados'] }
    ];

    contenedor.innerHTML = `
        <div class="flex h-full gap-6">
            <!-- Panel izquierdo: Árbol de navegación -->
            <div class="w-72 bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-4 flex flex-col overflow-y-auto" style="max-height: calc(100vh - 6rem);">
                <h2 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span>📚</span> Categorías
                </h2>
                <div class="space-y-2" id="arbol-categorias">
                    ${arbolCategorias.map(cat => `
                        <div class="categoria-nodo">
                            <button class="w-full text-left text-slate-300 hover:text-white font-semibold py-1 px-2 rounded hover:bg-slate-700 transition flex items-center gap-2 btn-categoria" data-categoria="${cat.nombre}">
                                <span class="text-lg">📁</span> ${cat.nombre}
                            </button>
                            <div class="ml-6 space-y-1 subcategorias hidden" data-categoria="${cat.nombre}">
                                ${cat.subcategorias.map(sub => `
                                    <button class="w-full text-left text-slate-400 hover:text-slate-200 text-sm py-1 px-2 rounded hover:bg-slate-700 transition btn-subcategoria" data-categoria="${cat.nombre}" data-subcategoria="${sub}">
                                        📄 ${sub}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <hr class="border-slate-700 my-4">
                <div class="text-xs text-slate-500">
                    <p>Total de documentos: <span id="total-documentos">--</span></p>
                </div>
            </div>

            <!-- Panel derecho: Búsqueda y resultados -->
            <div class="flex-1 flex flex-col">
                <!-- Barra de búsqueda y filtros -->
                <div class="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-4 mb-6">
                    <div class="flex flex-wrap gap-3 items-center">
                        <input type="text" id="busqueda-documento" placeholder="Buscar por título, código o tags..." class="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:border-blue-500 min-w-[200px]">
                        <select id="filtro-tipo" class="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white">
                            <option value="">Todos los tipos</option>
                            <option value="manual">Manual</option>
                            <option value="procedimiento">Procedimiento</option>
                            <option value="formulario">Formulario</option>
                            <option value="video">Video</option>
                            <option value="ficha_tecnica">Ficha Técnica</option>
                            <option value="plano">Plano</option>
                            <option value="presentacion">Presentación</option>
                            <option value="otro">Otro</option>
                        </select>
                        <select id="filtro-formato" class="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white">
                            <option value="">Todos los formatos</option>
                            <option value="pdf">PDF</option>
                            <option value="video">Video</option>
                            <option value="imagen">Imagen</option>
                        </select>
                        <button id="btn-buscar" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition">Buscar</button>
                        <button id="btn-limpiar-filtros" class="bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg transition">Limpiar</button>
                    </div>
                </div>

                <!-- Encabezado y botón de nuevo documento -->
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-bold text-white" id="titulo-resultados">Todos los documentos</h2>
                    ${esAdmin ? `
                    <button id="btn-nuevo-documento" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg transition flex items-center gap-2">
                        <span>+</span> Subir Documento
                    </button>` : ''}
                </div>

                <!-- Cuadrícula de tarjetas de documentos -->
                <div id="grid-documentos" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto" style="max-height: calc(100vh - 18rem);">
                    <p class="text-slate-400 col-span-full text-center py-8">Seleccione una categoría o realice una búsqueda.</p>
                </div>
            </div>
        </div>

        <!-- Modal de subida/edición (solo admin) – mismo que antes -->
        ${esAdmin ? `
        <div id="modal-documento" class="hidden fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
            <div class="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 w-full max-w-md p-6">
                <h2 id="modal-titulo" class="text-xl font-bold text-white mb-4 border-b border-slate-700 pb-2">Nuevo Documento</h2>
                <form id="form-documento" class="space-y-4">
                    <input type="hidden" id="doc-id">
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Código (opcional)</label>
                        <input type="text" id="doc-codigo" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                    </div>
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
                                ${arbolCategorias.map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-slate-400 text-sm mb-1">Subcategoría</label>
                            <input type="text" id="doc-subcategoria" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" placeholder="Ej: Procedimientos">
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
                                <option value="ficha_tecnica">Ficha Técnica</option>
                                <option value="plano">Plano</option>
                                <option value="presentacion">Presentación</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-slate-400 text-sm mb-1">Entidad Responsable</label>
                            <input type="text" id="doc-entidad" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" placeholder="Ej: Operaciones">
                        </div>
                        <div>
                            <label class="block text-slate-400 text-sm mb-1">Fecha de Vigencia</label>
                            <input type="date" id="doc-vigencia" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                        </div>
                        <div>
                            <label class="block text-slate-400 text-sm mb-1">Tags (separados por coma)</label>
                            <input type="text" id="doc-tags" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" placeholder="ácido, seguridad, torre">
                        </div>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Archivo</label>
                        <input type="file" id="doc-archivo" accept=".pdf,.mp4,.webm,.mov,.jpg,.jpeg,.png,.ppt,.pptx" class="w-full text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700">
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

    // --- Lógica de navegación por árbol ---
    document.querySelectorAll('.btn-categoria').forEach(btn => {
        btn.addEventListener('click', () => {
            const categoria = btn.dataset.categoria;
            // Toggle subcategorías
            const subDiv = document.querySelector(`.subcategorias[data-categoria="${categoria}"]`);
            if (subDiv) subDiv.classList.toggle('hidden');
            // Cargar documentos de la categoría principal
            cargarDocumentosPorCategoria(categoria, null, rol);
            document.getElementById('titulo-resultados').textContent = categoria;
            // Limpiar búsqueda
            document.getElementById('busqueda-documento').value = '';
        });
    });

    document.querySelectorAll('.btn-subcategoria').forEach(btn => {
        btn.addEventListener('click', () => {
            const categoria = btn.dataset.categoria;
            const subcategoria = btn.dataset.subcategoria;
            cargarDocumentosPorCategoria(categoria, subcategoria, rol);
            document.getElementById('titulo-resultados').textContent = `${categoria} > ${subcategoria}`;
            document.getElementById('busqueda-documento').value = '';
        });
    });

    // Búsqueda
    document.getElementById('btn-buscar').addEventListener('click', () => {
        const texto = document.getElementById('busqueda-documento').value.trim();
        const tipo = document.getElementById('filtro-tipo').value;
        const formato = document.getElementById('filtro-formato').value;
        buscarDocumentos(texto, tipo, formato, rol);
        document.getElementById('titulo-resultados').textContent = `Resultados de búsqueda`;
    });

    document.getElementById('btn-limpiar-filtros').addEventListener('click', () => {
        document.getElementById('busqueda-documento').value = '';
        document.getElementById('filtro-tipo').value = '';
        document.getElementById('filtro-formato').value = '';
        cargarDocumentosPorCategoria(null, null, rol);
        document.getElementById('titulo-resultados').textContent = 'Todos los documentos';
    });

    // Eventos del modal (admin)
    if (esAdmin) {
        document.getElementById('btn-nuevo-documento').addEventListener('click', () => abrirModalNuevo());
        document.getElementById('btn-cerrar-modal').addEventListener('click', cerrarModal);
        document.getElementById('form-documento').addEventListener('submit', (e) => {
            e.preventDefault();
            manejarSubmitDocumento(rol);
        });
    }

    // Carga inicial
    await cargarDocumentosPorCategoria(null, null, rol);
}
