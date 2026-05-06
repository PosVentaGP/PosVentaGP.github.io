/*
   SISTEMA DE TICKETS: FARMACIA YZA (COMPLETO Y CORREGIDO)
   PROYECTO: GEFTE POS SYSTEM
*/

let printerChar = null;
let productosVenta = [];
let currentPaper = 58;

// Configuración de perfiles de papel[cite: 1]
const PAPER_PROFILES = {
    58: { width: 384, fontSize: 12, smallSize: 10, limit: 20 },
    80: { width: 576, fontSize: 16, smallSize: 13, limit: 30 }
};

function setPaper(size) {
    currentPaper = size;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    const chip = document.getElementById(`chip${size}`);
    if(chip) chip.classList.add('active');
}

// --- GENERACIÓN DE ENCABEZADO YZA ---
async function getHeaderYza(fecha, hora) {
    const cfg = PAPER_PROFILES[currentPaper];
    const canvas = document.createElement('canvas');
    const h = 260;
    canvas.width = cfg.width; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, h);
    ctx.fillStyle = "black";
    ctx.textAlign = "center";

    let y = 25;
    ctx.font = `bold ${cfg.fontSize}px Courier New`;
    ctx.fillText("FARMACON S.A. DE C.V. (FAR-970429-SF2)", canvas.width/2, y);

    ctx.font = `${cfg.smallSize}px Courier New`;
    y += 15; ctx.fillText("BLVD. FRANCISCO I. MADERO #335-1, COL. CENTRO", canvas.width/2, y);
    y += 15; ctx.fillText("CP 80000, CULIACAN, SINALOA", canvas.width/2, y);
    y += 15; ctx.fillText("LUGAR DE EXPEDICION: TIZIMIN, YUCATAN", canvas.width/2, y);

    y += 25; ctx.font = `bold ${cfg.fontSize}px Courier New`;
    ctx.fillText("SUC. 1879 YZA TIZIMIN II", canvas.width/2, y);

    y += 30; ctx.textAlign = "left";
    ctx.font = `${cfg.smallSize}px Courier New`;
    ctx.fillText(`FOL. VENTA: V1383542  ${fecha} ${hora}`, 5, y);

    y += 20;
    ctx.font = `bold ${cfg.smallSize}px Courier New`;
    ctx.fillText("CANT. DESCRIPCION", 5, y);
    ctx.textAlign = "right"; ctx.fillText("IMP. TOTAL", canvas.width - 5, y);

    return canvasToBytes(ctx, canvas.width, h);
}

// --- CUERPO DE PRODUCTOS ---
async function getBodyYza(productos) {
    const cfg = PAPER_PROFILES[currentPaper];
    const canvas = document.createElement('canvas');
    const rowH = 45;
    const h = (productos.length * rowH) + 100;
    canvas.width = cfg.width; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, h);
    ctx.fillStyle = "black";

    let y = 25;
    let subtotal = 0;

    productos.forEach(p => {
        ctx.textAlign = "left";
        ctx.font = `bold ${cfg.fontSize}px Courier New`;
        ctx.fillText(`${p.cant}  ${p.desc.substring(0, cfg.limit)}`, 5, y);
        ctx.font = `${cfg.smallSize}px Courier New`;
        ctx.fillText(p.cod, 40, y + 15);
        ctx.textAlign = "right";
        ctx.font = `bold ${cfg.fontSize}px Courier New`;
        ctx.fillText(p.importe.toFixed(2), canvas.width - 5, y);
        subtotal += p.importe;
        y += rowH;
    });

    y += 10;
    ctx.textAlign = "right";
    ctx.font = `${cfg.fontSize}px Courier New`;
    ctx.fillText(`Sub-Total      ${subtotal.toFixed(2)}`, canvas.width - 5, y);
    ctx.fillText(`(+) I.V.A.          0.00`, canvas.width - 5, y + 15);
    ctx.font = `bold ${cfg.fontSize + 2}px Courier New`;
    ctx.fillText(`Total          ${subtotal.toFixed(2)}`, canvas.width - 5, y + 35);

    return canvasToBytes(ctx, canvas.width, h);
}

