document.getElementById('btnPrint').addEventListener('click', async () => {
    const statusDiv = document.getElementById('status');
    statusDiv.style.color = '#03dac6';
    statusDiv.textContent = "Buscando tiquetera Bluetooth...";

    try {
        // 1. Cargar la imagen local "logo.png" desde la carpeta del proyecto
        const img = new Image();
        img.src = 'logo.png';

        // Esperamos a que el logo cargue en memoria de forma asíncrona
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new Error("No se pudo cargar el archivo 'logo.png'. Verifica que esté en la misma carpeta que el index.html"));
        });

        // 2. Crear el Canvas invisible para el procesamiento Maxi-Grande (58mm)
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Ancho físico estricto de las tiqueteras de 58mm (384 puntos)
        const anchoImpresion = 384;

        // Aplicamos el escalado proporcional aumentado (* 1.5) para que el logo luzca enorme y detallado
        const altoImpresion = Math.round((img.height * anchoImpresion) / img.width) * 1.5;

        canvas.width = anchoImpresion;
        canvas.height = altoImpresion;

        // Dibujamos el logo expandido verticalmente en el lienzo virtual
        ctx.drawImage(img, 0, 0, anchoImpresion, altoImpresion);

        // Extraemos la matriz de píxeles RGBA
        const imageData = ctx.getImageData(0, 0, anchoImpresion, altoImpresion);
        const pixeles = imageData.data;

        // 3. Algoritmo de Umbral Monocromático de Alto Contraste
        const bytesPorLinea = anchoImpresion / 8; // 384 puntos / 8 bits = 48 bytes por línea
        const totalBytesMapeados = bytesPorLinea * altoImpresion;
        const bitmapImpresion = new Uint8Array(totalBytesMapeados);

        let indiceByte = 0;
        for (let y = 0; y < altoImpresion; y++) {
            for (let x = 0; x < bytesPorLinea; x++) {
                let byteActual = 0;

                // Agrupamos bloques horizontales de 8 píxeles en un solo byte binario
                for (let bit = 0; bit < 8; bit++) {
                    const pixelX = (x * 8) + bit;
                    const indicePixel = ((y * anchoImpresion) + pixelX) * 4;

                    const r = pixeles[indicePixel];
                    const g = pixeles[indicePixel + 1];
                    const b = pixeles[indicePixel + 2];
                    const a = pixeles[indicePixel + 3];

                    // Convertimos el píxel a escala de grises basada en luminancia humana
                    let gris = 0.2126 * r + 0.7152 * g + 0.0722 * b;

                    // Si el píxel es transparente en el PNG, lo forzamos a blanco
                    if (a < 128) gris = 255;

                    // Filtro de quema: si el tono es oscuro (menor a 128), activamos el bit de calor negro
                    if (gris < 128) {
                        byteActual |= (0x80 >> bit);
                    }
                }
                bitmapImpresion[indiceByte++] = byteActual;
            }
        }

        // 4. Conexión nativa por Web Bluetooth API
        const device = await navigator.bluetooth.requestDevice({
            filters: [
                { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // Canal de datos genérico
                { namePrefix: 'MTP' },
                { namePrefix: 'PT' },
                { namePrefix: 'RP' }
            ],
            optionalServices: ['00001101-0000-1000-8000-00805f9b34fb']
        });

        statusDiv.textContent = `Conectando a ${device.name}...`;
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
        const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

        statusDiv.textContent = "Transfiriendo logotipo maxi-grande...";

        // 5. Preparación de comandos ESC/POS para Raster Bitmaps
        const ESC = 0x1B;
        const GS = 0x1D;

        const initPrinter = new Uint8Array([ESC, 0x40]);    // Resetea y limpia el búfer de la impresora
        const centerAlign = new Uint8Array([ESC, 0x61, 1]); // Centrado absoluto en el papel de 58mm

        // Estructura de comando estándar GS v 0 (Modo rasterizado)
        const xL = bytesPorLinea & 0xFF;
        const xH = (bytesPorLinea >> 8) & 0xFF;
        const yL = altoImpresion & 0xFF;
        const yH = (altoImpresion >> 8) & 0xFF;

        const comandoImagen = new Uint8Array([GS, 0x76, 0x30, 0, xL, xH, yL, yH]);
        const lineFeed = new Uint8Array([0x0A, 0x0A, 0x0A]); // Empuja el papel tres líneas para facilitar el corte

        // Ejecución de la transmisión serie
        await characteristic.writeValue(initPrinter);
        await characteristic.writeValue(centerAlign);
        await characteristic.writeValue(comandoImagen);

        // Segmentamos el mapa de bits masivo en ráfagas de 20 bytes para proteger el búfer Bluetooth
        const chunkSize = 20;
        for (let i = 0; i < bitmapImpresion.length; i += chunkSize) {
            const chunk = bitmapImpresion.slice(i, i + chunkSize);
            await characteristic.writeValue(chunk);
        }

        // Mandamos los saltos de línea para terminar de expulsar el ticket
        await characteristic.writeValue(lineFeed);

        statusDiv.style.color = '#03dac6';
        statusDiv.textContent = "¡Logotipo gigante impreso con éxito!";

    } catch (error) {
        console.error(error);
        statusDiv.style.color = '#ff7597';
        statusDiv.textContent = `Error: ${error.message}`;
    }
});
