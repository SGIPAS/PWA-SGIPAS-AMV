// ocp Registro de emisiones SO₂ con foto
import { supabase } from '../../supabase-client.js';

export async function renderizarEmisiones(contenedor, rol) {
    contenedor.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Registrar Emisiones</h3>
                <form id="form-emisiones" class="space-y-4">
                    <div>
                        <label class="block text-slate-400 text-sm">Temperatura (°C)</label>
                        <input type="number" step="0.1" id="emis-temp" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">% O₂</label>
                        <input type="number" step="0.01" id="emis-o2" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">ppm SO₂</label>
                        <input type="number" step="0.01" id="emis-so2" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-2">Foto (opcional)</label>
                        <div class="flex space-x-4">
                            <label class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-4 rounded cursor-pointer">
                                📁 Subir
                                <input type="file" id="foto-file-emis" accept="image/*" class="hidden">
                            </label>
                            <label class="flex-1 bg-green-600 hover:bg-green-700 text-white text-center py-2 px-4 rounded cursor-pointer">
                                📷 Tomar foto
                                <input type="file" id="foto-cam-emis" accept="image/*" capture="environment" class="hidden">
                            </label>
                        </div>
                        <img id="preview-emis" class="mt-2 max-h-32 rounded hidden">
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">Guardar</button>
                </form>
            </div>
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Últimos registros</h3>
                <div id="lista-emisiones" class="space-y-3 max-h-96 overflow-y-auto">
                    <p class="text-slate-400 animate-pulse">Cargando...</p>
                </div>
            </div>
        </div>
    `;

    // Previsualización de imagen
    const fileInput = document.getElementById('foto-file-emis');
    const camInput = document.getElementById('foto-cam-emis');
    const preview = document.getElementById('preview-emis');

    function mostrarPreview(file) {
        const reader = new FileReader();
        reader.onload = e => { preview.src = e.target.result; preview.classList.remove('hidden'); };
        reader.readAsDataURL(file);
    }

    fileInput.addEventListener('change', () => { if (fileInput.files[0]) mostrarPreview(fileInput.files[0]); });
    camInput.addEventListener('change', () => { if (camInput.files[0]) mostrarPreview(camInput.files[0]); });

    document.getElementById('form-emisiones').addEventListener('submit', async (e) => {
        e.preventDefault();
        const temp = parseFloat(document.getElementById('emis-temp').value);
        const o2 = parseFloat(document.getElementById('emis-o2').value);
        const so2 = parseFloat(document.getElementById('emis-so2').value);
        const archivo = fileInput.files[0] || camInput.files[0];
        let foto_url = null;

        if (archivo) {
            const fileName = `emisiones/${Date.now()}_${archivo.name}`;
            const { error: uploadError } = await supabase.storage.from('biblioteca').upload(fileName, archivo);
            if (uploadError) return alert('Error al subir imagen: ' + uploadError.message);
            foto_url = fileName;
        }

        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('emisiones_so2').insert([{
            temperatura: temp,
            porcentaje_o2: o2,
            ppm_so2: so2,
            foto_url,
            registrado_por: user.id,
            fecha_registro: new Date().toISOString().split('T')[0]
        }]);

        if (error) return alert('Error: ' + error.message);
        alert('Registro guardado.');
        document.getElementById('form-emisiones').reset();
        preview.classList.add('hidden');
        cargarListaEmisiones();
    });

    await cargarListaEmisiones();
}

async function cargarListaEmisiones() {
    const container = document.getElementById('lista-emisiones');
    const { data, error } = await supabase.from('emisiones_so2').select('*').order('fecha_registro', { ascending: false }).limit(10);
    if (error) {
        container.innerHTML = '<p class="text-red-500">Error.</p>';
        return;
    }
    if (!data.length) {
        container.innerHTML = '<p class="text-slate-400">Sin registros.</p>';
        return;
    }
    container.innerHTML = data.map(r => `
        <div class="border-l-4 border-blue-500 bg-slate-800 p-3 rounded-r">
            <div class="flex justify-between text-xs text-slate-400 mb-1">
                <span class="font-semibold text-white">${r.fecha_registro}</span>
                <span>T:${r.temperatura}°C, O₂:${r.porcentaje_o2}%, SO₂:${r.ppm_so2}ppm</span>
            </div>
            ${r.foto_url ? `<img src="${supabase.storage.from('biblioteca').getPublicUrl(r.foto_url).data.publicUrl}" class="mt-2 max-h-24 rounded">` : ''}
        </div>
    `).join('');
}