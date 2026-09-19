// ocp Formulario de creación/edición de usuario — adaptado al nuevo modelo de seguridad
import { supabase, obtenerRolVerificado } from '../../supabase-client.js';
import { renderizarLista } from './lista.js';

export function abrirModalNuevo() {
    const modal = document.getElementById('modal-usuario');
    modal.classList.remove('hidden');
    modal.innerHTML = `
        <div class="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 w-full max-w-md p-6">
            <h2 id="modal-titulo" class="text-xl font-bold text-white mb-4 border-b border-slate-700 pb-2">Nuevo Trabajador</h2>

            <div class="bg-blue-900/30 border border-blue-700 rounded p-3 mb-4 text-xs text-blue-200">
                <p class="font-semibold mb-1">📌 Instrucciones para crear usuario</p>
                <p>1. Crea la cuenta desde el panel de Supabase (Authentication → Add User).</p>
                <p>2. Marca <strong>"Auto Confirm User"</strong>.</p>
                <p>3. En <strong>User Metadata</strong> pega:</p>
                <pre class="bg-slate-900 p-2 rounded mt-1 overflow-x-auto">{"nombre_completo":"Nombre Apellido","departamento":"operaciones"}</pre>
                <p class="mt-1">4. Vuelve aquí, refresca la lista y edita el rol del nuevo usuario.</p>
            </div>

            <form id="form-usuario" class="space-y-4">
                <input type="hidden" id="user-id">
                <div>
                    <label class="block text-slate-400 text-sm mb-1">Nombre Completo</label>
                    <input type="text" id="edit-nombre" required class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                </div>
                <div>
                    <label class="block text-slate-400 text-sm mb-1">Correo Electrónico</label>
                    <input type="email" id="edit-email" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" readonly placeholder="Se asigna desde Supabase">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Departamento</label>
                        <select id="edit-departamento" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                            <option value="operaciones">Operaciones</option>
                            <option value="instrumentacion y electricidad">Inst. y Electricidad</option>
                            <option value="mtto mecanico">Mtto. Mecánico</option>
                            <option value="fabricacion y soldadura">Fab. y Soldadura</option>
                            <option value="servicios generales">Servicios Generales</option>
                            <option value="foraneos">Foráneos</option>
                            <option value="laboratorio">Laboratorio</option>
                            <option value="superintendencia de acido">Superintendencia de Ácido</option>
                            <option value="SSL">SSL</option>
                            <option value="direccion general">Dirección General</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Rol de Acceso</label>
                        <select id="edit-rol" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                            <option value="operador">Operador</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="ejecutor">Ejecutor</option>
                            <option value="inspector_ssl">Inspector SSL</option>
                            <option value="analista">Analista</option>
                            <option value="directivos">Directivos</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <input type="checkbox" id="edit-estado" class="h-4 w-4 text-blue-600 bg-slate-700 border-slate-600 rounded" checked>
                    <label class="text-slate-400 text-sm">Usuario activo</label>
                </div>
                <div class="flex justify-end space-x-3 pt-4 border-t border-slate-700">
                    <button type="button" id="btn-cerrar-modal" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded">Cancelar</button>
                    <button type="submit" id="btn-guardar-usuario" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold">Guardar</button>
                </div>
            </form>
        </div>`;
    document.getElementById('btn-cerrar-modal').addEventListener('click', cerrarModal);
    document.getElementById('form-usuario').addEventListener('submit', manejarSubmitUsuario);
}

