// ocp Carga y muestra la tabla de usuarios con acciones
import { supabase } from '../../supabase-client.js';
import { abrirModalEditar } from './formulario.js';
import { resetearPassword, eliminarUsuario, toggleEstado } from './acciones.js';

export async function renderizarLista() {
    const container = document.getElementById('tabla-usuarios-container');
    const { data: perfiles, error } = await supabase
        .from('perfiles')
        .select('*')
        .order('creado_en', { ascending: false });

    if (error) {
        container.innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`;
        return;
    }
    if (!perfiles || perfiles.length === 0) {
        container.innerHTML = `<p class="text-slate-400 text-center py-4">No hay personal registrado.</p>`;
        return;
    }

    let html = `
        <table class="w-full text-left border-collapse">
            <thead>
                <tr class="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700">
                    <th class="p-4 font-semibold">Nombre Completo</th>
                    <th class="p-4 font-semibold">Correo</th>
                    <th class="p-4 font-semibold">Departamento</th>
                    <th class="p-4 font-semibold">Rol</th>
                    <th class="p-4 font-semibold">Estado</th>
                    <th class="p-4 font-semibold">Acciones</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-700 text-slate-300 text-sm">
    `;

    perfiles.forEach(p => {
        const colorRol = p.rol === 'admin' ? 'bg-red-900/50 text-red-300' :
                         p.rol === 'supervisor' ? 'bg-purple-900/50 text-purple-300' :
                         'bg-blue-900/50 text-blue-300';
        html += `
            <tr class="hover:bg-slate-700/50">
                <td class="p-4 font-medium text-white">${p.nombre_completo || '-'}</td>
                <td class="p-4 text-slate-400">${p.email || '-'}</td>
                <td class="p-4 capitalize">${p.departamento}</td>
                <td class="p-4"><span class="px-2 py-1 rounded text-xs ${colorRol}">${p.rol}</span></td>
                <td class="p-4">
                    <button data-id="${p.id}" data-estado="${p.estado}" class="toggle-estado text-xs font-semibold px-2 py-1 rounded border ${p.estado ? 'bg-green-900/50 text-green-300 border-green-700' : 'bg-red-900/50 text-red-300 border-red-700'}">
                        ${p.estado ? 'Activo' : 'Inactivo'}
                    </button>
                </td>
                <td class="p-4 flex space-x-2">
                    <button class="btn-editar text-yellow-400 hover:underline text-xs" data-id="${p.id}">✏️ Editar</button>
                    <button class="btn-reset text-orange-400 hover:underline text-xs" data-id="${p.id}">🔑 Reset</button>
                    <button class="btn-eliminar text-red-400 hover:underline text-xs" data-id="${p.id}">🗑️ Eliminar</button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;

    // Event listeners para cada acción
    document.querySelectorAll('.toggle-estado').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const nuevoEstado = btn.dataset.estado !== 'true';
            await toggleEstado(id, nuevoEstado);
            renderizarLista();
        });
    });

    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', () => abrirModalEditar(btn.dataset.id));
    });

    document.querySelectorAll('.btn-reset').forEach(btn => {
        btn.addEventListener('click', () => resetearPassword(btn.dataset.id));
    });

    document.querySelectorAll('.btn-eliminar').forEach(btn => {
        btn.addEventListener('click', () => eliminarUsuario(btn.dataset.id));
    });
}