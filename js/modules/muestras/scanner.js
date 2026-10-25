// ocp Componente de escaneo QR con la cámara del dispositivo
export class EscanerQR {
    constructor(elementId) {
        this.elementId = elementId;
        this.html5QrCode = null;
    }

    async iniciar(onScanSuccess) {
        this.html5QrCode = new Html5Qrcode(this.elementId);
        
        const config = {
            fps: 10, // Cuadros por segundo
            qrbox: { width: 250, height: 250 }, // Área de enfoque
            aspectRatio: 1.0
        };

        try {
            await this.html5QrCode.start(
                { facingMode: "environment" }, // Usar cámara trasera
                config,
                (decodedText) => {
                    // Al leer con éxito, detenemos la cámara y devolvemos el texto
                    this.detener().then(() => onScanSuccess(decodedText));
                },
                (errorMessage) => {
                    // Ignorar errores de lectura continua
                }
            );
        } catch (err) {
            console.error("Error al iniciar cámara:", err);
            alert("No se pudo acceder a la cámara. Verifique los permisos del navegador.");
        }
    }

    async detener() {
        if (this.html5QrCode) {
            try {
                await this.html5QrCode.stop();
                this.html5QrCode.clear();
            } catch (err) {
                console.warn("Error al detener cámara:", err);
            }
        }
    }
}