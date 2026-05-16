let printerChar = null;

// Comandos ESC/POS estándar
const ESC = {
    INIT: [0x1B, 0x40],
    CENTER: [0x1B, 0x61, 0x01],
    LEFT: [0x1B, 0x61, 0x00],
    BOLD_ON: [0x1B, 0x45, 0x01],
    BOLD_OFF: [0x1B, 0x45, 0x00],
    FEED: [0x0A, 0x0A, 0x0A, 0x0A]
};

// --- CONEXIÓN BLUETOOTH ---
document.getElementById('btnConnect').addEventListener('click', async () => {
    try {
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }]
        });
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
        printerChar = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

        document.getElementById('statusIndicator').classList.add('online');
        document.getElementById('statusText').textContent = "Estado: ¡CONECTADO!";
        document.getElementById('btnTest').disabled = false;
    } catch (e) {
        alert("Error de conexión: " + e.message);
    }
});

// --- IMPRESIÓN DE PRUEBA ---
document.getElementById('btnTest').addEventListener('click', async () => {
    if (!printerChar) return;
    const enc = new TextEncoder();

    const ticket = new Uint8Array([
        ...ESC.INIT,
        ...ESC.CENTER,
        ...ESC.BOLD_ON,
        ...enc.encode("FERRETERIA WITZI\n"),
        ...ESC.BOLD_OFF,
        ...enc.encode("Prueba de Identidad Visual\n"),
        ...enc.encode("--------------------------------\n"),
        ...ESC.LEFT,
        ...enc.encode("ESTADO:    CONEXION OK\n"),
        ...enc.encode("ARCHIVO:   app.js\n"),
        ...enc.encode("MENSAJE:   HOLA MUNDO\n"),
        ...enc.encode("--------------------------------\n"),
        ...ESC.CENTER,
        ...enc.encode("LISTO PARA CONFIGURAR LOGO\n"),
        ...ESC.FEED
    ]);

    // Envío por paquetes de 20 bytes
    for (let i = 0; i < ticket.length; i += 20) {
        await printerChar.writeValue(ticket.slice(i, i + 20));
    }
});
