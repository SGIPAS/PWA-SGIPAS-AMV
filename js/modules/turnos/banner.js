// ocp Banner de estado de turno — persistente en todos los módulos
import { supabase } from '../../supabase-client.js';
import { escapeHtml } from '../../utils-storage.js';

let turnoActivo = null;
let bitacoraPendiente = null;
let turnosAbiertosPlanta = [];
let intervalId = null;

// ocp Inicializar el sistema de banner
export async function inicializarBanner(rol) {
    const contenedor = document.getElementById('banner-turnos');
    if (!contenedor) return;

    await refrescarEstadoTurno(rol);

    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(() => refrescarEstadoTurno(rol), 60000);
}

// ocp Detener el banner (al cerrar sesión)
export function detenerBanner() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    const contenedor = document.getElementById('banner-turnos');
    if (contenedor) contenedor.innerHTML = '';
}

// ocp Consultar Supabase y actualizar el banner
export async function refrescarEstadoTurno(rol) {
    const contenedor = document.getElementById('banner-turnos');
    if (!contenedor) return;

    // 1. Bitácora pendiente (solo supervisores/admin)
    bitacoraPendiente = null;
    if (rol === 'supervisor' || rol === 'admin') {
        const { data } = await supabase.rpc('obtener_bitacora_pendiente');
        bitacoraPendiente = data || null;
    }

    // 2. Turno del usuario
    const { data: turnoData } = await supabase.rpc('obtener_turno_activo');
    turnoActivo = turnoData || null;

    // 3. Turnos abiertos en la planta (si el usuario no tiene turno)
    turnosAbiertosPlanta = [];
    if (!turnoActivo) {
        const { data: abiertos } = await supabase.rpc('listar_turnos_abiertos');
        turnosAbiertosPlanta = abiertos || [];
    }

    renderizar(rol);
}

