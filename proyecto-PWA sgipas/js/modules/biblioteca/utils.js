// ocp Utilidades para Biblioteca – funciones reutilizables
import { supabase } from '../../supabase-client.js';

// ocp Obtiene el rol del usuario desde la sesión
export async function obtenerRolUsuario() {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.user_metadata?.rol || 'operador';
}

// ocp Debounce para limitar peticiones en búsqueda
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}