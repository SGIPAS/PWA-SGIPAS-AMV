// ocp Vista de detalle de una OT con pestañas y botón de impresión
import { supabase } from '../../supabase-client.js';
import { irATablero } from './index.js';
import { badgeEstado, formatearFecha } from './utils.js';
import { cargarVistaAvances } from './avances.js';
import { cargarVistaCierres } from './cierres.js';

export async function mostrarDetalle(otId, rol) {
    const contenedor = document.getElementById('app-content');
    const { data: ot, error } = await supabase.from('ordenes_trabajo').select('*, equipos(codigo, nombre)').eq('id', otId).single();
    if (error || !ot) {
        contenedor.innerHTML = '<p class="text-red-500">OT no encontrada.</p>';
        return;
    }

    contenedor.innerHTML = `
        <div class="mb-6">
            <button id="btn-volver" class="text-blue-400 hover:underline mb-4 inline-block">← Volver al tablero</button>
            <div class="flex justify-between items-start flex-wrap gap-3">
                <div>
                    <h1 class="text-2xl font-bold text-white">${ot.numero_ot} – ${ot.titulo}${ot.tipo_ot === 'parada' ? ' <span class="text-red-400 text-sm">(PARADA)</span>' : ''}</h1>
                    <div class="flex flex-wrap gap-4 mt-2 text-slate-400 text-sm">
                        <span>Equipo: ${ot.equipos?.codigo || ot.codigo_equipo || 'N/A'} ${ot.equipos?.nombre || ot.equipo || ''}</span>
                        <span>Tipo: ${ot.tipo}</span>
                        <span>Prioridad: ${ot.prioridad}</span>
                        <span>Estado: ${badgeEstado(ot.estado)}</span>
                        <span>Solicitado: ${formatearFecha(ot.fecha_solicitud)}</span>
                    </div>
                </div>
                <button id="btn-imprimir-ot" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">🖨️ Imprimir OT</button>
            </div>
        </div>

        <div class="bg-slate-800 rounded-lg shadow-xl border border-slate-700">
            <div class="flex border-b border-slate-700">
                <button class="tab-btn active px-4 py-2 text-sm font-semibold text-white bg-slate-700 rounded-tl-lg" data-tab="avances">Avances / Historial</button>
                <button class="tab-btn px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white" data-tab="cierre">Cierre de conformidad</button>
            </div>
            <div id="tab-contenido" class="p-6"></div>
        </div>
    `;

    document.getElementById('btn-volver').addEventListener('click', irATablero);
    document.getElementById('btn-imprimir-ot').addEventListener('click', () => imprimirOT(otId));

    const tabs = document.querySelectorAll('.tab-btn');
    const contenido = document.getElementById('tab-contenido');

    async function activarPestana(tabName) {
        tabs.forEach(t => t.classList.remove('active', 'bg-slate-700', 'text-white'));
        const activa = Array.from(tabs).find(t => t.dataset.tab === tabName);
        if (activa) activa.classList.add('active', 'bg-slate-700', 'text-white');

        if (tabName === 'avances') await cargarVistaAvances(otId, rol, contenido);
        else if (tabName === 'cierre') await cargarVistaCierres(otId, rol, contenido);
    }

    tabs.forEach(t => t.addEventListener('click', (e) => activarPestana(e.target.dataset.tab)));
    await activarPestana('avances');
}