export async function abrirModalEditar(id) {
    const modal = document.getElementById('modal-usuario');
    modal.classList.remove('hidden');
    const { data: perfil, error } = await supabase.from('perfiles').select('*').eq('id', id).single();
    if (error || !perfil) return alert('Usuario no encontrado');

    modal.innerHTML = `
        <div class="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 w-full max-w-md p-6">
            <h2 id="modal-titulo" class="text-xl font-bold text-white mb-4 border-b border-slate-700 pb-2">Editar: ${perfil.nombre_completo || 'Usuario'}</h2>
            <form id="form-usuario" class="space-y-4">
                <input type="hidden" id="user-id" value="${perfil.id}">
                <div>
                    <label class="block text-slate-400 text-sm mb-1">Nombre Completo</label>
                    <input type="text" id="edit-nombre" required value="${perfil.nombre_completo || ''}" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                </div>
                <div>
                    <label class="block text-slate-400 text-sm mb-1">Correo Electrónico</label>
                    <input type="email" id="edit-email" value="${perfil.email || ''}" readonly class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white opacity-60">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Departamento</label>
                        <select id="edit-departamento" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                            <option value="operaciones" ${perfil.departamento === 'operaciones' ? 'selected' : ''}>Operaciones</option>
                            <option value="instrumentacion y electricidad" ${perfil.departamento === 'instrumentacion y electricidad' ? 'selected' : ''}>Inst. y Electricidad</option>
                            <option value="mtto mecanico" ${perfil.departamento === 'mtto mecanico' ? 'selected' : ''}>Mtto. Mecánico</option>
                            <option value="fabricacion y soldadura" ${perfil.departamento === 'fabricacion y soldadura' ? 'selected' : ''}>Fab. y Soldadura</option>
                            <option value="servicios generales" ${perfil.departamento === 'servicios generales' ? 'selected' : ''}>Servicios Generales</option>
                            <option value="foraneos" ${perfil.departamento === 'foraneos' ? 'selected' : ''}>Foráneos</option>
                            <option value="laboratorio" ${perfil.departamento === 'laboratorio' ? 'selected' : ''}>Laboratorio</option>
                            <option value="superintendencia de acido" ${perfil.departamento === 'superintendencia de acido' ? 'selected' : ''}>Superintendencia de Ácido</option>
                            <option value="SSL" ${perfil.departamento === 'SSL' ? 'selected' : ''}>SSL</option>
                            <option value="direccion general" ${perfil.departamento === 'direccion general' ? 'selected' : ''}>Dirección General</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-sm mb-1">Rol de Acceso</label>
                        <select id="edit-rol" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                            <option value="operador" ${perfil.rol === 'operador' ? 'selected' : ''}>Operador</option>
                            <option value="supervisor" ${perfil.rol === 'supervisor' ? 'selected' : ''}>Supervisor</option>
                            <option value="ejecutor" ${perfil.rol === 'ejecutor' ? 'selected' : ''}>Ejecutor</option>
                            <option value="inspector_ssl" ${perfil.rol === 'inspector_ssl' ? 'selected' : ''}>Inspector SSL</option>
                            <option value="analista" ${perfil.rol === 'analista' ? 'selected' : ''}>Analista</option>
                            <option value="directivos" ${perfil.rol === 'directivos' ? 'selected' : ''}>Directivos</option>
                            <option value="admin" ${perfil.rol === 'admin' ? 'selected' : ''}>Administrador</option>
                        </select>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <input type="checkbox" id="edit-estado" class="h-4 w-4 text-blue-600 bg-slate-700 border-slate-600 rounded" ${perfil.estado ? 'checked' : ''}>
                    <label class="text-slate-400 text-sm">Usuario activo</label>
                </div>
                <div class="flex justify-end space-x-3 pt-4 border-t border-slate-700">
                    <button type="button" id="btn-cerrar-modal" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded">Cancelar</button>
                    <button type="submit" id="btn-guardar-usuario" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold">Guardar</button>
                </div>
            </form>
        </div>`;
    document.getElementById('btn-cerrar-modal').addEventListener('click', cerrarModal);
    document.getElementById('form-usuario').addEventListener('submit', manejarSubmitUsuario);
}

export function cerrarModal() {
    const modal = document.getElementById('modal-usuario');
    modal.classList.add('hidden');
    modal.innerHTML = '';
}

export async function manejarSubmitUsuario(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-guardar-usuario');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    const id = document.getElementById('user-id').value;
    const nombre = document.getElementById('edit-nombre').value.trim();
    const departamento = document.getElementById('edit-departamento').value;
    const rol = document.getElementById('edit-rol').value;
    const estado = document.getElementById('edit-estado').checked;

    try {
        if (!id) {
            alert('Para crear un usuario nuevo, ve al panel de Supabase (Authentication → Add User) y sigue las instrucciones mostradas en este modal.');
            return;
        }

        // Verificar que el usuario que guarda es admin
        const rolActual = await obtenerRolVerificado();
        if (rolActual !== 'admin') {
            throw new Error('Solo administradores pueden modificar usuarios');
        }

        // Actualizar vía RPC (SECURITY DEFINER)
        const { data, error } = await supabase.rpc('admin_actualizar_usuario', {
            p_user_id: id,
            p_rol: rol,
            p_departamento: departamento,
            p_nombre_completo: nombre,
            p_estado: estado
        });

        if (error) throw new Error(error.message);

        cerrarModal();
        setTimeout(() => renderizarLista(), 300);
    } catch (err) {
        console.error('Error:', err);
        alert('Error al guardar usuario: ' + (err.message || JSON.stringify(err)));
    } finally {
        btn.disabled = false;
        btn.textContent = 'Guardar';
    }
}
