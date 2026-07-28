// ocp Motor principal del sistema – autenticación, roles, presencia, menú lateral expansivo
import { supabase } from './supabase-client.js';
import { cargarModuloOrdenes } from './modules/ordenes/index.js';
import { cargarModuloUsuarios } from './modules/usuarios/index.js';
import { mostrarLogin, cerrarSesion } from './auth.js';
import { iniciarPresencia, detenerPresencia } from './modules/presencia.js';

// ocp Obtener el rol del usuario actual
async function obtenerRol() {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.user_metadata?.rol || 'operador';
}

// ocp Actualizar badge de notificaciones
async function actualizarBadgeNotificaciones() {
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

// ocp Mostrar u ocultar botones del sidebar según el rol
async function construirSidebar(rol) {
    const botones = {
        dashboard:     document.getElementById('btn-nav-dashboard'),
        biblioteca:    document.getElementById('btn-nav-biblioteca'),
        mantenimiento: document.getElementById('btn-nav-mtto'),
        operaciones:   document.getElementById('btn-nav-operaciones'),
        bitacora:      document.getElementById('btn-nav-bitacora'),
        usuarios:      document.getElementById('btn-nav-usuarios'),
        ssl:           document.getElementById('btn-nav-ssl')
    };
    const visibilidad = {
        dashboard:     true,  // todos ven el panel
        biblioteca:    true,
        mantenimiento: ['admin', 'supervisor', 'ejecutor'].includes(rol),
        operaciones:   ['admin', 'supervisor', 'operador'].includes(rol),
        bitacora:      ['admin', 'supervisor'].includes(rol),
        usuarios:      rol === 'admin',
        ssl:           ['admin', 'inspector_ssl'].includes(rol)
    };
    for (const [key, btn] of Object.entries(botones)) {
        if (btn) btn.classList.toggle('hidden', !visibilidad[key]);
    }
}

// ocp Rellenar datos del usuario en el sidebar
function mostrarInfoUsuario() {
    supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        const nombre = user.user_metadata?.nombre_completo || user.email;
        const rol = user.user_metadata?.rol || 'operador';
        const iniciales = nombre.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
        const avatar = document.getElementById('avatar-inicial');
        const nombreEl = document.getElementById('usuario-nombre');
        const rolEl = document.getElementById('usuario-rol');
        if (avatar) avatar.textContent = iniciales;
        if (nombreEl) nombreEl.textContent = nombre;
        if (rolEl) rolEl.textContent = rol.replace(/_/g, ' ');
    });
}

// ocp Cambiar contraseña
function abrirCambioPassword() {
    const contenedor = document.getElementById('app-content');
    contenedor.innerHTML = `
        <div class="max-w-md mx-auto bg-slate-800 p-6 rounded-lg shadow-xl border border-slate-700">
            <h2 class="text-xl font-bold text-white mb-4">Cambiar contraseña</h2>
            <form id="form-password" class="space-y-4">
                <div>
                    <label class="block text-slate-400 text-sm">Nueva contraseña</label>
                    <input type="password" id="nuevo-password" minlength="6" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" required>
                </div>
                <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">Actualizar</button>
            </form>
        </div>`;
    document.getElementById('form-password').addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('nuevo-password').value;
        const { error } = await supabase.auth.updateUser({ password });
        if (error) return alert('Error: ' + error.message);
        alert('Contraseña actualizada correctamente.');
        location.reload();
    });
}

