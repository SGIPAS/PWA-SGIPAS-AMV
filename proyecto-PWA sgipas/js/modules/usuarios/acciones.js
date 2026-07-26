// ocp Acciones del administrador: toggle estado, reset password, eliminar
import { supabase } from '../../supabase-client.js';
import { renderizarLista } from './lista.js';

export async function toggleEstado(id, nuevoEstado) {
    await supabase.from('perfiles').update({ estado: nuevoEstado }).eq('id', id);
}

export async function resetearPassword(id) {
    const nuevaPassword = generarPasswordTemporal();
    try {
        const { data, error } = await supabase.functions.invoke('reset-password', {
            body: { user_id: id, new_password: nuevaPassword }
        });
        if (error) throw error;
        alert(`Contraseña restablecida. La nueva contraseña temporal es: ${nuevaPassword}\n\nComunique esto al usuario.`);
    } catch (err) {
        // Si la Edge Function no existe, mostramos la contraseña y sugerimos cambiarla manualmente
        if (err.message?.includes('function not found') || err.message?.includes('404')) {
            alert(`No se pudo conectar con la función de restablecimiento. La contraseña temporal sugerida es: ${nuevaPassword}\n\nPor favor, comuníquesela al usuario y luego cámbiela desde el panel de Supabase.`);
        } else {
            alert('Error al restablecer contraseña: ' + err.message);
        }
    }
}

export async function eliminarUsuario(id) {
    if (!confirm('¿Eliminar permanentemente este usuario?')) return;
    await supabase.from('perfiles').delete().eq('id', id);
    alert('Usuario eliminado del sistema.');
    renderizarLista();
}

function generarPasswordTemporal(length = 10) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    let pass = '';
    for (let i = 0; i < length; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    return pass;
}