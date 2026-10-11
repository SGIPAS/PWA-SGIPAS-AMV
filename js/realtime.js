// ocp Gestión centralizada de suscripciones Realtime de Supabase
import { supabase } from './supabase-client.js';

// Registro de canales activos para cleanup automático
const canalesActivos = [];

// ocp Suscribirse a cambios de una tabla
// evento: '*' | 'INSERT' | 'UPDATE' | 'DELETE'
// filtro: opcional, ej "usuario_id=eq.uuid" (formato PostgREST)
export function suscribirTabla(tabla, evento, callback, filtro = null) {
    const nombreCanal = `rt_${tabla}_${evento}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const config = {
        event: evento,
        schema: 'public',
        table: tabla
    };
    if (filtro) config.filter = filtro;

    const canal = supabase
        .channel(nombreCanal)
        .on('postgres_changes', config, (payload) => {
            try {
                callback(payload);
            } catch (e) {
                console.error(`[rt:${tabla}] Error en callback:`, e);
            }
        })
        .subscribe((status) => {
            if (status === 'CHANNEL_ERROR') {
                console.warn(`[rt:${tabla}] Error de canal`);
            }
        });

    canalesActivos.push({ canal, tabla });
    return canal;
}

// ocp Cancelar suscripciones de una tabla específica
export function cancelarSuscripcionesDe(tabla) {
    for (let i = canalesActivos.length - 1; i >= 0; i--) {
        if (canalesActivos[i].tabla === tabla) {
            try { supabase.removeChannel(canalesActivos[i].canal); } catch (e) { /* noop */ }
            canalesActivos.splice(i, 1);
        }
    }
}

// ocp Cancelar TODAS las suscripciones (al cambiar de módulo)
export function cancelarTodasLasSuscripciones() {
    canalesActivos.forEach(({ canal }) => {
        try { supabase.removeChannel(canal); } catch (e) { /* noop */ }
    });
    canalesActivos.length = 0;
}

// ocp Helper: envuelve un callback para ignorar eventos generados por el propio usuario
export function ignorarPropio(usuarioId, callback) {
    return (payload) => {
        const autorId = payload?.new?.creado_por
            || payload?.new?.usuario_id
            || payload?.new?.registrado_por
            || payload?.new?.actualizado_por;
        if (autorId && autorId === usuarioId) return;
        callback(payload);
    };
}