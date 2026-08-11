// ocp Módulo de notificaciones push – envío a través de OneSignal
import { supabase } from '../supabase-client.js';

export async function enviarPush(destinatarioId, mensaje) {
    if (!destinatarioId || !mensaje) return;

    // Obtener playerId del destinatario desde la tabla dispositivos (si la implementaste)
    // o desde localStorage (solo para pruebas). Para producción, deberías tener
    // una tabla que relacione usuario_id con player_id.
    // Por ahora, usaremos un enfoque simplificado: notificar al usuario actual (prueba).
    // Cuando tengas la tabla dispositivos poblada, cambia esto.
    const playerId = localStorage.getItem('playerId');
    if (!playerId) return;

    try {
        const { error } = await supabase.functions.invoke('notificar', {
            body: { playerId, mensaje }
        });
        if (error) console.error('Error al enviar push:', error);
    } catch (err) {
        console.error('Error en push:', err);
    }
}