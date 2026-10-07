// ocp Cierre de conformidad con registro de repuestos usados
import { supabase } from '../../supabase-client.js';
import { enviarPushARoles } from '../../push.js';

export async function cargarVistaCierres(otId, rol, contenedor) {
    const { data: ot } = await supabase.from('ordenes_trabajo')
        .select('estado, numero_ot, tipo_ot, equipo_id')
        .eq('id', otId)
        .single();

    const puedeCerrar = ot?.estado === 'finalizada_ejecutor' && ['admin', 'supervisor'].includes(rol);

    let novedadesVinculadas = [];
    if (ot?.tipo_ot === 'parada') {
        const { data } = await supabase.from('ot_novedades')
            .select('novedad_id, novedades(tag_equipo_area, descripcion)')
            .eq('orden_id', otId);
        novedadesVinculadas = data || [];
    }

    const { data: repuestos } = await supabase
        .from('repuestos')
        .select('id, codigo, descripcion, unidad_medida, stock_actual')
        .eq('activo', true)
        .order('codigo');

    const repuestosDisponibles = repuestos || [];
    const repuestosCierre = [];

    contenedor.innerHTML = `
        <div class="max-w-3xl mx-auto">
            ${puedeCerrar ? `
            <form id="form-cierre" class="bg-slate-900 p-6 rounded-lg border border-slate-700 space-y-4">
                <h3 class="text-xl font-semibold text-white">Auditoría de Conformidad</h3>

                ${novedadesVinculadas.length ? `
                <div class="bg-yellow-900 border border-yellow-700 rounded p-3">
                    <p class="text-yellow-200 text-sm font-semibold mb-2">Esta OT es PARADA y cerrará automáticamente:</p>
                    <ul class="text-xs text-yellow-100 list-disc list-inside">
                        ${novedadesVinculadas.map(n => `<li>${n.novedades?.tag_equipo_area}: ${n.novedades?.descripcion}</li>`).join('')}
                    </ul>
                </div>` : ''}

                <div class="space-y-2">
                    <label class="flex items-center text-slate-300">
                        <input type="checkbox" id="chk-limpieza" class="h-4 w-4 text-green-600 bg-slate-700 border-slate-600 rounded" required>
                        <span class="ml-2">Área limpia y libre de obstrucciones</span>
                    </label>
                    <label class="flex items-center text-slate-300">
                        <input type="checkbox" id="chk-loto" class="h-4 w-4 text-green-600 bg-slate-700 border-slate-600 rounded" required>
                        <span class="ml-2">LOTO retirado</span>
                    </label>
                    <label class="flex items-center text-slate-300">
                        <input type="checkbox" id="chk-pruebas" class="h-4 w-4 text-green-600 bg-slate-700 border-slate-600 rounded" required>
                        <span class="ml-2">Pruebas funcionales satisfactorias</span>
                    </label>
                </div>

                <div class="bg-slate-800 p-4 rounded border border-slate-700">
                    <p class="text-sm font-semibold text-slate-200 mb-1">📦 Repuestos utilizados</p>
                    <p class="text-xs text-slate-400 mb-3">Opcional. Se descontará del inventario al cerrar.</p>

                    <div class="flex gap-2 mb-3">
                        <input type="text" id="rep-input" list="rep-list"
                            placeholder="Escriba o seleccione un repuesto..."
                            autocomplete="off"
                            class="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm">
                        <button type="button" id="btn-add-rep"
                            class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 rounded">+ Agregar</button>
                    </div>

                    <datalist id="rep-list">
                        ${repuestosDisponibles.map(r => `<option value="${r.codigo}">${r.descripcion} — Stock: ${Number(r.stock_actual).toFixed(2)} ${r.unidad_medida}</option>`).join('')}
                    </datalist>

                    <div id="rep-lista" class="space-y-2"></div>
                    <p id="rep-vacio" class="text-slate-500 text-xs italic text-center py-2">Sin repuestos agregados.</p>
                </div>

                <div>
                    <label class="block text-slate-400 text-sm">Observaciones finales</label>
                    <textarea id="cierre-obs" rows="3" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required></textarea>
                </div>

                <button type="submit" id="btn-cerrar-ot"
                    class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded">
                    Firmar Conformidad y Cerrar OT
                </button>
            </form>` : `<p class="text-slate-400 italic">La OT debe estar en estado "Finalizada por ejecutor" para poder cerrarla.</p>`}
        </div>
    `;

    if (!puedeCerrar) return;

    // ocp Renderizar la lista de repuestos agregados al cierre
    function renderizarRepuestosCierre() {
        const container = document.getElementById('rep-lista');
        const vacio = document.getElementById('rep-vacio');

        if (repuestosCierre.length === 0) {
            container.innerHTML = '';
            vacio.classList.remove('hidden');
            return;
        }

        vacio.classList.add('hidden');
        container.innerHTML = repuestosCierre.map((r, idx) => `
            <div class="flex items-center gap-2 bg-slate-900 p-2 rounded border border-slate-700">
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-mono text-white truncate">${r.codigo}</p>
                    <p class="text-xs text-slate-400 truncate">${r.descripcion}</p>
                    <p class="text-xs text-slate-500">Stock actual: ${Number(r.stock_actual).toFixed(2)} ${r.unidad_medida}</p>
                </div>
                <input type="number" min="0.01" step="0.01" value="${r.cantidad}"
                    data-idx="${idx}"
                    class="rep-cantidad w-24 bg-slate-800 border border-slate-600 rounded p-1 text-white text-sm text-right">
                <span class="text-xs text-slate-400 w-16">${r.unidad_medida}</span>
                <button type="button" class="btn-quitar text-red-400 hover:text-red-300 text-lg px-2" data-idx="${idx}">✕</button>
            </div>
        `).join('');

        container.querySelectorAll('.rep-cantidad').forEach(inp => {
            inp.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.idx);
                const val = parseFloat(e.target.value);
                if (isNaN(val) || val <= 0) {
                    alert('Cantidad inválida.');
                    e.target.value = repuestosCierre[idx].cantidad;
                    return;
                }
                repuestosCierre[idx].cantidad = val;
            });
        });

        container.querySelectorAll('.btn-quitar').forEach(btn => {
            btn.addEventListener('click', () => {
                repuestosCierre.splice(parseInt(btn.dataset.idx), 1);
                renderizarRepuestosCierre();
            });
        });
    }

    // ocp Agregar repuesto por código
    document.getElementById('btn-add-rep').addEventListener('click', () => {
        const input = document.getElementById('rep-input');
        const codigo = input.value.trim().toLowerCase();
        if (!codigo) return;

        const rep = repuestosDisponibles.find(r => r.codigo.toLowerCase() === codigo);
        if (!rep) {
            alert('Repuesto no encontrado. Selecciónelo del autocompletado.');
            return;
        }
        if (repuestosCierre.find(r => r.id === rep.id)) {
            alert('Este repuesto ya está agregado.');
            input.value = '';
            return;
        }
        repuestosCierre.push({ ...rep, cantidad: 1 });
        input.value = '';
        renderizarRepuestosCierre();
        input.focus();
    });

    // ocp Enter en el input también agrega
    document.getElementById('rep-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('btn-add-rep').click();
        }
    });

    // ocp Submit del cierre
    document.getElementById('form-cierre').addEventListener('submit', async (e) => {
        e.preventDefault();
        await cerrarOT(otId, ot, novedadesVinculadas, repuestosCierre);
    });
}

