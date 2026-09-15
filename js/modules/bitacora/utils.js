// ocp Utilidades compartidas del módulo Bitácora
export const personalPorRol = {
    'Supervisor':   ['Wladimir J. Pino (A)', 'Angel Barrueta (B)', 'Eduardo Arias (C)', 'Heiver J. Ramirez (D)'],
    'Panelista':    ['Angel S. Solorzano', 'Noelvis dj Camacho T.', 'Hilnelio J. García Q.', 'Jesus E. Trias V.'],
    'Operador 1':   ['Carlos Rivero G.', 'Jose Rondón', 'Jose R. Guilart L.', 'Christian Acosta OCP', 'Reymond Garcia C.', 'Julio C. Mercado', 'Digrian D. Romero R.', 'Octavio A. Rodríguez C.', 'Kelvis Samuray', 'Fernando Gruber'],
    'Operador 2':   ['Carlos Rivero G.', 'Jose Rondón', 'Jose R. Guilart L.', 'Christian Acosta OCP', 'Reymond Garcia C.', 'Julio C. Mercado', 'Digrian D. Romero R.', 'Octavio A. Rodríguez C.', 'Kelvis Samuray', 'Fernando Gruber'],
    'Operador 3':   ['Carlos Rivero G.', 'Jose Rondón', 'Jose R. Guilart L.', 'Christian Acosta OCP', 'Reymond Garcia C.', 'Julio C. Mercado', 'Digrian D. Romero R.', 'Octavio A. Rodríguez C.', 'Kelvis Samuray', 'Fernando Gruber'],
    'Paramedico':   ['Arturo Tenia', 'Joseanny C. González', 'Lisangel L. Guevara', 'Lisbeth González'],
    'Inspector SSL':['Inspector SSL A', 'Inspector SSL B']
};

export function generarSelectPersonal(rol) {
    const nombres = personalPorRol[rol] || [];
    const opciones = nombres.map(n => `<option>${n}</option>`).join('');
    return `<select class="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs select-personal" data-rol="${rol}">
        <option value="">Seleccione...</option>
        ${opciones}
        <option value="OTRO">Otro</option>
    </select>`;
}

export function enlazarSelectPersonalBitacora(container) {
    container.querySelectorAll('.select-personal').forEach(select => {
        select.addEventListener('change', function () {
            if (this.value === 'OTRO') {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'w-full bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs mt-1';
                input.placeholder = 'Especifique...';
                this.parentNode.appendChild(input);
            }
        });
    });
}