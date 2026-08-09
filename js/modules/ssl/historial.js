// ocp Historial de PTS emitidos – muestra nombre real del emisor
import { supabase } from '../../supabase-client.js';

export async function renderizarHistorialPTS(contenedor, rol) {
    contenedor.innerHTML = `
        <h3 class="text-xl font-semibold text-white mb-4">Historial de Permisos (PTS)</h3>
        <div id="tabla-historial-pts" class="overflow-x-auto bg-slate-900 rounded p-4">
            <p class="text-slate-400 animate-pulse">Cargando...</p>
        </div>
    `;

    // 1. Obtener los PTS
    const { data: ptsData, error: ptsError } = await supabase
        .from('permisos_ssl')
        .select('*, ordenes_trabajo(numero_ot, titulo)')
        .order('created_at', { ascending: false })
        .limit(20);

    if (ptsError) {
        document.getElementById('tabla-historial-pts').innerHTML = `<p class="text-red-500">Error: ${ptsError.message}</p>`;
        return;
    }

    if (!ptsData || ptsData.length === 0) {
        document.getElementById('tabla-historial-pts').innerHTML = '<p class="text-slate-400">No se han emitido PTS.</p>';
        return;
    }

    // 2. Obtener los UUIDs únicos de los emisores
    const emisorIds = [...new Set(ptsData.map(p => p.autorizado_por))];

    // 3. Consultar los nombres desde perfiles
    const { data: perfilesData } = await supabase
        .from('perfiles')
        .select('id, nombre_completo')
        .in('id', emisorIds);

    // 4. Crear un mapa de id -> nombre para acceso rápido
    const mapaNombres = {};
    if (perfilesData) {
        perfilesData.forEach(p => {
            mapaNombres[p.id] = p.nombre_completo || 'Sin nombre';
        });
    }

    // 5. Construir la tabla
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

    ptsData.forEach(p => {
        const riesgos = [];
        if (p.check_loto) riesgos.push('LOTO');
        if (p.check_valvulas) riesgos.push('Válvulas');
        if (p.check_gases) riesgos.push('Gases');
        if (p.check_quimicos) riesgos.push('Químicos');
        if (p.check_caliente) riesgos.push('Caliente');
        if (p.check_bypass_control) riesgos.push('Bypass');
        const numOT = p.ordenes_trabajo?.numero_ot || p.orden_id;
        const titOT = p.ordenes_trabajo?.titulo || '';
        const nombreEmisor = mapaNombres[p.autorizado_por] || p.autorizado_por?.substring(0, 8) || 'Desconocido';

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
    document.getElementById('tabla-historial-pts').innerHTML = html;
}
