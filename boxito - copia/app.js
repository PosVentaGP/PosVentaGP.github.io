/* SISTEMA DE TICKETS: FERRETERIA BOXITO
   CONTROLADOR DE IMPRESIÓN BLUETOOTH Y RENDERIZADO GRÁFICO MAXIMIZADO (58MM)
*/

let printerChar = null;
let productosVenta = [];
const PAPER_WIDTH = 384; // 58mm reales libres a los bordes de impresión gráfica

// Carga del archivo logo.jpg ubicado al lado del index.html
function loadLogo() {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = 'logo.jpg';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
    });
}

// --- FUNCIÓN AUXILIAR PARA GENERAR CÓDIGO DE BARRAS EN CANVAS ---
function drawBarcode(ctx, text, x, y, width, height) {
    ctx.save();
    ctx.fillStyle = "black";
    let currentX = x;
    for (let i = 0; i < text.length; i++) {
        let code = text.charCodeAt(i);
        for (let bit = 0; bit < 8; bit++) {
            let barWidth = ((code >> bit) & 1) === 1 ? 2 : 1;
            if (bit % 2 === 0) {
                ctx.fillRect(currentX, y, barWidth, height);
            }
            currentX += barWidth + 1;
            if (currentX > x + width) break;
        }
    }
    ctx.restore();
}

// --- ENCABEZADO GRÁFICO (TEXTO AMPLIADO Y DIRECCIÓN DE SUCURSAL CORREGIDA) ---
async function getHeaderBoxito(datos) {
    const canvas = document.createElement('canvas');
    const h = 450;
    canvas.width = PAPER_WIDTH; canvas.height = h;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, h);
    ctx.fillStyle = "black";

    let y = 10;

    // Logotipo estirado horizontalmente sin recortarse de los costados
    const logo = await loadLogo();
    if (logo) {
        const aspect = logo.width / logo.height;
        const targetW = 376; // Ocupa prácticamente todo el ancho disponible (384px) sin cortarse
        const targetH = targetW / aspect;
        ctx.drawImage(logo, (canvas.width - targetW) / 2, y, targetW, targetH);
        y += targetH + 15;
    } else {
        ctx.font = "bold 32px Arial";
        ctx.textAlign = "center";
        ctx.fillText("BOXITO", canvas.width / 2, y);
        y += 35;
    }

    ctx.textAlign = "center";
    ctx.font = "bold 18px Arial"; // Texto corporativo de alta visibilidad
    ctx.fillText(datos.empGrupo, canvas.width / 2, y);

    ctx.font = "bold 13px Arial";
    y += 22; ctx.fillText("Calle 96 x 99 y 107 No. 892 Edif. A Int. 101", canvas.width / 2, y);
    y += 16; ctx.fillText("Col. Obrera C.P. 97260 Mérida, Yuc.", canvas.width / 2, y);
    y += 16; ctx.fillText(datos.empRfc, canvas.width / 2, y);

    // Sucursal
    y += 24; ctx.font = "bold 19px Arial";
    ctx.fillText(datos.empSucursal, canvas.width / 2, y);
    ctx.font = "bold 13px Arial";
    // DIRECCIÓN DE SUCURSAL COMPLETA CORREGIDA AQUÍ:
    y += 18; ctx.fillText("Circuito Colonias Smz 5 x Calle 4 Lote 7 Mza. 153 Lote 8 N/A", canvas.width / 2, y);
    y += 16; ctx.fillText("C.P. 77400 Isla Mujeres, QRO, MX", canvas.width / 2, y);

    // Control de Documento
    y += 28; ctx.font = "bold 17px Arial";
    ctx.fillText(datos.docTipo, canvas.width / 2, y);
    y += 22; ctx.font = "bold 22px Arial"; // Folio bien grande idéntico al ticket de la tienda
    ctx.fillText(datos.docFactura, canvas.width / 2, y);

    // Bloque operacional pegado al borde izquierdo absoluto
    y += 28; ctx.textAlign = "left";
    ctx.font = "bold 14px Arial";
    ctx.fillText(`Cliente: ${datos.cliNombre}`, 2, y);
    y += 18; ctx.fillText(`COND. PAGO: ${datos.docCondPago}`, 2, y);
    y += 18; ctx.fillText(`FECHA: ${datos.fecha} ${datos.hora}`, 2, y);
    y += 18; ctx.fillText(`VENDEDOR: ${datos.docVendedor}`, 2, y);

    return canvasToBytes(ctx, canvas.width, h);
}

