// ocp Historial de PTS emitidos – muestra nombre real del emisor
import { supabase } from '../../supabase-client.js';

export async function renderizarHistorialPTS(contenedor, rol) {
    contenedor.innerHTML = `
        <h3 class="text-xl font-semibold text-white mb-4">Historial de Permisos (PTS)</h3>
        <div id="tabla-historial-pts" class="overflow-x-auto bg-slate-900 rounded p-4">
            <p class="text-slate-400 animate-pulse">Cargando...</p>
        </div>
    `;

    // Obtener PTS con el nombre del autor usando JOIN
    const { data, error } = await supabase
        .from('permisos_ssl')
        .select('*, ordenes_trabajo(numero_ot, titulo), perfiles!permisos_ssl_autorizado_por_fkey(nombre_completo)')
        .order('created_at', { ascending: false })
        .limit(20);

    const container = document.getElementById('tabla-historial-pts');
    if (error) {
        container.innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`;
        return;
    }
    if (!data.length) {
        container.innerHTML = '<p class="text-slate-400">No se han emitido PTS.</p>';
        return;
    }

    let html = `
        <table class="w-full text-left border-collapse text-sm">
            <thead class="bg-slate-800 text-slate-400 uppercase">
                <tr>
                    <th class="p-3">OT</th>
                    <th class="p-3">Título</th>
                    <th class="p-3">Emitido por</th>
                    <th class="p-3">Vigencia</th>
                    <th class="p-3">Riesgos</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-700 text-slate-300">
    `;

    data.forEach(p => {
        const riesgos = [];
        if (p.check_loto) riesgos.push('LOTO');
        if (p.check_valvulas) riesgos.push('Válvulas');
        if (p.check_gases) riesgos.push('Gases');
        if (p.check_quimicos) riesgos.push('Químicos');
        if (p.check_caliente) riesgos.push('Caliente');
        if (p.check_bypass_control) riesgos.push('Bypass');
        const numOT = p.ordenes_trabajo?.numero_ot || p.orden_id;
        const titOT = p.ordenes_trabajo?.titulo || '';
        const nombreEmisor = p.perfiles?.nombre_completo || 'Usuario ' + (p.autorizado_por?.substring(0,8) || 'desconocido');

        html += `
            <tr class="hover:bg-slate-700/50">
                <td class="p-3 font-mono">${numOT}</td>
                <td class="p-3">${titOT}</td>
                <td class="p-3">${nombreEmisor}</td>
                <td class="p-3">${p.hora_inicio} – ${p.hora_fin}</td>
                <td class="p-3">${riesgos.join(', ') || 'Ninguno'}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}
