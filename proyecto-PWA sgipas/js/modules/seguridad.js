import { supabase } from '../../supabase-client.js';

// ============================================================================
// MÓDULO: SEGURIDAD (P.T.S. Y A.R.T.)
// ============================================================================

export async function cargarVistaSeguridad(contenedor) {
    try {
        // Validar sesión antes de cualquier operación
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        if (authError || !session) {
            contenedor.innerHTML = `<p class="text-red-500">Sesión expirada. Redirigiendo al login...</p>`;
            setTimeout(() => window.location.href = '/#login', 2000);
            return;
        }

        const { data: ordenes, error } = await supabase
            .from('ordenes_trabajo')
            .select('id, tag_equipo, descripcion')
            .eq('estado', 'Abierta')
            .eq('requiere_pts', true);

        if (error) throw error;

        // Si no hay O.T. que requieran PTS
        if (!ordenes || ordenes.length === 0) {
            contenedor.innerHTML = `
                <div class="bg-slate-800 rounded-lg shadow p-6 max-w-5xl mx-auto">
                    <h2 class="text-xl font-semibold mb-4 text-slate-100">P.T.S. y A.R.T.</h2>
                    <p class="text-amber-400">No hay órdenes de trabajo abiertas que requieran permiso SSL.</p>
                </div>`;
            return;
        }

        const opcionesSelect = ordenes.map(ot => 
            `<option value="${ot.id}">#OT-${ot.id} - ${ot.tag_equipo}</option>`
        ).join('');

        contenedor.innerHTML = `
            <div class="bg-slate-800 rounded-lg shadow p-6 max-w-5xl mx-auto">
                <h2 class="text-xl font-semibold mb-4 text-slate-100">Análisis de Riesgos (A.R.T.) y Permisos (P.T.S.)</h2>
                <p class="text-slate-400 mb-6">Complete la matriz de riesgos antes del inicio de labores.</p>
                
                <form id="form-seguridad" class="space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-slate-300">Orden de Trabajo Vinculada</label>
                            <select id="pts-ot-id" class="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100" required>
                                <option value="">-- Seleccione una O.T. --</option>
                                ${opcionesSelect}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-300">Validez del Permiso (Turno)</label>
                            <div class="flex space-x-2 mt-1">
                                <input type="time" id="pts-hora-inicio" class="block w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100" required>
                                <span class="text-slate-400 self-center">a</span>
                                <input type="time" id="pts-hora-fin" class="block w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100" required>
                            </div>
                        </div>
                    </div>

                    <div class="bg-slate-900 p-4 rounded-md border border-slate-700">
                        <h3 class="text-md font-semibold mb-3 text-slate-200">Condiciones de Aislamiento y Riesgo</h3>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            ${[
                                ['art-loto', 'Aislamiento Eléctrico (LOTO)'],
                                ['art-valvulas', 'Bloqueo de Válvulas / Tuberías'],
                                ['art-gases', 'Prueba de Gases Realizada'],
                                ['art-quimicos', 'Exposición a Sustancias Químicas'],
                                ['art-caliente', 'Trabajo en Caliente'],
                                ['art-bypass', 'Bypass en Sistema de Control']
                            ].map(([id, label]) => `
                                <label class="flex items-center text-sm text-slate-300 cursor-pointer hover:text-white">
                                    <input type="checkbox" id="${id}" class="h-4 w-4 text-red-600 bg-slate-700 border-slate-600 rounded">
                                    <span class="ml-2">${label}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <div class="text-right">
                        <button type="submit" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded transition duration-150 shadow-lg">
                            Firmar y Emitir P.T.S.
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.getElementById('form-seguridad').addEventListener('submit', guardarPTS);

    } catch (error) {
        console.error('Error al cargar vista de seguridad:', error);
        contenedor.innerHTML = `<p class="text-red-500">Error al inicializar el módulo P.T.S.: ${error.message}</p>`;
    }
}

async function guardarPTS(event) {
    event.preventDefault();
    
    const btnSubmit = event.target.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Emitiendo...';

    try {
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        if (authError || !session) {
            throw new Error('Sesión no válida. Inicie sesión nuevamente.');
        }

        const otId = document.getElementById('pts-ot-id').value;
        if (!otId) throw new Error('Debe seleccionar una Orden de Trabajo.');

        const payload = {
            orden_id: parseInt(otId),
            autorizado_por: session.user.id,
            hora_inicio: document.getElementById('pts-hora-inicio').value,
            hora_fin: document.getElementById('pts-hora-fin').value,
            check_loto: document.getElementById('art-loto').checked,
            check_valvulas: document.getElementById('art-valvulas').checked,
            check_gases: document.getElementById('art-gases').checked,
            check_quimicos: document.getElementById('art-quimicos').checked,
            check_caliente: document.getElementById('art-caliente').checked,
            check_bypass_control: document.getElementById('art-bypass').checked,
            fecha_emision: new Date().toISOString(),
            estado: 'Activo'
        };

        const { data, error } = await supabase.from('permisos_ssl').insert([payload]).select();
        if (error) throw error;

        alert('✅ Permiso de Trabajo Seguro (P.T.S.) emitido correctamente. ID: ' + data[0].id);
        event.target.reset();

        // TODO: Aquí disparar Alerta 3 al ejecutor
        // await dispararAlerta(3, payload.orden_id);

    } catch (error) {
        console.error('Error al emitir PTS:', error);
        alert('❌ Error al emitir el permiso: ' + (error.message || JSON.stringify(error)));
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Firmar y Emitir P.T.S.';
    }
}