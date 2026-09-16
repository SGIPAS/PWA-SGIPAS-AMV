// ocp Utilidades compartidas del módulo Operaciones
import { obtenerRolVerificado } from '../../supabase-client.js';

// ocp Obtiene el rol verificado desde perfiles (NUNCA desde user_metadata)
export async function obtenerRolUsuario() {
    return (await obtenerRolVerificado()) || 'operador';
}
