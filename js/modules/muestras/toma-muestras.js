// ocp Vista de Toma de Muestras (Operaciones)
import { supabase } from '../../supabase-client.js';
import { escapeHtml } from '../../utils-storage.js';
import { EscanerQR } from './scanner.js';

let escaner = null;

export async function renderizarTomaMuestras(contenedor) {
    contenedor.innerHTML = `
        <div class="bg-slate-900 p-6 rounded border border-slate-700 max-w-2xl mx-auto">
            <h2 class="text-2xl font-bold text-white mb-2">Toma de Muestras</h2>
            <p class="text-slate-400 mb-6">Escanee el frasco, registre los datos y envíelo al laboratorio.</p>

            <form id="form-muestra" class="space-y-4">
                <div>
                    <label class="block text-slate-400 text-sm mb-1">Código QR del Frasco *</label>
                    <div class="flex gap-2">
                        <input type="text" id="muestra-qr" required readonly placeholder="Escanee el código aquí..."
                            class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono text-lg">
                        <button type="button" id="btn-escanear" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold">
                            📷 Escanear
                        </button>
                    </div>
                </div>

                <div id="contenedor-escaner" class="hidden w-full max-w-sm mx-auto overflow-hidden rounded-lg border-2 border-blue-500"></div>

                <div>
                    <label class="block text-slate-400 text-sm mb-1">Punto de Muestreo *</label>
                    <select id="muestra-punto" required class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                        <option value="">Seleccione el origen...</option>
                        <option value="LINEA-1201">Línea de Ácido (LINEA-1201)</option>
                        <option value="TQ-3101">Tanque 3101</option>
                        <option value="TQ-3102">Tanque 3102</option>
                        <option value="TQ-3103">Tanque 3103</option>
                        <option value="TQ-3104">Tanque 3104</option>
                        <option value="CISTERNA">Cisterna CAT / Despacho</option>
                    </select>
                </div>

                <div>
                    <label class="block text-slate-400 text-sm mb-1">Propósito *</label>
                    <select id="muestra-proposito" required class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                        <option value="analisis_linea">Análisis de Línea</option>
                        <option value="certificacion_tanque">Certificación de Tanque</option>
                        <option value="despacho_inicial">Despacho - Inicial (Testigo)</option>
                        <option value="despacho_final">Despacho - Final (Calidad)</option>
                        <option value="muestra_cliente">Muestra para Cliente</option>
                    </select>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Cantidad (ml) *</label>
                        <input type="number" id="muestra-cantidad" required min="10" step="10" value="250"
                            class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Observaciones</label>
                        <input type="text" id="muestra-obs" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                    </div>
                </div>

                <button type="submit" id="btn-guardar-muestra" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded text-lg mt-4">
                    Registrar y Enviar a Laboratorio
                </button>
            </form>
        </div>
    `;

    escaner = new EscanerQR('contenedor-escaner');

    document.getElementById('btn-escanear').addEventListener('click', async () => {
        const divEscaner = document.getElementById('contenedor-escaner');
        divEscaner.classList.remove('hidden');
        
        await escaner.iniciar((textoQR) => {
            document.getElementById('muestra-qr').value = textoQR;
            divEscaner.classList.add('hidden');
        });
    });

    document.getElementById('form-muestra').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-guardar-muestra');
        btn.disabled = true;
        btn.textContent = 'Guardando...';

        const qr = document.getElementById('muestra-qr').value.trim();
        const punto = document.getElementById('muestra-punto').value;
        const proposito = document.getElementById('muestra-proposito').value;
        const cantidad = parseInt(document.getElementById('muestra-cantidad').value);
        const obs = document.getElementById('muestra-obs').value.trim() || null;

        try {
            const { data, error } = await supabase.rpc('registrar_muestra', {
                p_codigo_qr: qr,
                p_punto: punto,
                p_proposito: proposito,
                p_cantidad: cantidad,
                p_observaciones: obs
            });

            if (error) throw error;
            
            alert('✅ Muestra registrada. Llévela al laboratorio.');
            document.getElementById('form-muestra').reset();
            
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Registrar y Enviar a Laboratorio';
        }
    });
}