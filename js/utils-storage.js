// ocp Utilidades para Supabase Storage con URLs firmadas y escape de HTML
import { supabase } from './supabase-client.js';

// ocp Cache de URLs firmadas (evita regenerar en cada render)
const _urlCache = new Map();
const _CACHE_TTL = 55 * 60 * 1000; // 55 minutos (URLs duran 60 min)

// ocp Genera una URL firmada para un archivo del bucket biblioteca
export async function getSignedUrl(path, expiresIn = 3600) {
    if (!path) return null;

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

// ocp Genera múltiples URLs firmadas en paralelo
export async function getSignedUrlsBulk(items) {
    const results = {};
    await Promise.all(items.map(async (item) => {
        results[item.id] = await getSignedUrl(item.path);
    }));
    return results;
}

// ocp Limpiar cache (útil al subir/actualizar/eliminar archivos)
export function limpiarCacheUrls() {
    _urlCache.clear();
}

// ocp Escapar HTML para prevenir XSS en interpolaciones
export function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
