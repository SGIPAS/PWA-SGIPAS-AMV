// ocp Orquestador del módulo de mantenimiento
import { renderizarTablero } from './tablero.js';
import { renderizarCrear } from './crear.js';
import { renderizarListado } from './listado.js';
import { mostrarDetalle } from './detalle.js';
import { obtenerRolUsuario } from './utils.js';

let currentUserRole = null;

export async function cargarModuloOrdenes() {
    const contenedor = document.getElementById('app-content');
    if (!contenedor) return;

    currentUserRole = await obtenerRolUsuario();
    await renderizarTablero(currentUserRole);
}

// ocp Navegación interna
export function irACrear() { renderizarCrear(currentUserRole); }
export function irAListado() { renderizarListado(currentUserRole); }
export function irATablero() { renderizarTablero(currentUserRole); }
export function irADetalle(id) { mostrarDetalle(id, currentUserRole); }