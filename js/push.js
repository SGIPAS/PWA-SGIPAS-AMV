// ocp Módulo de notificaciones push – envío a múltiples dispositivos por rol
import { supabase } from './supabase-client.js';

/**
 * Envía una notificación push a todos los dispositivos de los usuarios que tengan uno de los roles indicados.
 * @param {string[]} roles - Ejemplo: ['admin', 'supervisor', 'inspector_ssl']
 * @param {string} mensaje - Texto de la notificación
 */
export async function enviarPushARoles(roles, mensaje) {
    if (!roles || roles.length === 0 || !mensaje) return;

    try {
        // 1. Obtener los IDs de los usuarios que tienen esos roles
        const { data: perfiles, error: errorPerfiles } = await supabase
            .from('perfiles')
            .select('id')
            .in('rol', roles);

        if (errorPerfiles) {
            console.error('Error al obtener perfiles:', errorPerfiles);
            return;
        }

        if (!perfiles || perfiles.length === 0) return;

        const usuarioIds = perfiles.map(p => p.id);

        // 2. Obtener los playerId de esos usuarios desde la tabla dispositivos
        const { data: dispositivos, error: errorDisp } = await supabase
            .from('dispositivos')
            .select('player_id')
            .in('usuario_id', usuarioIds);

        if (errorDisp) {
            console.error('Error al obtener dispositivos:', errorDisp);
            return;
        }

        if (!dispositivos || dispositivos.length === 0) return;

        const playerIds = [...new Set(dispositivos.map(d => d.player_id))];

        // 3. Llamar a la Edge Function notificar
        const { error } = await supabase.functions.invoke('notificar', {
            body: { playerIds, mensaje }
        });

        if (error) {
            console.error('Error al enviar push:', error);
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
        const { error } = await supabase.functions.invoke('notificar', {
            body: { playerIds: [playerId], mensaje }
        });
        if (error) console.error('Error al enviar push:', error);
    } catch (err) {
        console.error('Error en push:', err);
    }
}
