/* SISTEMA DE TICKETS: FARMACIA YZA (VERSIÓN FINAL COMPLETA)
   CAJERA: DIANA OJEDA DZUL | TICKET COMPACTO Y PIE RESTAURADO
*/

let printerChar = null;
let productosVenta = [];
let currentPaper = 58;

const PAPER_PROFILES = {
    58: { width: 384, fontSize: 22, smallSize: 18, limit: 18 },
    80: { width: 576, fontSize: 28, smallSize: 22, limit: 28 }
};

function setPaper(size) {
    currentPaper = size;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    const chip = document.getElementById(`chip${size}`);
    if(chip) chip.classList.add('active');
}

// --- ENCABEZADO ---
async function getHeaderYza(fecha, hora) {
    const cfg = PAPER_PROFILES[currentPaper];
    const canvas = document.createElement('canvas');
    const h = 330;
    canvas.width = cfg.width; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, h);
    ctx.fillStyle = "black";
    ctx.textAlign = "center";

    let y = 25;
    ctx.font = `bold ${cfg.fontSize}px Arial`;
    ctx.fillText("FARMACON S.A. DE C.V.", canvas.width/2, y);
    ctx.font = `bold ${cfg.smallSize}px Arial`;
    y += 22; ctx.fillText("(FAR-970429-SF2)", canvas.width/2, y);

    ctx.font = `${cfg.smallSize - 2}px Arial`;
    y += 20; ctx.fillText("BLVD. FRANCISCO I. MADERO #335-1", canvas.width/2, y);
    y += 18; ctx.fillText("COL. CENTRO CP 80000, CULIACAN, SIN.", canvas.width/2, y);

    y += 22; ctx.font = `bold ${cfg.smallSize - 2}px Arial`;
    ctx.fillText("SUC. 1879 YZA TIZIMIN II", canvas.width/2, y);
    ctx.font = `${cfg.smallSize - 2}px Arial`;
    y += 18; ctx.fillText("CALLE 51 #388 X 48 Y 50", canvas.width/2, y);
    y += 18; ctx.fillText("COL. CENTRO CP 97700, TIZIMIN, YUC.", canvas.width/2, y);

    y += 30; ctx.textAlign = "left";
    ctx.font = `${cfg.smallSize}px Arial`;
    ctx.fillText(`CAJERO: DIANA OJEDA DZUL`, 5, y);
    y += 20; ctx.fillText(`FOLIO: V1383542  ${fecha} ${hora}`, 5, y);

    y += 20; ctx.textAlign = "center";
    ctx.fillText("________________________________", canvas.width/2, y);

    y += 25; ctx.textAlign = "left";
    ctx.font = `bold ${cfg.smallSize}px Arial`;
    ctx.fillText("CANT  DESCRIPCION", 5, y);
    ctx.textAlign = "right"; ctx.fillText("TOTAL", canvas.width - 5, y);

    return canvasToBytes(ctx, canvas.width, h);
}

// --- CUERPO (ESPACIO REDUCIDO) ---
async function getBodyYza(productos) {
    const cfg = PAPER_PROFILES[currentPaper];
    const canvas = document.createElement('canvas');
    const rowH = 45; // Altura de fila compacta
    const h = (productos.length * rowH) + 100;
    canvas.width = cfg.width; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, h);
    ctx.fillStyle = "black";

    let y = 20; // Empezamos pegado al borde superior del bloque
    let subtotal = 0;

    productos.forEach(p => {
        ctx.textAlign = "left";
        ctx.font = `bold ${cfg.smallSize}px Arial`;
        ctx.fillText(`${p.cant}  ${p.desc.substring(0, cfg.limit)}`, 5, y);
        ctx.font = `${cfg.smallSize - 4}px Arial`;
        ctx.fillText(p.cod, 45, y + 18);
        ctx.textAlign = "right";
        ctx.font = `bold ${cfg.smallSize}px Arial`;
        ctx.fillText(p.importe.toFixed(2), canvas.width - 5, y);
        subtotal += p.importe;
        y += rowH;
    });

    y += 5; ctx.textAlign = "center";
    ctx.fillText("________________________________", canvas.width/2, y);
    y += 35; ctx.textAlign = "right";
    ctx.font = `bold ${cfg.fontSize}px Arial`;
    ctx.fillText(`TOTAL: $${subtotal.toFixed(2)}`, canvas.width - 5, y);

    return canvasToBytes(ctx, canvas.width, h);
}

