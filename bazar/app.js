/* SISTEMA DE TICKETS: FERRETERIA EL BAZAR
   CONTROLADOR DE IMPRESIÓN BLUETOOTH Y RENDERIZADO GRÁFICO (OPTIMIZADO PARA 58MM)
*/

let printerChar = null;
let productosVenta = [];
let currentPaper = 58;

const PAPER_PROFILES = {
    58: { width: 384, fontSize: 18, smallSize: 15, limit: 22 },
    80: { width: 576, fontSize: 25, smallSize: 20, limit: 32 }
};

function setPaper(size) {
    currentPaper = size;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    const chip = document.getElementById(`chip${size}`);
    if(chip) chip.classList.add('active');
}

// --- ENCABEZADO GRÁFICO (CORREGIDO BLOQUE BENEF Y RE-ALINEACIONES) ---
async function getHeaderBazar(datos) {
    const cfg = PAPER_PROFILES[currentPaper];
    const canvas = document.createElement('canvas');
    const h = 265;
    canvas.width = cfg.width; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, h);
    ctx.fillStyle = "black";
    ctx.textAlign = "center";

    let y = 25;
    ctx.font = `bold ${cfg.fontSize}px Arial`;
    ctx.fillText(datos.empNombre, canvas.width/2, y);

    ctx.font = `${cfg.smallSize - 1}px Arial`;
    y += 20; ctx.fillText(datos.empPropietario, canvas.width/2, y);
    y += 18; ctx.fillText(datos.empRfc, canvas.width/2, y);
    y += 18; ctx.fillText(datos.empDireccion, canvas.width/2, y);

    // --- NUEVO AJUSTE EXIGIDO: BENEF: REMP ---
    y += 25; ctx.font = `bold ${cfg.fontSize - 1}px Arial`;
    ctx.fillText(`BENEF:  ${datos.docTipo}`, canvas.width/2, y);
    y += 20; ctx.fillText(`FOLIO:  ${datos.docFolio}`, canvas.width/2, y);

    y += 20; ctx.font = `${cfg.smallSize}px Arial`;
    ctx.fillText(`FECHA:  ${datos.fecha} ${datos.hora}`, canvas.width/2, y);

    // Datos del Cliente
    y += 25; ctx.textAlign = "left";
    ctx.font = `${cfg.smallSize}px Arial`;
    ctx.fillText(`Cliente: ${datos.cliNombre}`, 5, y);
    y += 18; ctx.fillText(`RFC: ${datos.cliRfc}`, 5, y);

    // Separador exacto
    y += 15; ctx.textAlign = "center";
    ctx.font = `bold ${cfg.smallSize}px Arial`;
    ctx.fillText("--------------------------------", canvas.width/2, y);

    return canvasToBytes(ctx, canvas.width, h);
}

// --- CUERPO DE PRODUCTOS (CORREGIDO: INCLUSIÓN NATIVA DE ENCABEZADOS CON FILA INVERTIDA) ---
async function getBodyBazar(productos) {
    const cfg = PAPER_PROFILES[currentPaper];
    const canvas = document.createElement('canvas');
    const rowH = 40;
    // Añadimos 35px de alto extra para acomodar la fila fija de títulos
    const h = (productos.length * rowH) + 130;
    canvas.width = cfg.width; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, h);

    // --- NUEVA BARRA NEGRA PARA ENCABEZADO DE TABLA ---
    let y = 5;
    ctx.fillStyle = "black";
    // Dibujamos un rectángulo negro de 24px de alto que cubre todo el ancho del papel
    ctx.fillRect(0, y, canvas.width, 24);

    // --- TEXTO EN BLANCO ENTRANDO AL CUADRO NEGRO ---
    y += 17; // Ajustamos la altura de la línea para centrar el texto verticalmente en la barra
    ctx.textAlign = "left";
    ctx.font = `bold ${cfg.smallSize - 1}px Arial`;
    ctx.fillStyle = "white"; // Cambiamos el color de la fuente a blanco
    ctx.fillText("CANT.  DESCRIPCION.   VALOR.   IMPORTE", 5, y);

    // --- REGRESAMOS A MODO NORMAL (TEXTO NEGRO) PARA LOS PRODUCTOS ---
    ctx.fillStyle = "black";

    y += 15; // Bajamos el cursor gráfico para empezar a escribir productos sin encimarse
    let subtotal = 0;

    productos.forEach(p => {
        ctx.textAlign = "left";
        ctx.font = `${cfg.smallSize}px Arial`;
        ctx.fillText(p.cant.toFixed(3), 5, y);
        ctx.fillText("000", 12, y + 15);

        ctx.font = `bold ${cfg.smallSize}px Arial`;
        ctx.fillText(p.desc.substring(0, cfg.limit), 55, y);

        ctx.font = `${cfg.smallSize - 3}px Arial`;
        ctx.fillText(p.cod, 55, y + 15);

        ctx.textAlign = "right";
        ctx.font = `${cfg.smallSize - 1}px Arial`;
        ctx.fillText(p.pUnit.toFixed(2), canvas.width - 85, y);

        ctx.font = `bold ${cfg.smallSize}px Arial`;
        ctx.fillText(p.importe.toFixed(2), canvas.width - 5, y);

        subtotal += p.importe;
        y += rowH;
    });

    let desc = 0.00;
    let iva = subtotal * 0.16;
    let subSinIva = subtotal - iva;

    y += 10;
    ctx.font = `${cfg.smallSize}px Arial`;
    ctx.textAlign = "right";
    ctx.fillText(`Subtotal:      ${subSinIva.toFixed(2)}`, canvas.width - 5, y);
    y += 16; ctx.fillText(`Descuentos:        ${desc.toFixed(2)}`, canvas.width - 5, y);
    y += 16; ctx.fillText(`IVA:       ${iva.toFixed(2)}`, canvas.width - 5, y);
    y += 22; ctx.font = `bold ${cfg.fontSize}px Arial`;
    ctx.fillText(`Total:  $${subtotal.toFixed(2)}`, canvas.width - 5, y);

    return canvasToBytes(ctx, canvas.width, h);
}

