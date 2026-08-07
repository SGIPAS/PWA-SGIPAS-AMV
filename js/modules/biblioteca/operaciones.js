// ocp Operaciones CRUD y consultas para la Biblioteca Digital – versión explorador
import { supabase } from '../../supabase-client.js';

// ================================================================
// ocp Consultas para el explorador (tarjetas de documentos)
// ================================================================

// ocp Carga documentos por categoría/subcategoría y los muestra en tarjetas
export async function cargarDocumentosPorCategoria(categoria, subcategoria, rol) {
    const grid = document.getElementById('grid-documentos');
    const totalEl = document.getElementById('total-documentos');
    if (!grid) return;

    grid.innerHTML = '<p class="text-slate-400 col-span-full text-center py-8 animate-pulse">Cargando documentos...</p>';

    let query = supabase.from('documentos').select('*', { count: 'exact' }).order('fecha_publicacion', { ascending: false });

    if (categoria) query = query.eq('categoria', categoria);
    if (subcategoria) query = query.eq('subcategoria', subcategoria);

    const { data, error, count } = await query;

    if (totalEl) totalEl.textContent = count ?? 0;

    if (error) {
        grid.innerHTML = `<p class="text-red-500 col-span-full text-center py-8">Error: ${error.message}</p>`;
        return;
    }

    if (!data || data.length === 0) {
        grid.innerHTML = '<p class="text-slate-400 col-span-full text-center py-8">No se encontraron documentos.</p>';
        return;
    }

    grid.innerHTML = data.map(doc => crearTarjetaDocumento(doc, rol)).join('');
}

// ocp Busca documentos por texto libre y filtros adicionales
export async function buscarDocumentos(texto, tipo, formato, rol) {
    const grid = document.getElementById('grid-documentos');
    const totalEl = document.getElementById('total-documentos');
    if (!grid) return;

    grid.innerHTML = '<p class="text-slate-400 col-span-full text-center py-8 animate-pulse">Buscando...</p>';

    let query = supabase.from('documentos').select('*', { count: 'exact' });

    // Construir filtros dinámicos
    if (texto) {
        // Buscar en título, código, tags y descripción usando ilike
        const filtro = `%${texto}%`;
        query = query.or(`titulo.ilike.${filtro},codigo.ilike.${filtro},descripcion.ilike.${filtro}`);
        // También podríamos buscar en tags usando array operators, pero por simplicidad usamos ilike en un campo de texto concatenado si fuera necesario.
        // Para tags, podríamos usar .contains('tags', [texto]) si supabase lo soporta, pero es más complejo.
        // Por ahora, la búsqueda en título, código y descripción es suficiente.
    }
    if (tipo) query = query.eq('tipo', tipo);
    if (formato) {
        // Si el formato es 'video', buscar tipo 'video'; si es 'imagen', buscar tipos que sean imagen, etc.
        // Para simplificar, asumimos que el campo 'formato' se llena automáticamente con la extensión del archivo,
        // pero aún no hemos implementado eso. Por ahora, podemos filtrar por tipo si coincide.
        query = query.eq('tipo', formato);
    }

    query = query.order('fecha_publicacion', { ascending: false });

    const { data, error, count } = await query;

    if (totalEl) totalEl.textContent = count ?? 0;

    if (error) {
        grid.innerHTML = `<p class="text-red-500 col-span-full text-center py-8">Error: ${error.message}</p>`;
        return;
    }

    if (!data || data.length === 0) {
        grid.innerHTML = '<p class="text-slate-400 col-span-full text-center py-8">Sin resultados.</p>';
        return;
    }

    grid.innerHTML = data.map(doc => crearTarjetaDocumento(doc, rol)).join('');
}

