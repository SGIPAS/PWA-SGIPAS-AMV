// ocp Vista de Recepción de Muestras (Laboratorio)
import { supabase } from '../../supabase-client.js';
import { escapeHtml } from '../../utils-storage.js';
import { EscanerQR } from './scanner.js';
import { mapearNombresUsuarios, formatearFechaHora } from '../operaciones/utils.js';

let escaner = null;

export async function renderizarRecepcionMuestras(contenedor, rol) {
    contenedor.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- COLUMNA IZQUIERDA: ESCANER -->
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h2 class="text-xl font-bold text-white mb-4">Recepción de Muestra</h2>
                <p class="text-slate-400 text-sm mb-4">Escanee el código QR para verificar los datos.</p>

                <div class="flex gap-2 mb-4">
                    <input type="text" id="recepcion-qr" readonly placeholder="Esperando escaneo..."
                        class="w-full bg-slate-800 border border-slate-700 rounded p-3 text-white font-mono text-xl text-center">
                    <button type="button" id="btn-escanear-rec" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-bold text-lg">
                        📷
                    </button>
                </div>
                
                <div id="contenedor-escaner-rec" class="hidden w-full max-w-sm mx-auto overflow-hidden rounded-lg border-2 border-blue-500 mb-4"></div>
                
                <div id="detalle-muestra" class="hidden bg-slate-800 p-4 rounded border border-slate-600 mt-4">
                    <!-- Detalle de la muestra escaneada -->
                </div>
            </div>

            <!-- COLUMNA DERECHA: PENDIENTES E HISTORIAL -->
            <div class="bg-slate-900 p-4 rounded border border-slate-700 flex flex-col gap-6">
                <!-- SECCIÓN 1: COLA DE PENDIENTES -->
                <div>
                    <h2 class="text-lg font-bold text-white mb-3">Cola de Recepción (Pendientes)</h2>
                    <div id="lista-muestras-pendientes" class="space-y-2 max-h-64 overflow-y-auto pr-1">
                        <p class="text-slate-400 animate-pulse">Cargando...</p>
                    </div>
                </div>

                <!-- SECCIÓN 2: HISTORIAL PROCESADO -->
                <div>
                    <h2 class="text-lg font-bold text-white mb-3">Historial (Recibidas / Rechazadas)</h2>
                    <div id="lista-muestras-historial" class="space-y-2 max-h-64 overflow-y-auto pr-1">
                        <p class="text-slate-400 animate-pulse">Cargando...</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    escaner = new EscanerQR('contenedor-escaner-rec');

    document.getElementById('btn-escanear-rec').addEventListener('click', async () => {
        document.getElementById('contenedor-escaner-rec').classList.remove('hidden');
        await escaner.iniciar((textoQR) => buscarMuestra(textoQR));
    });

    async function buscarMuestra(qrTexto) {
        const qr = qrTexto.trim().toUpperCase();
        document.getElementById('recepcion-qr').value = qr;
        document.getElementById('contenedor-escaner-rec').classList.add('hidden');
        
        const detalleDiv = document.getElementById('detalle-muestra');
        detalleDiv.innerHTML = '<p class="text-blue-400 animate-pulse">Buscando...</p>';
        detalleDiv.classList.remove('hidden');

        const { data, error } = await supabase
            .from('muestras')
            .select('*')
            .eq('codigo_qr', qr)
            .eq('estado', 'en_transito')
            .maybeSingle();

        if (error || !data) {
            detalleDiv.innerHTML = `<div class="bg-red-900/50 p-3 rounded text-red-200">⚠️ No encontrada o ya fue recibida.</div>`;
            return;
        }

        const nombres = await mapearNombresUsuarios([data], 'operador_id');

        detalleDiv.innerHTML = `
            <h3 class="text-lg font-bold text-white mb-2">${escapeHtml(data.alias)} <span class="text-sm font-mono text-slate-400">(${escapeHtml(data.codigo_qr)})</span></h3>
            <div class="grid grid-cols-2 gap-2 text-sm text-slate-300 mb-4">
                <p>Punto: <strong>${escapeHtml(data.punto_muestreo)}</strong></p>
                <p>Cantidad: <strong>${data.cantidad_ml} ml</strong></p>
                <p class="col-span-2">Operador: <strong>${escapeHtml(nombres[data.operador_id] || 'N/A')}</strong></p>
            </div>
            <div class="flex gap-2">
                <button id="btn-confirmar-recepcion" class="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded">✅ Recibir</button>
                <button id="btn-rechazar-recepcion" class="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded">❌ Rechazar</button>
            </div>
        `;

        document.getElementById('btn-confirmar-recepcion').addEventListener('click', async () => {
            try {
                await supabase.rpc('recibir_muestra', { p_codigo_qr: data.codigo_qr });
                alert('✅ Recibida.');
                detalleDiv.classList.add('hidden');
                document.getElementById('recepcion-qr').value = '';
                cargarPendientes();
                cargarHistorial();
            } catch (err) { alert(err.message); }
        });

        document.getElementById('btn-rechazar-recepcion').addEventListener('click', async () => {
            const motivo = prompt('Indique el motivo del rechazo (ej. Frasco roto):');
            if (!motivo) return;
            try {
                await supabase.rpc('rechazar_muestra', { p_codigo_qr: data.codigo_qr, p_motivo: motivo });
                alert('❌ Muestra rechazada. El QR ha sido liberado.');
                detalleDiv.classList.add('hidden');
                document.getElementById('recepcion-qr').value = '';
                cargarPendientes();
                cargarHistorial();
            } catch (err) { alert(err.message); }
        });
    }

    // CARGAR PENDIENTES
    async function cargarPendientes() {
        const container = document.getElementById('lista-muestras-pendientes');
        
        const { data, error } = await supabase
            .from('muestras')
            .select('*')
            .eq('estado', 'en_transito')
            .order('fecha_muestreo', { ascending: true });

        if (error || !data.length) {
            container.innerHTML = '<p class="text-slate-400">No hay muestras pendientes en cola.</p>';
            return;
        }

        const nombres = await mapearNombresUsuarios(data, 'operador_id');

        container.innerHTML = data.map(m => `
            <div class="bg-slate-800 p-3 rounded border-l-4 border-yellow-500 flex justify-between items-center">
                <div>
                    <p class="font-bold text-white text-sm">${escapeHtml(m.alias)}</p>
                    <p class="text-xs text-slate-400 font-mono">${escapeHtml(m.codigo_qr)} • ${escapeHtml(m.punto_muestreo)}</p>
                    <p class="text-xs text-slate-500 mt-1">Tomada: ${formatearFechaHora(m.fecha_muestreo)} por 👤 ${escapeHtml(nombres[m.operador_id] || 'N/A')}</p>
                </div>
                <button class="btn-recibir-rapido bg-green-700 hover:bg-green-600 text-white text-xs font-bold px-3 py-1 rounded" data-qr="${m.codigo_qr}">
                    Recibir
                </button>
            </div>
        `).join('');

        container.querySelectorAll('.btn-recibir-rapido').forEach(btn => {
            btn.addEventListener('click', async () => {
                if(!confirm(`¿Confirmar recepción de ${btn.dataset.qr}?`)) return;
                try {
                    await supabase.rpc('recibir_muestra', { p_codigo_qr: btn.dataset.qr });
                    cargarPendientes();
                    cargarHistorial();
                } catch (err) { alert(err.message); }
            });
        });
    }

    // CARGAR HISTORIAL (RECIBIDAS Y RECHAZADAS)
    async function cargarHistorial() {
        const container = document.getElementById('lista-muestras-historial');
        
        // Traemos las que ya fueron procesadas (recibidas o rechazadas), las más recientes primero
        const { data, error } = await supabase
            .from('muestras')
            .select('*')
            .in('estado', ['recibida', 'rechazada'])
            .order('fecha_recepcion', { ascending: false })
            .limit(20);

        if (error || !data.length) {
            container.innerHTML = '<p class="text-slate-400">No hay historial reciente.</p>';
            return;
        }

        const nombresOperadores = await mapearNombresUsuarios(data, 'operador_id');
        const nombresAnalistas = await mapearNombresUsuarios(data, 'analista_id');

        container.innerHTML = data.map(m => {
            const esRecibida = m.estado === 'recibida';
            const colorBorde = esRecibida ? 'border-green-500' : 'border-red-500';
            const badge = esRecibida 
                ? '<span class="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded">✅ Recibida</span>' 
                : '<span class="text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded">❌ Rechazada</span>';
            
            // Si fue rechazada, mostramos el motivo
            const motivoHTML = m.motivo_rechazo 
                ? `<p class="text-xs text-red-400 mt-1">Motivo: ${escapeHtml(m.motivo_rechazo)}</p>` 
                : '';

            return `
                <div class="bg-slate-800 p-3 rounded border-l-4 ${colorBorde}">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="font-bold text-white text-sm">${escapeHtml(m.alias)}</p>
                            <p class="text-xs text-slate-400 font-mono mt-0.5">${escapeHtml(m.codigo_qr)} • ${escapeHtml(m.punto_muestreo)}</p>
                        </div>
                        ${badge}
                    </div>
                    <div class="text-xs text-slate-500 mt-2">
                        <p>Muestreo: ${formatearFechaHora(m.fecha_muestreo)} (por 👤 ${escapeHtml(nombresOperadores[m.operador_id] || 'N/A')})</p>
                        <p>Recepción: ${formatearFechaHora(m.fecha_recepcion)} (por 👤 ${escapeHtml(nombresAnalistas[m.analista_id] || 'N/A')})</p>
                        ${motivoHTML}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Inicializar ambas listas
    await cargarPendientes();
    await cargarHistorial();
}
