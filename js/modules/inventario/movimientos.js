// ocp Submódulo de Movimientos – recepción de azufre y despacho de ácido (con certificación automática)
import { supabase } from '../../supabase-client.js';

export async function renderizarMovimientos(contenedor) {
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
                    <div id="campos-dinamicos" class="space-y-4"></div>
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
                <div id="lista-movimientos" class="space-y-3 max-h-96 overflow-y-auto">
                    <p class="text-slate-400 animate-pulse">Cargando...</p>
                </div>
            </div>
        </div>
    `;

    const tipoSelect = document.getElementById('tipo-movimiento');
    const camposDinamicos = document.getElementById('campos-dinamicos');

    function actualizarCampos() {
        const tipo = tipoSelect.value;
        let html = `
            <div>
                <label class="block text-slate-400 text-sm">Fecha y Hora</label>
                <input type="datetime-local" id="fecha-movimiento" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
            </div>`;

        if (tipo.startsWith('recepcion')) {
            html += `
            <div>
                <label class="block text-slate-400 text-sm">Peso Neto (ton)</label>
                <input type="number" step="0.01" id="peso-neto" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
            </div>
            <div>
                <label class="block text-slate-400 text-sm">Acidez (%)</label>
                <input type="number" step="0.01" id="acidez" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
            </div>`;
        } else {
            html += `
            <div>
                <label class="block text-slate-400 text-sm">Toneladas Despachadas</label>
                <input type="number" step="0.01" id="toneladas" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
            </div>
            <div>
                <label class="block text-slate-400 text-sm">Tanque de Origen</label>
                <select id="tanque-origen" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
                    <option value="">Seleccione...</option>
                    <option value="TQ-3101">TQ-3101</option>
                    <option value="TQ-3102">TQ-3102</option>
                    <option value="TQ-3103">TQ-3103</option>
                    <option value="TQ-3104">TQ-3104</option>
                </select>
            </div>
            <!-- ocp Bloque de certificación automática -->
            <div id="certificacion-auto" class="hidden bg-slate-700 p-3 rounded border border-slate-600 text-sm">
                <p class="text-slate-300 font-semibold mb-1">Certificación de Calidad (automática)</p>
                <div id="cert-detalle" class="text-xs text-slate-400 space-y-1"></div>
            </div>`;
            if (tipo === 'despacho_cisterna') {
                html += `
                <div>
                    <label class="block text-slate-400 text-sm">Área de Despacho</label>
                    <select id="area-despacho" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                        <option value="">Seleccione...</option>
                        <option value="310">310</option>
                        <option value="120">120</option>
                    </select>
                </div>
                <div>
                    <label class="block text-slate-400 text-sm">Número de Cisternas</label>
                    <input type="number" id="num-cisternas" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                </div>`;
            }
        }
        camposDinamicos.innerHTML = html;

        // Evento para buscar certificación al cambiar el tanque
        const tanqueSelect = document.getElementById('tanque-origen');
        const certDiv = document.getElementById('certificacion-auto');
        const certDetalle = document.getElementById('cert-detalle');

        if (tanqueSelect) {
            tanqueSelect.addEventListener('change', async () => {
                const tanque = tanqueSelect.value;
                if (!tanque) {
                    certDiv.classList.add('hidden');
                    return;
                }

                // Buscar la última certificación vigente para ese tanque
                const { data: certs } = await supabase
                    .from('certificaciones_acido')
                    .select('*')
                    .eq('tanque', tanque)
                    .gte('fecha_vigencia', new Date().toISOString().split('T')[0])
                    .order('fecha_analisis', { ascending: false })
                    .limit(1);

                if (certs && certs.length > 0) {
                    const c = certs[0];
                    certDetalle.innerHTML = `
                        <p>Concentración: <span class="font-bold text-white">${c.concentracion}%</span></p>
                        <p>NTU: <span class="font-bold text-white">${c.ntu ?? '--'}</span></p>
                        <p>Fe: <span class="font-bold text-white">${c.ppm_fe ?? '--'} ppm</span></p>
                        <p>Vence: ${new Date(c.fecha_vigencia).toLocaleDateString('es-VE')}</p>
                    `;
                    certDiv.classList.remove('hidden');
                    // Guardar datos para el payload
                    window.certificacionActual = c;
                } else {
                    certDetalle.innerHTML = '<p class="text-red-400">Sin certificación vigente para este tanque</p>';
                    certDiv.classList.remove('hidden');
                    window.certificacionActual = null;
                }
            });
        }
    }

    tipoSelect.addEventListener('change', actualizarCampos);
    actualizarCampos();

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

    document.getElementById('form-inventario').addEventListener('submit', async (e) => {
        e.preventDefault();
        const tipo = tipoSelect.value;
        const fecha = document.getElementById('fecha-movimiento').value;
        if (!fecha) return alert('Ingrese la fecha y hora.');

        const payload = {
            tipo_movimiento: tipo,
            fecha_movimiento: new Date(fecha).toISOString(),
            registrado_por: (await supabase.auth.getUser()).data.user.id
        };

        if (tipo.startsWith('recepcion')) {
            payload.peso_neto = parseFloat(document.getElementById('peso-neto').value) || null;
            payload.acidez = parseFloat(document.getElementById('acidez')?.value) || null;
        } else {
            payload.toneladas_despachadas = parseFloat(document.getElementById('toneladas').value) || null;
            payload.tanque_origen = document.getElementById('tanque-origen')?.value;
            if (!payload.tanque_origen) return alert('Seleccione el tanque de origen.');

            // Incluir certificación automáticamente si existe
            if (window.certificacionActual) {
                const cert = window.certificacionActual;
                payload.observaciones = `Cert: Conc=${cert.concentracion}%, NTU=${cert.ntu ?? '--'}, Fe=${cert.ppm_fe ?? '--'} ppm, Vence=${cert.fecha_vigencia}`;
            }

            if (tipo === 'despacho_cisterna') {
                payload.area_despacho = document.getElementById('area-despacho')?.value;
                payload.num_cisternas = parseInt(document.getElementById('num-cisternas')?.value) || null;
            }
        }

        const archivo = fileInput.files[0] || camInput.files[0];
        if (archivo) {
            const fileName = `inventario/${Date.now()}_${archivo.name}`;
            const { error: uploadError } = await supabase.storage.from('biblioteca').upload(fileName, archivo);
            if (uploadError) return alert('Error al subir imagen: ' + uploadError.message);
            payload.foto_url = fileName;
        }

        const { error } = await supabase.from('inventario_movimientos').insert([payload]);
        if (error) return alert('Error: ' + error.message);
        alert('Movimiento registrado.');
        document.getElementById('form-inventario').reset();
        actualizarCampos();
        preview.classList.add('hidden');
        cargarListaMovimientos();
    });

    async function cargarListaMovimientos() {
        const container = document.getElementById('lista-movimientos');
        const { data, error } = await supabase.from('inventario_movimientos').select('*').order('fecha_movimiento', { ascending: false }).limit(10);
        if (error) { container.innerHTML = '<p class="text-red-500">Error.</p>'; return; }
        if (!data.length) { container.innerHTML = '<p class="text-slate-400">Sin movimientos.</p>'; return; }
        container.innerHTML = data.map(m => `
            <div class="border-l-4 border-blue-500 bg-slate-800 p-3 rounded-r">
                <div class="flex justify-between text-xs text-slate-400 mb-1">
                    <span class="font-semibold text-white">${m.tipo_movimiento.replace(/_/g, ' ')}</span>
                    <span>${new Date(m.fecha_movimiento).toLocaleString()}</span>
                </div>
                <p class="text-sm text-slate-300">Peso: ${m.peso_neto ?? m.toneladas_despachadas ?? '-'} ton | Acidez: ${m.acidez ?? '-'}%</p>
                ${m.tanque_origen ? `<p class="text-xs text-slate-400">Tanque origen: ${m.tanque_origen}</p>` : ''}
                ${m.observaciones ? `<p class="text-xs text-slate-400">${m.observaciones}</p>` : ''}
                ${m.foto_url ? `<img src="${supabase.storage.from('biblioteca').getPublicUrl(m.foto_url).data.publicUrl}" class="mt-2 max-h-24 rounded">` : ''}
            </div>
        `).join('');
    }

    await cargarListaMovimientos();
}
