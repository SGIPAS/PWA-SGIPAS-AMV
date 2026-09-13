// ocp Módulo de Rutinas Diarias – checklist + personal con selectores
import { supabase } from '../supabase-client.js';

const personalPorRol = {
    'Supervisor':   ['Wladimir J. Pino (A)', 'Angel Barrueta (B)', 'Eduardo Arias (C)', 'Heiver J. Ramirez (D)'],
    'Panelista':    ['Angel S. Solorzano', 'Noelvis dj Camacho T.', 'Hilnelio J. García Q.', 'Jesus E. Trias V.'],
    'Operador 1':   ['Carlos Rivero G.', 'Jose Rondón', 'Jose R. Guilart L.', 'Christian Acosta OCP', 'Reymond Garcia C.', 'Julio C. Mercado', 'Digrian D. Romero R.', 'Octavio A. Rodríguez C.', 'Kelvis Samuray', 'Fernando Gruber'],
    'Operador 2':   ['Carlos Rivero G.', 'Jose Rondón', 'Jose R. Guilart L.', 'Christian Acosta OCP', 'Reymond Garcia C.', 'Julio C. Mercado', 'Digrian D. Romero R.', 'Octavio A. Rodríguez C.', 'Kelvis Samuray', 'Fernando Gruber'],
    'Operador 3':   ['Carlos Rivero G.', 'Jose Rondón', 'Jose R. Guilart L.', 'Christian Acosta OCP', 'Reymond Garcia C.', 'Julio C. Mercado', 'Digrian D. Romero R.', 'Octavio A. Rodríguez C.', 'Kelvis Samuray', 'Fernando Gruber'],
    'Paramedico':   ['Arturo Tenia', 'Joseanny C. González', 'Lisangel L. Guevara', 'Lisbeth González'],
    'Inspector SSL':['Inspector SSL A', 'Inspector SSL B']
};

function generarSelectPersonal(rol) {
    const nombres = personalPorRol[rol] || [];
    return `
        <select class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm select-personal" data-rol="${rol}">
            <option value="">Seleccione...</option>
            ${nombres.map(n => `<option>${n}</option>`).join('')}
            <option value="OTRO">Otro (especificar)</option>
        </select>`;
}

