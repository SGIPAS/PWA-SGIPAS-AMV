// ocp Módulo de notificaciones push – envío a múltiples dispositivos por rol usando RPC
import { supabase } from './supabase-client.js';

export async function enviarPushARoles(roles, mensaje) {
    if (!roles || roles.length === 0 || !mensaje) return;

    try {
        const { error } = await supabase.rpc('enviar_notificacion_roles', {
            roles,
            mensaje
        });

        if (error) {
            console.error('Error al enviar push:', error.message);
        }
    } catch (err) {
        console.error('Error en enviarPushARoles:', err);
    }
}

// Compatibilidad por si algún módulo antiguo aún usa la versión singular
export async function enviarPush(mensaje) {
    const playerId = localStorage.getItem('playerId');
    if (!playerId || !mensaje) return;

    try {
        const { error } = await supabase.rpc('enviar_notificacion_roles', {
            roles: ['admin'], // No se puede enviar a un playerId concreto con esta función; se mantiene para no romper imports
            mensaje
        });
        if (error) console.error('Error al enviar push:', error);
    } catch (err) {
        console.error('Error en push:', err);
    }
}
