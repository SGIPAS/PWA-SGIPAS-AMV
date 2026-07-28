// ocp Módulo de notificaciones – función reusable para enviar alertas y vista mejorada
import { supabase } from './supabase-client.js';

// ocp Envía una notificación a todos los usuarios que tengan los roles indicados
export async function notificarARoles(roles, mensaje) {
    const { data: perfiles, error } = await supabase
        .from('perfiles')
        .select('id')
        .in('rol', roles);

    if (error || !perfiles || perfiles.length === 0) return;

    const inserts = perfiles.map(p => ({
        usuario_id: p.id,
        mensaje: mensaje,
        tipo: 'alerta'
    }));

    await supabase.from('notificaciones').insert(inserts);
}

// ocp Muestra la lista de notificaciones del usuario actual (con solución al marcar leída)
export async function mostrarNotificaciones() {
    const contenedor = document.getElementById('app-content');
    const { data: { user } } = await supabase.auth.getUser();

    contenedor.innerHTML = `
        <div class="max-w-2xl mx-auto">
            <h1 class="text-2xl font-bold text-white mb-6">Notificaciones</h1>
            <div id="lista-notificaciones" class="space-y-3"></div>
        </div>`;

    await cargarNotificaciones(user.id);

    // Delegación de eventos para "Marcar leída"
    document.getElementById('lista-notificaciones').addEventListener('click', async (e) => {
        const btn = e.target.closest('.marcar-leida');
        if (!btn) return;
        const id = btn.dataset.id;
        // Optimistic UI: eliminar la notificación de la vista inmediatamente
        const item = btn.closest('.notificacion-item');
        if (item) item.style.display = 'none';
        // Actualizar Supabase
        await supabase.from('notificaciones').update({ leida: true }).eq('id', id);
        // Actualizar badge
        actualizarBadge();
    });
}

async function cargarNotificaciones(userId) {
    const container = document.getElementById('lista-notificaciones');
    const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('usuario_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        container.innerHTML = `<p class="text-red-500">Error al cargar notificaciones.</p>`;
        return;
    }
    if (!data || data.length === 0) {
        container.innerHTML = '<p class="text-slate-400">No tienes notificaciones.</p>';
        return;
    }

    container.innerHTML = data.map(n => `
        <div class="notificacion-item bg-slate-800 p-3 rounded border ${n.leida ? 'border-slate-700 opacity-60' : 'border-blue-500'} flex justify-between">
            <div>
                <p class="text-sm text-slate-200">${n.mensaje}</p>
                <span class="text-xs text-slate-400">${new Date(n.created_at).toLocaleString()}</span>
            </div>
            ${!n.leida ? `<button class="marcar-leida text-xs text-blue-400 hover:underline" data-id="${n.id}">Marcar leída</button>` : ''}
        </div>
    `).join('');
}

async function actualizarBadge() {
    const badge = document.getElementById('badge-notificaciones');
    if (!badge) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { count } = await supabase
        .from('notificaciones')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', user.id)
        .eq('leida', false);
    badge.textContent = count ?? 0;
    badge.classList.toggle('hidden', count === 0);
}