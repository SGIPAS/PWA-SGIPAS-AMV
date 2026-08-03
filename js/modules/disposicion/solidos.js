// ocp Residuos Sólidos (coque, azufre contaminado, pastas ácidas, trapos, dotación, catalizador)
import { supabase } from '../../supabase-client.js';

const TIPOS_SOLIDOS = [
    { value: 'coque', label: 'Coque (limpieza de tanques)' },
    { value: 'azufre_cont', label: 'Azufre Contaminado' },
    { value: 'pasta_acida', label: 'Pasta Ácida' },
    { value: 'trapos', label: 'Trapos / Estopas' },
    { value: 'dotacion', label: 'Dotación Contaminada (EPP)' },
    { value: 'catalizador', label: 'Catalizador Gastado' },
    { value: 'otro', label: 'Otro' }
];

export async function renderizarDisposicionSolidos(contenedor) {
    contenedor.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Registrar Residuo Sólido</h3>
                <form id="form-solidos" class="space-y-4">
                    <div>
                        <label class="block text-slate-400 text-sm">Tipo de Residuo</label>
                        <select id="solido-tipo" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                            ${TIPOS_SOLIDOS.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">Cantidad</label>
                        <div class="flex">
                            <input type="number" step="0.1" id="solido-cantidad" class="flex-1 bg-slate-800 border border-slate-700 rounded-l p-2 text-white" required>
                            <select id="solido-unidad" class="bg-slate-700 border border-slate-700 rounded-r p-2 text-white">
                                <option value="kg">kg</option>
                                <option value="ton">ton</option>
                                <option value="unidad">unidad</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">Observaciones</label>
                        <textarea id="solido-obs" rows="2" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"></textarea>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">Registrar</button>
                </form>
            </div>
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Últimos Registros de Sólidos</h3>
                <div id="lista-solidos" class="space-y-2 max-h-96 overflow-y-auto">
                    <p class="text-slate-400 animate-pulse">Cargando...</p>
                </div>
            </div>
        </div>
    `;

    await cargarListaSolidos();

    document.getElementById('form-solidos').addEventListener('submit', async (e) => {
        e.preventDefault();
        const tipo = document.getElementById('solido-tipo').value;
        const cantidad = parseFloat(document.getElementById('solido-cantidad').value);
        const unidad = document.getElementById('solido-unidad').value;
        const obs = document.getElementById('solido-obs')?.value.trim() || null;
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from('disposicion_final').insert([{
            tipo: 'solido',
            subtipo: tipo,
            cantidad: cantidad,
            unidad: unidad,
            fecha: new Date().toISOString().split('T')[0],
            observaciones: obs,
            registrado_por: user.id
        }]);

        if (error) return alert('Error: ' + error.message);
        alert('Registro guardado.');
        document.getElementById('form-solidos').reset();
        cargarListaSolidos();
    });
}

async function cargarListaSolidos() {
    const container = document.getElementById('lista-solidos');
    const { data, error } = await supabase.from('disposicion_final').select('*').eq('tipo', 'solido').order('fecha', { ascending: false }).limit(10);
    if (error) { container.innerHTML = '<p class="text-red-500">Error.</p>'; return; }
    if (!data.length) { container.innerHTML = '<p class="text-slate-400">Sin registros.</p>'; return; }
    container.innerHTML = data.map(d => {
        const tipoLabel = TIPOS_SOLIDOS.find(t => t.value === d.subtipo)?.label || d.subtipo;
        return `
        <div class="bg-slate-800 p-2 rounded text-sm flex justify-between">
            <span>${d.fecha} - ${tipoLabel}</span>
            <span class="font-bold">${d.cantidad} ${d.unidad}</span>
            ${d.observaciones ? `<p class="text-xs text-slate-400 w-full">${d.observaciones}</p>` : ''}
        </div>`;
    }).join('');
}