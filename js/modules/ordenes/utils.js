// ocp Utilidades compartidas del módulo Órdenes de Trabajo
import { obtenerRolVerificado } from '../../supabase-client.js';

// ocp Obtiene el rol verificado desde perfiles
export async function obtenerRolUsuario() {
    return (await obtenerRolVerificado()) || 'operador';
}

export function formatearFecha(fecha) {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' });
}

export function badgeEstado(estado) {
    const map = {
        pendiente: 'text-yellow-400 bg-yellow-900/50',
        aprobada_seguridad: 'text-purple-400 bg-purple-900/50',
        en_ejecucion: 'text-blue-400 bg-blue-900/50',
        finalizada_ejecutor: 'text-teal-400 bg-teal-900/50',
        en_auditoria: 'text-orange-400 bg-orange-900/50',
        cerrada: 'text-green-400 bg-green-900/50',
        cancelada: 'text-red-400 bg-red-900/50'
    };
    return `<span class="px-2 py-1 rounded text-xs font-semibold ${map[estado] || ''}">${(estado || '').replace(/_/g, ' ')}</span>`;
}
