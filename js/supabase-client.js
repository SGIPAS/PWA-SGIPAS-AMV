// ocp Cliente Supabase con helpers de autorización verificada
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://dhxeyusfpuwzpksxmguo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoeGV5dXNmcHV3enBrc3htZ3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NTIyOTgsImV4cCI6MjA5OTAyODI5OH0.zi--IZhQRMBuUx3ZSghDrkmvXUhcmIZ6VbbTKAWPN5I';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
    }
});

// ocp Cache de rol verificado (evita consultas repetidas en la misma vista)
let _rolCache = null;
let _rolCacheUser = null;

// ocp Obtener rol verificado desde la tabla perfiles (NUNCA desde user_metadata)
export async function obtenerRolVerificado() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        _rolCache = null;
        _rolCacheUser = null;
        return null;
    }

    if (_rolCacheUser === user.id && _rolCache) {
        return _rolCache;
    }

    const { data: perfil, error } = await supabase
        .from('perfiles')
        .select('rol, estado')
        .eq('id', user.id)
        .single();

    if (error || !perfil || !perfil.estado) {
        _rolCache = null;
        _rolCacheUser = null;
        return null;
    }

    _rolCache = perfil.rol;
    _rolCacheUser = user.id;
    return perfil.rol;
}

// ocp Invalidar cache (llamar tras cerrar sesión o cambio de rol)
export function invalidarCacheRol() {
    _rolCache = null;
    _rolCacheUser = null;
}

// ocp Verificar si el usuario actual es admin
export async function esAdmin() {
    const rol = await obtenerRolVerificado();
    return rol === 'admin';
}

// ocp Obtener perfil completo del usuario actual
export async function obtenerPerfilActual() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: perfil } = await supabase
        .from('perfiles')
        .select('id, nombre_completo, email, departamento, rol, estado')
        .eq('id', user.id)
        .single();

    return perfil;
}
