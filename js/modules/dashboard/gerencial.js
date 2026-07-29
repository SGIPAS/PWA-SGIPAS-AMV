// ocp Resumen Gerencial – KPIs estratégicos mensuales
import { supabase } from '../../supabase-client.js';

export async function renderizarGerencial(contenedor) {
    const ahora = new Date();
    const mes = ahora.getMonth();
    const anio = ahora.getFullYear();
    const inicioMes = new Date(anio, mes, 1).toISOString().split('T')[0];
    const finMes = new Date(anio, mes + 1, 0).toISOString().split('T')[0];

    contenedor.innerHTML = `<p class="text-slate-400 animate-pulse">Cargando resumen gerencial...</p>`;

    try {
        // Consultar datos agregados del mes
        const [
            acidoRes, fundicionRes, otRes, emisionesRes, inventarioRes
        ] = await Promise.all([
            supabase.from('analisis_acido').select('concentracion').gte('fecha_registro', inicioMes).lte('fecha_registro', finMes),
            supabase.from('fundicion_diaria').select('big_bags').gte('fecha_registro', inicioMes).lte('fecha_registro', finMes),
            supabase.from('ordenes_trabajo').select('estado, fecha_solicitud, fecha_cierre').gte('fecha_solicitud', inicioMes).lte('fecha_solicitud', finMes),
            supabase.from('emisiones_so2').select('ppm_so2').gte('fecha_registro', inicioMes).lte('fecha_registro', finMes),
            supabase.from('inventario_movimientos').select('tipo_movimiento, peso_neto, toneladas_despachadas').gte('fecha_movimiento', inicioMes).lte('fecha_movimiento', finMes)
        ]);

        // Producción de ácido: promedio de concentración y total de big bags
        const concProm = acidoRes.data?.length ? (acidoRes.data.reduce((s, a) => s + a.concentracion, 0) / acidoRes.data.length).toFixed(2) : '--';
        const totalBB = fundicionRes.data?.reduce((s, f) => s + (f.big_bags || 0), 0) ?? 0;

        // OTs
        const totalOT = otRes.data?.length ?? 0;
        const cerradas = otRes.data?.filter(o => o.estado === 'cerrada').length ?? 0;
        const pendientes = otRes.data?.filter(o => o.estado === 'pendiente').length ?? 0;

        // Emisiones promedio
        const so2Prom = emisionesRes.data?.length ? (emisionesRes.data.reduce((s, e) => s + e.ppm_so2, 0) / emisionesRes.data.length).toFixed(1) : '--';

        // Inventario: entradas de azufre, salidas de ácido
        let entradaAzufre = 0, salidaAcido = 0;
        (inventarioRes.data || []).forEach(m => {
            if (m.tipo_movimiento === 'recepcion_solido' || m.tipo_movimiento === 'recepcion_liquido') {
                entradaAzufre += (m.peso_neto || 0);
            } else {
                salidaAcido += (m.toneladas_despachadas || 0);
            }
        });

        contenedor.innerHTML = `
            <h2 class="text-2xl font-bold text-white mb-6">${ahora.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })}</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div class="bg-slate-900 p-6 rounded border border-slate-700">
                    <h3 class="text-lg font-semibold text-slate-300">Producción de Ácido</h3>
                    <p class="text-3xl font-bold text-white mt-2">${concProm} %</p>
                    <p class="text-sm text-slate-400">Concentración promedio</p>
                </div>
                <div class="bg-slate-900 p-6 rounded border border-slate-700">
                    <h3 class="text-lg font-semibold text-slate-300">Fundición</h3>
                    <p class="text-3xl font-bold text-white mt-2">${totalBB} BB</p>
                    <p class="text-sm text-slate-400">Big Bags totales</p>
                </div>
                <div class="bg-slate-900 p-6 rounded border border-slate-700">
                    <h3 class="text-lg font-semibold text-slate-300">Órdenes de Trabajo</h3>
                    <p class="text-3xl font-bold text-white mt-2">${totalOT}</p>
                    <p class="text-sm text-slate-400">Creadas: ${totalOT} | Cerradas: ${cerradas} | Pendientes: ${pendientes}</p>
                </div>
                <div class="bg-slate-900 p-6 rounded border border-slate-700">
                    <h3 class="text-lg font-semibold text-slate-300">Emisiones SO₂</h3>
                    <p class="text-3xl font-bold text-white mt-2">${so2Prom} ppm</p>
                    <p class="text-sm text-slate-400">Promedio mensual</p>
                </div>
                <div class="bg-slate-900 p-6 rounded border border-slate-700">
                    <h3 class="text-lg font-semibold text-slate-300">Inventario</h3>
                    <p class="text-xl font-bold text-white mt-2">Entrada Azufre: ${entradaAzufre.toFixed(1)} ton</p>
                    <p class="text-xl font-bold text-white">Salida Ácido: ${salidaAcido.toFixed(1)} ton</p>
                </div>
                <div class="bg-slate-900 p-6 rounded border border-slate-700">
                    <h3 class="text-lg font-semibold text-slate-300">Seguridad</h3>
                    <p class="text-3xl font-bold text-white mt-2">—</p>
                    <p class="text-sm text-slate-400">Días sin accidentes (próx.)</p>
                </div>
            </div>
        `;
    } catch (err) {
        contenedor.innerHTML = `<p class="text-red-500">Error al cargar el resumen: ${err.message}</p>`;
        console.error(err);
    }
}