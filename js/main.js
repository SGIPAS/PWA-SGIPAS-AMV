// ocp Motor principal del sistema – autenticación, roles, presencia, menú lateral, visitante
import { supabase, obtenerRolVerificado, obtenerPerfilActual, invalidarCacheRol } from './supabase-client.js';
import { cargarModuloOrdenes } from './modules/ordenes/index.js';
import { cargarModuloUsuarios } from './modules/usuarios/index.js';
import { mostrarLogin, cerrarSesion } from './auth.js';
import { iniciarPresencia, detenerPresencia } from './modules/presencia.js';

// ocp Construir sidebar según rol verificado
function construirSidebar(rol) {
    const botones = {
        dashboard:     document.getElementById('btn-nav-dashboard'),
        biblioteca:    document.getElementById('btn-nav-biblioteca'),
        mantenimiento: document.getElementById('btn-nav-mtto'),
        operaciones:   document.getElementById('btn-nav-operaciones'),
        bitacora:      document.getElementById('btn-nav-bitacora'),
        reportes:      document.getElementById('btn-nav-reportes'),
        inventario:    document.getElementById('btn-nav-inventario'),
        disposicion:   document.getElementById('btn-nav-disposicion'),
        laboratorio:   document.getElementById('btn-nav-laboratorio'),
        rutinas:       document.getElementById('btn-nav-rutinas'),
        usuarios:      document.getElementById('btn-nav-usuarios'),
        ssl:           document.getElementById('btn-nav-ssl')
    };

    if (!rol) {
        for (const btn of Object.values(botones)) {
            if (btn) btn.classList.add('hidden');
        }
        return;
    }

    const visibilidad = {
        dashboard:     true,
        biblioteca:    true,
        mantenimiento: ['admin', 'supervisor', 'ejecutor'].includes(rol),
        operaciones:   ['admin', 'supervisor', 'operador'].includes(rol),
        bitacora:      ['admin', 'supervisor'].includes(rol),
        reportes:      ['admin', 'supervisor', 'directivos'].includes(rol),
        inventario:    ['admin', 'supervisor', 'operador'].includes(rol),
        disposicion:   ['admin', 'supervisor', 'operador'].includes(rol),
        laboratorio:   ['admin', 'analista'].includes(rol),
        rutinas:       ['admin', 'supervisor', 'operador'].includes(rol),
        usuarios:      rol === 'admin',
        ssl:           ['admin', 'inspector_ssl'].includes(rol)
    };

    for (const [key, btn] of Object.entries(botones)) {
        if (btn) btn.classList.toggle('hidden', !visibilidad[key]);
    }
}

// ocp Rellenar datos del usuario en el sidebar
async function mostrarInfoUsuario() {
    const perfil = await obtenerPerfilActual();
    if (!perfil) return;
    const nombre = perfil.nombre_completo || perfil.email || 'Usuario';
    const rol = perfil.rol || 'sin rol';
    const iniciales = nombre.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
    const avatar = document.getElementById('avatar-inicial');
    const nombreEl = document.getElementById('usuario-nombre');
    const rolEl = document.getElementById('usuario-rol');
    if (avatar) avatar.textContent = iniciales;
    if (nombreEl) nombreEl.textContent = nombre;
    if (rolEl) rolEl.textContent = rol.replace(/_/g, ' ');
}

