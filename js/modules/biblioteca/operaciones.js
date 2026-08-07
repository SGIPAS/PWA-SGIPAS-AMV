// ocp Operaciones CRUD – interacción con Supabase (documentos, versiones, storage) + soporte para video
import { supabase } from '../../supabase-client.js';

// ocp Carga la lista de documentos según filtros
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

// ocp Badge de estado
function badgeEstado(estado) {
    const colores = {
        borrador: 'text-yellow-400 bg-yellow-900/50',
        publicado: 'text-green-400 bg-green-900/50',
        obsoleto: 'text-red-400 bg-red-900/50'
    };
    return `<span class="px-2 py-1 rounded text-xs font-semibold ${colores[estado] || ''}">${estado}</span>`;
}

// ocp Abre modal para nuevo documento
export function abrirModalNuevo() {
    document.getElementById('doc-id').value = '';
    document.getElementById('modal-titulo').textContent = 'Nuevo Documento';
    document.getElementById('doc-titulo').value = '';
    document.getElementById('doc-descripcion').value = '';
    document.getElementById('doc-categoria').value = 'general';
    document.getElementById('doc-tipo').value = 'manual';
    document.getElementById('doc-archivo').value = '';
    document.getElementById('archivo-actual').classList.add('hidden');
    document.getElementById('doc-cambios-group').classList.add('hidden');
    document.getElementById('modal-documento').classList.remove('hidden');
}

// ocp Abre modal para editar documento existente (carga datos actuales)
export async function abrirModalEditar(id) {
    const { data: doc, error } = await supabase
        .from('documentos')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !doc) return alert('Documento no encontrado');

    document.getElementById('doc-id').value = doc.id;
    document.getElementById('modal-titulo').textContent = `Editar: ${doc.titulo}`;
    document.getElementById('doc-titulo').value = doc.titulo;
    document.getElementById('doc-descripcion').value = doc.descripcion || '';
    document.getElementById('doc-categoria').value = doc.categoria;
    document.getElementById('doc-tipo').value = doc.tipo;
    document.getElementById('doc-archivo').value = '';
    document.getElementById('archivo-actual').textContent = `Archivo actual: ${doc.archivo_url ? doc.archivo_url.split('/').pop() : 'Ninguno'}`;
    document.getElementById('archivo-actual').classList.remove('hidden');
    document.getElementById('doc-cambios-group').classList.remove('hidden');
    document.getElementById('doc-cambios').value = '';
    document.getElementById('modal-documento').classList.remove('hidden');
}

// ocp Cierra el modal
export function cerrarModal() {
    document.getElementById('modal-documento').classList.add('hidden');
}

// ocp Maneja el submit del formulario (crear o actualizar)
export async function manejarSubmitDocumento(rol) {
    const btn = document.getElementById('btn-guardar-doc');
    btn.disabled = true;
    btn.textContent = 'Procesando...';

    const id = document.getElementById('doc-id').value;
    const titulo = document.getElementById('doc-titulo').value.trim();
    const descripcion = document.getElementById('doc-descripcion').value.trim();
    const categoria = document.getElementById('doc-categoria').value;
    const tipo = document.getElementById('doc-tipo').value;
    const archivoInput = document.getElementById('doc-archivo');
    const cambios = document.getElementById('doc-cambios')?.value || '';

    try {
        let archivo_url = null;
        if (archivoInput.files.length > 0) {
            const file = archivoInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `documentos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('biblioteca')
                .upload(filePath, file, { upsert: false });

            if (uploadError) throw new Error('Error al subir archivo: ' + uploadError.message);
            archivo_url = filePath;
        }

        if (id) {
            // Actualizar documento existente: crear nueva versión
            const { data: docActual } = await supabase
                .from('documentos')
                .select('version_actual, archivo_url')
                .eq('id', id)
                .single();

            if (!docActual) throw new Error('Documento no encontrado');

            const nuevaVersion = docActual.version_actual + 1;

            // Insertar en historial de versiones la versión anterior
            await supabase.from('versiones').insert({
                documento_id: id,
                numero_version: docActual.version_actual,
                archivo_url: docActual.archivo_url,
                cambios: 'Versión anterior',
                creado_por: (await supabase.auth.getUser()).data.user.id
            });

            // Actualizar documento con nueva versión
            const updateData = {
                titulo,
                descripcion,
                categoria,
                tipo,
                version_actual: nuevaVersion,
                estado: 'publicado',
                fecha_publicacion: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            if (archivo_url) updateData.archivo_url = archivo_url;

            const { error: updateError } = await supabase
                .from('documentos')
                .update(updateData)
                .eq('id', id);

            if (updateError) throw updateError;

            // Guardar la nueva versión en historial también
            await supabase.from('versiones').insert({
                documento_id: id,
                numero_version: nuevaVersion,
                archivo_url: updateData.archivo_url || docActual.archivo_url,
                cambios: cambios || 'Actualización',
                creado_por: (await supabase.auth.getUser()).data.user.id
            });

        } else {
            // Nuevo documento
            if (!archivo_url) throw new Error('Debe seleccionar un archivo');

            const { data: userData } = await supabase.auth.getUser();
            const userId = userData.user.id;

            const { data: nuevoDoc, error: insertError } = await supabase
                .from('documentos')
                .insert({
                    titulo,
                    descripcion,
                    categoria,
                    tipo,
                    estado: 'publicado',
                    version_actual: 1,
                    archivo_url,
                    creado_por: userId,
                    fecha_publicacion: new Date().toISOString()
                })
                .select()
                .single();

            if (insertError) throw insertError;

            // Registrar primera versión
            await supabase.from('versiones').insert({
                documento_id: nuevoDoc.id,
                numero_version: 1,
                archivo_url,
                cambios: 'Versión inicial',
                creado_por: userId
            });
        }

        cerrarModal();
        await cargarListaDocumentos(rol);
    } catch (err) {
        alert('Error: ' + err.message);
        console.error(err);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Guardar';
    }
}

// ocp Confirmación y eliminación de documento
async function confirmarEliminarDocumento(id) {
    if (!confirm('¿Eliminar este documento y todo su historial? Esta acción no se puede deshacer.')) return;

    const { data: doc } = await supabase.from('documentos').select('archivo_url').eq('id', id).single();
    if (doc?.archivo_url) {
        await supabase.storage.from('biblioteca').remove([doc.archivo_url]);
    }

    const { error } = await supabase.from('documentos').delete().eq('id', id);
    if (error) {
        alert('Error al eliminar: ' + error.message);
    } else {
        await cargarListaDocumentos(await (await supabase.auth.getUser()).data.user?.user_metadata?.rol || 'operador');
    }
}
