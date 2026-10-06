// ocp Utilidades compartidas del módulo de Mantenimiento
import { escapeHtml } from '../../utils-storage.js';

// ocp Áreas de planta según SGI-PAS
export const AREAS_PLANTA = [
    { value: '400', label: 'Área 400 — Sistema de compresores' },
    { value: '420', label: 'Área 420 — Sistema de vapor (caldera auxiliar)' },
    { value: '430', label: 'Área 430 — Sistema de azufre y fundición' },
    { value: '120', label: 'Área 120 — Sistema de gases y combustión' },
    { value: '310', label: 'Área 310 — Sistema de despacho de ácido' },
    { value: 'tanque_concreto', label: 'Tanque de concreto — Almacenamiento de agua' }
];

// ocp Criticidad según SGI-PAS
export const CRITICIDADES = [
    { value: 'A', label: 'A — Crítico', color: 'bg-red-900/50 text-red-300 border-red-700' },
    { value: 'B', label: 'B — Esencial', color: 'bg-yellow-900/50 text-yellow-300 border-yellow-700' },
    { value: 'C', label: 'C — No crítico', color: 'bg-green-900/50 text-green-300 border-green-700' }
];

// ocp Estados de equipo
export const ESTADOS_EQUIPO = [
    { value: 'operativo', label: 'Operativo', color: 'bg-green-900/50 text-green-300' },
    { value: 'mantenimiento', label: 'En mantenimiento', color: 'bg-yellow-900/50 text-yellow-300' },
    { value: 'fuera_servicio', label: 'Fuera de servicio', color: 'bg-red-900/50 text-red-300' },
    { value: 'baja', label: 'Baja', color: 'bg-slate-700 text-slate-400' }
];

// ocp Tipos de equipo
export const TIPOS_EQUIPO = [
    'bomba', 'valvula', 'motor', 'soplador', 'compresor',
    'intercambiador', 'tanque', 'instrumento', 'tuberia', 'otro'
];

// ocp Sistemas de planta según SGI-PAS
export const SISTEMAS_PLANTA = [
    'Sistema de compresores',
    'Sistema de vapor',
    'Sistema de agua',
    'Sistema de azufre',
    'Sistema de fundición de azufre',
    'Sistema de gases',
    'Sistema de vapores',
    'Sistema de enfriamiento',
    'Sistema de combustión',
    'Sistema de adsorción',
    'Sistema de absorción',
    'Sistema de despacho de ácido',
    'Sistema de almacenamiento',
    'Sistema contra incendio'
];

// ocp Estrategias de mantenimiento según SGI-PAS
export const ESTRATEGIAS_MANTENIMIENTO = [
    { value: 'preventivo_sistematico', label: 'Preventivo sistemático' },
    { value: 'autonomo', label: 'Autónomo' },
    { value: 'predictivo', label: 'Predictivo' },
    { value: 'correctivo_planificado', label: 'Correctivo planificado' }
];

// ocp Formatear fecha a formato local con hora
export function formatearFecha(fecha) {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' });
}

// ocp Formatear solo fecha (sin hora)
export function formatearFechaCorta(fecha) {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-VE');
}

// ocp Badge HTML para clase de criticidad
export function badgeCriticidad(clase) {
    const item = CRITICIDADES.find(c => c.value === clase) || CRITICIDADES[2];
    return `<span class="px-2 py-0.5 rounded text-xs font-semibold border ${item.color}">${escapeHtml(item.value)}</span>`;
}

// ocp Badge HTML para estado del equipo
export function badgeEstado(estado) {
    const item = ESTADOS_EQUIPO.find(e => e.value === estado) || ESTADOS_EQUIPO[0];
    return `<span class="px-2 py-0.5 rounded text-xs font-semibold ${item.color}">${escapeHtml(item.label)}</span>`;
}

// ocp Obtener label de área por value
export function labelArea(value) {
    const item = AREAS_PLANTA.find(a => a.value === value);
    return item ? item.label : (value || '—');
}
