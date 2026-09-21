// ocp Historial de PTS con botón de impresión formato FOR-SSL-005
import { supabase } from '../../supabase-client.js';
import { escapeHtml } from '../../utils-storage.js';

export async function renderizarHistorialPTS(contenedor, rol) {
    contenedor.innerHTML = `
        <h3 class="text-xl font-semibold text-white mb-4">Historial de Permisos (PTS)</h3>
        <div id="tabla-historial-pts" class="overflow-x-auto bg-slate-900 rounded p-4">
            <p class="text-slate-400 animate-pulse">Cargando...</p>
        </div>`;

    const { data: ptsData, error } = await supabase.from('permisos_ssl')
        .select('*, ordenes_trabajo(numero_ot, titulo)')
        .order('created_at', { ascending: false }).limit(30);

    if (error) { document.getElementById('tabla-historial-pts').innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`; return; }
    if (!ptsData?.length) { document.getElementById('tabla-historial-pts').innerHTML = '<p class="text-slate-400">No se han emitido PTS.</p>'; return; }

    const emisorIds = [...new Set(ptsData.map(p => p.autorizado_por))];
    const { data: perfiles } = await supabase.from('perfiles').select('id, nombre_completo').in('id', emisorIds);
    const mapa = {};
    (perfiles || []).forEach(p => { mapa[p.id] = p.nombre_completo || 'Sin nombre'; });

    let html = `<table class="w-full text-left border-collapse text-sm">
        <thead class="bg-slate-800 text-slate-400 uppercase"><tr>
            <th class="p-3">N° PTS</th><th class="p-3">OT</th><th class="p-3">Tipo</th>
            <th class="p-3">Emitido por</th><th class="p-3">Vigencia</th>
            <th class="p-3">Riesgos</th><th class="p-3 text-center">Acción</th>
        </tr></thead><tbody class="divide-y divide-slate-700 text-slate-300">`;

    ptsData.forEach(p => {
        const riesgos = [];
        if (p.check_loto) riesgos.push('LOTO');
        if (p.check_valvulas) riesgos.push('Válvulas');
        if (p.check_gases) riesgos.push('Gases');
        if (p.check_quimicos) riesgos.push('Químicos');
        if (p.check_caliente) riesgos.push('Caliente');
        if (p.check_bypass_control) riesgos.push('Bypass');
        html += `<tr class="hover:bg-slate-700/50">
            <td class="p-3 font-mono">${p.numero_pts || '(sin correlativo)'}</td>
            <td class="p-3 font-mono">${p.ordenes_trabajo?.numero_ot || p.orden_id}</td>
            <td class="p-3 capitalize">${(p.tipo_trabajo || 'frio').replace('_',' ')}</td>
            <td class="p-3">${mapa[p.autorizado_por] || 'Desconocido'}</td>
            <td class="p-3">${p.fecha_desde || ''} ${p.hora_inicio || ''} – ${p.fecha_hasta || ''} ${p.hora_fin || ''}</td>
            <td class="p-3">${riesgos.join(', ') || 'Ninguno'}</td>
            <td class="p-3 text-center"><button class="btn-imprimir-pts bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded" data-id="${p.id}">🖨️ Imprimir</button></td>
        </tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('tabla-historial-pts').innerHTML = html;

    document.querySelectorAll('.btn-imprimir-pts').forEach(btn => {
        btn.addEventListener('click', () => imprimirPTS(btn.dataset.id));
    });
}

async function imprimirPTS(permisoId) {
    const { data: pts } = await supabase.from('permisos_ssl')
        .select('*, ordenes_trabajo(numero_ot, titulo)').eq('id', permisoId).single();
    if (!pts) return alert('PTS no encontrado.');

    const { data: trabajadores } = await supabase.from('permisos_ssl_trabajadores')
        .select('cargo, trabajadores(nombre_completo, cedula)').eq('permiso_id', permisoId);

    const chk = (c) => c ? '☑' : '☐';
    const win = window.open('', '_blank');
    win.document.write(`
        <!DOCTYPE html><html><head><meta charset="utf-8"><title>${pts.numero_pts}</title>
        <style>
            body { font-family: Arial, sans-serif; font-size: 9pt; margin: 12px; color: #000; }
            .cintillo { width: 100%; margin-bottom: 6px; border-bottom: 2px solid #1e3a8a; padding-bottom: 4px; }
            .cintillo img { width: 100%; height: auto; }
            h1 { text-align: center; font-size: 11pt; margin: 6px 0; }
            h2 { font-size: 10pt; margin: 8px 0 4px 0; background: #d1d5db; padding: 3px; text-align: center; border: 1px solid #000; }
            .codigos { text-align: right; font-size: 8pt; margin-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
            td, th { border: 1px solid #000; padding: 2px 4px; font-size: 8pt; vertical-align: top; }
            .label { background: #f3f4f6; font-weight: bold; }
            .center { text-align: center; }
            .firma { height: 40px; }
            @media print { .no-print { display: none; } }
        </style></head><body>
            <div class="cintillo"><img src="${window.location.origin}/cintillo_superior.png" onerror="this.style.display='none'"></div>
            <div class="codigos"><div><strong>FOR-SSL-005</strong></div><div><strong>N° ${pts.numero_pts || ''}</strong></div></div>
            <h1>PERMISO PARA TRABAJOS EN ${(pts.tipo_trabajo || '').toUpperCase()}</h1>

            <h2>DATOS GENERALES</h2>
            <table>
                <tr>
                    <td class="label">Fecha del permiso:</td>
                    <td>Desde: ${pts.fecha_desde || ''}</td>
                    <td>Hasta: ${pts.fecha_hasta || ''}</td>
                    <td class="label">Hora inicio:</td><td>${pts.hora_inicio || ''}</td>
                    <td class="label">Hora fin:</td><td>${pts.hora_fin || ''}</td>
                </tr>
                <tr>
                    <td class="label">Planta/Área:</td><td colspan="3">${pts.planta_area_intervenida || ''}</td>
                    <td class="label">Unidad responsable:</td><td colspan="2">${pts.unidad_responsable || ''}</td>
                </tr>
                <tr>
                    <td class="label">Empresa contratista:</td><td>${chk(pts.empresa_contratista)}</td>
                    <td class="label">Procedimiento:</td><td colspan="4">${pts.procedimiento_tipo === 'continuacion' ? 'Continuación' : 'Nuevo'}</td>
                </tr>
                <tr><td class="label">OT vinculada:</td><td colspan="6">${pts.ordenes_trabajo?.numero_ot || ''} – ${pts.ordenes_trabajo?.titulo || ''}</td></tr>
                <tr><td class="label">Descripción:</td><td colspan="6">${pts.descripcion_trabajo || ''}</td></tr>
            </table>

            <h2>RIESGOS Y CONTROLES (A.R.T.)</h2>
            <table>
                <tr><td class="label">LOTO:</td><td class="center">${chk(pts.check_loto)}</td>
                    <td class="label">Válvulas:</td><td class="center">${chk(pts.check_valvulas)}</td>
                    <td class="label">Gases:</td><td class="center">${chk(pts.check_gases)}</td></tr>
                <tr><td class="label">Químicos:</td><td class="center">${chk(pts.check_quimicos)}</td>
                    <td class="label">Caliente:</td><td class="center">${chk(pts.check_caliente)}</td>
                    <td class="label">Bypass:</td><td class="center">${chk(pts.check_bypass_control)}</td></tr>
                ${pts.check_gases ? `<tr>
                    <td class="label">Gases medidos:</td>
                    <td colspan="5">O₂: ${pts.valor_o2 ?? '--'}% | SO₂: ${pts.valor_so2 ?? '--'} ppm | H₂S: ${pts.valor_h2s ?? '--'} ppm | Explosivos: ${pts.valor_explosivos ?? '--'}%</td>
                </tr>` : ''}
            </table>

            <h2>TRABAJADORES EJECUTANTES</h2>
            <table>
                <tr><th>Nombre</th><th>Cédula</th><th>Cargo</th><th>Firma</th></tr>
                ${(trabajadores || []).map(t => `<tr>
                    <td>${t.trabajadores?.nombre_completo || ''}</td>
                    <td>${t.trabajadores?.cedula || ''}</td>
                    <td>${t.cargo || ''}</td>
                    <td class="firma"></td>
                </tr>`).join('')}
                ${Array(Math.max(0, 4 - (trabajadores?.length || 0))).fill(0).map(() => `<tr><td></td><td></td><td></td><td class="firma"></td></tr>`).join('')}
            </table>

            <h2>FIRMAS</h2>
            <table>
                <tr>
                    <td class="label">Responsable Área:</td><td class="firma"></td>
                    <td class="label">Responsable Seguridad:</td><td class="firma"></td>
                    <td class="label">Responsable Ejecutar:</td><td class="firma"></td>
                </tr>
                <tr><td class="label">Fecha:</td><td></td><td class="label">Fecha:</td><td></td><td class="label">Fecha:</td><td></td></tr>
            </table>

            <h2>REVALIDACIONES</h2>
            <table>
                <tr><th>Responsable Área</th><th>Responsable Seguridad</th><th>Responsable Ejecutar</th><th>Fecha</th></tr>
                ${Array(5).fill(0).map(() => `<tr><td class="firma"></td><td class="firma"></td><td class="firma"></td><td></td></tr>`).join('')}
            </table>

            <div class="no-print" style="text-align:center; margin-top:16px;">
                <button onclick="window.print()" style="padding:8px 16px; background:#2563eb; color:#fff; border:none; border-radius:4px; cursor:pointer;">🖨️ Imprimir</button>
            </div>
        </body></html>`);
    win.document.close();
}
