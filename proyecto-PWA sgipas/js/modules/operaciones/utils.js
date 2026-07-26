// ocp Utilidades compartidas
import { supabase } from '../../supabase-client.js';

export async function obtenerRolUsuario() {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.user_metadata?.rol || 'operador';
}