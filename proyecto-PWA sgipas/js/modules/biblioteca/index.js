// ocp Módulo principal de Biblioteca Documental – orquesta la carga del módulo
import { renderizarUI } from './ui.js';
import { obtenerRolUsuario } from './utils.js';
import { cargarListaDocumentos } from './operaciones.js';

let currentUserRole = null;

export async function cargarModuloBiblioteca() {
    const contenedor = document.getElementById('app-content');
    if (!contenedor) return;

    // ocp Obtener rol del usuario para control de permisos
    currentUserRole = await obtenerRolUsuario();

    // ocp Renderizar la interfaz completa y conectar eventos
    await renderizarUI(currentUserRole);

    // ocp Carga inicial de la lista de documentos
    await cargarListaDocumentos(currentUserRole);
}