// ocp Utilidades compartidas del módulo de Laboratorio
import { supabase } from '../../supabase-client.js';

export function puedeRegistrar(rol) {
    return ['admin', 'analista'].includes(rol);
}

// ocp Notificaciones de laboratorio con destinatarios por tipo de certificación
// - Ácido y azufre → admin, supervisor, directivos
// - Agua y disposición → admin, supervisor (directivos NO)
export async function notificarLaboratorio(titulo, mensaje, tipoCertificacion = null) {
    try {
        const { enviarPushARoles } = await import('../../push.js');

        let roles = ['admin', 'supervisor'];

        if (tipoCertificacion === 'acido' || tipoCertificacion === 'azufre') {
            roles.push('directivos');
        }

        await enviarPushARoles(roles, `${titulo}: ${mensaje}`);
    } catch (e) {
        console.error('Error en notificación de laboratorio:', e);
    }
}