// ocp Construye el HTML de una tarjeta de documento
function crearTarjetaDocumento(doc, rol) {
    const esAdmin = rol === 'admin';
    const iconos = {
        manual: '📘',
        procedimiento: '📙',
        formulario: '📄',
        registro: '📋',
        practica: '📝',
        video: '🎥',
        ficha_tecnica: '📊',
        plano: '🗺️',
        presentacion: '📈',
        otro: '📎'
    };
    const icono = iconos[doc.tipo] || '📎';
    const colorBorde = {
        'Normativa': '#f59e0b',
        'SGIPAS': '#3b82f6',
        'Operaciones': '#10b981',
        'Mantenimiento': '#8b5cf6',
        'Seguridad y Salud': '#ef4444',
        'Ambiente y Energía': '#06b6d4',
        'Laboratorio': '#ec4899',
        'Capacitación': '#f97316',
        'Administrativo': '#6366f1'
    }[doc.categoria] || '#64748b';

    const vigencia = doc.fecha_vigencia ? new Date(doc.fecha_vigencia).toLocaleDateString('es-VE') : '';
    const vigente = doc.fecha_vigencia ? new Date(doc.fecha_vigencia) >= new Date() : true;

    return `
        <div class="bg-slate-800 rounded-lg shadow-lg border-l-4 hover:bg-slate-700 transition p-4 flex flex-col" style="border-left-color: ${colorBorde};">
            <div class="flex items-start justify-between mb-2">
                <span class="text-3xl">${icono}</span>
                <span class="text-xs font-mono text-slate-500">${doc.codigo || ''}</span>
            </div>
            <h3 class="text-sm font-semibold text-white mb-1 line-clamp-2" title="${doc.titulo}">${doc.titulo}</h3>
            <p class="text-xs text-slate-400 mb-1">${doc.categoria}${doc.subcategoria ? ' / ' + doc.subcategoria : ''}</p>
            <div class="flex items-center justify-between mt-2 text-xs">
                <span class="px-2 py-0.5 rounded-full ${doc.estado === 'publicado' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}">v${doc.version_actual} ${vigente ? '' : '(obsoleto)'}</span>
                <span class="text-slate-500">${vigencia ? 'Vence: ' + vigencia : ''}</span>
            </div>
            <div class="flex gap-2 mt-3">
                ${doc.archivo_url ? 
                    (doc.tipo === 'video' ? 
                        `<button class="text-xs text-blue-400 hover:underline ver-video" data-url="${supabase.storage.from('biblioteca').getPublicUrl(doc.archivo_url).data.publicUrl}">▶ Reproducir</button>` 
                        : `<a href="${supabase.storage.from('biblioteca').getPublicUrl(doc.archivo_url).data.publicUrl}" target="_blank" class="text-xs text-blue-400 hover:underline">📥 Descargar</a>`)
                    : '<span class="text-xs text-slate-500">Sin archivo</span>'}
                ${esAdmin ? `
                    <button onclick="window.editarDocumento('${doc.id}')" class="text-xs text-yellow-400 hover:underline ml-auto">✏️ Editar</button>
                    <button onclick="window.eliminarDocumento('${doc.id}')" class="text-xs text-red-400 hover:underline">🗑️</button>
                ` : ''}
            </div>
        </div>
    `;
}

// ================================================================
// ocp Funciones CRUD (mantienen compatibilidad con el modal)
// ================================================================

// ocp Abre modal para nuevo documento (metadatos actualizados)
export function abrirModalNuevo() {
    document.getElementById('doc-id').value = '';
    document.getElementById('modal-titulo').textContent = 'Nuevo Documento';
    document.getElementById('doc-codigo').value = '';
    document.getElementById('doc-titulo').value = '';
    document.getElementById('doc-descripcion').value = '';
    document.getElementById('doc-categoria').value = 'Operaciones';
    document.getElementById('doc-subcategoria').value = '';
    document.getElementById('doc-tipo').value = 'manual';
    document.getElementById('doc-entidad').value = '';
    document.getElementById('doc-vigencia').value = '';
    document.getElementById('doc-tags').value = '';
    document.getElementById('doc-archivo').value = '';
    document.getElementById('archivo-actual').classList.add('hidden');
    document.getElementById('doc-cambios-group').classList.add('hidden');
    document.getElementById('modal-documento').classList.remove('hidden');
}