export async function cargarRutinas() {
    const contenedor = document.getElementById('app-content');
    if (!contenedor) return;

    const hoy = new Date().toISOString().split('T')[0];
    const diaSemana = new Date().getDay(); // 0=domingo, 1=lunes...

    const { data: predefinidas } = await supabase
        .from('rutinas_predefinidas')
        .select('*')
        .or(`dia_semana.is.null,dia_semana.eq.${diaSemana}`)
        .eq('activo', true)
        .order('hora');

    const { data: ejecutadas } = await supabase
        .from('rutinas_ejecutadas')
        .select('*')
        .eq('fecha', hoy)
        .order('hora_registro');

    contenedor.innerHTML = `
        <div class="mb-6">
            <h1 class="text-3xl font-bold text-slate-100">Rutinas Diarias</h1>
            <p class="text-slate-400 mt-1">Checklist del turno – ${new Date().toLocaleDateString('es-VE', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
        </div>

        <div class="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-4 mb-6">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-bold text-white">Tareas del día</h2>
                <span id="progreso" class="text-sm text-slate-400">Progreso: calculando...</span>
            </div>
            <div id="barra-progreso" class="w-full bg-slate-700 rounded-full h-3 mb-6">
                <div id="barra-relleno" class="bg-green-500 h-3 rounded-full" style="width: 0%;"></div>
            </div>
            <div id="lista-rutinas" class="space-y-3">
                <p class="text-slate-400 animate-pulse">Cargando rutinas...</p>
            </div>
        </div>

        <div class="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-4">
            <h2 class="text-xl font-bold text-white mb-4">Personal de Turno y Acontecimientos</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div><label class="block text-sm text-slate-400 mb-1">Supervisor</label>${generarSelectPersonal('Supervisor')}</div>
                <div><label class="block text-sm text-slate-400 mb-1">Panelista</label>${generarSelectPersonal('Panelista')}</div>
                <div><label class="block text-sm text-slate-400 mb-1">Operador 1</label>${generarSelectPersonal('Operador 1')}</div>
                <div><label class="block text-sm text-slate-400 mb-1">Operador 2</label>${generarSelectPersonal('Operador 2')}</div>
                <div><label class="block text-sm text-slate-400 mb-1">Operador 3</label>${generarSelectPersonal('Operador 3')}</div>
                <div><label class="block text-sm text-slate-400 mb-1">Paramédico</label>${generarSelectPersonal('Paramedico')}</div>
                <div class="md:col-span-2"><label class="block text-sm text-slate-400 mb-1">Inspector SSL</label>${generarSelectPersonal('Inspector SSL')}</div>
            </div>
            <label class="block text-sm text-slate-400 mb-1">Acontecimientos del turno</label>
            <textarea class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" rows="4" placeholder="Describa eventos relevantes del turno..."></textarea>
        </div>
    `;

    document.querySelectorAll('.select-personal').forEach(sel => {
        sel.addEventListener('change', function() {
            if (this.value === 'OTRO') {
                const prev = this.parentNode.querySelector('.input-otro');
                if (prev) prev.remove();
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'input-otro w-full bg-slate-900 border border-slate-700 rounded p-2 text-white mt-1 text-sm';
                input.placeholder = 'Especifique nombre...';
                this.parentNode.appendChild(input);
            } else {
                const prev = this.parentNode.querySelector('.input-otro');
                if (prev) prev.remove();
            }
        });
    });

    const lista = document.getElementById('lista-rutinas');
    if (!predefinidas || predefinidas.length === 0) {
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
        const icono = hecho ? '✅' : '⬜';
        const clase = hecho ? 'opacity-60' : '';
        return `
            <div class="flex items-center gap-4 bg-slate-900 p-3 rounded border border-slate-700 ${clase}">
                <span class="text-2xl cursor-pointer" data-id="${r.id}" data-hecho="${hecho}">${icono}</span>
                <div class="flex-1">
                    <p class="text-sm font-semibold text-white">${r.descripcion}</p>
                    <p class="text-xs text-slate-400">🕖 ${r.hora} – ${r.categoria}${r.responsable ? ` – ${r.responsable}` : ''}</p>
                    ${hecho ? `<p class="text-xs text-green-400">Completado – ${ejec?.observaciones || ''}</p>` : ''}
                </div>
                <button class="btn-completar text-xs bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded ${hecho ? 'hidden' : ''}" data-id="${r.id}">Completar</button>
            </div>
        `;
    }).join('');

    const pct = total > 0 ? Math.round((completadas / total) * 100) : 0;
    document.getElementById('barra-relleno').style.width = `${pct}%`;
    document.getElementById('progreso').textContent = `Progreso: ${completadas}/${total} (${pct}%)`;

    document.querySelectorAll('.btn-completar').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const obs = prompt('Observaciones (opcional)') || '';
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('rutinas_ejecutadas').insert({
                rutina_predefinida_id: id,
                fecha: new Date().toISOString().split('T')[0],
                hora_registro: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
                completada: true,
                observaciones: obs,
                usuario_id: user.id
            });
            cargarRutinas();
        });
    });

    document.querySelectorAll('.text-2xl').forEach(icon => {
        icon.addEventListener('click', async () => {
            const id = icon.dataset.id;
            const hecho = icon.dataset.hecho === 'true';
            if (hecho) {
                const { data: ejec } = await supabase.from('rutinas_ejecutadas')
                    .select('id')
                    .eq('rutina_predefinida_id', id)
                    .eq('fecha', new Date().toISOString().split('T')[0])
                    .maybeSingle();
                if (ejec) {
                    await supabase.from('rutinas_ejecutadas').delete().eq('id', ejec.id);
                    cargarRutinas();
                }
            } else {
                const obs = prompt('Observaciones (opcional)') || '';
                const { data: { user } } = await supabase.auth.getUser();
                await supabase.from('rutinas_ejecutadas').insert({
                    rutina_predefinida_id: id,
                    fecha: new Date().toISOString().split('T')[0],
                    hora_registro: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
                    completada: true,
                    observaciones: obs,
                    usuario_id: user.id
                });
                cargarRutinas();
            }
        });
    });
}
