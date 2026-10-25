// ocp Vista de Recepción de Muestras (Laboratorio)
import { supabase } from '../../supabase-client.js';
import { escapeHtml } from '../../utils-storage.js';
import { EscanerQR } from './scanner.js';
import { mapearNombresUsuarios, formatearFechaHora } from '../operaciones/utils.js';

let escaner = null;

export async function renderizarRecepcionMuestras(contenedor, rol) {
    contenedor.innerHTML = `
        <div class="bg-slate-900 p-6 rounded border border-slate-700 max-w-2xl mx-auto mb-6">
            <h2 class="text-2xl font-bold text-white mb-2">Recepción de Muestras</h2>
            <p class="text-slate-400 mb-6">Escanee el frasco para confirmar que ingresa al laboratorio.</p>

            <div class="flex gap-2 mb-4">
                <input type="text" id="recepcion-qr" readonly placeholder="Escanee el código QR..."
                    class="w-full bg-slate-800 border border-slate-700 rounded p-3 text-white font-mono text-xl text-center">
                <button type="button" id="btn-escanear-rec" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-bold text-lg">
                    📷 Escanear
                </button>
            </div>
            
            <div id="contenedor-escaner-rec" class="hidden w-full max-w-sm mx-auto overflow-hidden rounded-lg border-2 border-blue-500"></div>
            
            <div id="detalle-muestra" class="hidden bg-slate-800 p-4 rounded border border-slate-600 mt-4">
                <!-- Aquí se inyectan los datos de la muestra escaneada -->
            </div>
        </div>

        <div class="bg-slate-900 p-6 rounded border border-slate-700">
            <h3 class="text-lg font-semibold text-white mb-4">Últimas Muestras Recibidas Hoy</h3>
            <div id="lista-muestras-recibidas" class="space-y-2">
                <p class="text-slate-400 animate-pulse">Cargando...</p>
            </div>
        </div>
    `;

    escaner = new EscanerQR('contenedor-escaner-rec');

    // Función para buscar y mostrar la muestra
    async function buscarMuestra(qr) {
        document.getElementById('recepcion-qr').value = qr;
        document.getElementById('contenedor-escaner-rec').classList.add('hidden');
        
        const detalleDiv = document.getElementById('detalle-muestra');
        detalleDiv.innerHTML = '<p class="text-blue-400 animate-pulse">Buscando muestra...</p>';
        detalleDiv.classList.remove('hidden');

        const { data, error } = await supabase
            .from('muestras')
            .select('*, perfiles(nombre_completo)')
            .eq('codigo_qr', qr)
            .eq('estado', 'en_transito')
            .maybeSingle();

        if (error || !data) {
            detalleDiv.innerHTML = `
                <div class="bg-red-900/50 border border-red-700 p-3 rounded text-red-200">
                    ⚠️ No se encontró ninguna muestra EN TRÁNSITO con el código <strong>${escapeHtml(qr)}</strong>.
                </div>
            `;
            return;
        }

        // Mostrar datos y botón de confirmar
        detalleDiv.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <h3 class="text-lg font-bold text-white">Datos de la Muestra</h3>
                <span class="text-xs text-slate-400">Tomada: ${formatearFechaHora(data.fecha_muestreo)}</span>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm text-slate-300 mb-4">
                <p><strong>Punto:</strong> ${escapeHtml(data.punto_muestreo)}</p>
                <p><strong>Propósito:</strong> ${escapeHtml(data.proposito)}</p>
                <p><strong>Cantidad:</strong> ${data.cantidad_ml} ml</p>
                <p><strong>Operador:</strong> ${escapeHtml(data.perfiles?.nombre_completo || 'N/A')}</p>
            </div>
            <button id="btn-confirmar-recepcion" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded text-lg">
                ✅ Confirmar Recepción en Laboratorio
            </button>
        `;

        document.getElementById('btn-confirmar-recepcion').addEventListener('click', async () => {
            const btn = document.getElementById('btn-confirmar-recepcion');
            btn.disabled = true;
            btn.textContent = 'Registrando...';

            try {
                const { error: rpcError } = await supabase.rpc('recibir_muestra', {
                    p_codigo_qr: qr,
                    p_observaciones: null
                });

                if (rpcError) throw rpcError;

                alert('✅ Muestra recibida correctamente.');
                detalleDiv.classList.add('hidden');
                document.getElementById('recepcion-qr').value = '';
                cargarMuestrasRecibidas();

            } catch (err) {
                alert('Error al recibir: ' + err.message);
                btn.disabled = false;
                btn.textContent = '✅ Confirmar Recepción en Laboratorio';
            }
        });
    }

    // Iniciar escáner
    document.getElementById('btn-escanear-rec').addEventListener('click', async () => {
        document.getElementById('contenedor-escaner-rec').classList.remove('hidden');
        await escaner.iniciar((textoQR) => buscarMuestra(textoQR));
    });

    // Historial del día
    async function cargarMuestrasRecibidas() {
        const container = document.getElementById('lista-muestras-recibidas');
        const hoy = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
            .from('muestras')
            .select('*, perfiles(nombre_completo)')
            .eq('estado', 'recibida')
            .gte('fecha_recepcion', hoy)
            .order('fecha_recepcion', { ascending: false });

        if (error || !data.length) {
            container.innerHTML = '<p class="text-slate-400">No hay muestras recibidas hoy.</p>';
            return;
        }

        const nombres = await mapearNombresUsuarios(data, 'analista_id');

        container.innerHTML = data.map(m => `
            <div class="bg-slate-800 p-3 rounded border-l-4 border-green-500 flex justify-between items-center">
                <div>
                    <p class="font-mono text-white">${escapeHtml(m.codigo_qr)} - ${escapeHtml(m.punto_muestreo)}</p>
                    <p class="text-xs text-slate-400">Recibida a las: ${new Date(m.fecha_recepcion).toLocaleTimeString('es-VE')} por 👤 ${escapeHtml(nombres[m.analista_id] || 'N/A')}</p>
                </div>
                <span class="text-xs bg-green-900/50 text-green-300 px-2 py-1 rounded">En Laboratorio</span>
            </div>
        `).join('');
    }

    await cargarMuestrasRecibidas();
}