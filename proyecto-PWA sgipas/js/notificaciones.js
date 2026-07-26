// ocp Módulo de notificaciones – función reusable para enviar alertas y vista de notificaciones
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

// ocp Muestra la lista de notificaciones del usuario actual
export async function mostrarNotificaciones() {
    const contenedor = document.getElementById('app-content');
    const { data: { user } } = await supabase.auth.getUser();

    contenedor.innerHTML = `
        <div class="max-w-2xl mx-auto">
            <h1 class="text-2xl font-bold text-white mb-6">Notificaciones</h1>
            <div id="lista-notificaciones" class="space-y-3">
                <p class="text-slate-400 animate-pulse">Cargando...</p>
            </div>
        </div>`;

    const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

    const lista = document.getElementById('lista-notificaciones');
    if (error) {
        lista.innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`;
        return;
    }
    if (!data.length) {
        lista.innerHTML = '<p class="text-slate-400">No tienes notificaciones.</p>';
        return;
    }

    lista.innerHTML = data.map(n => `
        <div class="bg-slate-800 p-3 rounded border ${n.leida ? 'border-slate-700 opacity-60' : 'border-blue-500'} flex justify-between">
            <div>
                <p class="text-sm text-slate-200">${n.mensaje}</p>
                <span class="text-xs text-slate-400">${new Date(n.created_at).toLocaleString()}</span>
            </div>
            ${!n.leida ? `<button class="text-xs text-blue-400 hover:underline marcar-leida" data-id="${n.id}">Marcar leída</button>` : ''}
        </div>
    `).join('');

    document.querySelectorAll('.marcar-leida').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            await supabase.from('notificaciones').update({ leida: true }).eq('id', id);
            mostrarNotificaciones();
        });
    });
}