// ocp Vista de Toma de Muestras (Operaciones)
import { supabase } from '../../supabase-client.js';
import { escapeHtml } from '../../utils-storage.js';
import { EscanerQR } from './scanner.js';
import { mapearNombresUsuarios, formatearFechaHora } from '../operaciones/utils.js';

let escaner = null;

export async function renderizarTomaMuestras(contenedor, rol) {
    contenedor.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- COLUMNA IZQUIERDA: FORMULARIO -->
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h2 class="text-xl font-bold text-white mb-4">Registrar Nueva Muestra</h2>
                <form id="form-muestra" class="space-y-4">
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Código QR (Escaneado) *</label>
                        <div class="flex gap-2">
                            <input type="text" id="muestra-qr" required readonly placeholder="Use la cámara..."
                                class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono text-lg">
                            <button type="button" id="btn-escanear" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold">
                                📷
                            </button>
                        </div>
                    </div>
                    
                    <div id="contenedor-escaner" class="hidden w-full max-w-sm mx-auto overflow-hidden rounded-lg border-2 border-blue-500"></div>

                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Alias / Nombre de la Muestra *</label>
                        <input type="text" id="muestra-alias" required placeholder="Ej: Muestra CAT Certificación"
                            class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-slate-400 text-sm mb-1">Punto *</label>
                            <select id="muestra-punto" required class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                                <option value="LINEA-1201">Línea de Ácido</option>
                                <option value="TQ-3101">Tanque 3101</option>
                                <option value="TQ-3102">Tanque 3102</option>
                                <option value="TQ-3103">Tanque 3103</option>
                                <option value="TQ-3104">Tanque 3104</option>
                                <option value="CISTERNA">Cisterna CAT</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-slate-400 text-sm mb-1">Propósito *</label>
                            <select id="muestra-proposito" required class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                                <option value="analisis_linea">Análisis de Línea</option>
                                <option value="certificacion_tanque">Certificación Tanque</option>
                                <option value="despacho_inicial">Despacho Inicial</option>
                                <option value="despacho_final">Despacho Final</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Cantidad (ml) *</label>
                        <input type="number" id="muestra-cantidad" required min="10" step="10" value="250"
                            class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                    </div>

                    <button type="submit" id="btn-guardar-muestra" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded mt-4">
                        Registrar Muestra
                    </button>
                </form>
            </div>

            <!-- COLUMNA DERECHA: HISTORIAL -->
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h2 class="text-xl font-bold text-white mb-4">Historial Reciente</h2>
                <div id="lista-muestras-operador" class="space-y-2 max-h-[600px] overflow-y-auto">
                    <p class="text-slate-400 animate-pulse">Cargando...</p>
                </div>
            </div>
        </div>
    `;

    escaner = new EscanerQR('contenedor-escaner');

    document.getElementById('btn-escanear').addEventListener('click', async () => {
        document.getElementById('contenedor-escaner').classList.remove('hidden');
        await escaner.iniciar((textoQR) => {
            document.getElementById('muestra-qr').value = textoQR.trim().toUpperCase();
            document.getElementById('contenedor-escaner').classList.add('hidden');
        });
    });

    document.getElementById('form-muestra').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-guardar-muestra');
        btn.disabled = true;
        btn.textContent = 'Guardando...';

        try {
            const { error } = await supabase.rpc('registrar_muestra', {
                p_codigo_qr: document.getElementById('muestra-qr').value,
                p_alias: document.getElementById('muestra-alias').value.trim(),
                p_punto: document.getElementById('muestra-punto').value,
                p_proposito: document.getElementById('muestra-proposito').value,
                p_cantidad: parseInt(document.getElementById('muestra-cantidad').value),
                p_observaciones: null
            });

            if (error) throw error;
            alert('✅ Muestra registrada.');
            document.getElementById('form-muestra').reset();
            cargarHistorial(rol);
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Registrar Muestra';
        }
    });

    async function cargarHistorial(rolActual) {
        const container = document.getElementById('lista-muestras-operador');
        const { data, error } = await supabase
            .from('muestras')
            .select('*')
            .order('fecha_muestreo', { ascending: false })
            .limit(20);

        if (error || !data.length) {
            container.innerHTML = '<p class="text-slate-400">No hay muestras registradas.</p>';
            return;
        }

        const esAdmin = rolActual === 'admin';

        container.innerHTML = data.map(m => {
            let badge = '';
            if (m.estado === 'en_transito') badge = '<span class="text-xs bg-yellow-900 text-yellow-300 px-2 py-0.5 rounded">⏳ En Tránsito</span>';
            else if (m.estado === 'recibida') badge = '<span class="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded">✅ Recibida</span>';
            else if (m.estado === 'rechazada') badge = '<span class="text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded">❌ Rechazada</span>';

            return `
                <div class="bg-slate-800 p-3 rounded border-l-4 border-slate-600">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="font-bold text-white text-sm">${escapeHtml(m.alias)}</p>
                            <p class="text-xs text-slate-400 font-mono mt-0.5">${escapeHtml(m.codigo_qr)} • ${escapeHtml(m.punto_muestreo)}</p>
                        </div>
                        ${badge}
                    </div>
                    <div class="flex justify-between items-center mt-2">
                        <p class="text-xs text-slate-500">${formatearFechaHora(m.fecha_muestreo)}</p>
                        ${esAdmin && m.estado === 'en_transito' ? `<button class="btn-anular text-red-400 hover:text-red-300 text-xs" data-id="${m.id}">🗑️ Anular</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Lógica de anulación simple
        if (esAdmin) {
            container.querySelectorAll('.btn-anular').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.dataset.id;
                    const motivo = prompt('Motivo de anulación (se liberará el frasco):');
                    if (!motivo) return;
                    // Llamamos a la función de rechazar, pero desde admin
                    // Ojo: para que funcione, debemos actualizar el estado a 'rechazada' o 'anulado'
                    await supabase.from('muestras').update({ estado: 'rechazada', motivo_rechazo: 'Anulada por admin: ' + motivo }).eq('id', id);
                    cargarHistorial(rolActual);
                });
            });
        }
    }

    await cargarHistorial(rol);
}
