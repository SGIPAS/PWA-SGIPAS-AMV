// ocp Motor principal del sistema – autenticación, roles, presencia, menú lateral, visitante
import { supabase } from './supabase-client.js';
import { cargarModuloOrdenes } from './modules/ordenes/index.js';
import { cargarModuloUsuarios } from './modules/usuarios/index.js';
import { mostrarLogin, cerrarSesion } from './auth.js';
import { iniciarPresencia, detenerPresencia } from './modules/presencia.js';

// ocp Obtener el rol del usuario actual
async function obtenerRol() {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.user_metadata?.rol || 'visitante';
}

// ocp Mostrar u ocultar botones del sidebar según el rol
async function construirSidebar(rol) {
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

    if (rol === 'visitante') {
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
        reportes:      ['admin', 'supervisor'].includes(rol),
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

    const btnLogin = document.createElement('button');
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
        await cargarDashboardVisitante();
        return;
    }

    const rol = user.user_metadata?.rol || 'operador';
    const userName = user.user_metadata?.nombre_completo || user.email;

    // 3. Mostrar sidebar
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

    // 4. Footer del sidebar
    if (footerEl) {
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'w-full flex items-center justify-start p-3 rounded-md bg-red-700 hover:bg-red-600 text-white font-medium transition-colors shadow-sm border border-red-600 mt-4';
        logoutBtn.innerHTML = '<span class="mr-3">🚪</span> Cerrar Sesión';
        logoutBtn.addEventListener('click', cerrarSesion);
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
    }

    // 5. Conectar botones de navegación
    const btnDashboard = document.getElementById('btn-nav-dashboard');
    const btnMantenimiento = document.getElementById('btn-nav-mtto');
    const btnUsuarios = document.getElementById('btn-nav-usuarios');
    const btnOperaciones = document.getElementById('btn-nav-operaciones');
    const btnBiblioteca = document.getElementById('btn-nav-biblioteca');
    const btnSSL = document.getElementById('btn-nav-ssl');
    const btnBitacora = document.getElementById('btn-nav-bitacora');
    const btnReportes = document.getElementById('btn-nav-reportes');
    const btnInventario = document.getElementById('btn-nav-inventario');
    const btnDisposicion = document.getElementById('btn-nav-disposicion');
    const btnLaboratorio = document.getElementById('btn-nav-laboratorio');
    const btnRutinas = document.getElementById('btn-nav-rutinas');

    if (btnDashboard && !btnDashboard.classList.contains('hidden')) {
        btnDashboard.addEventListener('click', () => import('./modules/dashboard/index.js').then(m => m.cargarDashboard(rol)));
    }
    if (btnBiblioteca && !btnBiblioteca.classList.contains('hidden')) {
        btnBiblioteca.addEventListener('click', () => import('./modules/biblioteca/index.js').then(m => m.cargarModuloBiblioteca()));
    }
    if (btnMantenimiento && !btnMantenimiento.classList.contains('hidden')) {
        btnMantenimiento.addEventListener('click', cargarModuloOrdenes);
    }
    if (btnOperaciones && !btnOperaciones.classList.contains('hidden')) {
        btnOperaciones.addEventListener('click', () => import('./modules/operaciones/index.js').then(m => m.cargarModuloOperaciones()));
    }
    if (btnUsuarios && !btnUsuarios.classList.contains('hidden')) {
        btnUsuarios.addEventListener('click', cargarModuloUsuarios);
    }
    if (btnSSL && !btnSSL.classList.contains('hidden')) {
        btnSSL.addEventListener('click', () => import('./modules/ssl/index.js').then(m => m.cargarModuloSSL()));
    }
    if (btnBitacora && !btnBitacora.classList.contains('hidden')) {
        btnBitacora.addEventListener('click', () => import('./modules/bitacora.js').then(m => m.cargarBitacora()));
    }
    if (btnReportes && !btnReportes.classList.contains('hidden')) {
        btnReportes.addEventListener('click', () => import('./modules/reportes/index.js').then(m => m.cargarReportes()));
    }
    if (btnInventario && !btnInventario.classList.contains('hidden')) {
        btnInventario.addEventListener('click', () => import('./modules/inventario/index.js').then(m => m.cargarInventario()));
    }
    if (btnDisposicion && !btnDisposicion.classList.contains('hidden')) {
        btnDisposicion.addEventListener('click', () => import('./modules/disposicion/index.js').then(m => m.cargarDisposicion()));
    }
    if (btnLaboratorio && !btnLaboratorio.classList.contains('hidden')) {
        btnLaboratorio.addEventListener('click', () => import('./modules/laboratorio/index.js').then(m => m.cargarLaboratorio()));
    }
    if (btnRutinas && !btnRutinas.classList.contains('hidden')) {
        btnRutinas.addEventListener('click', () => import('./modules/rutinas.js').then(m => m.cargarRutinas()));
    }

    document.getElementById('btn-cambiar-password')?.addEventListener('click', abrirCambioPassword);

    // 6. Menú hamburguesa
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

    // 7. Iniciar presencia
    await iniciarPresencia(user.id, userName);

    // 8. Obtener y guardar el playerId de OneSignal
    try {
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        OneSignalDeferred.push(async function(OneSignal) {
            try {
                const playerId = OneSignal.User?.PushSubscription?.id;
                if (playerId && user) {
                    localStorage.setItem('playerId', playerId);

                    const { error } = await supabase.from('dispositivos').upsert(
                        {
                            usuario_id: user.id,
                            player_id: playerId
                        },
                        { onConflict: 'usuario_id,player_id' }
                    );

                    if (error) {
                        console.warn('No se pudo registrar dispositivo:', error.message);
                    } else {
                        console.log('Dispositivo registrado:', playerId);
                    }
                } else {
                    console.warn('No se pudo obtener playerId. ¿El usuario aceptó las notificaciones?');
                }
            } catch (e) {
                console.warn('Error obteniendo playerId:', e.message);
            }
        });
    } catch (e) {}

    // 9. Cargar módulo inicial (Panel de Indicadores)
    import('./modules/dashboard/index.js').then(m => m.cargarDashboard(rol)).catch(err => {
        console.error(err);
        document.getElementById('app-content').innerHTML = `<p class="text-red-500">Error al cargar el panel.</p>`;
    });

    // 10. Limpiar presencia al salir
    window.addEventListener('beforeunload', () => detenerPresencia());
});
