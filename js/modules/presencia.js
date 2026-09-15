// ocp Presencia de usuarios en tiempo real – con identificación completa
import { supabase } from '../supabase-client.js';

let currentChannel = null;

export async function iniciarPresencia(userId, userName, userRol, userDepto) {
    // Limpiar canal anterior si existe
    if (currentChannel) {
        supabase.removeChannel(currentChannel);
    }
    
    const channel = supabase.channel('online-users', {
        config: {
            presence: {
                key: userId,
                enabled: true
            }
        }
    });

    channel
        .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const usuarios = Object.values(state).flat().map(u => ({
                userId: u.user_id,
                nombre: u.name,
                rol: u.rol,
                departamento: u.departamento,
                onlineAt: u.online_at
            }));
            actualizarPanelPresencia(usuarios);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            newPresences.forEach(p => {
                console.log(`🟢 ${p.name} (${p.rol}) se conectó`);
            });
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            leftPresences.forEach(p => {
                console.log(`🔴 ${p.name} (${p.rol}) se desconectó`);
            });
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    user_id: userId,
                    name: userName,
                    rol: userRol,
                    departamento: userDepto,
                    online_at: new Date().toISOString()
                });
            }
        });

    currentChannel = channel;
}

export function detenerPresencia() {
    if (currentChannel) {
        supabase.removeChannel(currentChannel);
        currentChannel = null;
    }
}

function actualizarPanelPresencia(usuarios) {
    // Actualizar contador en sidebar
    const el = document.getElementById('presencia-count');
    if (el) el.textContent = usuarios.length;

    // Renderizar panel detallado si existe el contenedor
    const panel = document.getElementById('presencia-panel');
    if (!panel) return;

    if (usuarios.length === 0) {
        panel.innerHTML = '<p class="text-slate-400 text-xs">Sin usuarios en línea.</p>';
        return;
    }

    // Agrupar por rol
    const porRol = {};
    usuarios.forEach(u => {
        if (!porRol[u.rol]) porRol[u.rol] = [];
        porRol[u.rol].push(u);
    });

    panel.innerHTML = Object.entries(porRol).map(([rol, users]) => `
        <div class="mb-2">
            <p class="text-xs font-semibold text-slate-400 uppercase">${rol} (${users.length})</p>
            ${users.map(u => `
                <div class="flex items-center gap-2 text-xs text-slate-300 ml-2">
                    <span class="w-2 h-2 rounded-full bg-green-500"></span>
                    <span>${u.nombre}</span>
                    <span class="text-slate-500">· ${u.departamento || 'N/A'}</span>
                </div>
            `).join('')}
        </div>
    `).join('');
}