// --- PIE DE PÁGINA ---
async function getFooterBazar() {
    const cfg = PAPER_PROFILES[currentPaper];
    const canvas = document.createElement('canvas');
    const h = 55;
    canvas.width = cfg.width; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, h);
    ctx.fillStyle = "black";
    ctx.textAlign = "center";

    let y = 22;
    ctx.font = `italic ${cfg.smallSize - 3}px Arial`;
    ctx.fillText("Este documento es una representation impresa de un CFDI", canvas.width/2, y);

    return canvasToBytes(ctx, canvas.width, h);
}

// --- CONVERSOR BINARIO A MATRIZ ESC/POS ---
function canvasToBytes(ctx, w, h) {
    const imgData = ctx.getImageData(0, 0, w, h);
    const bytesPerRow = w / 8;
    const data = new Uint8Array(8 + (bytesPerRow * h));
    data.set([0x1D, 0x76, 0x30, 0x00, bytesPerRow & 0xFF, (bytesPerRow >> 8) & 0xFF, h & 0xFF, (h >> 8) & 0xFF]);
    let pos = 8;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < bytesPerRow; x++) {
            let b = 0;
            for (let i = 0; i < 8; i++) {
                const idx = (y * w + (x * 8 + i)) * 4;
                const gray = (imgData.data[idx] * 0.299 + imgData.data[idx+1] * 0.587 + imgData.data[idx+2] * 0.114);
                if (gray < 200) b |= (0x80 >> i);
            }
            data[pos++] = b;
        }
    }
    return data;
}

// --- INICIALIZACIÓN Y EVENTOS ---
window.onload = () => {
    const ahora = new Date();
    document.getElementById('fechaManual').valueAsDate = ahora;
    document.getElementById('horaManual').value = ahora.getHours().toString().padStart(2, '0') + ":" + ahora.getMinutes().toString().padStart(2, '0');

    document.getElementById('btnConnect').onclick = async () => {
        try {
            const device = await navigator.bluetooth.requestDevice({
                filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
                optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
            });
            const server = await device.gatt.connect();
            const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
            printerChar = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

            document.getElementById('led').className = 'led-on';
            document.getElementById('statusText').textContent = "Conectado Exitosamente";
            document.getElementById('btnTest').disabled = false;
        } catch (e) {
            alert("Error de conexión: " + e.message);
        }
    };

    document.getElementById('btnAdd').onclick = () => {
        const desc = document.getElementById('prodDesc').value.toUpperCase();
        const cant = parseFloat(document.getElementById('prodCant').value) || 1.000;
        const pUnit = parseFloat(document.getElementById('prodPrice').value);
        const cod = document.getElementById('prodCod').value || "COD-ART";

        if (!desc || isNaN(pUnit)) {
            alert("Completa la Descripción y el Precio del artículo.");
            return;
        }

        productosVenta.push({ cod, desc, cant, pUnit, importe: cant * pUnit });

        const tbody = document.querySelector('#listaPrevia tbody');
        tbody.innerHTML += `<tr>
            <td>${cant.toFixed(3)}</td>
            <td><b>${desc}</b><br><span style="font-size:11px;color:#a1b0cb">${cod}</span></td>
            <td style="text-align:right;">$${(cant*pUnit).toFixed(2)}</td>
        </tr>`;

        const totalAcumulado = productosVenta.reduce((s, p) => s + p.importe, 0);
        document.getElementById('totalLabel').textContent = `TOTAL: $${totalAcumulado.toFixed(2)}`;

        document.getElementById('prodDesc').value = "";
        document.getElementById('prodPrice').value = "";
        document.getElementById('prodCod').value = "";
    };

    document.getElementById('btnTest').onclick = async () => {
        if (!printerChar || productosVenta.length === 0) return;

        const datosCampos = {
            empNombre: document.getElementById('empNombre').value.toUpperCase(),
            empPropietario: document.getElementById('empPropietario').value.toUpperCase(),
            empRfc: document.getElementById('empRfc').value.toUpperCase(),
            empDireccion: document.getElementById('empDireccion').value,
            docTipo: document.getElementById('docTipo').value.toUpperCase(),
            docFolio: document.getElementById('docFolio').value,
            fecha: document.getElementById('fechaManual').value.split('-').reverse().join('/'),
            hora: document.getElementById('horaManual').value,
            cliNombre: document.getElementById('cliNombre').value.toUpperCase(),
            cliRfc: document.getElementById('cliRfc').value.toUpperCase()
        };

        const h1 = await getHeaderBazar(datosCampos);
        const body = await getBodyBazar(productosVenta);
        const foot = await getFooterBazar();

        const data = new Uint8Array([0x1B, 0x40, ...h1, ...body, ...foot, 0x1B, 0x64, 0x04]);

        for (let i = 0; i < data.length; i += 20) {
            await printerChar.writeValue(data.slice(i, i + 20));
        }
    };

    document.getElementById('btnReset').onclick = () => location.reload();
};
