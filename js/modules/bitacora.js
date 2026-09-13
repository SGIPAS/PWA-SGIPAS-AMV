// ocp Módulo de Bitácora Digital de Turno – con cintillo, personal de turno y layout compacto
import { supabase } from '../supabase-client.js';

let entregaActual = null;

export async function cargarBitacora() {
    const contenedor = document.getElementById('app-content');
    if (!contenedor) return;

    const { data: { user } } = await supabase.auth.getUser();
    const rol = user?.user_metadata?.rol;
    if (!['admin', 'supervisor'].includes(rol)) {
        contenedor.innerHTML = `<div class="flex justify-center items-center h-full"><p class="text-red-500 text-xl">Acceso denegado. Solo administradores y supervisores pueden usar esta función.</p></div>`;
        return;
    }

    const ahora = new Date();
    const hora = ahora.getHours();
    let fechaInicio, fechaFin, turnoNombre;
    if (hora >= 7 && hora < 19) {
        fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 7, 0, 0).toISOString();
        fechaFin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 19, 0, 0).toISOString();
        turnoNombre = 'Diurno (07:00 - 19:00)';
    } else {
        const inicioNocturno = hora >= 19
            ? new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 19, 0, 0)
            : new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 1, 19, 0, 0);
        fechaInicio = inicioNocturno.toISOString();
        fechaFin = new Date(inicioNocturno.getTime() + 12 * 60 * 60 * 1000).toISOString();
        turnoNombre = 'Nocturno (19:00 - 07:00)';
    }

    const { data: entregaExistente } = await supabase.from('entregas_turno')
        .select('*')
        .eq('fecha_inicio', fechaInicio)
        .eq('fecha_fin', fechaFin)
        .maybeSingle();

    if (entregaExistente) {
        entregaActual = entregaExistente;
        await generarBitacora(contenedor, user, fechaInicio, fechaFin, turnoNombre, entregaExistente);
    } else {
        mostrarFormularioInicial(contenedor, user, fechaInicio, fechaFin, turnoNombre);
    }
}

