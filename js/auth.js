// ocp Autenticación – login, logout y validación OWASP de contraseña
import { supabase, invalidarCacheRol } from './supabase-client.js';

// ocp Validación OWASP de fortaleza de contraseña (usada en cambio de password)
export function validarPassword(password) {
    const errores = [];
    if (password.length < 12) errores.push('mínimo 12 caracteres');
    if (!/[a-z]/.test(password)) errores.push('una minúscula');
    if (!/[A-Z]/.test(password)) errores.push('una mayúscula');
    if (!/\d/.test(password)) errores.push('un número');
    if (!/[!@#$%^&*(),.?":{}|<>_\-+=]/.test(password)) errores.push('un símbolo especial');
    if (/(.)\1{2,}/.test(password)) errores.push('sin caracteres repetidos consecutivos');
    return errores;
}

// ocp Renderiza la pantalla de inicio de sesión en #app-content
export function mostrarLogin() {
    const contenedor = document.getElementById('app-content');
    const sidebar = document.getElementById('sidebar');
    if (!contenedor) return;

    if (sidebar) sidebar.classList.add('hidden');

    contenedor.innerHTML = `
        <div class="flex items-center justify-center h-full">
            <div class="bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-700 w-full max-w-md">
                <h1 class="text-2xl font-bold text-white mb-6 text-center">SGI Planta de Ácido</h1>
                <form id="login-form" class="space-y-4" autocomplete="on">
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Correo electrónico</label>
                        <input
                            type="email"
                            id="login-email"
                            required
                            autocomplete="username"
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
                            autocomplete="current-password"
                            minlength="8"
                            class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-blue-500 focus:outline-none"
                            placeholder="••••••"
                        >
                    </div>
                    <p id="login-error" class="text-red-400 text-sm hidden"></p>
                    <button
                        type="submit"
                        id="btn-login-submit"
                        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Iniciar Sesión
                    </button>
                </form>
                <p class="text-xs text-slate-500 mt-4 text-center">
                    Si olvidó su contraseña, contacte al administrador del sistema.
                </p>
            </div>
        </div>
    `;

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        const btn = document.getElementById('btn-login-submit');

        btn.disabled = true;
        btn.textContent = 'Verificando...';
        errorEl.classList.add('hidden');

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            // ocp Mensaje genérico (no revelar si el email existe)
            errorEl.textContent = 'Credenciales inválidas. Verifique e intente nuevamente.';
            errorEl.classList.remove('hidden');
            btn.disabled = false;
            btn.textContent = 'Iniciar Sesión';
            return;
        }

        // Verificar que el usuario tenga perfil activo
        const { data: { user } } = await supabase.auth.getUser();
        const { data: perfil } = await supabase
            .from('perfiles')
            .select('estado')
            .eq('id', user.id)
            .single();

        if (!perfil || !perfil.estado) {
            await supabase.auth.signOut();
            invalidarCacheRol();
            errorEl.textContent = 'Su cuenta no está activa. Contacte al administrador.';
            errorEl.classList.remove('hidden');
            btn.disabled = false;
            btn.textContent = 'Iniciar Sesión';
            return;
        }

        invalidarCacheRol();
        window.location.reload();
    });
}

// ocp Cierra la sesión actual y recarga la página
export async function cerrarSesion() {
    invalidarCacheRol();
    await supabase.auth.signOut();
    window.location.reload();
}
