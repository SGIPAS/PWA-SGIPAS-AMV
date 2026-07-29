// ocp Módulo de Inventario y Despachos (ajustado)
import { supabase } from '../../supabase-client.js';

export async function renderizarInventario(contenedor, rol) {
    contenedor.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Nuevo Movimiento</h3>
                <form id="form-inventario" class="space-y-4">
                    <div>
                        <label class="block text-slate-400 text-sm">Tipo de Movimiento</label>
                        <select id="tipo-movimiento" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                            <option value="recepcion_solido">Recepción Azufre Sólido</option>
                            <option value="recepcion_liquido">Recepción Azufre Líquido</option>
                            <option value="despacho_sulfato">Despacho a Planta de Sulfato</option>
                            <option value="despacho_cisterna">Despacho a Cisterna</option>
                        </select>
                    </div>
                    <div id="campos-comunes" class="space-y-4">
                        <div>
                            <label class="block text-slate-400 text-sm">Fecha y Hora</label>
                            <input type="datetime-local" id="fecha-movimiento" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
                        </div>
                        <!-- Placa y Proveedor ya no se usan en recepción; los ocultamos siempre -->
                        <div id="grupo-placa" class="hidden">
                            <label class="block text-slate-400 text-sm">Placa del Vehículo</label>
                            <input type="text" id="placa" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white uppercase">
                        </div>
                        <div id="grupo-proveedor" class="hidden">
                            <label class="block text-slate-400 text-sm">Proveedor / Cliente</label>
                            <input type="text" id="proveedor" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                        </div>
                        <div id="grupo-peso" class="hidden">
                            <label class="block text-slate-400 text-sm">Peso Neto (ton)</label>
                            <input type="number" step="0.01" id="peso-neto" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                        </div>
                        <div id="grupo-acidez" class="hidden">
                            <label class="block text-slate-400 text-sm">Acidez (%)</label>
                            <input type="number" step="0.01" id="acidez" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                        </div>
                        <div id="grupo-toneladas" class="hidden">
                            <label class="block text-slate-400 text-sm">Toneladas Despachadas</label>
                            <input type="number" step="0.01" id="toneladas" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                        </div>
                        <div id="grupo-procedencia" class="hidden">
                            <label class="block text-slate-400 text-sm">Procedencia</label>
                            <input type="text" id="procedencia" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                        </div>
                        <div id="grupo-certificado" class="hidden">
                            <label class="flex items-center text-slate-300">
                                <input type="checkbox" id="certificado" class="h-4 w-4 text-blue-600 bg-slate-700 border-slate-600 rounded">
                                <span class="ml-2">Cuenta con certificado de calidad</span>
                            </label>
                            <!-- Campos adicionales del certificado -->
                            <div id="campos-certificado" class="hidden mt-3 pl-4 border-l-2 border-slate-600 space-y-2">
                                <div>
                                    <label class="block text-slate-400 text-sm">Concentración (%)</label>
                                    <input type="number" step="0.01" id="cert-conc" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                                </div>
                                <div>
                                    <label class="block text-slate-400 text-sm">NTU</label>
                                    <input type="number" step="0.01" id="cert-ntu" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                                </div>
                                <div>
                                    <label class="block text-slate-400 text-sm">Fe (ppm)</label>
                                    <input type="number" step="0.01" id="cert-fe" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                                </div>
                            </div>
                        </div>
                        <div id="grupo-area-despacho" class="hidden">
                            <label class="block text-slate-400 text-sm">Área de Despacho</label>
                            <select id="area-despacho" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                                <option value="">Seleccione...</option>
                                <option value="310">310</option>
                                <option value="120">120</option>
                            </select>
                        </div>
                        <div id="grupo-num-cisternas" class="hidden">
                            <label class="block text-slate-400 text-sm">Número de Cisternas</label>
                            <input type="number" id="num-cisternas" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                        </div>
                    </div>
                    <div class="flex space-x-4">
                        <label class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-4 rounded cursor-pointer">
                            📁 Subir
                            <input type="file" id="foto-file" accept="image/*" class="hidden">
                        </label>
                        <label class="flex-1 bg-green-600 hover:bg-green-700 text-white text-center py-2 px-4 rounded cursor-pointer">
                            📷 Tomar
                            <input type="file" id="foto-cam" accept="image/*" capture="environment" class="hidden">
                        </label>
                    </div>
                    <img id="preview-foto" class="mt-2 max-h-32 rounded hidden">
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">Registrar</button>
                </form>
            </div>
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Últimos Movimientos</h3>
                <div id="lista-inventario" class="space-y-3 max-h-96 overflow-y-auto">
                    <p class="text-slate-400 animate-pulse">Cargando...</p>
                </div>
            </div>
        </div>
    `;

    // Mostrar/ocultar campos según tipo de movimiento
    const tipoSelect = document.getElementById('tipo-movimiento');
    function actualizarCampos() {
        const tipo = tipoSelect.value;
        // Ocultar todos los grupos dinámicos
        ['grupo-placa','grupo-proveedor','grupo-peso','grupo-acidez','grupo-toneladas','grupo-procedencia','grupo-certificado','grupo-area-despacho','grupo-num-cisternas'].forEach(id => {
            document.getElementById(id)?.classList.add('hidden');
        });
        // Mostrar según tipo
        switch (tipo) {
            case 'recepcion_solido':
            case 'recepcion_liquido':
                // Ya no se muestran placa ni proveedor
                mostrar('grupo-peso'); 
                mostrar('grupo-acidez');
                break;
            case 'despacho_sulfato':
                mostrar('grupo-toneladas'); 
                mostrar('grupo-procedencia'); 
                mostrar('grupo-certificado');
                break;
            case 'despacho_cisterna':
                mostrar('grupo-area-despacho'); 
                mostrar('grupo-toneladas'); 
                mostrar('grupo-procedencia'); 
                mostrar('grupo-certificado'); 
                mostrar('grupo-num-cisternas');
                break;
        }
        // Asegurar que los campos de certificado se oculten si el checkbox no está marcado
        document.getElementById('campos-certificado')?.classList.add('hidden');
        document.getElementById('certificado')?.checked && toggleCamposCertificado();
    }
    function mostrar(id) { document.getElementById(id)?.classList.remove('hidden'); }

    // Evento para mostrar/ocultar campos del certificado
    function toggleCamposCertificado() {
        const chk = document.getElementById('certificado');
        const campos = document.getElementById('campos-certificado');
        if (chk && campos) {
            campos.classList.toggle('hidden', !chk.checked);
        }
    }
    document.getElementById('certificado')?.addEventListener('change', toggleCamposCertificado);

    tipoSelect.addEventListener('change', actualizarCampos);
    actualizarCampos();

    // Previsualización de imagen
    const fileInput = document.getElementById('foto-file');
    const camInput = document.getElementById('foto-cam');
    const preview = document.getElementById('preview-foto');
    function mostrarPreview(file) {
        const reader = new FileReader();
        reader.onload = e => { preview.src = e.target.result; preview.classList.remove('hidden'); };
        reader.readAsDataURL(file);
    }
    fileInput.addEventListener('change', () => { if (fileInput.files[0]) mostrarPreview(fileInput.files[0]); });
    camInput.addEventListener('change', () => { if (camInput.files[0]) mostrarPreview(camInput.files[0]); });

    // Envío del formulario
    document.getElementById('form-inventario').addEventListener('submit', async (e) => {
        e.preventDefault();
        const tipo = tipoSelect.value;
        const fecha = document.getElementById('fecha-movimiento').value;
        const pesoNeto = parseFloat(document.getElementById('peso-neto')?.value) || null;
        const acidez = parseFloat(document.getElementById('acidez')?.value) || null;
        const toneladas = parseFloat(document.getElementById('toneladas')?.value) || null;
        const procedencia = document.getElementById('procedencia')?.value.trim();
        const area = document.getElementById('area-despacho')?.value;
        const numCist = parseInt(document.getElementById('num-cisternas')?.value) || null;
        const certificado = document.getElementById('certificado')?.checked || false;

        // Construir observaciones con datos del certificado si aplica
        let observaciones = '';
        if (certificado) {
            const conc = document.getElementById('cert-conc')?.value;
            const ntu = document.getElementById('cert-ntu')?.value;
            const fe = document.getElementById('cert-fe')?.value;
            observaciones = `Cert: Conc=${conc ?? '--'}%, NTU=${ntu ?? '--'}, Fe=${fe ?? '--'} ppm`;
        }

        const archivo = fileInput.files[0] || camInput.files[0];
        let foto_url = null;

        if (archivo) {
            const fileName = `inventario/${Date.now()}_${archivo.name}`;
            const { error: uploadError } = await supabase.storage.from('biblioteca').upload(fileName, archivo);
            if (uploadError) return alert('Error al subir imagen: ' + uploadError.message);
            foto_url = fileName;
        }

        const { data: { user } } = await supabase.auth.getUser();
        const payload = {
            tipo_movimiento: tipo,
            fecha_movimiento: new Date(fecha).toISOString(),
            placa_vehiculo: null,      // ya no se usa
            proveedor_cliente: null,   // ya no se usa
            peso_neto: pesoNeto,
            acidez: acidez,
            toneladas_despachadas: toneladas,
            procedencia: procedencia,
            certificado_calidad: certificado,
            area_despacho: area,
            num_cisternas: numCist,
            foto_url: foto_url,
            observaciones: observaciones || null,
            registrado_por: user.id
        };

        const { error } = await supabase.from('inventario_movimientos').insert([payload]);
        if (error) return alert('Error: ' + error.message);
        alert('Movimiento registrado.');
        document.getElementById('form-inventario').reset();
        preview.classList.add('hidden');
        cargarListaInventario();
    });

    await cargarListaInventario();
}

async function cargarListaInventario() {
    const container = document.getElementById('lista-inventario');
    const { data, error } = await supabase.from('inventario_movimientos').select('*').order('fecha_movimiento', { ascending: false }).limit(10);
    if (error) { container.innerHTML = `<p class="text-red-500">Error.</p>`; return; }
    if (!data.length) { container.innerHTML = '<p class="text-slate-400">Sin movimientos.</p>'; return; }

    container.innerHTML = data.map(m => `
        <div class="border-l-4 border-blue-500 bg-slate-800 p-3 rounded-r">
            <div class="flex justify-between text-xs text-slate-400 mb-1">
                <span class="font-semibold text-white">${m.tipo_movimiento.replace(/_/g, ' ')}</span>
                <span>${new Date(m.fecha_movimiento).toLocaleString()}</span>
            </div>
            <p class="text-sm text-slate-300">Peso: ${m.peso_neto ?? m.toneladas_despachadas ?? '-'} ton | Acidez: ${m.acidez ?? '-'}%</p>
            ${m.observaciones ? `<p class="text-xs text-slate-400">${m.observaciones}</p>` : ''}
            ${m.foto_url ? `<img src="${supabase.storage.from('biblioteca').getPublicUrl(m.foto_url).data.publicUrl}" class="mt-2 max-h-24 rounded">` : ''}
        </div>
    `).join('');
}