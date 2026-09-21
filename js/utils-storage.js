// ocp Utilidades para Supabase Storage con URLs firmadas
import { supabase } from './supabase-client.js';

// ocp Cache de URLs firmadas (evita regenerar en cada render)
const _urlCache = new Map();
const _CACHE_TTL = 55 * 60 * 1000; // 55 minutos (las URLs duran 60 min)

/**
 * Genera una URL firmada para un archivo del bucket biblioteca.
 * @param {string} path - Ruta del archivo dentro del bucket (ej: "documentos/1234_abc.pdf")
 * @param {number} expiresIn - Segundos de validez (default: 3600 = 1 hora)
 * @returns {Promise<string|null>} URL firmada o null si falla
 */
export async function getSignedUrl(path, expiresIn = 3600) {
    if (!path) return null;

    // Verificar cache
    const cacheKey = `${path}:${expiresIn}`;
    const cached = _urlCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.url;
    }

    try {
        const { data, error } = await supabase.storage
            .from('biblioteca')
            .createSignedUrl(path, expiresIn);

        if (error) {
            console.error('Error generando signed URL:', error.message);
            return null;
        }

        // Guardar en cache
        _urlCache.set(cacheKey, {
            url: data.signedUrl,
            expiresAt: Date.now() + _CACHE_TTL
        });

        return data.signedUrl;
    } catch (err) {
        console.error('Error en getSignedUrl:', err);
        return null;
    }
}

/**
 * Genera múltiples URLs firmadas en paralelo.
 * @param {Array<{id: string, path: string}>} items - Array con id y path
 * @returns {Promise<Object>} Mapa id → URL firmada
 */
export async function getSignedUrlsBulk(items) {
    const results = {};
    await Promise.all(items.map(async (item) => {
        results[item.id] = await getSignedUrl(item.path);
    }));
    return results;
}

// ocp Limpiar cache (útil al subir/actualizar archivos)
export function limpiarCacheUrls() {
    _urlCache.clear();
}
