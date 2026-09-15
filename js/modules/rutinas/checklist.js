// ocp Vista Checklist del día
import { supabase } from '../../supabase-client.js';
import { generarSelectPersonal, horaActualPG, enlazarSelectPersonal } from './utils.js';

export async function renderChecklist(contenedor, rol) {
    const hoy = new Date().toISOString().split('T')[0];
    const diaSemana = new Date().getDay();

    const { data: predefinidas } = await supabase.from('rutinas_predefinidas')
        .select('*').or(`dia_semana.is.null,dia_semana.eq.${diaSemana}`)
        .eq('activo', true).order('hora');
    const { data: ejecutadas } = await supabase.from('rutinas_ejecutadas')
        .select('*').eq('fecha', hoy).order('hora_registro');

    contenedor.innerHTML = `
        <div class="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-4 mb-6">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-bold text-white">Tareas del día</h2>
                <span id="progreso" class="text-sm text-slate-400">Progreso: calculando...</span>
            </div>
            <div class="w-full bg-slate-700 rounded-full h-3 mb-6">
                <div id="barra-relleno" class="bg-green-500 h-3 rounded-full" style="width: 0%;"></div>
            </div>
            <div id="lista-rutinas" class="space-y-3"></div>
        </div>

        <div class="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-4">
            <h2 class="text-xl font-bold text-white mb-4">Personal de Turno y Acontecimientos</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                ${['Supervisor','Panelista','Operador 1','Operador 2','Operador 3','Paramedico','Inspector SSL'].map(r =>
                    `<div><label class="block text-sm text-slate-400 mb-1">${r}</label>${generarSelectPersonal(r)}</div>`
                ).join('')}
            </div>
            <label class="block text-sm text-slate-400 mb-1">Acontecimientos del turno</label>
            <textarea class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" rows="4" placeholder="Describa eventos relevantes del turno..."></textarea>
        </div>
    `;

    enlazarSelectPersonal(contenedor);

    const lista = document.getElementById('lista-rutinas');
    if (!predefinidas?.length) {
        lista.innerHTML = '<p class="text-slate-400">No hay rutinas definidas para hoy.</p>';
        document.getElementById('progreso').textContent = 'Progreso: 0/0';
        return;
    }

    let completadas = 0;
    const total = predefinidas.length;
    lista.innerHTML = predefinidas.map(r => {
        const ejec = ejecutadas?.find(e => e.rutina_predefinida_id === r.id);
        const hecho = ejec?.completada || false;
        if (hecho) completadas++;
        return `
            <div class="flex items-center gap-4 bg-slate-900 p-3 rounded border border-slate-700 ${hecho ? 'opacity-60' : ''}">
                <span class="text-2xl cursor-pointer" data-id="${r.id}" data-hecho="${hecho}">${hecho ? '✅' : '⬜'}</span>
                <div class="flex-1">
                    <p class="text-sm font-semibold text-white">${r.descripcion}</p>
                    <p class="text-xs text-slate-400">🕖 ${r.hora} – ${r.categoria}${r.responsable ? ` – ${r.responsable}` : ''}</p>
                    ${hecho ? `<p class="text-xs text-green-400">Completado – ${ejec?.observaciones || ''}</p>` : ''}
                </div>
                <button class="btn-completar text-xs bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded ${hecho ? 'hidden' : ''}" data-id="${r.id}">Completar</button>
            </div>`;
    }).join('');

    const pct = total > 0 ? Math.round((completadas / total) * 100) : 0;
    document.getElementById('barra-relleno').style.width = `${pct}%`;
    document.getElementById('progreso').textContent = `Progreso: ${completadas}/${total} (${pct}%)`;

    document.querySelectorAll('.btn-completar').forEach(btn => btn.addEventListener('click', async () => {
        const obs = prompt('Observaciones (opcional)') || '';
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('rutinas_ejecutadas').insert({
            rutina_predefinida_id: btn.dataset.id,
            fecha: new Date().toISOString().split('T')[0],
            hora_registro: horaActualPG(),
            completada: true, observaciones: obs, usuario_id: user.id
        });
        if (error) return alert('Error: ' + error.message);
        renderChecklist(contenedor, rol);
    }));

    document.querySelectorAll('.text-2xl').forEach(icon => icon.addEventListener('click', async () => {
        const hecho = icon.dataset.hecho === 'true';
        const id = icon.dataset.id;
        if (hecho) {
            const { data: ejec } = await supabase.from('rutinas_ejecutadas').select('id')
                .eq('rutina_predefinida_id', id).eq('fecha', new Date().toISOString().split('T')[0]).maybeSingle();
            if (ejec) { await supabase.from('rutinas_ejecutadas').delete().eq('id', ejec.id); renderChecklist(contenedor, rol); }
        } else {
            const obs = prompt('Observaciones (opcional)') || '';
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('rutinas_ejecutadas').insert({
                rutina_predefinida_id: id,
                fecha: new Date().toISOString().split('T')[0],
                hora_registro: horaActualPG(),
                completada: true, observaciones: obs, usuario_id: user.id
            });
            renderChecklist(contenedor, rol);
        }
    }));
}