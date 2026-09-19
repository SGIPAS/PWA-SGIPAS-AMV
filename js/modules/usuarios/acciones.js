// ocp Acciones del administrador sobre usuarios
import { supabase } from '../../supabase-client.js';
import { renderizarLista } from './lista.js';

export async function toggleEstado(id, nuevoEstado) {
    const { error } = await supabase.rpc('admin_actualizar_usuario', {
        p_user_id: id,
        p_rol: null,   // no cambiar el rol
        p_estado: nuevoEstado
    });
    if (error) {
        alert('Error al cambiar estado: ' + error.message);
    }
}

// Nota: resetear contraseña requiere service_role, por lo que se hace
// desde el Dashboard de Supabase. Se mantiene el botón como recordatorio.
export async function resetearPassword(id) {
    alert(
        'Para resetear la contraseña de un usuario:\n\n' +
        '1. Abre el panel de Supabase → Authentication → Users\n' +
        '2. Busca el email del usuario\n' +
        '3. Haz clic en los tres puntos → "Send password recovery"\n\n' +
        'El usuario recibirá un email para crear una nueva contraseña.'
    );
}
