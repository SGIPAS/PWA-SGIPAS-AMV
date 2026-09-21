// ocp Emitir PTS + ART con correlativo, gases condicionales y trabajadores (con registro)
import { supabase } from '../../supabase-client.js';
import { obtenerCorrelativo } from '../utils.js';
import { enviarPushARoles } from '../../push.js';
import { escapeHtml } from '../../utils-storage.js';

const DEPARTAMENTOS_TRABAJADOR = [
    'operaciones', 'mecanico', 'electrico', 'instrumentacion',
    'fabricacion', 'servicios generales', 'SSL', 'laboratorio', 'contratista'
];

export async function renderizarEmitirPTS(contenedor, rol) {
    const puedeEmitir = ['admin', 'inspector_ssl'].includes(rol);
    contenedor.innerHTML = `
        <div class="max-w-4xl mx-auto">
            ${puedeEmitir ? `
            <div class="bg-slate-900 p-6 rounded-lg border border-slate-700">
                <h3 class="text-xl font-semibold text-white mb-4">Nuevo Permiso de Trabajo Seguro (PTS + ART)</h3>
                <form id="form-pts" class="space-y-6">
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Orden de Trabajo</label>
                        <select id="pts-orden" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
                            <option value="">Seleccione una OT...</option>
                        </select>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-slate-400 text-sm mb-1">Tipo de trabajo</label>
                            <select id="pts-tipo-trabajo" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                                <option value="frio">Frío</option>
                                <option value="caliente">Caliente</option>
                                <option value="altura">Altura</option>
                                <option value="espacio_confinado">Espacio confinado</option>
                            </select>
                        </div>
                        <div><label class="block text-slate-400 text-sm mb-1">Fecha desde</label><input type="date" id="pts-fecha-desde" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required></div>
                        <div><label class="block text-slate-400 text-sm mb-1">Fecha hasta</label><input type="date" id="pts-fecha-hasta" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required></div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div><label class="block text-slate-400 text-sm mb-1">Hora inicio</label><input type="time" id="pts-hora-inicio" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required></div>
                        <div><label class="block text-slate-400 text-sm mb-1">Hora fin</label><input type="time" id="pts-hora-fin" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required></div>
                        <div><label class="block text-slate-400 text-sm mb-1">Planta/Área</label><input type="text" id="pts-planta-area" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" value="Planta Ácido"></div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div><label class="block text-slate-400 text-sm mb-1">Unidad responsable</label><input type="text" id="pts-unidad" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" value="AMV"></div>
                        <div class="flex items-center pt-6">
                            <label class="flex items-center text-slate-300">
                                <input type="checkbox" id="pts-empresa-contratista" class="h-4 w-4 text-blue-600 bg-slate-700 border-slate-600 rounded">
                                <span class="ml-2">Empresa contratista</span>
                            </label>
                        </div>
                        <div>
                            <label class="block text-slate-400 text-sm mb-1">Procedimiento</label>
                            <select id="pts-procedimiento" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                                <option value="nuevo">Nuevo</option>
                                <option value="continuacion">Continuación</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Descripción del trabajo</label>
                        <textarea id="pts-desc-trabajo" rows="2" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required></textarea>
                    </div>
                    <div class="bg-slate-800 p-4 rounded border border-slate-700">
                        <p class="text-sm font-semibold text-slate-300 mb-3">Riesgos y controles (A.R.T.)</p>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <label class="flex items-center text-sm text-slate-300"><input type="checkbox" id="art-loto" class="h-4 w-4 text-red-600 bg-slate-700 border-slate-600 rounded mr-2"> Aislamiento Eléctrico (LOTO)</label>
                            <label class="flex items-center text-sm text-slate-300"><input type="checkbox" id="art-valvulas" class="h-4 w-4 text-red-600 bg-slate-700 border-slate-600 rounded mr-2"> Bloqueo de Válvulas</label>
                            <label class="flex items-center text-sm text-slate-300"><input type="checkbox" id="art-gases" class="h-4 w-4 text-red-600 bg-slate-700 border-slate-600 rounded mr-2"> Prueba de Gases</label>
                            <label class="flex items-center text-sm text-slate-300"><input type="checkbox" id="art-quimicos" class="h-4 w-4 text-red-600 bg-slate-700 border-slate-600 rounded mr-2"> Exposición Químicos</label>
                            <label class="flex items-center text-sm text-slate-300"><input type="checkbox" id="art-caliente" class="h-4 w-4 text-red-600 bg-slate-700 border-slate-600 rounded mr-2"> Trabajo en Caliente</label>
                            <label class="flex items-center text-sm text-slate-300"><input type="checkbox" id="art-bypass" class="h-4 w-4 text-red-600 bg-slate-700 border-slate-600 rounded mr-2"> Bypass Sistema de Control</label>
                        </div>
                    </div>
                    <div id="bloque-gases" class="hidden bg-yellow-900 border border-yellow-700 rounded p-3 space-y-2">
                        <p class="text-yellow-200 text-sm font-semibold">Valores de gases medidos</p>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div><label class="block text-yellow-100 text-xs">% O₂</label><input type="number" step="any" id="gas-o2" class="w-full bg-slate-800 border border-slate-700 rounded p-1 text-white text-sm"></div>
                            <div><label class="block text-yellow-100 text-xs">ppm SO₂</label><input type="number" step="any" id="gas-so2" class="w-full bg-slate-800 border border-slate-700 rounded p-1 text-white text-sm"></div>
                            <div><label class="block text-yellow-100 text-xs">ppm H₂S</label><input type="number" step="any" id="gas-h2s" class="w-full bg-slate-800 border border-slate-700 rounded p-1 text-white text-sm"></div>
                            <div><label class="block text-yellow-100 text-xs">% Explosivos</label><input type="number" step="any" id="gas-explosivos" class="w-full bg-slate-800 border border-slate-700 rounded p-1 text-white text-sm"></div>
                        </div>
                    </div>
                    <div class="bg-slate-800 p-4 rounded border border-slate-700">
                        <div class="flex justify-between items-center mb-2 flex-wrap gap-2">
                            <p class="text-sm font-semibold text-slate-300">Trabajadores ejecutantes</p>
                            <div class="flex gap-2">
                                <button type="button" id="btn-add-trabajador" class="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded">+ Agregar de la lista</button>
                                <button type="button" id="btn-nuevo-trabajador" class="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded">+ Nuevo trabajador</button>
                            </div>
                        </div>
                        <div id="lista-trabajadores" class="space-y-2"></div>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Observaciones</label>
                        <textarea id="pts-obs" rows="2" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"></textarea>
                    </div>
                    <button type="submit" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded">Firmar y Emitir PTS</button>
                </form>
            </div>` : `
            <div class="bg-yellow-900 border border-yellow-700 p-6 rounded-lg text-center">
                <p class="text-yellow-200 text-lg font-semibold">Acceso restringido</p>
                <p class="text-yellow-300 mt-2">Solo Inspector SSL o Administrador.</p>
            </div>`}
        </div>

        <!-- Modal nuevo trabajador -->
        <div id="modal-trabajador" class="hidden fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
            <div class="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 w-full max-w-md p-6">
                <h3 class="text-lg font-bold text-white mb-4 border-b border-slate-700 pb-2">Registrar Nuevo Trabajador</h3>
                <form id="form-nuevo-trabajador" class="space-y-3">
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Cédula *</label>
                        <input type="text" id="trab-cedula" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" required>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Nombre completo *</label>
                        <input type="text" id="trab-nombre" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" required>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Cargo</label>
                        <input type="text" id="trab-cargo" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" placeholder="Ej: Soldador, Mecánico">
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Departamento</label>
                        <select id="trab-departamento" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                            ${DEPARTAMENTOS_TRABAJADOR.map(d => `<option value="${d}" class="capitalize">${d}</option>`).join('')}
                        </select>
                    </div>
                    <div class="flex justify-end gap-2 pt-3 border-t border-slate-700">
                        <button type="button" id="btn-cerrar-modal-trab" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded">Cancelar</button>
                        <button type="submit" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-bold">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    if (!puedeEmitir) return;

    // Cargar OTs pendientes con PTS requerido
    const { data: ots } = await supabase.from('ordenes_trabajo')
        .select('id, numero_ot, titulo').eq('estado', 'pendiente').eq('requiere_pts', true);
    const select = document.getElementById('pts-orden');
    select.innerHTML = '<option value="">Seleccione una OT...</option>' +
        (ots?.length ? ots.map(ot => `<option value="${ot.id}">${ot.numero_ot} – ${ot.titulo}</option>`).join('')
                      : '<option value="">No hay OTs pendientes con PTS</option>');

    // Cache local de trabajadores
    let trabajadoresCache = [];
    async function cargarTrabajadores() {
        const { data } = await supabase.from('trabajadores')
            .select('*').eq('activo', true).order('nombre_completo');
        trabajadoresCache = data || [];
        return trabajadoresCache;
    }
    await cargarTrabajadores();

    // Bloque de gases
    document.getElementById('art-gases').addEventListener('change', (e) => {
        document.getElementById('bloque-gases').classList.toggle('hidden', !e.target.checked);
    });

    // Añadir fila de trabajador (desde lista)
    document.getElementById('btn-add-trabajador').addEventListener('click', () => {
        if (trabajadoresCache.length === 0) {
            alert('No hay trabajadores registrados. Use "+ Nuevo trabajador" para agregar.');
            return;
        }
        const div = document.createElement('div');
        div.className = 'flex gap-2 items-center';
        div.innerHTML = `
            <select class="trab-select flex-1 bg-slate-900 border border-slate-700 rounded p-1 text-white text-sm">
                <option value="">Seleccione trabajador...</option>
                ${trabajadoresCache.map(t => `<option value="${t.id}" data-cargo="${t.cargo || ''}">${t.nombre_completo} - ${t.cedula} - ${t.departamento || ''}</option>`).join('')}
            </select>
            <input type="text" class="trab-cargo-manual bg-slate-900 border border-slate-700 rounded p-1 text-white text-sm w-32" placeholder="Cargo">
            <button type="button" class="btn-del-trab text-red-500 hover:text-red-300 text-lg px-2">✕</button>`;
        div.querySelector('.btn-del-trab').addEventListener('click', () => div.remove());
        div.querySelector('.trab-select').addEventListener('change', function() {
            if (this.value) {
                const opt = this.options[this.selectedIndex];
                div.querySelector('.trab-cargo-manual').value = opt.dataset.cargo || '';
            }
        });
        document.getElementById('lista-trabajadores').appendChild(div);
    });

    // Abrir modal nuevo trabajador
    document.getElementById('btn-nuevo-trabajador').addEventListener('click', () => {
        document.getElementById('modal-trabajador').classList.remove('hidden');
        document.getElementById('form-nuevo-trabajador').reset();
    });
    document.getElementById('btn-cerrar-modal-trab').addEventListener('click', () => {
        document.getElementById('modal-trabajador').classList.add('hidden');
    });

    // Guardar nuevo trabajador
    document.getElementById('form-nuevo-trabajador').addEventListener('submit', async (e) => {
        e.preventDefault();
        const cedula = document.getElementById('trab-cedula').value.trim();
        const nombre = document.getElementById('trab-nombre').value.trim();
        const cargo = document.getElementById('trab-cargo').value.trim();
        const departamento = document.getElementById('trab-departamento').value;

        if (!cedula || !nombre) return alert('Cédula y nombre son obligatorios.');

        const { data: nuevo, error } = await supabase.from('trabajadores').insert([{
            cedula, nombre_completo: nombre, cargo: cargo || null,
            departamento: departamento || null, activo: true
        }]).select().single();

        if (error) {
            if (error.code === '23505') return alert('Ya existe un trabajador con esa cédula.');
            return alert('Error al guardar trabajador: ' + error.message);
        }

        alert('Trabajador registrado correctamente.');
        document.getElementById('modal-trabajador').classList.add('hidden');

        // Refrescar la lista cache
        await cargarTrabajadores();

        // Añadir automáticamente el nuevo trabajador a la lista del PTS
        const div = document.createElement('div');
        div.className = 'flex gap-2 items-center';
        div.innerHTML = `
            <select class="trab-select flex-1 bg-slate-900 border border-slate-700 rounded p-1 text-white text-sm">
                ${trabajadoresCache.map(t => `<option value="${t.id}" data-cargo="${t.cargo || ''}" ${t.id === nuevo.id ? 'selected' : ''}>${t.nombre_completo} - ${t.cedula} - ${t.departamento || ''}</option>`).join('')}
            </select>
            <input type="text" class="trab-cargo-manual bg-slate-900 border border-slate-700 rounded p-1 text-white text-sm w-32" value="${nuevo.cargo || ''}" placeholder="Cargo">
            <button type="button" class="btn-del-trab text-red-500 hover:text-red-300 text-lg px-2">✕</button>`;
        div.querySelector('.btn-del-trab').addEventListener('click', () => div.remove());
        div.querySelector('.trab-select').addEventListener('change', function() {
            const opt = this.options[this.selectedIndex];
            div.querySelector('.trab-cargo-manual').value = opt.dataset.cargo || '';
        });
        document.getElementById('lista-trabajadores').appendChild(div);
    });

    // Submit del PTS
    document.getElementById('form-pts').addEventListener('submit', async (e) => {
        e.preventDefault();
        const orden_id = select.value;
        if (!orden_id) return alert('Seleccione una OT.');

        const marcadoGases = document.getElementById('art-gases').checked;
        if (marcadoGases) {
            const ids = ['gas-o2','gas-so2','gas-h2s','gas-explosivos'];
            if (ids.some(id => !document.getElementById(id).value)) {
                return alert('Debe registrar todos los valores de gases.');
            }
        }

        const numero_pts = await obtenerCorrelativo('PTS', 'FOR-SSL');

        const payload = {
            orden_id, numero_pts, numero_art: numero_pts + '-A',
            autorizado_por: (await supabase.auth.getUser()).data.user.id,
            tipo_trabajo: document.getElementById('pts-tipo-trabajo').value,
            fecha_desde: document.getElementById('pts-fecha-desde').value,
            fecha_hasta: document.getElementById('pts-fecha-hasta').value,
            hora_inicio: document.getElementById('pts-hora-inicio').value,
            hora_fin: document.getElementById('pts-hora-fin').value,
            planta_area_intervenida: document.getElementById('pts-planta-area').value.trim(),
            unidad_responsable: document.getElementById('pts-unidad').value.trim(),
            empresa_contratista: document.getElementById('pts-empresa-contratista').checked,
            procedimiento_tipo: document.getElementById('pts-procedimiento').value,
            descripcion_trabajo: document.getElementById('pts-desc-trabajo').value.trim(),
            check_loto: document.getElementById('art-loto').checked,
            check_valvulas: document.getElementById('art-valvulas').checked,
            check_gases: marcadoGases,
            check_quimicos: document.getElementById('art-quimicos').checked,
            check_caliente: document.getElementById('art-caliente').checked,
            check_bypass_control: document.getElementById('art-bypass').checked,
            valor_o2: marcadoGases ? parseFloat(document.getElementById('gas-o2').value) : null,
            valor_so2: marcadoGases ? parseFloat(document.getElementById('gas-so2').value) : null,
            valor_h2s: marcadoGases ? parseFloat(document.getElementById('gas-h2s').value) : null,
            valor_explosivos: marcadoGases ? parseFloat(document.getElementById('gas-explosivos').value) : null,
            observaciones: document.getElementById('pts-obs').value.trim()
        };

        const { data: ptsIns, error } = await supabase.from('permisos_ssl').insert([payload]).select().single();
        if (error) return alert('Error: ' + error.message);

        const trabajadoresPayload = [];
        document.querySelectorAll('.trab-select').forEach(s => {
            if (s.value) {
                const cargoManual = s.parentElement.querySelector('.trab-cargo-manual')?.value.trim();
                trabajadoresPayload.push({
                    permiso_id: ptsIns.id,
                    trabajador_id: s.value,
                    cargo: cargoManual || s.options[s.selectedIndex].dataset.cargo || null
                });
            }
        });
        if (trabajadoresPayload.length) {
            const { error: errTrab } = await supabase.from('permisos_ssl_trabajadores').insert(trabajadoresPayload);
            if (errTrab) console.error('Error guardando trabajadores:', errTrab);
        }

        await supabase.from('art').insert([{
            permiso_id: ptsIns.id,
            actividad_tarea: payload.descripcion_trabajo,
            area: payload.planta_area_intervenida,
            fecha: payload.fecha_desde,
            pasos: [], epp_requerido: [],
            observaciones: payload.observaciones
        }]);

        await supabase.from('ordenes_trabajo').update({
            estado: 'aprobada_seguridad',
            fecha_aprobacion_seguridad: new Date().toISOString(),
            numero_pts_reservado: numero_pts
        }).eq('id', orden_id);

        const { data: otData } = await supabase.from('ordenes_trabajo').select('numero_ot').eq('id', orden_id).single();
        await enviarPushARoles(
            ['admin', 'supervisor', 'operador', 'ejecutor'],
            `PTS ${numero_pts} emitido para OT ${otData?.numero_ot || ''}.`
        );

        alert(`PTS ${numero_pts} emitido correctamente.`);
        document.getElementById('form-pts').reset();
        location.reload();
    });
}
