// ocp Módulo de notificaciones push – envío a múltiples dispositivos por rol
import { supabase } from './supabase-client.js';

export async function enviarPushARoles(roles, mensaje) {
    if (!roles || roles.length === 0 || !mensaje) return;

    const { data: perfiles } = await supabase
        .from('perfiles')
        .select('id')
        .in('rol', roles);
    if (!perfiles?.length) return;

    const usuarioIds = perfiles.map(p => p.id);

    const { data: dispositivos } = await supabase
        .from('dispositivos')
        .select('player_id')
        .in('usuario_id', usuarioIds);
    if (!dispositivos?.length) return;

    const playerIds = [...new Set(dispositivos.map(d => d.player_id))];

    try {
        const { error } = await supabase.functions.invoke('notificar', {
            body: { playerIds, mensaje }
        });
        if (error) console.error('Error al enviar push:', error);
    } catch (err) {
        console.error('Error en push:', err);
    }
}
