// ocp Módulo principal de Biblioteca Documental – orquesta la carga del módulo
import { renderizarUI } from './ui.js';
import { obtenerRolUsuario } from './utils.js';
import { cargarDocumentosPorCategoria } from './operaciones.js';  // ocp función correcta

let currentUserRole = null;

export async function cargarModuloBiblioteca() {
    const contenedor = document.getElementById('app-content');
    if (!contenedor) return;

    // ocp Obtener rol del usuario para control de permisos
    currentUserRole = await obtenerRolUsuario();

    // ocp Renderizar la interfaz completa (ahora incluye el árbol y la barra de búsqueda)
    await renderizarUI(currentUserRole);

    // ocp Carga inicial: todos los documentos (sin filtro)
    await cargarDocumentosPorCategoria(null, null, currentUserRole);
}
