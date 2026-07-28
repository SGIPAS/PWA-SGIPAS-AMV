// ocp Módulo de Bitácora Digital de Turno – versión final con pH por equipo, grupo editable, acidez en tanques y filtro nocturno corregido
import { supabase } from '../supabase-client.js';

let entregaActual = null;

export async function cargarBitacora() {
    const contenedor = document.getElementById('app-content');
    if (!contenedor) return;

    const { data: { user } } = await supabase.auth.getUser();
    const rol = user?.user_metadata?.rol;
    if (!['admin', 'supervisor'].includes(rol)) {
        contenedor.innerHTML = `<div class="flex justify-center items-center h-full"><p class="text-red-500 text-xl">Acceso denegado. Solo supervisores pueden usar esta función.</p></div>`;
        return;
    }

    // Obtener nombre completo desde metadata o desde perfiles
    let supervisorNombreDefault = user.user_metadata?.nombre_completo;
    if (!supervisorNombreDefault) {
        const { data: perfil } = await supabase.from('perfiles').select('nombre_completo').eq('id', user.id).single();
        supervisorNombreDefault = perfil?.nombre_completo || 'Supervisor';
    }

    const ahora = new Date();
    const hora = ahora.getHours();
    let fechaInicio, fechaFin, turnoNombre, fechaInicioDate, fechaFinDate;
    if (hora >= 7 && hora < 19) {
        fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 7, 0, 0).toISOString();
        fechaFin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 19, 0, 0).toISOString();
        turnoNombre = 'Diurno (07:00 - 19:00)';
        fechaInicioDate = fechaInicio.split('T')[0];
        fechaFinDate = fechaFin.split('T')[0];
    } else {
        const inicioNocturno = hora >= 19 
            ? new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 19, 0, 0)
            : new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 1, 19, 0, 0);
        fechaInicio = inicioNocturno.toISOString();
        fechaFin = new Date(inicioNocturno.getTime() + 12 * 60 * 60 * 1000).toISOString();
        turnoNombre = 'Nocturno (19:00 - 07:00)';
        fechaInicioDate = fechaInicio.split('T')[0];
        fechaFinDate = fechaFin.split('T')[0];
    }

    // Verificar si ya existe una entrega para este turno
    const { data: entregaExistente } = await supabase.from('entregas_turno')
        .select('*')
        .eq('fecha_inicio', fechaInicio)
        .eq('fecha_fin', fechaFin)
        .maybeSingle();

    if (entregaExistente) {
        entregaActual = entregaExistente;
        await generarBitacora(contenedor, user, fechaInicio, fechaFin, turnoNombre, entregaExistente, supervisorNombreDefault);
    } else {
        mostrarFormularioInicial(contenedor, user, fechaInicio, fechaFin, turnoNombre, supervisorNombreDefault);
    }
}

function mostrarFormularioInicial(contenedor, user, fechaInicio, fechaFin, turnoNombre, supervisorDefault) {
    contenedor.innerHTML = `
        <div class="max-w-md mx-auto bg-slate-800 p-6 rounded-lg shadow-xl border border-slate-700">
            <h2 class="text-xl font-bold text-white mb-4">Nueva Entrega de Turno</h2>
            <p class="text-slate-400 mb-4">Ingrese los datos del supervisor saliente.</p>
            <form id="form-inicio-bitacora" class="space-y-4">
                <div>
                    <label class="block text-slate-400 text-sm mb-1">Supervisor Saliente</label>
                    <input type="text" id="supervisor-nombre" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" value="${supervisorDefault}" required>
                </div>
                <div>
                    <label class="block text-slate-400 text-sm mb-1">Grupo (A, B, C, D)</label>
                    <select id="supervisor-grupo" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" required>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                    </select>
                </div>
                <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">Generar Bitácora</button>
            </form>
        </div>
    `;

    document.getElementById('form-inicio-bitacora').addEventListener('submit', async (e) => {
        e.preventDefault();
        const supervisorNombre = document.getElementById('supervisor-nombre').value.trim();
        const grupo = document.getElementById('supervisor-grupo').value;

        const { data: nuevaEntrega, error } = await supabase.from('entregas_turno').insert({
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            turno: turnoNombre,
            supervisor_saliente_id: user.id,
            grupo_saliente: grupo
        }).select().single();

        if (error) {
            alert('Error al crear la entrega: ' + error.message);
            return;
        }

        entregaActual = nuevaEntrega;
        await generarBitacora(contenedor, user, fechaInicio, fechaFin, turnoNombre, nuevaEntrega, supervisorNombre, grupo);
    });
}