// ocp Renderizar el banner según el estado
function renderizar(rol) {
    const contenedor = document.getElementById('banner-turnos');
    if (!contenedor) return;

    // Caso 1: Bitácora pendiente (prioridad máxima)
    if (bitacoraPendiente) {
        contenedor.innerHTML = `
            <div class="bg-red-700 border-b-2 border-red-500 px-4 py-3 flex items-center justify-between flex-wrap gap-3 shadow-lg">
                <div class="flex items-center gap-3 flex-1 min-w-0">
                    <span class="text-2xl flex-shrink-0">📋</span>
                    <div class="min-w-0">
                        <p class="text-white font-bold text-sm">Bitácora pendiente de aceptar</p>
                        <p class="text-red-100 text-xs">
                            Turno <strong>${escapeHtml(bitacoraPendiente.grupo)}</strong> —
                            ${escapeHtml(bitacoraPendiente.tipo_turno)} del
                            ${new Date(bitacoraPendiente.fecha_operativa + 'T12:00:00').toLocaleDateString('es-VE')}
                            · Entregada por: <strong>${escapeHtml(bitacoraPendiente.supervisor_saliente?.nombre || 'N/D')}</strong>
                        </p>
                    </div>
                </div>
                <button id="btn-ver-bitacora-pendiente"
                    class="bg-white text-red-700 hover:bg-red-50 font-bold text-sm py-2 px-4 rounded transition shadow-sm flex-shrink-0">
                    Ver y aceptar
                </button>
            </div>
        `;
        document.getElementById('btn-ver-bitacora-pendiente')?.addEventListener('click', () => {
            import('./aceptacion.js').then(m => m.abrirModalAceptacion(bitacoraPendiente));
        });
        return;
    }

    // Caso 2: Turno activo propio
    if (turnoActivo) {
        contenedor.innerHTML = `
            <div class="bg-green-800 border-b-2 border-green-600 px-4 py-2 flex items-center justify-between flex-wrap gap-3">
                <div class="flex items-center gap-3 text-sm">
                    <span class="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse flex-shrink-0"></span>
                    <div class="text-green-100">
                        <strong class="text-white">Turno activo:</strong>
                        Grupo ${escapeHtml(turnoActivo.grupo)} · ${escapeHtml(turnoActivo.tipo_turno)}
                        · ${new Date(turnoActivo.fecha_operativa + 'T12:00:00').toLocaleDateString('es-VE')}
                        · hasta ${new Date(turnoActivo.hora_fin_prevista).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
                ${(rol === 'supervisor' || rol === 'admin') ? `
                <button id="btn-ir-bitacora"
                    class="bg-green-600 hover:bg-green-500 text-white font-semibold text-xs py-1.5 px-3 rounded transition">
                    Ir a Bitácora
                </button>` : ''}
            </div>
        `;
        document.getElementById('btn-ir-bitacora')?.addEventListener('click', () => {
            import('../bitacora/index.js').then(m => m.cargarBitacora());
        });
        return;
    }

    // Caso 3: Sin turno propio PERO hay turnos abiertos en planta
    if (turnosAbiertosPlanta.length > 0) {
        const totalTurnos = turnosAbiertosPlanta.length;
        const grupos = turnosAbiertosPlanta.map(t => t.grupo).join(', ');

        contenedor.innerHTML = `
            <div class="bg-blue-800 border-b-2 border-blue-600 px-4 py-2 flex items-center justify-between flex-wrap gap-3">
                <div class="flex items-center gap-3 text-sm">
                    <span class="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse flex-shrink-0"></span>
                    <div class="text-blue-100">
                        <strong class="text-white">${totalTurnos} turno${totalTurnos > 1 ? 's' : ''} abierto${totalTurnos > 1 ? 's' : ''} en planta:</strong>
                        Grupo${totalTurnos > 1 ? 's' : ''} ${escapeHtml(grupos)}.
                        No estás asociado a ninguno.
                    </div>
                </div>
                <div class="flex gap-2 flex-shrink-0">
                    ${turnosAbiertosPlanta.map(t => `
                        <button class="btn-unirse-turno bg-blue-500 hover:bg-blue-400 text-white font-semibold text-xs py-1.5 px-3 rounded transition"
                            data-turno-id="${t.id}">
                            Unirse a Grupo ${escapeHtml(t.grupo)}
                        </button>
                    `).join('')}
                    ${(rol === 'supervisor' || rol === 'admin') ? `
                    <button id="btn-abrir-turno-azul"
                        class="bg-blue-700 hover:bg-blue-600 text-white font-semibold text-xs py-1.5 px-3 rounded transition border border-blue-500">
                        + Abrir otro
                    </button>` : ''}
                </div>
            </div>
        `;

        contenedor.querySelectorAll('.btn-unirse-turno').forEach(btn => {
            btn.addEventListener('click', async () => {
                const turnoId = btn.dataset.turnoId;
                await unirseATurno(turnoId, rol);
            });
        });

        document.getElementById('btn-abrir-turno-azul')?.addEventListener('click', () => {
            import('./apertura.js').then(m => m.abrirModalApertura());
        });
        return;
    }

    // Caso 4: Sin turno y sin turnos abiertos en planta
    if (rol === 'supervisor' || rol === 'admin') {
        contenedor.innerHTML = `
            <div class="bg-yellow-800 border-b-2 border-yellow-600 px-4 py-2 flex items-center justify-between flex-wrap gap-3">
                <div class="flex items-center gap-3 text-sm text-yellow-100">
                    <span class="text-xl flex-shrink-0">⚠️</span>
                    <div>
                        <strong class="text-white">No hay turnos abiertos.</strong>
                        Debe abrir un turno para registrar datos y generar la bitácora.
                    </div>
                </div>
                <button id="btn-abrir-turno"
                    class="bg-yellow-500 hover:bg-yellow-400 text-yellow-900 font-bold text-sm py-2 px-4 rounded transition shadow-sm flex-shrink-0">
                    Abrir Turno
                </button>
            </div>
        `;
        document.getElementById('btn-abrir-turno')?.addEventListener('click', () => {
            import('./apertura.js').then(m => m.abrirModalApertura());
        });
        return;
    }

    // Otros roles sin turno ni turnos abiertos: nada
    contenedor.innerHTML = '';
}

// ocp Unirse a un turno existente
async function unirseATurno(turnoId, rol) {
    try {
        const { error } = await supabase.rpc('unirse_a_turno', { p_turno_id: turnoId });
        if (error) throw error;
        await refrescarEstadoTurno(rol);
    } catch (err) {
        alert('Error al unirse al turno: ' + (err.message || err));
    }
}

// ocp Obtener el turno activo (para otros módulos)
export function getTurnoActivo() {
    return turnoActivo;
}
