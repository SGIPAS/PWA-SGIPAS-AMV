// ocp Utilidad para obtener el siguiente correlativo desde Supabase
import { supabase } from '../supabase-client.js';

export async function obtenerCorrelativo(tipo, prefijo, digitos = 4) {
    const { data, error } = await supabase.rpc('siguiente_correlativo', {
        p_tipo: tipo,
        p_prefijo: prefijo,
        p_digitos: digitos
    });
    if (error) {
        console.error('Error obteniendo correlativo:', error);
        throw new Error('No se pudo generar el número correlativo.');
    }
    return data; // Ej: "OT-PA-0001"
}