// --- PIE DE TICKET ---
async function getFooterYza(total, pago) {
    const cfg = PAPER_PROFILES[currentPaper];
    const canvas = document.createElement('canvas');
    const h = 420;
    canvas.width = cfg.width; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, h);
    ctx.fillStyle = "black";
    ctx.font = `${cfg.smallSize}px Courier New`;

    let y = 20;
    ctx.fillText(`Importe del Pago: $ ${pago.toFixed(2)}`, 5, y);
    ctx.textAlign = "right";
    ctx.fillText(`Cambio: $ ${(pago - total).toFixed(2)}`, canvas.width - 5, y);

    ctx.textAlign = "center";
    y += 40; ctx.fillText("Gracias por su compra", canvas.width/2, y);
    y += 30; ctx.font = `${cfg.smallSize - 1}px Courier New`;
    ctx.fillText("USTED PUEDE CONSULTAR NUESTRO AVISO DE PRIVACIDAD", canvas.width/2, y);
    y += 15; ctx.fillText("FACTURACION HTTPS://APP.FACTURAME.MX/FARMACIASYZA/", canvas.width/2, y);
    y += 30; ctx.font = `bold ${cfg.smallSize}px Courier New`;
    ctx.fillText(`Total para Facturacion: ${total.toFixed(2)}`, canvas.width/2, y);
    y += 20; ctx.fillText("PAGO EN UNA SOLA EXHIBICION", canvas.width/2, y);
    y += 40; ctx.fillText("SERVICIO A DOMICILIO: YZATEL 986 863 4433", canvas.width/2, y);

    return canvasToBytes(ctx, canvas.width, h);
}

// --- FUNCIÓN TÉCNICA DE CONVERSIÓN ---
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
                const lum = (imgData.data[idx] + imgData.data[idx + 1] + imgData.data[idx + 2]) / 3;
                if (lum < 128) b |= (0x80 >> i);
            }
            data[pos++] = b;
        }
    }
    return data;
}

// --- LÓGICA DE INTERFAZ[cite: 1] ---
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
            document.getElementById('btnTest').disabled = false;
            alert("Impresora Vinculada con Éxito");
        } catch (e) { alert("Error Bluetooth: " + e.message); }
    };

    document.getElementById('btnAdd').onclick = () => {
        const desc = document.getElementById('prodDesc').value.toUpperCase();
        const cant = parseFloat(document.getElementById('prodCant').value) || 1;
        const pUnit = parseFloat(document.getElementById('prodPrice').value);
        const cod = document.getElementById('prodCod').value || "750000000000";

        if (!desc || isNaN(pUnit)) { alert("Por favor completa descripción y precio"); return; }

        productosVenta.push({ cod, desc, cant, pUnit, importe: cant * pUnit });
        const tbody = document.querySelector('#listaPrevia tbody');
        tbody.innerHTML += `<tr><td>${cant}</td><td>${desc}</td><td>$${(cant*pUnit).toFixed(2)}</td></tr>`;

        const total = productosVenta.reduce((s, p) => s + p.importe, 0);
        document.getElementById('totalLabel').textContent = `TOTAL: $${total.toFixed(2)}`;

        // Limpiar campos[cite: 1]
        document.getElementById('prodDesc').value = "";
        document.getElementById('prodPrice').value = "";
        document.getElementById('prodCod').value = "";
        document.getElementById('prodDesc').focus();
    };

    document.getElementById('btnTest').onclick = async () => {
        if (!printerChar || productosVenta.length === 0) {
            alert("Conecta la impresora y añade productos");
            return;
        }

        const fecha = document.getElementById('fechaManual').value.split('-').reverse().join('/');
        const hora = document.getElementById('horaManual').value;
        const pago = parseFloat(document.getElementById('pagoCliente').value) || 0;
        const total = productosVenta.reduce((s, p) => s + p.importe, 0);

        const h1 = await getHeaderYza(fecha, hora);
        const body = await getBodyYza(productosVenta);
        const foot = await getFooterYza(total, pago);

        // Inicializar, imprimir bloques y cortar[cite: 1]
        const data = new Uint8Array([0x1B, 0x40, ...h1, ...body, ...foot, 0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x41, 0x03]);

        for (let i = 0; i < data.length; i += 20) {
            await printerChar.writeValue(data.slice(i, i + 20));
        }
    };

    document.getElementById('btnReset').onclick = () => {
        if(confirm("¿Nueva venta? Se borrará la lista actual.")) location.reload();
    };
};