// ocp Inicio de la aplicación
document.addEventListener('DOMContentLoaded', async () => {
    const sidebarEl = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    const footerEl = document.getElementById('sidebar-footer');

    // 1. Verificar sesión
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        mostrarLogin();
        return;
    }

    // 2. Validar usuario
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        await supabase.auth.signOut();
        mostrarLogin();
        return;
    }

    const rol = user.user_metadata?.rol || 'operador';
    const userName = user.user_metadata?.nombre_completo || user.email;

    // 3. Mostrar sidebar y aplicar restricciones
    if (sidebarEl) {
        sidebarEl.classList.remove('hidden');
        if (window.innerWidth < 768) {
            sidebarEl.classList.add('sidebar-closed');
        } else {
            sidebarEl.classList.remove('sidebar-closed');
        }
    }
    await construirSidebar(rol);
    mostrarInfoUsuario();

    // 4. Agregar notificaciones, cerrar sesión y presencia en el footer del sidebar
    if (footerEl) {
        const badgeHTML = `
            <button id="btn-notificaciones" class="w-full flex items-center justify-between p-3 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium transition-colors shadow-sm border border-slate-600">
                <span class="flex items-center"><span class="mr-3">🔔</span> Notificaciones</span>
                <span id="badge-notificaciones" class="bg-red-600 text-white text-xs font-bold rounded-full px-2 py-0.5 hidden">0</span>
            </button>`;

        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'w-full flex items-center justify-start p-3 rounded-md bg-red-700 hover:bg-red-600 text-white font-medium transition-colors shadow-sm border border-red-600';
        logoutBtn.innerHTML = '<span class="mr-3">🚪</span> Cerrar Sesión';
        logoutBtn.addEventListener('click', cerrarSesion);

        footerEl.innerHTML = badgeHTML;
        footerEl.appendChild(logoutBtn);

        if (rol === 'admin') {
            const presenciaHTML = `
                <div class="mt-2 px-4 py-2 text-xs text-slate-400 flex items-center">
                    <span class="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                    En línea: <span id="presencia-count" class="ml-1 font-bold text-white">0</span>
                </div>`;
            const presenciaDiv = document.createElement('div');
            presenciaDiv.innerHTML = presenciaHTML;
            footerEl.appendChild(presenciaDiv.firstElementChild);
        }

        document.getElementById('btn-notificaciones')?.addEventListener('click', () => {
            import('./notificaciones.js')
                .then(m => m.mostrarNotificaciones())
                .catch(err => console.error('Error al cargar notificaciones:', err));
        });
    }

    // 5. Conectar botones de navegación (incluido el Panel de Indicadores)
    const btnDashboard = document.getElementById('btn-nav-dashboard');
    const btnMantenimiento = document.getElementById('btn-nav-mtto');
    const btnUsuarios = document.getElementById('btn-nav-usuarios');
    const btnOperaciones = document.getElementById('btn-nav-operaciones');
    const btnBiblioteca = document.getElementById('btn-nav-biblioteca');
    const btnSSL = document.getElementById('btn-nav-ssl');
    const btnBitacora = document.getElementById('btn-nav-bitacora');

    if (btnDashboard && !btnDashboard.classList.contains('hidden')) {
        btnDashboard.addEventListener('click', () => {
            import('./modules/dashboard/index.js')
                .then(m => m.cargarDashboard())
                .catch(err => console.error('Error al cargar Panel de Indicadores:', err));
        });
    }
    if (btnBiblioteca && !btnBiblioteca.classList.contains('hidden')) {
        btnBiblioteca.addEventListener('click', () => {
            import('./modules/biblioteca/index.js').then(m => m.cargarModuloBiblioteca());
        });
    }
    if (btnMantenimiento && !btnMantenimiento.classList.contains('hidden')) {
        btnMantenimiento.addEventListener('click', cargarModuloOrdenes);
    }
    if (btnOperaciones && !btnOperaciones.classList.contains('hidden')) {
        btnOperaciones.addEventListener('click', () => {
            import('./modules/operaciones/index.js').then(m => m.cargarModuloOperaciones());
        });
    }
    if (btnUsuarios && !btnUsuarios.classList.contains('hidden')) {
        btnUsuarios.addEventListener('click', cargarModuloUsuarios);
    }
    if (btnSSL && !btnSSL.classList.contains('hidden')) {
        btnSSL.addEventListener('click', () => {
            import('./modules/ssl/index.js').then(m => m.cargarModuloSSL());
        });
    }
    if (btnBitacora && !btnBitacora.classList.contains('hidden')) {
        btnBitacora.addEventListener('click', () => {
            import('./modules/bitacora.js').then(m => m.cargarBitacora());
        });
    }

    document.getElementById('btn-cambiar-password')?.addEventListener('click', abrirCambioPassword);

    // 6. Menú hamburguesa universal
    if (menuToggle && sidebarEl) {
        menuToggle.addEventListener('click', () => {
            sidebarEl.classList.toggle('sidebar-closed');
            const main = document.querySelector('main');
            if (main) {
                if (sidebarEl.classList.contains('sidebar-closed')) {
                    main.style.marginLeft = '0';
                } else {
                    main.style.marginLeft = '';
                }
            }
        });

        sidebarEl.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                if (window.innerWidth < 768) {
                    sidebarEl.classList.add('sidebar-closed');
                    const main = document.querySelector('main');
                    if (main) main.style.marginLeft = '0';
                }
            });
        });
    }

    // 7. Iniciar presencia
    await iniciarPresencia(user.id, userName);

    // 8. Actualizar badge y cargar módulo inicial (Panel de Indicadores)
    await actualizarBadgeNotificaciones();
    import('./modules/dashboard/index.js')
        .then(m => m.cargarDashboard())
        .catch(err => {
            console.error('Error al cargar Panel de Indicadores:', err);
            document.getElementById('app-content').innerHTML = `<p class="text-red-500">Error al cargar el panel principal.</p>`;
        });

    // 9. Limpiar presencia al salir
    window.addEventListener('beforeunload', () => detenerPresencia());
});