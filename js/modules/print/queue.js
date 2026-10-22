// ocp Utilidad para enviar documentos a la cola de impresión de Sala de Control
import { supabase } from '../../supabase-client.js';

export async function enviarASalaControl(htmlString, tipoDoc, nombreArchivo) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No autenticado');

        // 1. Subir HTML a Storage (bucket print_queue)
        const fileName = `jobs/${Date.now()}_${nombreArchivo}.html`;
        const blob = new Blob([htmlString], { type: 'text/html' });
        
        const { error: uploadError } = await supabase.storage
            .from('print_queue')
            .upload(fileName, blob, { contentType: 'text/html' });

        if (uploadError) throw new Error('Error al subir documento: ' + uploadError.message);

        // 2. Registrar el trabajo en la base de datos
        const { data, error } = await supabase.rpc('registrar_print_job', {
            p_tipo_doc: tipoDoc,
            p_archivo_url: fileName
        });

        if (error) throw error;

        // 3. Alerta si la cola está larga
        if (data.pendientes >= 5) {
            const mensaje = `⚠️ Hay ${data.pendientes} documentos en cola. Verifique que la PC de Sala de Control esté encendida y el agente de impresión corriendo.`;
            alert(mensaje);
            
            // Enviar push al admin/supervisor (opcional, usando tu función existente)
            const { enviarPushARoles } = await import('../../push.js');
            enviarPushARoles(['admin', 'supervisor'], mensaje);
        } else {
            alert('✅ Documento enviado a la cola de Sala de Control.');
        }

    } catch (err) {
        console.error('Error en cola de impresión:', err);
        alert('Error al enviar a Sala de Control: ' + err.message);
    }
}