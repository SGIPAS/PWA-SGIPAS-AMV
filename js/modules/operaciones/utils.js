// ocp Utilidades compartidas del módulo Operaciones
import { supabase, obtenerRolVerificado } from '../../supabase-client.js';

// ocp Obtiene el rol verificado desde perfiles
export async function obtenerRolUsuario() {
    return (await obtenerRolVerificado()) || 'operador';
}

// ocp Devuelve un mapa { usuario_id: nombre_completo } para los IDs presentes en items
export async function mapearNombresUsuarios(items, campo = 'registrado_por') {
    const ids = [...new Set((items || []).map(i => i[campo]).filter(Boolean))];
    if (ids.length === 0) return {};

    const { data, error } = await supabase
        .from('perfiles')
        .select('id, nombre_completo')
        .in('id', ids);

    if (error) {
        console.warn('Error cargando nombres:', error.message);
        return {};
    }

    const mapa = {};
    (data || []).forEach(p => { mapa[p.id] = p.nombre_completo || 'Sin nombre'; });
    return mapa;
}

// ocp Formatear fecha con hora en formato Venezuela
export function formatearFechaHora(fecha) {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleString('es-VE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}
