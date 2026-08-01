// ocp Módulo de Inventario y Despachos – con movimientos, producción diaria y stock
import { supabase } from '../../supabase-client.js';

export async function renderizarInventario(contenedor, rol) {
    contenedor.innerHTML = `
        <div class="mb-6">
            <h1 class="text-3xl font-bold text-slate-100">Inventario y Producción</h1>
            <p class="text-slate-400 mt-1">Recepción de azufre, despacho de ácido y producción diaria.</p>
        </div>

        <div class="border-b border-slate-700 mb-6 bg-slate-900 rounded-t-lg px-2 pt-2">
            <nav class="-mb-px flex space-x-4 overflow-x-auto" id="tab-nav">
                <button data-tab="movimientos" class="tab-btn border-blue-500 text-blue-500 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors">📦 Movimientos</button>
                <button data-tab="produccion" class="tab-btn border-transparent text-slate-400 hover:text-slate-200 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors">🏭 Producción Diaria</button>
            </nav>
        </div>

        <div id="tab-content" class="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-6"></div>
    `;

    const tabs = document.querySelectorAll('.tab-btn');
    const tabContent = document.getElementById('tab-content');

    async function activarPestana(name) {
        tabs.forEach(t => {
            t.classList.remove('border-blue-500', 'text-blue-500');
            t.classList.add('border-transparent', 'text-slate-400');
        });
        const activa = document.querySelector(`[data-tab="${name}"]`);
        if (activa) {
            activa.classList.remove('border-transparent', 'text-slate-400');
            activa.classList.add('border-blue-500', 'text-blue-500');
        }
        switch (name) {
            case 'movimientos': await renderizarMovimientos(tabContent, rol); break;
            case 'produccion': await renderizarProduccion(tabContent); break;
        }
    }

    tabs.forEach(t => t.addEventListener('click', (e) => activarPestana(e.target.dataset.tab)));
    await activarPestana('movimientos');
}

// ==================== MOVIMIENTOS (RECEPCIÓN / DESPACHO) ====================
async function renderizarMovimientos(contenedor, rol) {
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

    // Lógica de campos dinámicos según tipo de movimiento
    const tipoSelect = document.getElementById('tipo-movimiento');
    function actualizarCampos() {
        const tipo = tipoSelect.value;
        ['grupo-placa','grupo-proveedor','grupo-peso','grupo-acidez','grupo-toneladas','grupo-procedencia','grupo-certificado','grupo-area-despacho','grupo-num-cisternas'].forEach(id => {
            document.getElementById(id)?.classList.add('hidden');
        });
        switch (tipo) {
            case 'recepcion_solido':
            case 'recepcion_liquido':
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
        document.getElementById('campos-certificado')?.classList.add('hidden');
        if (document.getElementById('certificado')?.checked) {
            document.getElementById('campos-certificado')?.classList.remove('hidden');
        }
    }
    function mostrar(id) { document.getElementById(id)?.classList.remove('hidden'); }

    document.getElementById('certificado')?.addEventListener('change', function() {
        document.getElementById('campos-certificado')?.classList.toggle('hidden', !this.checked);
    });

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
    fileInput?.addEventListener('change', () => { if (fileInput.files[0]) mostrarPreview(fileInput.files[0]); });
    camInput?.addEventListener('change', () => { if (camInput.files[0]) mostrarPreview(camInput.files[0]); });

    // Envío del formulario de movimientos
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
            peso_neto: pesoNeto,
            acidez: acidez,
            toneladas_despachadas: toneladas,
            procedencia: procedencia,
            certificado_calidad: certificado,
            area_despacho: area,
            num_cisternas: numCist,
            observaciones: observaciones || null,
            foto_url: foto_url,
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
}

// ==================== PRODUCCIÓN DIARIA ====================
async function renderizarProduccion(contenedor) {
    contenedor.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Registrar Producción Diaria</h3>
                <form id="form-produccion" class="space-y-4">
                    <div>
                        <label class="block text-slate-400 text-sm">Fecha</label>
                        <input type="date" id="prod-fecha" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">Toneladas Producidas</label>
                        <input type="number" step="0.001" id="prod-toneladas" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">Guardar Producción</button>
                </form>
            </div>
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Últimos Registros</h3>
                <div id="lista-produccion" class="space-y-2 max-h-96 overflow-y-auto mb-4">
                    <p class="text-slate-400 animate-pulse">Cargando...</p>
                </div>
                <h3 class="text-lg font-semibold text-white mb-2">Resumen de Inventario Actual</h3>
                <div id="resumen-inventario" class="text-sm text-slate-300 space-y-1">
                    <p class="animate-pulse">Calculando...</p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('prod-fecha').value = new Date().toISOString().split('T')[0];

    document.getElementById('form-produccion').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fecha = document.getElementById('prod-fecha').value;
        const toneladas = parseFloat(document.getElementById('prod-toneladas').value);
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from('produccion_diaria').upsert({
            fecha,
            toneladas,
            registrado_por: user.id
        }, { onConflict: 'fecha' });

        if (error) return alert('Error: ' + error.message);
        alert('Producción registrada.');
        document.getElementById('form-produccion').reset();
        document.getElementById('prod-fecha').value = new Date().toISOString().split('T')[0];
        cargarListaProduccion();
        actualizarResumenInventario();
    });

    await cargarListaProduccion();
    await actualizarResumenInventario();
}

async function cargarListaProduccion() {
    const container = document.getElementById('lista-produccion');
    const { data, error } = await supabase.from('produccion_diaria').select('*').order('fecha', { ascending: false }).limit(10);
    if (error) { container.innerHTML = '<p class="text-red-500">Error.</p>'; return; }
    if (!data.length) { container.innerHTML = '<p class="text-slate-400">Sin registros.</p>'; return; }
    container.innerHTML = data.map(p => `
        <div class="bg-slate-800 p-2 rounded text-sm flex justify-between">
            <span>${p.fecha}</span>
            <span class="font-bold text-green-400">${p.toneladas.toFixed(3)} ton</span>
        </div>
    `).join('');
}

async function actualizarResumenInventario() {
    const container = document.getElementById('resumen-inventario');
    const { data: produccion } = await supabase.from('produccion_diaria').select('toneladas');
    const totalProducido = produccion?.reduce((s, p) => s + p.toneladas, 0) || 0;

    const { data: movimientos } = await supabase.from('inventario_movimientos').select('tipo_movimiento, peso_neto, toneladas_despachadas');
    let totalDespachado = 0;
    movimientos?.forEach(m => {
        if (m.tipo_movimiento === 'despacho_sulfato' || m.tipo_movimiento === 'despacho_cisterna') {
            totalDespachado += (m.toneladas_despachadas || 0);
        }
    });

    const stockActual = totalProducido - totalDespachado;
    container.innerHTML = `
        <p>Producción Total: <span class="font-bold">${totalProducido.toFixed(3)} ton</span></p>
        <p>Despachado Total: <span class="font-bold text-yellow-400">${totalDespachado.toFixed(3)} ton</span></p>
        <p class="text-lg font-bold text-blue-400">Stock Actual Estimado: ${stockActual.toFixed(3)} ton</p>
    `;
}
