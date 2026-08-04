// ocp Registro de diferenciales de presión con selectores de equipo y punto
import { supabase } from '../../supabase-client.js';

export async function renderizarDiferenciales(contenedor, rol) {
    contenedor.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Registrar Diferencial de Presión</h3>
                <form id="form-dp" class="space-y-4">
                    <div>
                        <label class="block text-slate-400 text-sm">Equipo</label>
                        <select id="dp-equipo" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
                            <option value="">Seleccione equipo...</option>
                            <option value="Soplador">Soplador</option>
                            <option value="Torre de Secado">Torre de Secado</option>
                            <option value="Torre Intermedia">Torre Intermedia</option>
                            <option value="Torre Final">Torre Final</option>
                            <option value="Lecho 1">Lecho 1</option>
                            <option value="Lecho 2">Lecho 2</option>
                            <option value="Lecho 3">Lecho 3</option>
                            <option value="Lecho 4">Lecho 4</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm">Punto de medición</label>
                        <select id="dp-punto" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
                            <option value="">Seleccione punto...</option>
                            <option value="Entrada">Entrada</option>
                            <option value="Salida">Salida</option>
                        </select>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-slate-400 text-sm">Valor</label>
                            <input type="number" step="0.01" id="dp-valor" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white" required>
                        </div>
                        <div>
                            <label class="block text-slate-400 text-sm">Unidad</label>
                            <select id="dp-unidad" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white">
                                <option value="psi">psi</option>
                                <option value="bar">bar</option>
                                <option value="inH2O">inH2O</option>
                                <option value="mmHg">mmHg</option>
                            </select>
                        </div>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">Guardar</button>
                </form>
            </div>
            <div class="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 class="text-lg font-semibold text-white mb-4">Últimos registros</h3>
                <div id="lista-dp" class="space-y-2 max-h-96 overflow-y-auto">
                    <p class="text-slate-400 animate-pulse">Cargando...</p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('form-dp').addEventListener('submit', async (e) => {
        e.preventDefault();
        const equipo = document.getElementById('dp-equipo').value;
        const punto = document.getElementById('dp-punto').value;
        const valor = parseFloat(document.getElementById('dp-valor').value);
        const unidad = document.getElementById('dp-unidad').value;
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from('diferenciales_presion').insert([{
            tag_equipo: equipo,
            punto_medicion: punto,
            valor: valor,
            unidad: unidad,
            registrado_por: user.id,
            fecha_registro: new Date().toISOString().split('T')[0]
        }]);

        if (error) return alert('Error: ' + error.message);
        alert('Registro guardado.');
        document.getElementById('form-dp').reset();
        cargarListaDP();
    });

    await cargarListaDP();
}

async function cargarListaDP() {
    const container = document.getElementById('lista-dp');
    const { data, error } = await supabase.from('diferenciales_presion').select('*').order('fecha_registro', { ascending: false }).limit(10);
    if (error) { container.innerHTML = '<p class="text-red-500">Error.</p>'; return; }
    if (!data.length) { container.innerHTML = '<p class="text-slate-400">Sin registros.</p>'; return; }

    container.innerHTML = data.map(r => `
        <div class="bg-slate-800 p-2 rounded text-sm">
            <span class="text-slate-400">${r.fecha_registro}</span>
            <span class="ml-2 font-bold text-white">${r.tag_equipo} - ${r.punto_medicion}</span>
            <span class="ml-2 text-blue-400">${r.valor} ${r.unidad}</span>
        </div>
    `).join('');
}