async function generarBitacora(contenedor, user, fechaInicio, fechaFin, turnoNombre, entrega, supervisorNombre, grupo) {
    if (!supervisorNombre) {
        supervisorNombre = user.user_metadata?.nombre_completo || 'No especificado';
        grupo = entrega.grupo_saliente || '?';
    }

    contenedor.innerHTML = `<div class="flex justify-center items-center h-full"><p class="text-slate-400 animate-pulse text-xl">Generando bitácora...</p></div>`;

    try {
        const startDate = fechaInicio.split('T')[0];
        const endDate = fechaFin.split('T')[0];
        const fechas = startDate === endDate ? [startDate] : [startDate, endDate];

        const [novedades, ordenes, acido, ph, consumo, fundicion] = await Promise.all([
            supabase.from('novedades').select('*').gte('fecha_novedad', fechaInicio).lt('fecha_novedad', fechaFin).order('fecha_novedad', { ascending: false }),
            supabase.from('ordenes_trabajo').select('*').or(`fecha_solicitud.gte.${fechaInicio},fecha_cierre.gte.${fechaInicio}`).order('fecha_solicitud', { ascending: false }),
            supabase.from('analisis_acido').select('*').in('fecha_registro', fechas).order('fecha_registro', { ascending: true }),
            supabase.from('ph_aguas').select('*').in('fecha_registro', fechas).order('fecha_registro', { ascending: true }),
            supabase.from('consumo_agua').select('*').in('fecha_registro', fechas).order('fecha_registro', { ascending: true }),
            supabase.from('fundicion_diaria').select('*').in('fecha_registro', fechas).order('fecha_registro', { ascending: true })
        ]);

        const promAcido = acido.data?.length ? (acido.data.reduce((s, a) => s + a.concentracion, 0) / acido.data.length).toFixed(2) : '--';
        const promNTU = acido.data?.length ? (acido.data.reduce((s, a) => s + (a.turbidez_ntu || 0), 0) / acido.data.length).toFixed(2) : '--';
        const bigBags = fundicion.data?.reduce((s, f) => s + (f.big_bags || 0), 0) || 0;

        // Calcular pH promedio por equipo
        const phPorEquipo = {};
        if (ph.data?.length) {
            ph.data.forEach(p => {
                if (!phPorEquipo[p.punto_muestreo]) {
                    phPorEquipo[p.punto_muestreo] = { sum: 0, count: 0 };
                }
                phPorEquipo[p.punto_muestreo].sum += p.valor_ph;
                phPorEquipo[p.punto_muestreo].count++;
            });
        }

        const confirmada = entrega?.confirmada || false;
        const confirmanteId = entrega?.supervisor_entrante_id;
        const fechaConfirmacion = entrega?.fecha_confirmacion ? new Date(entrega.fecha_confirmacion).toLocaleString() : null;
        const rol = user.user_metadata?.rol;

        const fechaBitacora = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' });

        let html = `
        <div id="bitacora-print" class="max-w-4xl mx-auto text-slate-800 bg-white p-6 rounded shadow-lg print:shadow-none print:rounded-none">
            <style>
                @media print {
                    body * { visibility: hidden; }
                    #bitacora-print, #bitacora-print * { visibility: visible; }
                    #bitacora-print { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none; }
                }
            </style>
            <div class="text-center mb-4 border-b-2 border-gray-300 pb-2">
                <h1 class="text-2xl font-bold">Entrega de Turno - Planta de Ácido Sulfúrico</h1>
                <p class="text-lg font-semibold">${fechaBitacora} - Turno: ${turnoNombre}</p>
                <p class="text-sm">Supervisor saliente: <strong>${supervisorNombre}</strong> - Grupo: <input type="text" class="border rounded px-1 w-16" value="${grupo}" id="grupo-editable"></p>
            </div>

            <!-- Área 310 -->
            <div class="mb-4">
                <h2 class="text-lg font-bold bg-gray-200 px-2 py-1">Área 310 - Tanque de Producción</h2>
                <textarea class="w-full border rounded p-1 text-sm" rows="2" placeholder="Observaciones..."></textarea>
            </div>

            <!-- Área 430 - Niveles de azufre con acidez -->
            <div class="mb-4">
                <h2 class="text-lg font-bold bg-gray-200 px-2 py-1">Área 430 - Tanques de Azufre</h2>
                <table class="w-full text-sm border">
                    <thead><tr class="bg-gray-300"><th class="p-1 border">Tanque</th><th class="p-1 border">Nivel (cm)</th><th class="p-1 border">Toneladas</th><th class="p-1 border">Acidez (%)</th></tr></thead>
                    <tbody>
                        <tr><td class="p-1 border">TQ-A</td><td class="p-1 border"><input type="number" step="0.1" class="nivel-cm w-full border rounded px-1" data-tq="A" placeholder="cm"></td><td class="p-1 border"><span id="ton-a">0.00</span></td><td class="p-1 border"><input type="number" step="0.01" class="border rounded px-1 w-full" placeholder="%"></td></tr>
                        <tr><td class="p-1 border">TQ-B</td><td class="p-1 border"><input type="number" step="0.1" class="nivel-cm w-full border rounded px-1" data-tq="B" placeholder="cm"></td><td class="p-1 border"><span id="ton-b">0.00</span></td><td class="p-1 border"><input type="number" step="0.01" class="border rounded px-1 w-full" placeholder="%"></td></tr>
                        <tr><td class="p-1 border">TQ-C</td><td class="p-1 border"><input type="number" step="0.1" class="nivel-cm w-full border rounded px-1" data-tq="C" placeholder="cm"></td><td class="p-1 border"><span id="ton-c">0.00</span></td><td class="p-1 border"><input type="number" step="0.01" class="border rounded px-1 w-full" placeholder="%"></td></tr>
                        <tr><td class="p-1 border">TQ-D</td><td class="p-1 border"><input type="number" step="0.1" class="nivel-cm w-full border rounded px-1" data-tq="D" placeholder="cm"></td><td class="p-1 border"><span id="ton-d">0.00</span></td><td class="p-1 border"><input type="number" step="0.01" class="border rounded px-1 w-full" placeholder="%"></td></tr>
                    </tbody>
                </table>
                <p class="text-xs mt-1">Conversión: 250 cm ≈ 108 toneladas (0.432 ton/cm)</p>
            </div>

            <!-- Áreas 420/120 -->
            <div class="mb-4">
                <h2 class="text-lg font-bold bg-gray-200 px-2 py-1">Áreas 420 / 120 y Salas de Máquinas</h2>
                <p class="text-sm"><strong>Sala de Compresores:</strong> <input type="text" class="border rounded px-1 w-3/4"></p>
                <p class="text-sm"><strong>Sala de Sopladores:</strong> <input type="text" class="border rounded px-1 w-3/4"></p>
                <p class="text-sm"><strong>Área 120:</strong> <input type="text" class="border rounded px-1 w-3/4"></p>
            </div>

            <!-- Producción -->
            <div class="mb-4">
                <h2 class="text-lg font-bold bg-gray-200 px-2 py-1">Producción del Turno</h2>
                <p class="text-sm"><strong>Big Bags Fundidos:</strong> ${bigBags}</p>
                <p class="text-sm"><strong>Toneladas de Ácido Producidas (aprox.):</strong> <input type="number" step="0.01" class="border rounded px-1 w-24"></p>
            </div>

            <!-- Análisis de Ácido -->
            <div class="mb-4">
                <h2 class="text-lg font-bold bg-gray-200 px-2 py-1">Resultados de Análisis de Ácido</h2>
                <p class="text-sm"><strong>Concentración promedio (%):</strong> ${promAcido}%</p>
                <p class="text-sm"><strong>Turbidez promedio (NTU):</strong> ${promNTU}</p>
                <p class="text-sm"><strong>Operador de análisis:</strong> <input type="text" class="border rounded px-1 w-1/2"></p>
            </div>

            <!-- Promedios de Parámetros Operativos -->
            <div class="mb-4">
                <h2 class="text-lg font-bold bg-gray-200 px-2 py-1">Promedios de Parámetros Operativos</h2>
                <ul class="text-sm list-disc list-inside">
                    <li>pH promedio por equipo:</li>
                </ul>
                <table class="w-48 text-sm border mt-1">
                    <thead><tr class="bg-gray-300"><th class="p-1 border">Equipo</th><th class="p-1 border">pH</th></tr></thead>
                    <tbody>
                        ${Object.entries(phPorEquipo).map(([equipo, { sum, count }]) => `
                        <tr><td class="p-1 border">${equipo}</td><td class="p-1 border">${(sum / count).toFixed(2)}</td></tr>
                        `).join('')}
                    </tbody>
                </table>
                <ul class="text-sm list-disc list-inside">
                    <li>Consumo de agua promedio (m³): ${consumo.data?.length ? (consumo.data.reduce((s, c) => s + c.valor_m3, 0) / consumo.data.length).toFixed(2) : '--'}</li>
                </ul>
            </div>

            <!-- Novedades y OTs -->
            <div class="mb-4">
                <h2 class="text-lg font-bold bg-gray-200 px-2 py-1">Novedades y Órdenes de Trabajo</h2>
                ${novedades.data?.length ? novedades.data.map(n => `<p class="text-sm">• [${new Date(n.fecha_novedad).toLocaleTimeString()}] ${n.tag_equipo_area}: ${n.descripcion}</p>`).join('') : '<p class="text-sm italic">Sin novedades en el turno.</p>'}
                ${ordenes.data?.length ? ordenes.data.map(o => `<p class="text-sm">• OT ${o.numero_ot} - ${o.titulo} (Estado: ${o.estado})</p>`).join('') : '<p class="text-sm italic">Sin OTs en el turno.</p>'}
            </div>

            <!-- Firmas -->
            <div class="mt-8 flex justify-between">
                <div class="text-center">
                    <p class="font-bold">${supervisorNombre}</p>
                    <p class="text-sm">Supervisor Saliente</p>
                </div>
                <div class="text-center">
                    <p class="font-bold">${confirmada ? 'Confirmada por ' + (confirmanteId?.slice(0,8) || 'Usuario') : '___________________________'}</p>
                    <p class="text-sm">Supervisor Entrante</p>
                    ${confirmada ? `<p class="text-xs text-green-600">Confirmada el ${fechaConfirmacion}</p>` : ''}
                </div>
            </div>

            <div class="mt-6 text-center no-print flex justify-center space-x-4">
                <button onclick="window.print()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow-lg">🖨️ Imprimir Bitácora</button>
                ${!confirmada && rol !== 'admin' ? `<button id="btn-confirmar-recepcion" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded shadow-lg">✅ Confirmar Recepción</button>` : ''}
            </div>
        </div>`;

        contenedor.innerHTML = html;

        // Conversión cm -> toneladas
        document.querySelectorAll('.nivel-cm').forEach(input => {
            input.addEventListener('input', function() {
                const cm = parseFloat(this.value) || 0;
                const ton = (cm * 0.432).toFixed(2);
                const tq = this.dataset.tq;
                document.getElementById(`ton-${tq.toLowerCase()}`).textContent = ton;
            });
        });

        document.getElementById('btn-confirmar-recepcion')?.addEventListener('click', async () => {
            if (!confirm('¿Confirma que ha recibido y revisado la entrega de turno? Esta acción no se puede deshacer.')) return;
            
            const { error: updateError } = await supabase.from('entregas_turno')
                .update({
                    confirmada: true,
                    supervisor_entrante_id: user.id,
                    fecha_confirmacion: new Date().toISOString()
                })
                .eq('id', entrega.id);

            if (updateError) {
                alert('Error al confirmar: ' + updateError.message);
                return;
            }

            alert('Recepción confirmada exitosamente. Se ha cerrado el ciclo de entrega de turno.');
            cargarBitacora();
        });

    } catch (error) {
        contenedor.innerHTML = `<div class="flex justify-center items-center h-full"><p class="text-red-500 text-xl">Error al generar la bitácora: ${error.message}</p></div>`;
    }
}