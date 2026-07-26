// ocp Control de fundición: big bags y acidez de tanques A, B, C, D
import { supabase } from '../../supabase-client.js';

export async function renderizarFundicion(contenedor, rol) {
    contenedor.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Registro Diario de Fundición</h3>
                <form id="form-fundicion" class="space-y-4">
                    <div>
                        <label class="block text-slate-400 text-sm">Big Bags Fundidos</label>
                        <input type="number" step="1" id="fund-bigbags" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-slate-400 text-sm">Acidez TQ-A (%)</label>
                            <input type="number" step="0.01" id="fund-a" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                        </div>
                        <div>
                            <label class="block text-slate-400 text-sm">Acidez TQ-B (%)</label>
                            <input type="number" step="0.01" id="fund-b" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                        </div>
                        <div>
                            <label class="block text-slate-400 text-sm">Acidez TQ-C (%)</label>
                            <input type="number" step="0.01" id="fund-c" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                        </div>
                        <div>
                            <label class="block text-slate-400 text-sm">Acidez TQ-D (%)</label>
                            <input type="number" step="0.01" id="fund-d" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                        </div>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">Guardar Día</button>
                </form>
            </div>
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Últimos registros</h3>
                <div id="lista-fundicion" class="space-y-2 max-h-96 overflow-y-auto">
                    <p class="text-slate-400 animate-pulse">Cargando...</p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('form-fundicion').addEventListener('submit', async (e) => {
        e.preventDefault();
        const bigBags = parseInt(document.getElementById('fund-bigbags').value);
        const a = parseFloat(document.getElementById('fund-a').value) || null;
        const b = parseFloat(document.getElementById('fund-b').value) || null;
        const c = parseFloat(document.getElementById('fund-c').value) || null;
        const d = parseFloat(document.getElementById('fund-d').value) || null;
        const { data: { user } } = await supabase.auth.getUser();
        const fechaHoy = new Date().toISOString().split('T')[0];

        // Intentar insertar, si ya existe un registro para hoy, actualizar
        const { error } = await supabase
            .from('fundicion_diaria')
            .upsert({
                fecha_registro: fechaHoy,
                big_bags: bigBags,
                acidez_tq_a: a,
                acidez_tq_b: b,
                acidez_tq_c: c,
                acidez_tq_d: d,
                registrado_por: user.id
            }, { onConflict: 'fecha_registro' });

        if (error) return alert('Error: ' + error.message);
        alert('Registro guardado.');
        document.getElementById('form-fundicion').reset();
        cargarListaFundicion();
    });

    await cargarListaFundicion();
}

async function cargarListaFundicion() {
    const container = document.getElementById('lista-fundicion');
    const { data, error } = await supabase.from('fundicion_diaria').select('*').order('fecha_registro', { ascending: false }).limit(10);
    if (error) { container.innerHTML = '<p class="text-red-500">Error.</p>'; return; }
    if (!data.length) { container.innerHTML = '<p class="text-slate-400">Sin registros.</p>'; return; }

    container.innerHTML = data.map(r => `
        <div class="bg-slate-800 p-2 rounded text-sm">
            <div class="flex justify-between">
                <span class="font-bold text-white">${r.fecha_registro}</span>
                <span class="text-blue-400">Big Bags: ${r.big_bags}</span>
            </div>
            <div class="text-slate-300 mt-1">
                TQ-A: ${r.acidez_tq_a ?? '-'}% | TQ-B: ${r.acidez_tq_b ?? '-'}% | TQ-C: ${r.acidez_tq_c ?? '-'}% | TQ-D: ${r.acidez_tq_d ?? '-'}%
            </div>
        </div>
    `).join('');
}