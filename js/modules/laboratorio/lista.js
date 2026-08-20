// ocp Funciones de listado compartidas para Laboratorio
import { supabase } from '../../supabase-client.js';

export async function renderizarListaCertificaciones(tabla, contenedorId, campos) {
    const container = document.getElementById(contenedorId);
    if (!container) return;

    const { data, error } = await supabase
        .from(tabla)
        .select('*')
        .eq('anulado', false)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        container.innerHTML = '<p class="text-red-500">Error al cargar.</p>';
        return;
    }
    if (!data.length) {
        container.innerHTML = '<p class="text-slate-400">Sin registros.</p>';
        return;
    }

    container.innerHTML = data.map(item => {
        let detalles = '';
        campos.forEach(campo => {
            if (item[campo] !== undefined && item[campo] !== null) {
                detalles += `<span class="ml-2 text-blue-400">${campo}: ${item[campo]}</span>`;
            }
        });
        return `
            <div class="bg-slate-800 p-2 rounded text-sm">
                <span class="text-slate-400">${item.fecha_analisis || item.fecha || ''}</span>
                <span class="ml-2 font-bold text-white">${item.tanque || item.punto_muestreo || '--'}</span>
                ${detalles}
            </div>
        `;
    }).join('');
}
