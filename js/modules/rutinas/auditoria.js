// ocp Vista Auditoría (solo admin + supervisor)
import { supabase } from '../../supabase-client.js';

export async function renderAuditoria(contenedor, rol) {
    const hoy = new Date().toISOString().split('T')[0];
    contenedor.innerHTML = `
        <div class="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-4 mb-4 flex flex-wrap gap-3 items-end">
            <div>
                <label class="block text-slate-400 text-sm mb-1">Fecha a auditar</label>
                <input type="date" id="audit-fecha" value="${hoy}" class="bg-slate-900 border border-slate-700 rounded p-2 text-white">
            </div>
            <div>
                <label class="block text-slate-400 text-sm mb-1">Categoría</label>
                <select id="audit-categoria" class="bg-slate-900 border border-slate-700 rounded p-2 text-white">
                    <option value="">Todas</option>
                </select>
            </div>
            <button id="btn-audit-generar" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Consultar</button>
            <button id="btn-audit-imprimir" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded hidden">🖨️ Imprimir</button>
        </div>
        <div id="audit-resultado"></div>
    `;

    const { data: cats } = await supabase.from('rutinas_predefinidas').select('categoria');
    const unicas = [...new Set((cats || []).map(c => c.categoria))];
    const selCat = document.getElementById('audit-categoria');
    unicas.forEach(c => selCat.insertAdjacentHTML('beforeend', `<option value="${c}">${c}</option>`));

    document.getElementById('btn-audit-generar').addEventListener('click', async () => {
        const fecha = document.getElementById('audit-fecha').value;
        const cat = document.getElementById('audit-categoria').value;
        await generarAuditoria(fecha, cat, rol);
    });

    document.getElementById('btn-audit-imprimir').addEventListener('click', () => window.print());

    await generarAuditoria(hoy, '', rol);
}