// ocp Abre modal para editar documento existente (carga metadatos)
export async function abrirModalEditar(id) {
    const { data: doc, error } = await supabase
        .from('documentos')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !doc) return alert('Documento no encontrado');

    document.getElementById('doc-id').value = doc.id;
    document.getElementById('modal-titulo').textContent = `Editar: ${doc.titulo}`;
    document.getElementById('doc-codigo').value = doc.codigo || '';
    document.getElementById('doc-titulo').value = doc.titulo;
    document.getElementById('doc-descripcion').value = doc.descripcion || '';
    document.getElementById('doc-categoria').value = doc.categoria;
    document.getElementById('doc-subcategoria').value = doc.subcategoria || '';
    document.getElementById('doc-tipo').value = doc.tipo;
    document.getElementById('doc-entidad').value = doc.entidad_responsable || '';
    document.getElementById('doc-vigencia').value = doc.fecha_vigencia || '';
    document.getElementById('doc-tags').value = doc.tags ? doc.tags.join(', ') : '';
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

// ocp Maneja el envío del formulario (crear / actualizar) con todos los metadatos
export async function manejarSubmitDocumento(rol) {
    const btn = document.getElementById('btn-guardar-doc');
    btn.disabled = true;
    btn.textContent = 'Procesando...';

    const id = document.getElementById('doc-id').value;
    const codigo = document.getElementById('doc-codigo').value.trim();
    const titulo = document.getElementById('doc-titulo').value.trim();
    const descripcion = document.getElementById('doc-descripcion').value.trim();
    const categoria = document.getElementById('doc-categoria').value;
    const subcategoria = document.getElementById('doc-subcategoria').value.trim();
    const tipo = document.getElementById('doc-tipo').value;
    const entidad = document.getElementById('doc-entidad').value.trim();
    const vigencia = document.getElementById('doc-vigencia').value;
    const tags = document.getElementById('doc-tags').value.split(',').map(t => t.trim()).filter(Boolean);
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

        const payloadBase = {
            titulo,
            descripcion,
            categoria,
            subcategoria: subcategoria || null,
            tipo,
            entidad_responsable: entidad || null,
            fecha_vigencia: vigencia || null,
            tags: tags.length > 0 ? tags : null,
            codigo: codigo || null,
            estado: 'publicado',
            updated_at: new Date().toISOString()
        };

        if (id) {
            // Actualizar existente
            const { data: docActual } = await supabase
                .from('documentos')
                .select('version_actual, archivo_url')
                .eq('id', id)
                .single();

            if (!docActual) throw new Error('Documento no encontrado');

            const nuevaVersion = docActual.version_actual + 1;
            payloadBase.version_actual = nuevaVersion;
            if (archivo_url) payloadBase.archivo_url = archivo_url;
            payloadBase.fecha_publicacion = new Date().toISOString();

            // Insertar versión anterior en historial
            await supabase.from('versiones').insert({
                documento_id: id,
                numero_version: docActual.version_actual,
                archivo_url: docActual.archivo_url,
                cambios: 'Versión anterior',
                creado_por: (await supabase.auth.getUser()).data.user.id
            });

            const { error: updateError } = await supabase
                .from('documentos')
                .update(payloadBase)
                .eq('id', id);

            if (updateError) throw updateError;

            // Insertar nueva versión en historial
            await supabase.from('versiones').insert({
                documento_id: id,
                numero_version: nuevaVersion,
                archivo_url: payloadBase.archivo_url || docActual.archivo_url,
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
                    ...payloadBase,
                    version_actual: 1,
                    archivo_url,
                    creado_por: userId,
                    fecha_publicacion: new Date().toISOString()
                })
                .select()
                .single();

            if (insertError) throw insertError;

            await supabase.from('versiones').insert({
                documento_id: nuevoDoc.id,
                numero_version: 1,
                archivo_url,
                cambios: 'Versión inicial',
                creado_por: userId
            });
        }

        cerrarModal();
        // Recargar la vista actual (todos los documentos)
        await cargarDocumentosPorCategoria(null, null, rol);

    } catch (err) {
        alert('Error: ' + err.message);
        console.error(err);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Guardar';
    }
}

// ocp Eliminación de documento (con confirmación)
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
        // Recargar la vista actual
        await cargarDocumentosPorCategoria(null, null, 
            (await supabase.auth.getUser()).data.user?.user_metadata?.rol || 'operador');
    }
}

// Exponer funciones globales para los botones de las tarjetas
window.editarDocumento = (id) => abrirModalEditar(id);
window.eliminarDocumento = (id) => confirmarEliminarDocumento(id);