// --- PIE DE PÁGINA (TODO EL TEXTO RESTAURADO) ---
async function getFooterYza(total, pago) {
    const cfg = PAPER_PROFILES[currentPaper];
    const canvas = document.createElement('canvas');
    const h = 580; // Aumentado para que quepa todo el texto legal
    canvas.width = cfg.width; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, h);
    ctx.fillStyle = "black";

    let y = 30;
    ctx.textAlign = "left";
    ctx.font = `bold ${cfg.smallSize}px Arial`;
    ctx.fillText(`RECIBIDO: $${pago.toFixed(2)}`, 5, y);
    ctx.textAlign = "right";
    ctx.fillText(`CAMBIO: $${(pago-total).toFixed(2)}`, canvas.width - 5, y);

    ctx.textAlign = "center";
    y += 40; ctx.font = `bold ${cfg.smallSize}px Arial`;
    ctx.fillText("¡GRACIAS POR SU COMPRA!", canvas.width/2, y);
    y += 30; ctx.font = `${cfg.smallSize - 2}px Arial`;
    ctx.fillText(`LE ATENDIO: DIANA OJEDA DZUL`, canvas.width/2, y);

    y += 35; ctx.font = `${cfg.smallSize - 3}px Arial`;
    ctx.fillText("USTED PUEDE CONSULTAR NUESTRO", canvas.width/2, y);
    y += 18; ctx.fillText("AVISO DE PRIVACIDAD EN WWW.YZA.MX", canvas.width/2, y);

    y += 35; ctx.fillText("FACTURACION EN LINEA:", canvas.width/2, y);
    y += 18; ctx.font = `bold ${cfg.smallSize - 3}px Arial`;
    ctx.fillText("HTTPS://APP.FACTURAME.MX/FARMACIASYZA/", canvas.width/2, y);

    y += 40; ctx.font = `bold ${cfg.smallSize}px Arial`;
    ctx.fillText(`TOTAL PARA FACTURAR: $${total.toFixed(2)}`, canvas.width/2, y);
    y += 25; ctx.fillText("PAGO EN UNA SOLA EXHIBICION", canvas.width/2, y);

    y += 45; ctx.font = `bold ${cfg.smallSize + 2}px Arial`;
    ctx.fillText("YZATEL: 986 863 4433", canvas.width/2, y);

    y += 35; ctx.font = `${cfg.smallSize - 4}px Arial`;
    ctx.fillText("________________________________", canvas.width/2, y);
    y += 25; ctx.fillText("SU OPINION ES IMPORTANTE PARA NOSOTROS", canvas.width/2, y);
    y += 15; ctx.fillText("SI NO RECIBIO SU TICKET DE VENTA O NO FUE EL", canvas.width/2, y);
    y += 15; ctx.fillText("IMPORTE PAGADO, SU COMPRA ES GRATIS.", canvas.width/2, y);
    y += 30; ctx.fillText("EN CASO DE QUEJA O SUGERENCIA", canvas.width/2, y);
    y += 15; ctx.fillText("CONTACTENOS: ATENCION@YZA.MX", canvas.width/2, y);
    y += 15; ctx.fillText("WWW.YZA.MX/QUEJAS", canvas.width/2, y);

    return canvasToBytes(ctx, canvas.width, h);
}

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
        } catch (e) { alert(e.message); }
    };

    document.getElementById('btnAdd').onclick = () => {
        const desc = document.getElementById('prodDesc').value.toUpperCase();
        const cant = parseFloat(document.getElementById('prodCant').value) || 1;
        const pUnit = parseFloat(document.getElementById('prodPrice').value);
        const cod = document.getElementById('prodCod').value || "750000000000";
        if (!desc || isNaN(pUnit)) return;
        productosVenta.push({ cod, desc, cant, pUnit, importe: cant * pUnit });
        const tbody = document.querySelector('#listaPrevia tbody');
        tbody.innerHTML += `<tr><td>${cant}</td><td>${desc}</td><td>$${(cant*pUnit).toFixed(2)}</td></tr>`;
        document.getElementById('totalLabel').textContent = `TOTAL: $${productosVenta.reduce((s, p) => s + p.importe, 0).toFixed(2)}`;
        document.getElementById('prodDesc').value = ""; document.getElementById('prodPrice').value = ""; document.getElementById('prodCod').value = "";
    };

    document.getElementById('btnTest').onclick = async () => {
        if (!printerChar || productosVenta.length === 0) return;
        const h1 = await getHeaderYza(document.getElementById('fechaManual').value.split('-').reverse().join('/'), document.getElementById('horaManual').value);
        const body = await getBodyYza(productosVenta);
        const foot = await getFooterYza(productosVenta.reduce((s, p) => s + p.importe, 0), parseFloat(document.getElementById('pagoCliente').value) || 0);
        // Comando de impresión con avance de papel corto al final (0x03)
        const data = new Uint8Array([0x1B, 0x40, ...h1, ...body, ...foot, 0x1B, 0x64, 0x03]);
        for (let i = 0; i < data.length; i += 20) {
            await printerChar.writeValue(data.slice(i, i + 20));
        }
    };
    document.getElementById('btnReset').onclick = () => location.reload();
};
