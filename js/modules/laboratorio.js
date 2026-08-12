// ocp Módulo de Laboratorio – certificaciones de ácido, azufre y disposición final
import { supabase } from '../supabase-client.js';

let currentUserRole = null;

export async function cargarLaboratorio() {
    const contenedor = document.getElementById('app-content');
    if (!contenedor) return;

    const { data: { user } } = await supabase.auth.getUser();
    currentUserRole = user?.user_metadata?.rol;

    contenedor.innerHTML = `
        <div class="mb-6">
            <h1 class="text-3xl font-bold text-slate-100">Laboratorio</h1>
            <p class="text-slate-400 mt-1">Certificaciones de calidad y control de disposición final.</p>
        </div>
        <div class="border-b border-slate-700 mb-6 bg-slate-900 rounded-t-lg px-2 pt-2">
            <nav class="-mb-px flex space-x-4 overflow-x-auto" id="tab-nav">
                <button data-tab="cert-acido" class="tab-btn border-blue-500 text-blue-500 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors">🧪 Cert. Ácido</button>
                <button data-tab="cert-azufre" class="tab-btn border-transparent text-slate-400 hover:text-slate-200 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors">🧴 Cert. Azufre</button>
                <button data-tab="disp-acido" class="tab-btn border-transparent text-slate-400 hover:text-slate-200 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors">♻️ Disposición Ácido</button>
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
            case 'cert-acido': await renderizarCertAcido(tabContent); break;
            case 'cert-azufre': await renderizarCertAzufre(tabContent); break;
            case 'disp-acido': await renderizarDispAcido(tabContent); break;
        }
    }

    tabs.forEach(t => t.addEventListener('click', (e) => activarPestana(e.target.dataset.tab)));
    await activarPestana('cert-acido');
}

// ==================== CERTIFICACIÓN DE ÁCIDO ====================
async function renderizarCertAcido(contenedor) {
    const puedeRegistrar = ['admin', 'analista'].includes(currentUserRole);
    contenedor.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-slate-900 p-4 rounded border border-slate-700 lg:col-span-1">
                <h3 class="text-lg font-semibold text-white mb-4">Certificación de Ácido (Tanques + Línea)</h3>
                ${puedeRegistrar ? `
                <form id="form-cert-acido" class="space-y-4">
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead class="text-slate-400 border-b border-slate-700">
                                <tr>
                                    <th class="py-2 px-2 text-left">Punto</th>
                                    <th class="py-2 px-2 text-right">Concentración (%)</th>
                                    <th class="py-2 px-2 text-right">NTU</th>
                                    <th class="py-2 px-2 text-right">Fe (ppm)</th>
                                </tr>
                            </thead>
                            <tbody id="tabla-cert-acido">
                                ${['TQ-3101','TQ-3102','TQ-3103','TQ-3104','LINEA-1201'].map(punto => `
                                <tr class="border-b border-slate-800">
                                    <td class="py-2 px-2 font-medium text-white">${punto}</td>
                                    <td class="py-2 px-2">
                                        <input type="number" step="any" name="conc-${punto}" class="w-20 bg-slate-800 border border-slate-700 rounded p-1 text-white text-right" placeholder="0.00">
                                    </td>
                                    <td class="py-2 px-2">
                                        <input type="number" step="any" name="ntu-${punto}" class="w-20 bg-slate-800 border border-slate-700 rounded p-1 text-white text-right" placeholder="0.00">
                                    </td>
                                    <td class="py-2 px-2">
                                        <input type="number" step="any" name="fe-${punto}" class="w-20 bg-slate-800 border border-slate-700 rounded p-1 text-white text-right" placeholder="0.00">
                                    </td>
                                </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    <p class="text-xs text-slate-400">Solo se guardarán los puntos con concentración ingresada.</p>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">Guardar Certificaciones</button>
                </form>` : '<p class="text-slate-400 italic">Solo analistas pueden registrar.</p>'}
            </div>
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Últimas Certificaciones</h3>
                <div id="lista-cert-acido" class="space-y-2 max-h-96 overflow-y-auto">
                    <p class="text-slate-400 animate-pulse">Cargando...</p>
                </div>
            </div>
        </div>
    `;

    if (puedeRegistrar) {
        document.getElementById('form-cert-acido').addEventListener('submit', async (e) => {
            e.preventDefault();
            const { data: { user } } = await supabase.auth.getUser();
            const fechaAnalisis = new Date().toISOString().split('T')[0];
            const fechaVigencia = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            const puntos = ['TQ-3101','TQ-3102','TQ-3103','TQ-3104','LINEA-1201'];
            const inserciones = [];

            for (const punto of puntos) {
                const conc = parseFloat(document.querySelector(`[name="conc-${punto}"]`)?.value);
                const ntu = parseFloat(document.querySelector(`[name="ntu-${punto}"]`)?.value) || null;
                const fe = parseFloat(document.querySelector(`[name="fe-${punto}"]`)?.value) || null;
                if (!isNaN(conc)) {
                    inserciones.push({
                        tanque: punto,
                        concentracion: conc,
                        ntu,
                        ppm_fe: fe,
                        fecha_analisis: fechaAnalisis,
                        fecha_vigencia: fechaVigencia,
                        registrado_por: user.id
                    });
                }
            }

            if (inserciones.length === 0) {
                alert('Ingrese al menos una concentración.');
                return;
            }

            const { error } = await supabase.from('certificaciones_acido').insert(inserciones);
            if (error) {
                alert('Error al guardar: ' + error.message);
                return;
            }

            alert('Certificaciones guardadas correctamente.');
            document.getElementById('form-cert-acido').reset();
            cargarListaCertAcido();

            // --- Notificación push ---
            try {
                await supabase.functions.invoke('notificar-certificacion', {
                    body: {
                        tipo: 'acido',
                        puntos: inserciones.map(i => i.tanque)
                    }
                });
            } catch (notifErr) {
                console.warn('Notificación no enviada:', notifErr);
            }
        });
    }

    await cargarListaCertAcido();
}

async function cargarListaCertAcido() {
    const container = document.getElementById('lista-cert-acido');
    const { data, error } = await supabase.from('certificaciones_acido').select('*').order('fecha_analisis', { ascending: false }).limit(10);
    if (error) { container.innerHTML = '<p class="text-red-500">Error.</p>'; return; }
    if (!data.length) { container.innerHTML = '<p class="text-slate-400">Sin certificaciones.</p>'; return; }
    container.innerHTML = data.map(c => `
        <div class="bg-slate-800 p-2 rounded text-sm">
            <span class="text-slate-400">${c.fecha_analisis} (Vence: ${c.fecha_vigencia})</span>
            <span class="ml-2 font-bold text-white">${c.tanque}</span>
            <span class="ml-2 text-blue-400">${c.concentracion}% | NTU:${c.ntu??'-'} | Fe:${c.ppm_fe??'-'}ppm</span>
        </div>
    `).join('');
}

// ==================== CERTIFICACIÓN DE AZUFRE ====================
async function renderizarCertAzufre(contenedor) {
    const puedeRegistrar = ['admin', 'analista'].includes(currentUserRole);
    const puntosAzufre = ['TQ-4302A','TQ-4302B','TQ-4302C','TQ-4302D','HORNO-AZUFRE'];

    contenedor.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-slate-900 p-4 rounded border border-slate-700 lg:col-span-1">
                <h3 class="text-lg font-semibold text-white mb-4">Certificación de Azufre (Tanques + Horno)</h3>
                ${puedeRegistrar ? `
                <form id="form-cert-azufre" class="space-y-4">
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead class="text-slate-400 border-b border-slate-700">
                                <tr>
                                    <th class="py-2 px-2 text-left">Punto</th>
                                    <th class="py-2 px-2 text-right">Acidez (%)</th>
                                </tr>
                            </thead>
                            <tbody id="tabla-cert-azufre">
                                ${puntosAzufre.map(punto => `
                                <tr class="border-b border-slate-800">
                                    <td class="py-2 px-2 font-medium text-white">${punto}</td>
                                    <td class="py-2 px-2">
                                        <input type="number" step="any" name="acidez-${punto}" class="w-20 bg-slate-800 border border-slate-700 rounded p-1 text-white text-right" placeholder="0.0000">
                                    </td>
                                </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">Impurezas (general)</label>
                        <textarea id="cert-impurezas" rows="2" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"></textarea>
                    </div>
                    <p class="text-xs text-slate-400">Solo se guardarán los puntos con acidez ingresada.</p>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">Guardar Certificaciones</button>
                </form>` : '<p class="text-slate-400 italic">Solo analistas pueden registrar.</p>'}
            </div>
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Últimas Certificaciones</h3>
                <div id="lista-cert-azufre" class="space-y-2 max-h-96 overflow-y-auto">
                    <p class="text-slate-400 animate-pulse">Cargando...</p>
                </div>
            </div>
        </div>
    `;

    if (puedeRegistrar) {
        document.getElementById('form-cert-azufre').addEventListener('submit', async (e) => {
            e.preventDefault();
            const { data: { user } } = await supabase.auth.getUser();
            const impurezas = document.getElementById('cert-impurezas')?.value.trim() || null;
            const fechaAnalisis = new Date().toISOString().split('T')[0];

            const inserciones = [];
            for (const punto of puntosAzufre) {
                const acidez = parseFloat(document.querySelector(`[name="acidez-${punto}"]`)?.value);
                if (!isNaN(acidez)) {
                    inserciones.push({
                        tanque: punto,
                        acidez,
                        impurezas,
                        fecha_analisis: fechaAnalisis,
                        registrado_por: user.id
                    });
                }
            }

            if (inserciones.length === 0) {
                alert('Ingrese al menos una acidez.');
                return;
            }

            const { error } = await supabase.from('certificaciones_azufre').insert(inserciones);
            if (error) {
                alert('Error al guardar: ' + error.message);
                return;
            }

            alert('Certificaciones de azufre guardadas.');
            document.getElementById('form-cert-azufre').reset();
            cargarListaCertAzufre();

            // --- Notificación push ---
            try {
                await supabase.functions.invoke('notificar-certificacion', {
                    body: {
                        tipo: 'azufre',
                        puntos: inserciones.map(i => i.tanque)
                    }
                });
            } catch (notifErr) {
                console.warn('Notificación no enviada:', notifErr);
            }
        });
    }

    await cargarListaCertAzufre();
}

async function cargarListaCertAzufre() {
    const container = document.getElementById('lista-cert-azufre');
    const { data, error } = await supabase.from('certificaciones_azufre').select('*').order('fecha_analisis', { ascending: false }).limit(10);
    if (error) { container.innerHTML = '<p class="text-red-500">Error.</p>'; return; }
    if (!data.length) { container.innerHTML = '<p class="text-slate-400">Sin certificaciones.</p>'; return; }
    container.innerHTML = data.map(c => `
        <div class="bg-slate-800 p-2 rounded text-sm">
            <span class="text-slate-400">${c.fecha_analisis}</span>
            <span class="ml-2 font-bold text-white">${c.tanque || c.proveedor || 'Sin tanque'}</span>
            <span class="ml-2 text-blue-400">Acidez: ${c.acidez}%</span>
            ${c.impurezas ? `<p class="text-xs text-slate-400 mt-1">${c.impurezas}</p>` : ''}
        </div>
    `).join('');
}

// ==================== DISPOSICIÓN DE ÁCIDO ====================
async function renderizarDispAcido(contenedor) {
    const puedeRegistrar = ['admin', 'analista'].includes(currentUserRole);
    contenedor.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Registrar Disposición</h3>
                ${puedeRegistrar ? `
                <form id="form-disp-acido" class="space-y-4">
                    <div>
                        <label class="block text-slate-400 text-sm">Tipo</label>
                        <select id="disp-tipo" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                            <option value="entrada">Ácido Retenido (entrada)</option>
                            <option value="salida">Devuelto a Proceso (salida)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">Cantidad (litros)</label>
                        <input type="number" step="0.1" id="disp-cantidad" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">Motivo</label>
                        <textarea id="disp-motivo" rows="2" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"></textarea>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">Guardar</button>
                </form>` : '<p class="text-slate-400 italic">Solo analistas pueden registrar.</p>'}
            </div>
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Saldo Actual</h3>
                <div id="saldo-disp-acido" class="text-2xl font-bold text-white mb-4">-- litros</div>
                <h3 class="text-lg font-semibold text-white mb-2">Últimos Movimientos</h3>
                <div id="lista-disp-acido" class="space-y-2 max-h-72 overflow-y-auto">
                    <p class="text-slate-400 animate-pulse">Cargando...</p>
                </div>
            </div>
        </div>
    `;

    await actualizarSaldoDisp();
    await cargarListaDispAcido();

    if (puedeRegistrar) {
        document.getElementById('form-disp-acido').addEventListener('submit', async (e) => {
            e.preventDefault();
            const tipo = document.getElementById('disp-tipo').value;
            const cantidad = parseFloat(document.getElementById('disp-cantidad').value);
            const motivo = document.getElementById('disp-motivo')?.value.trim() || null;
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase.from('disposicion_acido').insert([{
                tipo, cantidad_litros: cantidad, motivo,
                fecha: new Date().toISOString().split('T')[0],
                registrado_por: user.id
            }]);
            if (error) return alert('Error: ' + error.message);
            alert('Movimiento registrado.');
            document.getElementById('form-disp-acido').reset();
            actualizarSaldoDisp();
            cargarListaDispAcido();

            // --- Notificación push ---
            try {
                await supabase.functions.invoke('notificar-certificacion', {
                    body: {
                        tipo: 'disposicion',
                        puntos: []
                    }
                });
            } catch (notifErr) {
                console.warn('Notificación no enviada:', notifErr);
            }
        });
    }
}

async function actualizarSaldoDisp() {
    const { data } = await supabase.from('disposicion_acido').select('*');
    const entradas = (data || []).filter(d => d.tipo === 'entrada').reduce((s, d) => s + d.cantidad_litros, 0);
    const salidas = (data || []).filter(d => d.tipo === 'salida').reduce((s, d) => s + d.cantidad_litros, 0);
    const saldo = entradas - salidas;
    document.getElementById('saldo-disp-acido').textContent = `${saldo.toFixed(1)} litros`;
}

async function cargarListaDispAcido() {
    const container = document.getElementById('lista-disp-acido');
    const { data, error } = await supabase.from('disposicion_acido').select('*').order('fecha', { ascending: false }).limit(10);
    if (error) { container.innerHTML = '<p class="text-red-500">Error.</p>'; return; }
    if (!data.length) { container.innerHTML = '<p class="text-slate-400">Sin movimientos.</p>'; return; }
    container.innerHTML = data.map(d => `
        <div class="bg-slate-800 p-2 rounded text-sm flex justify-between">
            <span>${d.fecha} - ${d.tipo === 'entrada' ? '🔻 Retenido' : '🔺 Devuelto'}</span>
            <span class="font-bold">${d.cantidad_litros} L</span>
            ${d.motivo ? `<p class="text-xs text-slate-400 w-full">${d.motivo}</p>` : ''}
        </div>
    `).join('');
}
