import { supabase } from './supabase-client.js';

/**
 * Renderiza la pantalla de inicio de sesión en el div #app-content.
 * Oculta el sidebar y centra el formulario.
 */
export function mostrarLogin() {
    const contenedor = document.getElementById('app-content');
    const sidebar = document.getElementById('sidebar');
    if (!contenedor) return;

    // Ocultar sidebar por seguridad
    if (sidebar) sidebar.classList.add('hidden');

    contenedor.innerHTML = `
        <div class="flex items-center justify-center h-full">
            <div class="bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-700 w-full max-w-md">
                <h1 class="text-2xl font-bold text-white mb-6 text-center">
                    SGI Planta de Ácido
                </h1>
                <form id="login-form" class="space-y-4">
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Correo electrónico</label>
                        <input 
                            type="email" 
                            id="login-email" 
                            required 
                            class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-blue-500 focus:outline-none" 
                            placeholder="usuario@planta.com"
                        >
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Contraseña</label>
                        <input 
                            type="password" 
                            id="login-password" 
                            required 
                            class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-blue-500 focus:outline-none" 
                            placeholder="••••••"
                        >
                    </div>
                    <p id="login-error" class="text-red-400 text-sm hidden"></p>
                    <button 
                        type="submit" 
                        id="btn-login-submit"
                        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-150"
                    >
                        Iniciar Sesión
                    </button>
                </form>
            </div>
        </div>
    `;

    // Manejo del envío del formulario
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        const btn = document.getElementById('btn-login-submit');

        btn.disabled = true;
        btn.textContent = 'Verificando...';
        errorEl.classList.add('hidden');

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            errorEl.textContent = 'Error: ' + (error.message || 'Credenciales inválidas');
            errorEl.classList.remove('hidden');
            btn.disabled = false;
            btn.textContent = 'Iniciar Sesión';
        } else {
            // Sesión iniciada, recargar la aplicación para que main.js detecte la sesión
            window.location.reload();
        }
    });
}

/**
 * Cierra la sesión actual y recarga la página.
 */
export async function cerrarSesion() {
    await supabase.auth.signOut();
    window.location.reload();
}