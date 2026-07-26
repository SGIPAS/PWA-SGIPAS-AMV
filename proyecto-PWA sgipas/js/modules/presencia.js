// ocp Presencia de usuarios en tiempo real
import { supabase } from '../supabase-client.js';

let currentChannel = null;

export async function iniciarPresencia(userId, userName) {
  // Crea un canal único para presencia
  const channel = supabase.channel('online-users', {
    config: { presence: { key: userId } }
  });

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      actualizarContador(Object.keys(state).length);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: userId, name: userName });
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

function actualizarContador(count) {
  const el = document.getElementById('presencia-count');
  if (el) el.textContent = count;
}