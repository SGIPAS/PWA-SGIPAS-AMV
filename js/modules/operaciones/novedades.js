// ocp Submódulo de Reporte de Novedades – con notificaciones push
import { supabase } from '../../supabase-client.js';
//import { enviarPushARoles } from '../../push.js';

export async function renderizarNovedades(contenedor, rol) {
    contenedor.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Nueva Novedad</h3>
                <form id="form-novedad" class="space-y-4">
                    <div>
                        <label class="block text-slate-400 text-sm">TAG Equipo / Área</label>
                        <input type="text" id="novedad-tag" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">Descripción</label>
                        <textarea id="novedad-desc" rows="3" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required></textarea>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-2">Evidencia (Foto)</label>
                        <div class="flex space-x-4">
                            <label class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-4 rounded cursor-pointer">
                                📁 Subir archivo
                                <input type="file" id="foto-file" accept="image/*" class="hidden">
                            </label>
                            <label class="flex-1 bg-green-600 hover:bg-green-700 text-white text-center py-2 px-4 rounded cursor-pointer">
                                📷 Tomar foto
                                <input type="file" id="foto-camera" accept="image/*" capture="environment" class="hidden">
                            </label>
                        </div>
                        <img id="preview-foto" class="mt-2 max-h-32 rounded hidden">
                    </div>
                    <div class="flex items-center space-x-2">
                        <input type="checkbox" id="genera-ot" class="h-4 w-4 text-blue-600 bg-slate-700 border-slate-600 rounded">
                        <label class="text-slate-400 text-sm">Generar Orden de Trabajo automática</label>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">Registrar Novedad</button>
                </form>
            </div>
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Últimas Novedades</h3>
                <div id="lista-novedades" class="space-y-3 max-h-96 overflow-y-auto">
                    <p class="text-slate-400 animate-pulse">Cargando...</p>
                </div>
            </div>
        </div>
    `;

    const fileInput = document.getElementById('foto-file');
    const cameraInput = document.getElementById('foto-camera');
    const preview = document.getElementById('preview-foto');

    function mostrarPreview(file) {
        const reader = new FileReader();
        reader.onload = e => { preview.src = e.target.result; preview.classList.remove('hidden'); };
        reader.readAsDataURL(file);
    }

    fileInput.addEventListener('change', () => { if (fileInput.files[0]) mostrarPreview(fileInput.files[0]); });
    cameraInput.addEventListener('change', () => { if (cameraInput.files[0]) mostrarPreview(cameraInput.files[0]); });

    document.getElementById('form-novedad').addEventListener('submit', async (e) => {
        e.preventDefault();
        const tag = document.getElementById('novedad-tag').value.trim();
        const desc = document.getElementById('novedad-desc').value.trim();
        const generarOT = document.getElementById('genera-ot').checked;

        let foto_url = null;
        const archivo = fileInput.files[0] || cameraInput.files[0];
        if (archivo) {
            const fileName = `novedades/${Date.now()}_${archivo.name}`;
            const { error: uploadError } = await supabase.storage.from('biblioteca').upload(fileName, archivo);
            if (uploadError) return alert('Error al subir imagen: ' + uploadError.message);
            foto_url = fileName;
        }

        const { data: { user } } = await supabase.auth.getUser();
        const payload = {
            tag_equipo_area: tag,
            descripcion: desc,
            foto_url,
            creado_por: user.id,
            genera_ot: generarOT
        };

        const { error } = await supabase.from('novedades').insert([payload]);
        if (error) return alert('Error al guardar novedad: ' + error.message);

        if (generarOT) {
            const { data: lastOT } = await supabase.from('ordenes_trabajo').select('numero_ot').order('created_at', { ascending: false }).limit(1);
            let nextNum = 1;
            if (lastOT?.length) {
                const last = parseInt(lastOT[0].numero_ot.split('-')[1]);
                if (!isNaN(last)) nextNum = last + 1;
            }
            const numero_ot = `OTA-${String(nextNum).padStart(3, '0')}`;

            const { error: otError } = await supabase.from('ordenes_trabajo').insert([{
                numero_ot,
                titulo: `Novedad: ${tag}`,
                descripcion: desc,
                tipo: 'correctiva',
                prioridad: 'media',
                estado: 'pendiente',
                solicitante_id: user.id,
                creado_por: user.id,
                requiere_pts: false,
                aplica_loto: false
            }]);

            if (otError) {
                alert('Novedad guardada, pero error al crear OT: ' + otError.message);
            } else {
                alert(`Novedad registrada y OT ${numero_ot} creada.`);
                // Notificar a supervisores, admin, inspector y ejecutor
                await enviarPushARoles(['admin', 'supervisor', 'inspector_ssl', 'ejecutor'],
                    `🔧 Nueva OT ${numero_ot} creada: ${tag}`);
            }
        } else {
            alert('Novedad registrada.');
            //await enviarPushARoles(['admin', 'supervisor'],
                `📸 Nueva novedad reportada en ${tag}`);
        }

        document.getElementById('form-novedad').reset();
        preview.classList.add('hidden');
        cargarListaNovedades();
    });

    await cargarListaNovedades();
}

async function cargarListaNovedades() {
    const container = document.getElementById('lista-novedades');
    const { data, error } = await supabase.from('novedades').select('*').order('fecha_novedad', { ascending: false }).limit(10);
    if (error) {
        container.innerHTML = '<p class="text-red-500">Error al cargar novedades.</p>';
        return;
    }
    if (!data.length) {
        container.innerHTML = '<p class="text-slate-400">Sin novedades recientes.</p>';
        return;
    }
    container.innerHTML = data.map(n => `
        <div class="border-l-4 border-blue-500 bg-slate-800 p-3 rounded-r">
            <div class="flex justify-between text-xs text-slate-400 mb-1">
                <span class="font-semibold text-white">${n.tag_equipo_area}</span>
                <span>${new Date(n.fecha_novedad).toLocaleString()}</span>
            </div>
            <p class="text-sm text-slate-300">${n.descripcion}</p>
            ${n.foto_url ? `<img src="${supabase.storage.from('biblioteca').getPublicUrl(n.foto_url).data.publicUrl}" class="mt-2 max-h-24 rounded">` : ''}
        </div>
    `).join('');
}
