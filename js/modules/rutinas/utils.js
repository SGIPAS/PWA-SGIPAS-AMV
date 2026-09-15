// ocp Utilidades compartidas del módulo Rutinas
export const personalPorRol = {
    'Supervisor':   ['Wladimir J. Pino (A)', 'Angel Barrueta (B)', 'Eduardo Arias (C)', 'Heiver J. Ramirez (D)'],
    'Panelista':    ['Angel S. Solorzano', 'Noelvis dj Camacho T.', 'Hilnelio J. García Q.', 'Jesus E. Trias V.'],
    'Operador 1':   ['Carlos Rivero G.', 'Jose Rondón', 'Jose R. Guilart L.', 'Christian Acosta OCP', 'Reymond Garcia C.', 'Julio C. Mercado', 'Digrian D. Romero R.', 'Octavio A. Rodríguez C.', 'Kelvis Samuray', 'Fernando Gruber'],
    'Operador 2':   ['Carlos Rivero G.', 'Jose Rondón', 'Jose R. Guilart L.', 'Christian Acosta OCP', 'Reymond Garcia C.', 'Julio C. Mercado', 'Digrian D. Romero R.', 'Octavio A. Rodríguez C.', 'Kelvis Samuray', 'Fernando Gruber'],
    'Operador 3':   ['Carlos Rivero G.', 'Jose Rondón', 'Jose R. Guilart L.', 'Christian Acosta OCP', 'Reymond Garcia C.', 'Julio C. Mercado', 'Digrian D. Romero R.', 'Octavio A. Rodríguez C.', 'Kelvis Samuray', 'Fernando Gruber'],
    'Paramedico':   ['Arturo Tenia', 'Joseanny C. González', 'Lisangel L. Guevara', 'Lisbeth González'],
    'Inspector SSL':['Inspector SSL A', 'Inspector SSL B']
};

export function horaActualPG() {
    return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function generarSelectPersonal(rol) {
    const nombres = personalPorRol[rol] || [];
    return `<select class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm select-personal" data-rol="${rol}">
        <option value="">Seleccione...</option>
        ${nombres.map(n => `<option>${n}</option>`).join('')}
        <option value="OTRO">Otro (especificar)</option>
    </select>`;
}

export function enlazarSelectPersonal(container = document) {
    container.querySelectorAll('.select-personal').forEach(sel => {
        sel.addEventListener('change', function () {
            const prev = this.parentNode.querySelector('.input-otro');
            if (prev) prev.remove();
            if (this.value === 'OTRO') {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'input-otro w-full bg-slate-900 border border-slate-700 rounded p-2 text-white mt-1 text-sm';
                input.placeholder = 'Especifique nombre...';
                this.parentNode.appendChild(input);
            }
        });
    });
}