async function generarAuditoria(fecha, categoriaFiltro, rol) {
    const resultado = document.getElementById('audit-resultado');
    resultado.innerHTML = '<p class="text-slate-400 animate-pulse">Consultando...</p>';

    const fechaObj = new Date(fecha + 'T12:00:00');
    const diaSemana = fechaObj.getDay();

    let qPre = supabase.from('rutinas_predefinidas').select('*')
        .or(`dia_semana.is.null,dia_semana.eq.${diaSemana}`).eq('activo', true).order('hora');
    if (categoriaFiltro) qPre = qPre.eq('categoria', categoriaFiltro);
    const { data: predefinidas } = await qPre;

    const { data: ejecutadas } = await supabase.from('rutinas_ejecutadas').select('*').eq('fecha', fecha);
    const { data: auditorias } = await supabase.from('rutinas_auditoria').select('*').eq('fecha', fecha);
    const { data: perfiles } = await supabase.from('perfiles').select('id, nombre_completo');
    const mapaNombres = {};
    (perfiles || []).forEach(p => { mapaNombres[p.id] = p.nombre_completo; });

    if (!predefinidas?.length) {
        resultado.innerHTML = '<p class="text-slate-400">No hay rutinas definidas para esa fecha.</p>';
        return;
    }

    const total = predefinidas.length;
    let completadas = 0, noEjecutadas = 0, pendientes = 0;
    const filas = predefinidas.map(r => {
        const ejec = ejecutadas?.find(e => e.rutina_predefinida_id === r.id);
        const audit = auditorias?.find(a => a.rutina_predefinida_id === r.id);
        let estado, motivo = '';
        if (ejec?.completada) { estado = '✅ Completada'; completadas++; }
        else if (audit) { estado = '❌ No ejecutada'; motivo = audit.motivo; noEjecutadas++; }
        else { estado = '⬜ Pendiente'; pendientes++; }
        const usuario = ejec?.usuario_id ? (mapaNombres[ejec.usuario_id] || '--') : '--';
        return { r, estado, usuario, obs: ejec?.observaciones || '', motivo };
    });

    const pct = total > 0 ? Math.round((completadas / total) * 100) : 0;

    let html = `
    <div id="rutinas-audit-print" class="bg-white text-slate-800 p-4 rounded shadow">
        <div style="width:100%; margin-bottom:6px; border-bottom:2px solid #1e3a8a; padding-bottom:3px;">
            <img src="cintillo_superior.png" style="width:100%;height:auto;" onerror="this.style.display='none'">
        </div>
        <h2 class="text-center font-bold mb-1" style="font-size:14px;">AUDITORÍA DE RUTINAS DIARIAS</h2>
        <p class="text-center mb-3" style="font-size:11px;">Fecha: ${fechaObj.toLocaleDateString('es-VE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>

        <div class="grid grid-cols-4 gap-2 mb-3 text-center" style="font-size:11px;">
            <div class="border p-2"><div class="font-bold text-lg">${total}</div><div>Total</div></div>
            <div class="border p-2"><div class="font-bold text-lg text-green-700">${completadas}</div><div>Completadas</div></div>
            <div class="border p-2"><div class="font-bold text-lg text-yellow-700">${pendientes}</div><div>Pendientes</div></div>
            <div class="border p-2"><div class="font-bold text-lg text-red-700">${noEjecutadas}</div><div>No ejecutadas</div></div>
        </div>

        <p class="text-center font-bold mb-3" style="font-size:12px;">Cumplimiento: ${pct}%</p>

        <table class="w-full border-collapse" style="font-size:9px;">
            <thead><tr class="bg-gray-200">
                <th class="border p-1">Hora</th>
                <th class="border p-1">Actividad</th>
                <th class="border p-1">Responsable</th>
                <th class="border p-1">Estado</th>
                <th class="border p-1">Ejecutado por</th>
                <th class="border p-1">Observación / Motivo</th>
            </tr></thead>
            <tbody>
                ${filas.map(f => `<tr>
                    <td class="border p-1">${f.r.hora}</td>
                    <td class="border p-1">${f.r.descripcion}</td>
                    <td class="border p-1">${f.r.responsable || ''}</td>
                    <td class="border p-1">${f.estado}</td>
                    <td class="border p-1">${f.usuario}</td>
                    <td class="border p-1">${f.motivo || f.obs || ''}</td>
                </tr>`).join('')}
            </tbody>
        </table>
    </div>

    <div class="mt-4 bg-slate-800 p-4 rounded-lg border border-slate-700 no-print">
        <h3 class="text-white font-bold mb-3">Registrar motivo de incumplimiento</h3>
        <div class="flex gap-2 items-end flex-wrap">
            <div class="flex-1 min-w-[300px]">
                <label class="block text-slate-400 text-sm mb-1">Rutina no ejecutada</label>
                <select id="audit-rutina-sel" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                    <option value="">Seleccione...</option>
                    ${filas.filter(f => f.estado.includes('Pendiente')).map(f =>
                        `<option value="${f.r.id}">${f.r.hora} – ${f.r.descripcion}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="flex-1 min-w-[300px]">
                <label class="block text-slate-400 text-sm mb-1">Motivo</label>
                <input type="text" id="audit-motivo" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" placeholder="Ej: No se pudo acceder al área por parada">
            </div>
            <button id="btn-audit-guardar" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">Registrar incumplimiento</button>
        </div>
    </div>`;

    resultado.innerHTML = html;
    document.getElementById('btn-audit-imprimir').classList.remove('hidden');

    document.getElementById('btn-audit-guardar').addEventListener('click', async () => {
        const rid = document.getElementById('audit-rutina-sel').value;
        const motivo = document.getElementById('audit-motivo').value.trim();
        if (!rid || !motivo) return alert('Seleccione una rutina e ingrese el motivo.');
        const { data: { user } } = await supabase.auth.getUser();
        const turno = new Date().getHours() >= 7 && new Date().getHours() < 19 ? 'diurno' : 'nocturno';
        const { error } = await supabase.from('rutinas_auditoria').insert({
            rutina_predefinida_id: rid, fecha, turno, motivo, registrado_por: user.id
        });
        if (error) return alert('Error: ' + error.message);
        generarAuditoria(fecha, categoriaFiltro, rol);
    });
}