// ocp Ejecutar el cierre completo de la OT
async function cerrarOT(otId, ot, novedadesVinculadas, repuestosCierre) {
    const btn = document.getElementById('btn-cerrar-ot');
    btn.disabled = true;
    btn.textContent = 'Cerrando...';

    const obs = document.getElementById('cierre-obs').value;
    const { data: { user } } = await supabase.auth.getUser();
    const ahora = new Date().toISOString();

    try {
        await supabase.from('avances_ot').insert([{
            orden_id: otId,
            usuario_id: user.id,
            tipo: 'cierre',
            comentario: `Cierre de conformidad. Checklist OK. Obs: ${obs}`,
            metadata: { checklist: ['limpieza', 'loto', 'pruebas'] }
        }]);

        const repFallidos = [];
        for (const rep of repuestosCierre) {
            const { error } = await supabase.rpc('registrar_movimiento_repuesto', {
                p_repuesto_id: rep.id,
                p_tipo_movimiento: 'salida',
                p_cantidad: rep.cantidad,
                p_orden_id: otId,
                p_equipo_id: ot.equipo_id || null,
                p_motivo: `Uso en OT ${ot.numero_ot}`
            });
            if (error) {
                console.error('Error descontando repuesto:', rep.codigo, error);
                repFallidos.push(rep.codigo);
            }
        }

        if (ot.equipo_id) {
            await supabase.from('eventos_equipo').insert([{
                equipo_id: ot.equipo_id,
                orden_id: otId,
                tipo_evento: 'reparacion',
                estrategia: 'correctivo_planificado',
                descripcion: `Cierre de OT ${ot.numero_ot}: ${obs}`,
                registrado_por: user.id
            }]);
        }

        await supabase.from('ordenes_trabajo').update({
            estado: 'cerrada',
            fecha_cierre: ahora,
            observaciones_cierre: obs,
            conformidad: true,
            fecha_verificacion: ahora,
            recibido_por: user.id
        }).eq('id', otId);

        if (ot?.tipo_ot === 'parada' && novedadesVinculadas.length > 0) {
            await supabase.from('novedades').update({
                estado_cierre: 'cerrada_por_parada',
                fecha_cierre: ahora,
                ot_cierre_id: otId
            }).in('id', novedadesVinculadas.map(n => n.novedad_id));
        }

        enviarPushARoles(
            ['admin', 'supervisor', 'ejecutor', 'inspector_ssl'],
            `OT ${ot.numero_ot} cerrada por Operaciones.`
        );

        let msg = 'OT cerrada exitosamente.';
        if (novedadesVinculadas.length > 0) msg += `\nSe cerraron ${novedadesVinculadas.length} novedades.`;
        if (repuestosCierre.length > 0) {
            const ok = repuestosCierre.length - repFallidos.length;
            msg += `\nRepuestos descontados: ${ok} de ${repuestosCierre.length}.`;
            if (repFallidos.length > 0) msg += `\n⚠️ Falló: ${repFallidos.join(', ')}.`;
        }
        alert(msg);

        const { irATablero } = await import('./index.js');
        irATablero();

    } catch (err) {
        console.error('Error al cerrar OT:', err);
        alert('Error: ' + err.message);
        btn.disabled = false;
        btn.textContent = 'Firmar Conformidad y Cerrar OT';
    }
}
