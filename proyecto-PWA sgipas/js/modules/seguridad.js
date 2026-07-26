import { supabase } from '../../supabase-client.js';

// ============================================================================
// MÓDULO: SEGURIDAD (P.T.S. Y A.R.T.)
// ============================================================================

export async function cargarVistaSeguridad(contenedor) {
    try {
        // Buscar O.T. que requieren PTS y están abiertas
        const { data: ordenes, error } = await supabase
            .from('ordenes_trabajo')
            .select('id, tag_equipo, descripcion')
            .eq('estado', 'Abierta')
            .eq('requiere_pts', true);

        if (error) throw error;

        let opcionesSelect = '<option value="">-- Seleccione una O.T. con requerimiento SSL --</option>';
        ordenes.forEach(ot => {
            opcionesSelect += `<option value="${ot.id}">#OT-${ot.id} - ${ot.tag_equipo}</option>`;
        });

        contenedor.innerHTML = `
            <div class="bg-slate-800 rounded-lg shadow p-6 max-w-5xl mx-auto">
                <h2 class="text-xl font-semibold mb-4 text-slate-100">Análisis de Riesgos (A.R.T.) y Permisos (P.T.S.)</h2>
                <p class="text-slate-400 mb-6">Complete la matriz de riesgos antes del inicio de labores. Toda validación queda registrada bajo su usuario.</p>
                
                <form id="form-seguridad" class="space-y-6">
                    <!-- Selección de O.T. -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-slate-300">Orden de Trabajo Vinculada</label>
                            <select id="pts-ot-id" class="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:border-red-500" required>
                                ${opcionesSelect}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-300">Validez del Permiso (Turno actual)</label>
                            <div class="flex space-x-2 mt-1">
                                <input type="time" id="pts-hora-inicio" class="block w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100" required>
                                <span class="text-slate-400 self-center">a</span>
                                <input type="time" id="pts-hora-fin" class="block w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100" required>
                            </div>
                        </div>
                    </div>

                    <!-- Matriz A.R.T. -->
                    <div class="bg-slate-900 p-4 rounded-md border border-slate-700">
                        <h3 class="text-md font-semibold mb-3 text-slate-200">Condiciones de Aislamiento y Riesgo</h3>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <label class="flex items-center text-sm text-slate-300">
                                <input type="checkbox" id="art-loto" class="h-4 w-4 text-red-600 bg-slate-700 border-slate-600 rounded">
                                <span class="ml-2">Aislamiento Eléctrico (LOTO)</span>
                            </label>
                            <label class="flex items-center text-sm text-slate-300">
                                <input type="checkbox" id="art-valvulas" class="h-4 w-4 text-red-600 bg-slate-700 border-slate-600 rounded">
                                <span class="ml-2">Bloqueo de Válvulas / Tuberías</span>
                            </label>
                            <label class="flex items-center text-sm text-slate-300">
                                <input type="checkbox" id="art-gases" class="h-4 w-4 text-red-600 bg-slate-700 border-slate-600 rounded">
                                <span class="ml-2">Prueba de Gases Realizada</span>
                            </label>
                            <label class="flex items-center text-sm text-slate-300">
                                <input type="checkbox" id="art-quimicos" class="h-4 w-4 text-red-600 bg-slate-700 border-slate-600 rounded">
                                <span class="ml-2">Exposición a Sustancias Químicas</span>
                            </label>
                            <label class="flex items-center text-sm text-slate-300">
                                <input type="checkbox" id="art-caliente" class="h-4 w-4 text-red-600 bg-slate-700 border-slate-600 rounded">
                                <span class="ml-2">Trabajo en Caliente (Chispas/Fuego)</span>
                            </label>
                            <label class="flex items-center text-sm text-slate-300">
                                <input type="checkbox" id="art-bypass" class="h-4 w-4 text-red-600 bg-slate-700 border-slate-600 rounded">
                                <span class="ml-2">Bypass en Sistema de Control</span>
                            </label>
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

        // Asignar el evento al formulario
        const formSeguridad = document.getElementById('form-seguridad');
        if (formSeguridad) {
            formSeguridad.addEventListener('submit', guardarPTS);
        }

    } catch (error) {
        console.error('Error al cargar vista de seguridad:', error);
        contenedor.innerHTML = `<p class="text-red-500">Error al inicializar el módulo P.T.S.</p>`;
    }
}

async function guardarPTS(event) {
    event.preventDefault();
    
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    const otId = document.getElementById('pts-ot-id').value;

    const payload = {
        orden_id: otId,
        autorizado_por: userId,
        hora_inicio: document.getElementById('pts-hora-inicio').value,
        hora_fin: document.getElementById('pts-hora-fin').value,
        check_loto: document.getElementById('art-loto').checked,
        check_valvulas: document.getElementById('art-valvulas').checked,
        check_gases: document.getElementById('art-gases').checked,
        check_quimicos: document.getElementById('art-quimicos').checked,
        check_caliente: document.getElementById('art-caliente').checked,
        check_bypass_control: document.getElementById('art-bypass').checked
    };

    try {
        const { error } = await supabase.from('permisos_ssl').insert([payload]);
        if (error) throw error;

        alert('Permiso de Trabajo Seguro (P.T.S.) emitido correctamente.');
        document.getElementById('form-seguridad').reset();
    } catch (error) {
        alert('Error al emitir el permiso: ' + error.message);
    }
}