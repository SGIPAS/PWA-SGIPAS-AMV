// ocp Generación de la bitácora imprimible
import { supabase } from '../../supabase-client.js';
import { escapeHtml } from '../../utils-storage.js';
import { personalPorRol, generarSelectPersonal, enlazarSelectPersonalBitacora } from './utils.js';

export async function generarBitacora(contenedor, user, fechaInicio, fechaFin, turnoNombre, entrega, supervisorNombre, grupo) {
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

        // Cumplimiento de rutinas
        const hoyFecha = new Date().toISOString().split('T')[0];
        const diaSem = new Date().getDay();
        const { data: predef } = await supabase.from('rutinas_predefinidas').select('id')
            .or(`dia_semana.is.null,dia_semana.eq.${diaSem}`).eq('activo', true);
        const { data: ejec } = await supabase.from('rutinas_ejecutadas').select('rutina_predefinida_id')
            .eq('fecha', hoyFecha).eq('completada', true);
        const totalRut = predef?.length || 0;
        const cumplRut = ejec?.length || 0;
        const pctRut = totalRut > 0 ? Math.round((cumplRut / totalRut) * 100) : 0;

        const confirmada = entrega?.confirmada || false;
        const confirmanteId = entrega?.supervisor_entrante_id;
        const fechaConfirmacion = entrega?.fecha_confirmacion ? new Date(entrega.fecha_confirmacion).toLocaleString() : null;
        const rol = user.user_metadata?.rol;
        const fechaBitacora = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' });

        // ocp Escapado de HTML en los campos dinámicos
        const supervisorNombreSeguro = escapeHtml(supervisorNombre);
        const grupoSeguro = escapeHtml(grupo);
        const turnoSeguro = escapeHtml(turnoNombre);
        const fechaBitacoraSegura = escapeHtml(fechaBitacora);

        let html = `
        <div id="bitacora-print" class="bg-white text-slate-800 p-3" style="font-size: 10px; line-height: 1.25;">
            <div style="width: 100%; margin-bottom: 6px; border-bottom: 2px solid #1e3a8a; padding-bottom: 3px;">
                <img src="cintillo_superior.png" style="width: 100%; height: auto; display: block;" onerror="this.style.display='none'">
            </div>

            <div class="text-center mb-2 border-b border-gray-300 pb-1">
                <h1 style="font-size: 14px; font-weight: bold;">Entrega de Turno - Planta de Ácido Sulfúrico</h1>
                <p style="font-size: 11px;">${fechaBitacoraSegura} – Turno: ${turnoSeguro}</p>
                <p style="font-size: 10px;">Supervisor saliente: <strong>${supervisorNombreSeguro}</strong> – Grupo: <strong>${grupoSeguro}</strong></p>
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
                    ${Object.entries(phPorEquipo).map(([e, {sum,count}]) => `${escapeHtml(e)}: <strong>${(sum/count).toFixed(2)}</strong>`).join(' | ') || 'Sin datos'}
                    ${consumo.data?.length ? ` &nbsp;|&nbsp; Consumo promedio: <strong>${(consumo.data.reduce((s,c)=>s+c.valor_m3,0)/consumo.data.length).toFixed(2)}</strong> m³` : ''}
                </div>
            </div>

            <div class="mb-1">
                <div style="background:#e5e7eb; padding: 2px 4px; font-weight:bold; font-size:10px; border:1px solid #999;">Novedades y OTs del Turno</div>
                <div style="border:1px solid #999; padding:3px; font-size:9px; min-height:34px;">
                    ${novedades.data?.slice(0,4).map(n => `• [${new Date(n.fecha_novedad).toLocaleTimeString()}] ${escapeHtml(n.tag_equipo_area)}: ${escapeHtml(n.descripcion)}`).join('<br>') || 'Sin novedades.'}
                    ${ordenes.data?.slice(0,3).map(o => `<br>• OT ${escapeHtml(o.numero_ot)} – ${escapeHtml(o.titulo)} (${escapeHtml(o.estado)})`).join('') || ''}
                </div>
            </div>

            <div class="mb-1">
                <div style="background:#e5e7eb; padding: 2px 4px; font-weight:bold; font-size:10px; border:1px solid #999;">Cumplimiento de Rutinas Diarias</div>
                <div style="border:1px solid #999; padding:3px; font-size:9px;">
                    Ejecutadas: <strong>${cumplRut}</strong> / ${totalRut} — Cumplimiento: <strong>${pctRut}%</strong>
                </div>
            </div>

            <div class="mb-1">
                <div style="background:#e5e7eb; padding: 2px 4px; font-weight:bold; font-size:10px; border:1px solid #999;">Personal de Turno</div>
                <table style="width:100%; border-collapse: collapse; font-size:9px;">
                    ${Object.keys(personalPorRol).map(rolNombre => `
                        <tr>
                            <td style="border:1px solid #999; padding:2px; background:#f3f4f6; width:22%;"><strong>${escapeHtml(rolNombre)}</strong></td>
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
                    <div style="border-top:1px solid #000; margin-top:18px; padding-top:2px;">${supervisorNombreSeguro}</div>
                    <div style="font-size:9px;">Supervisor Saliente</div>
                </div>
                <div class="text-center" style="width:45%;">
                    <div style="border-top:1px solid #000; margin-top:18px; padding-top:2px;">${confirmada ? 'Confirmada por ' + escapeHtml(confirmanteId?.slice(0,8) || 'Usuario') : '&nbsp;'}</div>
                    <div style="font-size:9px;">Supervisor Entrante</div>
                    ${confirmada ? `<div style="font-size:8px; color:green;">${escapeHtml(fechaConfirmacion)}</div>` : ''}
                </div>
            </div>

            <div class="mt-3 text-center no-print">
                <button onclick="window.print()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow-lg">🖨️ Imprimir Bitácora</button>
                ${!confirmada && rol !== 'admin' ? `<button id="btn-confirmar-recepcion" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded shadow-lg ml-2">✅ Confirmar Recepción</button>` : ''}
            </div>
        </div>`;

        contenedor.innerHTML = html;
        enlazarSelectPersonalBitacora(contenedor);

        document.querySelectorAll('.nivel-cm').forEach(input => {
            input.addEventListener('input', function () {
                const cm = parseFloat(this.value) || 0;
                document.getElementById(`ton-${this.dataset.tq.toLowerCase()}`).textContent = (cm * 0.432).toFixed(2);
            });
        });

        document.getElementById('btn-confirmar-recepcion')?.addEventListener('click', async () => {
            if (!confirm('¿Confirma que ha recibido y revisado la entrega de turno? Esta acción no se puede deshacer.')) return;
            const { error: updateError } = await supabase.from('entregas_turno').update({
                confirmada: true,
                supervisor_entrante_id: user.id,
                fecha_confirmacion: new Date().toISOString()
            }).eq('id', entrega.id);
            if (updateError) return alert('Error al confirmar: ' + updateError.message);
            alert('Recepción confirmada exitosamente.');
            const { cargarBitacora } = await import('./index.js');
            cargarBitacora();
        });

    } catch (error) {
        contenedor.innerHTML = `<div class="flex justify-center items-center h-full"><p class="text-red-500 text-xl">Error al generar la bitácora: ${escapeHtml(error.message)}</p></div>`;
    }
}
