// ocp Módulo de notificaciones push – envío a través de OneSignal
import { supabase } from './supabase-client.js';  // ruta correcta: mismo nivel que push.js

export async function enviarPush(mensaje) {
    const playerId = localStorage.getItem('playerId');
    if (!playerId || !mensaje) return;

    try {
        const { error } = await supabase.functions.invoke('notificar', {
            body: { playerId, mensaje }
        });
        if (error) console.error('Error al enviar push:', error);
    } catch (err) {
        console.error('Error en push:', err);
    }
}