// ocp Cambiar contraseña con validación OWASP
function abrirCambioPassword() {
    const contenedor = document.getElementById('app-content');
    contenedor.innerHTML = `
        <div class="max-w-md mx-auto bg-slate-800 p-6 rounded-lg shadow-xl border border-slate-700">
            <h2 class="text-xl font-bold text-white mb-4">Cambiar contraseña</h2>
            <form id="form-password" class="space-y-4">
                <div>
                    <label class="block text-slate-400 text-sm">Contraseña actual</label>
                    <input type="password" id="password-actual" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" required>
                </div>
                <div>
                    <label class="block text-slate-400 text-sm">Nueva contraseña</label>
                    <input type="password" id="nuevo-password" minlength="12" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" required>
                    <p class="text-xs text-slate-500 mt-1">Mínimo 12 caracteres, mayúscula, minúscula, número y símbolo.</p>
                </div>
                <div>
                    <label class="block text-slate-400 text-sm">Confirmar nueva contraseña</label>
                    <input type="password" id="confirmar-password" minlength="12" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" required>
                </div>
                <p id="password-error" class="text-red-400 text-sm hidden"></p>
                <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">Actualizar</button>
            </form>
        </div>`;

    document.getElementById('form-password').addEventListener('submit', async (e) => {
        e.preventDefault();
        const passwordActual = document.getElementById('password-actual').value;
        const password = document.getElementById('nuevo-password').value;
        const confirmar = document.getElementById('confirmar-password').value;
        const errorEl = document.getElementById('password-error');
        errorEl.classList.add('hidden');

        if (password !== confirmar) {
            errorEl.textContent = 'Las contraseñas no coinciden.';
            errorEl.classList.remove('hidden');
            return;
        }

        // ocp Validación OWASP
        const errores = [];
        if (password.length < 12) errores.push('mínimo 12 caracteres');
        if (!/[a-z]/.test(password)) errores.push('una minúscula');
        if (!/[A-Z]/.test(password)) errores.push('una mayúscula');
        if (!/\d/.test(password)) errores.push('un número');
        if (!/[!@#$%^&*(),.?":{}|<>_\-+=]/.test(password)) errores.push('un símbolo especial');
        if (/(.)\1{2,}/.test(password)) errores.push('sin caracteres repetidos consecutivos');

        if (errores.length > 0) {
            errorEl.textContent = 'La contraseña debe contener: ' + errores.join(', ') + '.';
            errorEl.classList.remove('hidden');
            return;
        }

        // Re-autenticar con la contraseña actual antes de cambiarla
        const { data: { user } } = await supabase.auth.getUser();
        const { error: reauthError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: passwordActual
        });

        if (reauthError) {
            errorEl.textContent = 'Contraseña actual incorrecta.';
            errorEl.classList.remove('hidden');
            return;
        }

        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
            errorEl.textContent = 'Error: ' + error.message;
            errorEl.classList.remove('hidden');
            return;
        }

        alert('Contraseña actualizada correctamente.');
        invalidarCacheRol();
        location.reload();
    });
}

// ocp Cargar el panel de indicadores para visitantes (sin sesión)
async function cargarDashboardVisitante() {
    const sidebarEl = document.getElementById('sidebar');
    const footerEl = document.getElementById('sidebar-footer');
    if (sidebarEl) sidebarEl.classList.add('hidden');

    const appContent = document.getElementById('app-content');
    if (appContent) {
        appContent.innerHTML = '<p class="text-slate-400">Cargando panel de indicadores...</p>';
    }

    try {
        const dashboard = await import('./modules/dashboard/index.js');
        await dashboard.cargarDashboard('visitante');
    } catch (err) {
        console.error(err);
        if (appContent) appContent.innerHTML = '<p class="text-red-500">Error al cargar el panel.</p>';
    }

    // Verificar si ya existe un botón de login (evitar duplicados)
    if (document.getElementById('btn-login-visitante')) return;

    const btnLogin = document.createElement('button');
    btnLogin.id = 'btn-login-visitante';
    btnLogin.className = 'fixed top-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow-lg';
    btnLogin.textContent = 'Iniciar Sesión';
    btnLogin.addEventListener('click', () => {
        mostrarLogin();
    });
    document.body.appendChild(btnLogin);
}

