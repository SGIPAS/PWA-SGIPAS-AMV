// ocp Utilidades compartidas del módulo de Laboratorio
import { supabase } from '../../supabase-client.js';

export function puedeRegistrar(rol) {
    return ['admin', 'analista'].includes(rol);
}

export async function notificarLaboratorio(titulo, mensaje) {
    const { enviarPushARoles } = await import('../../push.js');
    await enviarPushARoles(['admin', 'supervisor', 'directivos'], `${titulo}: ${mensaje}`);
}