function mostrarFormularioInicial(contenedor, user, fechaInicio, fechaFin, turnoNombre) {
    contenedor.innerHTML = `
        <div class="max-w-md mx-auto bg-slate-800 p-6 rounded-lg shadow-xl border border-slate-700">
            <h2 class="text-xl font-bold text-white mb-4">Nueva Entrega de Turno</h2>
            <p class="text-slate-400 mb-4">Ingrese los datos del supervisor saliente.</p>
            <form id="form-inicio-bitacora" class="space-y-4">
                <div>
                    <label class="block text-slate-400 text-sm mb-1">Supervisor Saliente</label>
                    <input type="text" id="supervisor-nombre" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" value="${user.user_metadata?.nombre_completo || ''}" required>
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

        const phPorEquipo = {};
        if (ph.data?.length) {
            ph.data.forEach(p => {
                if (!phPorEquipo[p.punto_muestreo]) phPorEquipo[p.punto_muestreo] = { sum: 0, count: 0 };
                phPorEquipo[p.punto_muestreo].sum += p.valor_ph;
                phPorEquipo[p.punto_muestreo].count++;
            });
        }

        const confirmada = entrega?.confirmada || false;
        const confirmanteId = entrega?.supervisor_entrante_id;
        const fechaConfirmacion = entrega?.fecha_confirmacion ? new Date(entrega.fecha_confirmacion).toLocaleString() : null;
        const rol = user.user_metadata?.rol;
        const fechaBitacora = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' });

        const personalPorRol = {
            'Supervisor':   ['Wladimir J. Pino (A)', 'Angel Barrueta (B)', 'Eduardo Arias (C)', 'Heiver J. Ramirez (D)'],
            'Panelista':    ['Angel S. Solorzano', 'Noelvis dj Camacho T.', 'Hilnelio J. García Q.', 'Jesus E. Trias V.'],
            'Operador 1':   ['Carlos Rivero G.', 'Jose Rondón', 'Jose R. Guilart L.', 'Christian Acosta OCP', 'Reymond Garcia C.', 'Julio C. Mercado', 'Digrian D. Romero R.', 'Octavio A. Rodríguez C.', 'Kelvis Samuray', 'Fernando Gruber'],
            'Operador 2':   ['Carlos Rivero G.', 'Jose Rondón', 'Jose R. Guilart L.', 'Christian Acosta OCP', 'Reymond Garcia C.', 'Julio C. Mercado', 'Digrian D. Romero R.', 'Octavio A. Rodríguez C.', 'Kelvis Samuray', 'Fernando Gruber'],
            'Operador 3':   ['Carlos Rivero G.', 'Jose Rondón', 'Jose R. Guilart L.', 'Christian Acosta OCP', 'Reymond Garcia C.', 'Julio C. Mercado', 'Digrian D. Romero R.', 'Octavio A. Rodríguez C.', 'Kelvis Samuray', 'Fernando Gruber'],
            'Paramedico':   ['Arturo Tenia', 'Joseanny C. González', 'Lisangel L. Guevara', 'Lisbeth González'],
            'Inspector SSL':['Inspector SSL A', 'Inspector SSL B']
        };

        const generarSelectPersonal = (rolNombre) => {
            const nombres = personalPorRol[rolNombre] || [];
            const opciones = nombres.map(n => `<option>${n}</option>`).join('');
            return `<select class="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs select-personal" data-rol="${rolNombre}">
                <option value="">Seleccione...</option>
                ${opciones}
                <option value="OTRO">Otro</option>
            </select>`;
        };

        let html = `
        <div id="bitacora-print" class="bg-white text-slate-800 p-3" style="font-size: 10px; line-height: 1.25;">

            <div style="width: 100%; margin-bottom: 6px; border-bottom: 2px solid #1e3a8a; padding-bottom: 3px;">
                <img src="cintillo_superior.png" style="width: 100%; height: auto; display: block;" onerror="this.style.display='none'">
            </div>

            <div class="text-center mb-2 border-b border-gray-300 pb-1">
                <h1 style="font-size: 14px; font-weight: bold;">Entrega de Turno - Planta de Ácido Sulfúrico</h1>
                <p style="font-size: 11px;">${fechaBitacora} – Turno: ${turnoNombre}</p>
                <p style="font-size: 10px;">Supervisor saliente: <strong>${supervisorNombre}</strong> – Grupo: <strong>${grupo}</strong></p>
            </div>

            <div class="mb-1">
                <div style="background:#e5e7eb; padding: 2px 4px; font-weight:bold; font-size:10px; border:1px solid #999;">Área 310 – Tanque de Producción</div>
                <textarea class="w-full" style="border:1px solid #999; height:26px; font-size:9px;" placeholder="Observaciones..."></textarea>
            </div>

            <div class="mb-1">
                <div style="background:#e5e7eb; padding: 2px 4px; font-weight:bold; font-size:10px; border:1px solid #999;">Área 430 – Tanques de Azufre</div>
                <table style="width:100%; border-collapse: collapse; font-size:9px;">
                    <tr style="background:#f3f4f6;"><th style="border:1px solid #999; padding:2px;">Tanque</th><th style="border:1px solid #999; padding:2px;">Nivel (cm)</th><th style="border:1px solid #999; padding:2px;">Toneladas</th><th style="border:1px solid #999; padding:2px;">Acidez (%)</th></tr>
                    ${['A','B','C','D'].map(tq => `<tr>
                        <td style="border:1px solid #999; padding:2px;">TQ-${tq}</td>
                        <td style="border:1px solid #999; padding:2px;"><input type="number" step="0.1" class="nivel-cm w-full" data-tq="${tq}" style="border:0; font-size:9px;"></td>
                        <td style="border:1px solid #999; padding:2px;"><span id="ton-${tq.toLowerCase()}">0.00</span></td>
                        <td style="border:1px solid #999; padding:2px;"><input type="number" step="0.01" style="border:0; font-size:9px; width:100%;"></td>
                    </tr>`).join('')}
                </table>
                <p style="font-size:8px; color:#666;">Conversión: 250 cm ≈ 108 toneladas (0.432 ton/cm)</p>
            </div>

            <div class="mb-1">
                <div style="background:#e5e7eb; padding: 2px 4px; font-weight:bold; font-size:10px; border:1px solid #999;">Áreas 420 / 120 y Salas de Máquinas</div>
                <div style="border:1px solid #999; padding:3px; font-size:9px;">
                    <div><strong>Sala de Compresores:</strong> <input type="text" style="border:0; border-bottom:1px solid #999; width:65%; font-size:9px;"></div>
                    <div><strong>Sala de Sopladores:</strong> <input type="text" style="border:0; border-bottom:1px solid #999; width:66%; font-size:9px;"></div>
                    <div><strong>Área 120:</strong> <input type="text" style="border:0; border-bottom:1px solid #999; width:76%; font-size:9px;"></div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-1 mb-1">
                <div>
                    <div style="background:#e5e7eb; padding: 2px 4px; font-weight:bold; font-size:10px; border:1px solid #999;">Producción del Turno</div>
                    <div style="border:1px solid #999; padding:3px; font-size:9px;">
                        Big Bags Fundidos: <strong>${bigBags}</strong><br>
                        Toneladas Ácido (aprox.): <input type="number" step="0.01" style="border:0; border-bottom:1px solid #999; width:60px; font-size:9px;">
                    </div>
                </div>
                <div>
                    <div style="background:#e5e7eb; padding: 2px 4px; font-weight:bold; font-size:10px; border:1px solid #999;">Análisis de Ácido</div>
                    <div style="border:1px solid #999; padding:3px; font-size:9px;">
                        Concentración: <strong>${promAcido}%</strong><br>
                        Turbidez: <strong>${promNTU}</strong> NTU<br>
                        Operador: <input type="text" style="border:0; border-bottom:1px solid #999; width:80px; font-size:9px;">
                    </div>
                </div>
            </div>

            <div class="mb-1">
                <div style="background:#e5e7eb; padding: 2px 4px; font-weight:bold; font-size:10px; border:1px solid #999;">pH Promedio por Equipo y Consumo de Agua</div>
                <div style="border:1px solid #999; padding:3px; font-size:9px;">
                    ${Object.entries(phPorEquipo).map(([e, {sum,count}]) => `${e}: <strong>${(sum/count).toFixed(2)}</strong>`).join(' | ') || 'Sin datos'}
                    ${consumo.data?.length ? ` &nbsp;|&nbsp; Consumo promedio: <strong>${(consumo.data.reduce((s,c)=>s+c.valor_m3,0)/consumo.data.length).toFixed(2)}</strong> m³` : ''}
                </div>
            </div>

            <div class="mb-1">
                <div style="background:#e5e7eb; padding: 2px 4px; font-weight:bold; font-size:10px; border:1px solid #999;">Novedades y OTs del Turno</div>
                <div style="border:1px solid #999; padding:3px; font-size:9px; min-height:34px;">
                    ${novedades.data?.slice(0,4).map(n => `• [${new Date(n.fecha_novedad).toLocaleTimeString()}] ${n.tag_equipo_area}: ${n.descripcion}`).join('<br>') || 'Sin novedades.'}
                    ${ordenes.data?.slice(0,3).map(o => `<br>• OT ${o.numero_ot} – ${o.titulo} (${o.estado})`).join('') || ''}
                </div>
            </div>

            <div class="mb-1">
                <div style="background:#e5e7eb; padding: 2px 4px; font-weight:bold; font-size:10px; border:1px solid #999;">Personal de Turno</div>
                <table style="width:100%; border-collapse: collapse; font-size:9px;">
                    ${Object.keys(personalPorRol).map(rolNombre => `
                        <tr>
                            <td style="border:1px solid #999; padding:2px; background:#f3f4f6; width:22%;"><strong>${rolNombre}</strong></td>
                            <td style="border:1px solid #999; padding:2px;">${generarSelectPersonal(rolNombre)}</td>
                        </tr>`).join('')}
                </table>
            </div>

            <div class="mb-1">
                <div style="background:#e5e7eb; padding: 2px 4px; font-weight:bold; font-size:10px; border:1px solid #999;">Acontecimientos del Turno</div>
                <textarea class="w-full" style="border:1px solid #999; height:36px; font-size:9px;" placeholder="Describa los eventos relevantes..."></textarea>
            </div>

            <div class="mt-3 flex justify-between" style="font-size:10px;">
                <div class="text-center" style="width:45%;">
                    <div style="border-top:1px solid #000; margin-top:18px; padding-top:2px;">${supervisorNombre}</div>
                    <div style="font-size:9px;">Supervisor Saliente</div>
                </div>
                <div class="text-center" style="width:45%;">
                    <div style="border-top:1px solid #000; margin-top:18px; padding-top:2px;">${confirmada ? 'Confirmada por ' + (confirmanteId?.slice(0,8) || 'Usuario') : '&nbsp;'}</div>
                    <div style="font-size:9px;">Supervisor Entrante</div>
                    ${confirmada ? `<div style="font-size:8px; color:green;">${fechaConfirmacion}</div>` : ''}
                </div>
            </div>

            <div class="mt-3 text-center no-print">
                <button onclick="window.print()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow-lg">🖨️ Imprimir Bitácora</button>
                ${!confirmada && rol !== 'admin' ? `<button id="btn-confirmar-recepcion" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded shadow-lg ml-2">✅ Confirmar Recepción</button>` : ''}
            </div>
        </div>`;

        contenedor.innerHTML = html;

        document.querySelectorAll('.nivel-cm').forEach(input => {
            input.addEventListener('input', function() {
                const cm = parseFloat(this.value) || 0;
                const ton = (cm * 0.432).toFixed(2);
                const tq = this.dataset.tq;
                document.getElementById(`ton-${tq.toLowerCase()}`).textContent = ton;
            });
        });

        document.querySelectorAll('.select-personal').forEach(select => {
            select.addEventListener('change', function() {
                if (this.value === 'OTRO') {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.className = 'w-full bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs mt-1';
                    input.placeholder = 'Especifique...';
                    this.parentNode.appendChild(input);
                }
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

            alert('Recepción confirmada exitosamente.');
            cargarBitacora();
        });

    } catch (error) {
        contenedor.innerHTML = `<div class="flex justify-center items-center h-full"><p class="text-red-500 text-xl">Error al generar la bitácora: ${error.message}</p></div>`;
    }
}