async function imprimirOT(otId) {
    const { data: ot } = await supabase.from('ordenes_trabajo')
        .select('*, equipos(codigo, nombre)').eq('id', otId).single();
    if (!ot) return alert('OT no encontrada.');

    const { data: deps } = await supabase.from('ordenes_trabajo_departamentos')
        .select('departamento').eq('orden_id', otId);
    const departamentos = (deps || []).map(d => d.departamento);

    const { data: solicitante } = await supabase.from('perfiles')
        .select('nombre_completo').eq('id', ot.solicitante_id).maybeSingle();

    const { data: ejecutor } = await supabase.from('perfiles')
        .select('nombre_completo').eq('id', ot.creado_por).maybeSingle();

    const { data: pts } = await supabase.from('permisos_ssl')
        .select('numero_pts').eq('orden_id', otId).maybeSingle();

    const { data: novLinks } = await supabase.from('ot_novedades')
        .select('novedades(tag_equipo_area, descripcion)').eq('orden_id', otId);
    const novedades = (novLinks || []).map(n => n.novedades).filter(Boolean);

    const fmt = (f) => f ? new Date(f).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    const chk = (cond) => cond ? '☑' : '☐';

    const win = window.open('', '_blank');
    win.document.write(`
        <!DOCTYPE html><html><head><meta charset="utf-8"><title>OT ${ot.numero_ot}</title>
        <style>
            body { font-family: Arial, sans-serif; font-size: 10pt; margin: 15px; color: #000; }
            .cintillo { width: 100%; margin-bottom: 8px; border-bottom: 2px solid #1e3a8a; padding-bottom: 4px; }
            .cintillo img { width: 100%; height: auto; }
            h1 { text-align: center; font-size: 12pt; margin: 6px 0; }
            .codigos { text-align: right; font-size: 9pt; margin-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
            td, th { border: 1px solid #000; padding: 3px 5px; font-size: 9pt; vertical-align: top; }
            .seccion { background: #d1d5db; font-weight: bold; text-align: center; }
            .label { background: #f3f4f6; font-weight: bold; width: 18%; }
            .firma { height: 45px; }
            @media print { .no-print { display: none; } }
        </style></head><body>
            <div class="cintillo"><img src="${window.location.origin}/cintillo_superior.png" onerror="this.style.display='none'"></div>
            <div class="codigos"><div><strong>PRO-MTTO-F-8903</strong></div><div><strong>N° ${ot.numero_ot}</strong></div></div>
            <h1>ORDEN DE TRABAJO</h1>

            <table>
                <tr><td colspan="6" class="seccion">1. DATOS DEL EQUIPO</td></tr>
                <tr>
                    <td class="label">Código:</td><td>${ot.equipos?.codigo || ot.codigo_equipo || ''}</td>
                    <td class="label">Equipo:</td><td>${ot.equipos?.nombre || ot.equipo || ''}</td>
                    <td class="label">Área:</td><td>${ot.area_solicitante || ''}</td>
                </tr>
                <tr>
                    <td class="label">Prioridad:</td>
                    <td colspan="5">${ot.prioridad || ''} &nbsp; Urgente: ${chk(ot.prioridad === 'urgente')} &nbsp; Programado: ${chk(ot.prioridad === 'programado')} &nbsp; Otro: ☐</td>
                </tr>
            </table>

            <table>
                <tr><td colspan="6" class="seccion">2. INFORMACIÓN DE LA SOLICITUD</td></tr>
                <tr>
                    <td class="label">Solicitante:</td><td>${solicitante?.nombre_completo || ''}</td>
                    <td class="label">Fecha solicitud:</td><td>${fmt(ot.fecha_solicitud)}</td>
                    <td class="label">Hora:</td><td>${ot.fecha_solicitud ? new Date(ot.fecha_solicitud).toLocaleTimeString('es-VE') : ''}</td>
                </tr>
                <tr><td class="label">Dpto(s) ejecutor(es):</td><td colspan="5">${departamentos.join(', ') || 'N/A'}</td></tr>
                <tr>
                    <td class="label">Solicitud del MTTO:</td>
                    <td colspan="5">
                        Correctivo: ${chk(ot.tipo === 'correctiva')} &nbsp;
                        Preventivo: ${chk(ot.tipo === 'preventiva')} &nbsp;
                        Insp. Técnica: ${chk(ot.tipo === 'predictiva')} &nbsp;
                        Emergencia: ${chk(ot.tipo === 'emergencia')} &nbsp;
                        Parada: ${chk(ot.tipo_ot === 'parada')}
                    </td>
                </tr>
                <tr><td class="label">Origen:</td><td colspan="5">${ot.origen || ''}</td></tr>
                <tr><td class="label">Descripción:</td><td colspan="5">${ot.descripcion || ''}</td></tr>
                ${novedades.length ? `<tr><td class="label">Novedades vinculadas:</td><td colspan="5">${novedades.map(n => `• ${n.tag_equipo_area}: ${n.descripcion}`).join('<br>')}</td></tr>` : ''}
            </table>

            <table>
                <tr><td colspan="6" class="seccion">3. FIRMAS</td></tr>
                <tr>
                    <td class="label">Solicitante:</td><td>${solicitante?.nombre_completo || ''}</td>
                    <td class="label">Ejecutor:</td><td>${ejecutor?.nombre_completo || ''}</td><td colspan="2"></td>
                </tr>
                <tr><td class="label">Firma:</td><td class="firma"></td><td class="label">Firma:</td><td class="firma"></td><td colspan="2"></td></tr>
            </table>

            <table>
                <tr><td colspan="6" class="seccion">4. EJECUCIÓN DEL TRABAJO</td></tr>
                <tr>
                    <td class="label">Ejecutor(es):</td><td colspan="3">${departamentos.join(', ')}</td>
                    <td class="label">N° P.T.S.:</td><td>${pts?.numero_pts || ''}</td>
                </tr>
                <tr>
                    <td class="label">Fecha inicio:</td><td>${fmt(ot.fecha_inicio_real)}</td>
                    <td class="label">Fecha culminación:</td><td>${fmt(ot.fecha_fin_real)}</td>
                    <td class="label">Horas hombre:</td><td>${ot.horas_hombre || ''}</td>
                </tr>
                <tr><td class="label">Recursos utilizados:</td><td colspan="5">${ot.recursos_utilizados || ''}</td></tr>
                <tr><td class="label">Observaciones:</td><td colspan="5">${ot.observaciones_inspeccion || ''}</td></tr>
            </table>

            <table>
                <tr><td colspan="6" class="seccion">5. CIERRE Y VERIFICACIÓN</td></tr>
                <tr>
                    <td class="label">Entregado por:</td><td>${ejecutor?.nombre_completo || ''}</td>
                    <td class="label">Recibido por:</td><td>${solicitante?.nombre_completo || ''}</td>
                    <td class="label">Conformidad:</td><td>SI ${chk(ot.conformidad)} / NO ${chk(ot.conformidad === false)}</td>
                </tr>
                <tr>
                    <td class="label">Firma verificación:</td><td class="firma"></td>
                    <td class="label">Firma:</td><td class="firma"></td>
                    <td class="label">Fecha:</td><td>${fmt(ot.fecha_verificacion)}</td>
                </tr>
                <tr><td class="label">Observaciones:</td><td colspan="5">${ot.observaciones_cierre || ''}</td></tr>
            </table>

            <div class="no-print" style="text-align:center; margin-top:20px;">
                <button onclick="window.print()" style="padding:8px 16px; background:#2563eb; color:#fff; border:none; border-radius:4px; cursor:pointer;">🖨️ Imprimir</button>
            </div>
        </body></html>`);
    win.document.close();
}
