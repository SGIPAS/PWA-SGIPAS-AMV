// ocp Utilidades compartidas del módulo de Laboratorio
import { supabase } from '../../supabase-client.js';

export function puedeRegistrar(rol) {
    return ['admin', 'analista'].includes(rol);
}

export async function notificarATodos(titulo, mensaje) {
    try {
        await supabase.rpc('notificar_a_todos', { titulo, mensaje });
    } catch (e) {
        console.warn('Notificación no enviada:', e);
    }
}