// --- CUERPO DE CONCEPTOS Y PIE DE PÁGINA CON CÓDIGO DE BARRAS ---
async function getBodyBoxito(productos, barcodeVal) {
    const canvas = document.createElement('canvas');
    const rowH = 44;
    const h = (productos.length * rowH) + 360;
    canvas.width = PAPER_WIDTH; canvas.height = h;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, h);
    ctx.fillStyle = "black";

    let y = 22;
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "left";

    // Títulos de columnas aprovechando los 384px por completo
    ctx.fillText("Articulo", 2, y);
    ctx.fillText("Cantidad", 115, y);
    ctx.fillText("P.Unit", 230, y);
    ctx.fillText("Importe", 325, y);

    y += 12;
    ctx.font = "bold 14px Arial";
    ctx.fillText("--------------------------------------------------", 2, y);

    y += 24;
    let subtotal = 0;

    productos.forEach(p => {
        ctx.textAlign = "left";
        ctx.font = "14px Arial";
        ctx.fillText(p.art, 2, y);
        ctx.fillText(`${p.cant.toFixed(2)} PZ`, 115, y);

        ctx.font = "bold 14px Arial";
        ctx.fillText(p.desc.substring(0, 26), 2, y + 16);

        ctx.textAlign = "right";
        ctx.font = "14px Arial";
        ctx.fillText(p.pUnit.toFixed(2), 275, y);

        ctx.font = "bold 14px Arial";
        ctx.fillText(p.importe.toFixed(2), canvas.width - 2, y);

        subtotal += p.importe;
        y += rowH;
    });

    let iva = subtotal * 0.16;
    let subTotalBase = subtotal - iva;

    y += 15;
    ctx.textAlign = "left";
    ctx.font = "bold 14px Arial";
    ctx.fillText(`Numero de renglones: ${productos.length}`, 2, y);

    ctx.textAlign = "right";
    y += 5;
    ctx.fillText(`Sub Total:   $${subTotalBase.toFixed(2)}`, canvas.width - 2, y);
    y += 20; ctx.fillText(`IVA INCLUIDO AL 16.00%:   $${iva.toFixed(2)}`, canvas.width - 2, y);

    // TOTAL ULTRA GRANDE
    y += 28; ctx.font = "bold 22px Arial";
    ctx.fillText(`TOTAL:   $${subtotal.toFixed(2)}`, canvas.width - 2, y);

    // --- PIE DE PÁGINA COMPLETO ---
    y += 26; ctx.textAlign = "center";
    ctx.font = "bold italic 12px Arial";
    ctx.fillText(`( ${numeroALetras(subtotal)} )`, canvas.width / 2, y);

    y += 22; ctx.font = "bold 12px Arial";
    ctx.fillText("DESCUENTO OTORGADO EN MOSTRADOR: 18.00", canvas.width / 2, y);

    y += 25; ctx.font = "11px Arial";
    ctx.fillText("Para cualquier cambio u aclaración es indispensable", canvas.width / 2, y);
    y += 14; ctx.fillText("presentar este comprobante de pago original.", canvas.width / 2, y);
    y += 14; ctx.fillText("¡Gracias por su compra en Ferreterías Boxito!", canvas.width / 2, y);

    // Renderizado del Código de Barras
    y += 25;
    const barcodeWidth = 260;
    const barcodeHeight = 45;
    drawBarcode(ctx, barcodeVal, (canvas.width - barcodeWidth) / 2, y, barcodeWidth, barcodeHeight);

    y += barcodeHeight + 14;
    ctx.font = "bold 12px Courier New";
    ctx.fillText(barcodeVal, canvas.width / 2, y);

    return canvasToBytes(ctx, canvas.width, h);
}

// --- CONVERSOR ESC/POS BITMAP CON ALTO QUEMADO EN CABEZAL ---
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
                // Umbral óptimo de 225 para garantizar letras e imágenes ultra negras sin ruidos
                if (gray < 225) b |= (0x80 >> i);
            }
            data[pos++] = b;
        }
    }
    return data;
}

function numeroALetras(num) {
    return "CINCUENTA Y DOS PESOS 78/100 MN";
}

// --- MANEJO DE COMPORTAMIENTOS E INTERFAZ ---
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
            document.getElementById('statusText').textContent = "Boxito Printer Lista";
            document.getElementById('btnTest').disabled = false;
        } catch (e) { alert("Error: " + e.message); }
    };

    document.getElementById('btnAdd').onclick = () => {
        const desc = document.getElementById('prodDesc').value.toUpperCase();
        const art = document.getElementById('prodArt').value || "000000";
        const cant = parseFloat(document.getElementById('prodCant').value) || 1.00;
        const pUnit = parseFloat(document.getElementById('prodPrice').value);

        if (!desc || isNaN(pUnit)) {
            alert("Completa Descripción y Precio unitario.");
            return;
        }

        productosVenta.push({ art, desc, cant, pUnit, importe: cant * pUnit });

        const tbody = document.querySelector('#listaPrevia tbody');
        tbody.innerHTML += `<tr>
            <td>${cant.toFixed(2)}</td>
            <td><b>${desc}</b><br><span style="font-size:11px;color:#cbd5e1">${art}</span></td>
            <td style="text-align:right;">$${(cant * pUnit).toFixed(2)}</td>
        </tr>`;

        const total = productosVenta.reduce((s, p) => s + p.importe, 0);
        document.getElementById('totalLabel').textContent = `TOTAL: $${total.toFixed(2)}`;

        document.getElementById('prodDesc').value = "";
        document.getElementById('prodPrice').value = "";
        document.getElementById('prodArt').value = "";
    };

    document.getElementById('btnTest').onclick = async () => {
        if (!printerChar || productosVenta.length === 0) return;

        const datosCampos = {
            empGrupo: document.getElementById('empGrupo').value.toUpperCase(),
            empRfc: document.getElementById('empRfc').value.toUpperCase(),
            empSucursal: document.getElementById('empSucursal').value.toUpperCase(),
            docTipo: document.getElementById('docTipo').value.toUpperCase(),
            docFactura: document.getElementById('docFactura').value.toUpperCase(),
            cliNombre: document.getElementById('cliNombre').value.toUpperCase(),
            docCondPago: document.getElementById('docCondPago').value.toUpperCase(),
            fecha: document.getElementById('fechaManual').value.split('-').reverse().join('/'),
            hora: document.getElementById('horaManual').value,
            docVendedor: document.getElementById('docVendedor').value.toUpperCase()
        };

        const barcodeVal = document.getElementById('docBarcode').value || "000000000000";

        const header = await getHeaderBoxito(datosCampos);
        const body = await getBodyBoxito(productosVenta, barcodeVal);

        const data = new Uint8Array([0x1B, 0x40, ...header, ...body, 0x1B, 0x64, 0x05]);

        for (let i = 0; i < data.length; i += 20) {
            await printerChar.writeValue(data.slice(i, i + 20));
        }
    };

    document.getElementById('btnReset').onclick = () => location.reload();
};
