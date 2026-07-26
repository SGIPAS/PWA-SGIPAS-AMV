import { supabase } from './supabase-client.js';
import { renderLogin } from './modules/auth.js';
import { initSidebar } from './modules/sidebar.js';
import { cargarModulo } from './modules/operaciones.js'; // Por defecto o router

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Registro del Service Worker para soporte PWA Offline
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('./sw.js');
            console.log('Service Worker registrado con éxito.');
        } catch (error) {
            console.error('Fallo al registrar el Service Worker:', error);
        }
    }

    // 2. Verificar estado de autenticación en Supabase
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        mostrarAppPrincipal(session.user);
    } else {
        mostrarLogin();
    }
});

export function mostrarAppPrincipal(user) {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('main-container').classList.remove('hidden');
    
    // Guardar datos mínimos en sesión local del navegador
    localStorage.setItem('user_email', user.email);
    
    initSidebar(); // Carga el menú lateral
}

export function mostrarLogin() {
    document.getElementById('main-container').classList.add('hidden');
    document.getElementById('login-container').classList.remove('hidden');
    renderLogin();
}