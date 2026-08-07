// ocp Operaciones CRUD – interacción con Supabase (tablas documentos, versiones, storage) + videos
import { supabase } from '../../supabase-client.js';

export async function cargarListaDocumentos(rol) {
    const container = document.getElementById('tabla-documentos-container');
    if (!container) return;

    container.innerHTML = '<p class="text-slate-400 animate-pulse">Cargando documentos...</p>';

    const busqueda = document.getElementById('busqueda-documento')?.value.toLowerCase() || '';
    const categoria = document.getElementById('filtro-categoria')?.value || '';
    const tipo = document.getElementById('filtro-tipo')?.value || '';

    let query = supabase
        .from('documentos')
        .select('*')
        .order('fecha_publicacion', { ascending: false });

    if (categoria) query = query.eq('categoria', categoria);
    if (tipo) query = query.eq('tipo', tipo);
    if (busqueda) query = query.ilike('titulo', `%${busqueda}%`);

    const { data: documentos, error } = await query;

    if (error) {
        container.innerHTML = `<p class="text-red-500 p-4">Error al cargar documentos: ${error.message}</p>`;
        return;
    }

    if (!documentos || documentos.length === 0) {
        container.innerHTML = '<p class="text-slate-400 p-4 text-center">No se encontraron documentos.</p>';
        return;
    }

    const esAdmin = rol === 'admin';
    let html = `
        <table class="w-full text-left border-collapse">
            <thead>
                <tr class="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700">
                    <th class="p-4 font-semibold">Título</th>
                    <th class="p-4 font-semibold">Categoría</th>
                    <th class="p-4 font-semibold">Tipo</th>
                    <th class="p-4 font-semibold">Versión</th>
                    <th class="p-4 font-semibold">Estado</th>
                    <th class="p-4 font-semibold">Acciones</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-700 text-slate-300 text-sm">
    `;

    documentos.forEach(doc => {
        html += `
            <tr class="hover:bg-slate-700/50 transition duration-150">
                <td class="p-4 font-medium text-slate-100">${doc.titulo}</td>
                <td class="p-4 capitalize">${doc.categoria}</td>
                <td class="p-4"><span class="px-2 py-1 text-xs rounded bg-slate-700">${doc.tipo}</span></td>
                <td class="p-4">v${doc.version_actual}</td>
                <td class="p-4">${badgeEstado(doc.estado)}</td>
                <td class="p-4 flex space-x-2">
                    ${doc.archivo_url ? 
                        (doc.tipo === 'video' ? 
                            `<video width="200" controls>
                                <source src="${supabase.storage.from('biblioteca').getPublicUrl(doc.archivo_url).data.publicUrl}" type="video/mp4">
                            </video>` 
                            : `<a href="${supabase.storage.from('biblioteca').getPublicUrl(doc.archivo_url).data.publicUrl}" target="_blank" class="text-blue-400 hover:underline">Ver</a>`)
                        : '-'}
                    ${esAdmin ? `
                        <button onclick="window.editarDocumento('${doc.id}')" class="text-yellow-400 hover:underline ml-2">Editar</button>
                        <button onclick="window.eliminarDocumento('${doc.id}')" class="text-red-400 hover:underline ml-2">Eliminar</button>
                    ` : ''}
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;

    window.editarDocumento = (id) => abrirModalEditar(id);
    window.eliminarDocumento = (id) => confirmarEliminarDocumento(id);
}

function badgeEstado(estado) {
    const colores = {
        borrador: 'text-yellow-400 bg-yellow-900/50',
        publicado: 'text-green-400 bg-green-900/50',
        obsoleto: 'text-red-400 bg-red-900/50'
    };
    return `<span class="px-2 py-1 rounded text-xs font-semibold ${colores[estado] || ''}">${estado}</span>`;
}

// Las demás funciones (abrirModalNuevo, abrirModalEditar, cerrarModal, manejarSubmitDocumento, confirmarEliminarDocumento) permanecen igual.
// Solo se ha modificado la visualización en la lista.