// ocp Inicio de la aplicación
document.addEventListener('DOMContentLoaded', async () => {
    const sidebarEl = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    const footerEl = document.getElementById('sidebar-footer');

    // 1. Verificar sesión
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        await cargarDashboardVisitante();
        return;
    }

    // 2. Validar usuario
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        await supabase.auth.signOut();
        invalidarCacheRol();
        await cargarDashboardVisitante();
        return;
    }

    // 3. Obtener rol VERIFICADO desde perfiles
    const rol = await obtenerRolVerificado();
    if (!rol) {
        // Usuario sin perfil o inactivo → cerrar sesión
        alert('Tu cuenta no está activa o no tiene perfil asignado. Contacta al administrador.');
        await supabase.auth.signOut();
        invalidarCacheRol();
        await cargarDashboardVisitante();
        return;
    }

    const perfil = await obtenerPerfilActual();

    // 4. Mostrar sidebar
    if (sidebarEl) {
        sidebarEl.classList.remove('hidden');
        if (window.innerWidth < 768) {
            sidebarEl.classList.add('sidebar-closed');
        } else {
            sidebarEl.classList.remove('sidebar-closed');
        }
    }
    construirSidebar(rol);
    await mostrarInfoUsuario();

    // 5. Footer del sidebar
    if (footerEl) {
        footerEl.innerHTML = '';
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'w-full flex items-center justify-start p-3 rounded-md bg-red-700 hover:bg-red-600 text-white font-medium transition-colors shadow-sm border border-red-600 mt-4';
        logoutBtn.innerHTML = '<span class="mr-3">🚪</span> Cerrar Sesión';
        logoutBtn.addEventListener('click', async () => {
            invalidarCacheRol();
            await cerrarSesion();
        });
        footerEl.appendChild(logoutBtn);

        if (rol === 'admin') {
            const presenciaHTML = `
                <div class="mt-2 px-4 py-2 text-xs text-slate-400 flex items-center">
                    <span class="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                    En línea: <span id="presencia-count" class="ml-1 font-bold text-white">0</span>
                </div>
                <div id="presencia-panel" class="mt-2 px-4 py-2 max-h-48 overflow-y-auto"></div>`;
            const presenciaDiv = document.createElement('div');
            presenciaDiv.innerHTML = presenciaHTML;
            footerEl.appendChild(presenciaDiv);
        }
    }

    // 6. Conectar botones de navegación
    const btnMap = [
        ['btn-nav-dashboard',    () => import('./modules/dashboard/index.js').then(m => m.cargarDashboard(rol))],
        ['btn-nav-biblioteca',   () => import('./modules/biblioteca/index.js').then(m => m.cargarModuloBiblioteca())],
        ['btn-nav-mtto',         cargarModuloOrdenes],
        ['btn-nav-operaciones',  () => import('./modules/operaciones/index.js').then(m => m.cargarModuloOperaciones())],
        ['btn-nav-usuarios',     cargarModuloUsuarios],
        ['btn-nav-ssl',          () => import('./modules/ssl/index.js').then(m => m.cargarModuloSSL())],
        ['btn-nav-bitacora',     () => import('./modules/bitacora/index.js').then(m => m.cargarBitacora())],
        ['btn-nav-reportes',     () => import('./modules/reportes/index.js').then(m => m.cargarReportes())],
        ['btn-nav-inventario',   () => import('./modules/inventario/index.js').then(m => m.cargarInventario())],
        ['btn-nav-disposicion',  () => import('./modules/disposicion/index.js').then(m => m.cargarDisposicion())],
        ['btn-nav-laboratorio',  () => import('./modules/laboratorio/index.js').then(m => m.cargarLaboratorio())],
        ['btn-nav-rutinas',      () => import('./modules/rutinas/index.js').then(m => m.cargarRutinas())]
    ];

    btnMap.forEach(([id, handler]) => {
        const btn = document.getElementById(id);
        if (btn && !btn.classList.contains('hidden')) {
            btn.addEventListener('click', handler);
        }
    });

    document.getElementById('btn-cambiar-password')?.addEventListener('click', abrirCambioPassword);

    // 7. Menú hamburguesa
    if (menuToggle && sidebarEl) {
        menuToggle.addEventListener('click', () => {
            sidebarEl.classList.toggle('sidebar-closed');
            const main = document.querySelector('main');
            if (main) main.style.marginLeft = sidebarEl.classList.contains('sidebar-closed') ? '0' : '';
        });
        sidebarEl.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                if (window.innerWidth < 768) {
                    sidebarEl.classList.add('sidebar-closed');
                    document.querySelector('main').style.marginLeft = '0';
                }
            });
        });
    }

    // 8. Iniciar presencia con datos verificados
    await iniciarPresencia(user.id, perfil?.nombre_completo || user.email, rol, perfil?.departamento);

    // 9. Registrar playerId de OneSignal
    try {
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        OneSignalDeferred.push(async function (OneSignal) {
            try {
                const playerId = OneSignal.User?.PushSubscription?.id;
                if (playerId && user) {
                    localStorage.setItem('playerId', playerId);
                    const { error } = await supabase.from('dispositivos').upsert(
                        { usuario_id: user.id, player_id: playerId },
                        { onConflict: 'usuario_id,player_id' }
                    );
                    if (error) console.warn('No se pudo registrar dispositivo:', error.message);
                    else console.log('Dispositivo registrado:', playerId);
                }
            } catch (e) {
                console.warn('Error obteniendo playerId:', e.message);
            }
        });
    } catch (e) { /* noop */ }

    // 10. Cargar módulo inicial
    import('./modules/dashboard/index.js')
        .then(m => m.cargarDashboard(rol))
        .catch(err => {
            console.error(err);
            document.getElementById('app-content').innerHTML = `<p class="text-red-500">Error al cargar el panel.</p>`;
        });

    // 11. Limpiar presencia al salir
    window.addEventListener('beforeunload', () => detenerPresencia());
});
