// ocp Utilidades compartidas del módulo SSL
import { obtenerRolVerificado } from '../../supabase-client.js';

// ocp Obtiene el rol verificado desde perfiles
export async function obtenerRolUsuario() {
    return (await obtenerRolVerificado()) || 'operador';
}

// ocp Verificar si el usuario puede emitir PTS
export async function puedeEmitirPTS() {
    const rol = await obtenerRolVerificado();
    return ['admin', 'inspector_ssl'].includes(rol);
}
