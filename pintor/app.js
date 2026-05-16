<<<<<<< HEAD
/*
   PROYECTO: PROVEEDOR DEL PINTOR
   MEJORA: BLOQUE DE PAGO CON FUENTE MÁS GRANDE
*/

let printerChar = null;
let productosVenta = [];
let currentPaper = 58;

const PAPER_PROFILES = {
    58: { width: 384, fontSize: 13, smallSize: 11, limit: 22 },
    80: { width: 576, fontSize: 18, smallSize: 14, limit: 32 }
};

function numeroALetras(num) {
    const aLetras = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num);
    return `(${aLetras} PESOS 00/100 MXN)`.toUpperCase();
}

// --- LAS FUNCIONES DE ENCABEZADO Y TABLA SE MANTIENEN IGUAL ---

async function getFullHeaderBytes(fechaTxt) {
    const cfg = PAPER_PROFILES[currentPaper];
    return new Promise((resolve) => {
        const img = new Image();
        img.src = 'logo.jpg';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const h = 220;
            canvas.width = cfg.width; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, h);
            ctx.fillStyle = "black";
            ctx.drawImage(img, 5, 25, 90, 90);
            ctx.textAlign = "center";
            const mid = (canvas.width / 2) + 25;
            ctx.font = `bold ${cfg.fontSize + 2}px Arial`;
            ctx.fillText("TICKET DE VENTA", mid, 30);
            ctx.font = `${cfg.fontSize}px Arial`;
            ctx.fillText("PROVEEDOR DE PINTURAS Y FERRETER", mid, 50);
            ctx.font = `${cfg.smallSize}px Arial`;
            ctx.fillText("PPF060103EC0       EXPEDIDO EN: 97700", mid, 70);
            ctx.fillText("SUCURSAL:  TIZIMIN", mid, 90);
            ctx.textAlign = "right";
            ctx.fillText(`FECHA: ${fechaTxt} 10:18:35`, canvas.width - 5, 115);
            ctx.fillText("FOLIO: 0000063434", canvas.width - 5, 130);
            ctx.textAlign = "left";
            ctx.font = `${cfg.smallSize}px Arial`;
            ctx.fillText(`VENDEDOR: VC01`, 5, 155);
            ctx.fillText(`CLIENTE: 04472`, 5, 170);
            ctx.fillText(`R.F.C. XAXX010101000`, 5, 185);
            ctx.textAlign = "right";
            ctx.font = `bold ${cfg.smallSize + 1}px Arial`;
            ctx.fillText('"PUBLICO EN GENERAL"', canvas.width - 15, 170);
            resolve(canvasToBytes(ctx, canvas.width, h));
        };
        img.onerror = () => resolve(new Uint8Array(0));
    });
}

async function getProductsTableBytes(productos) {
    const cfg = PAPER_PROFILES[currentPaper];
    const canvas = document.createElement('canvas');
    const rowH = 60;
    const h = 45 + (productos.length * rowH);
    canvas.width = cfg.width; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, h);
    ctx.fillStyle = "#444"; ctx.fillRect(0, 0, canvas.width, 38);
    ctx.fillStyle = "white";
    ctx.font = `bold ${cfg.smallSize}px Arial`;
    ctx.textAlign = "left";
    ctx.fillText("CANT.", 5, 16); ctx.fillText("COD.", 5, 32);
    ctx.fillText("DESCRIPCION", 75, 16); ctx.fillText("P/UNIT.", 180, 32);
    ctx.textAlign = "right"; ctx.fillText("IMPORTE", canvas.width - 5, 16);
    ctx.fillStyle = "black";
    let y = 60;
    productos.forEach(p => {
        ctx.textAlign = "left";
        ctx.font = `bold ${cfg.fontSize}px Arial`;
        ctx.fillText(p.cant.toFixed(2), 5, y);
        let d = p.desc;
        if (d.length > cfg.limit) d = d.substring(0, cfg.limit);
        ctx.fillText(d, 75, y);
        ctx.font = `${cfg.smallSize}px Arial`;
        ctx.fillText(p.cod, 5, y + 18);
        ctx.textAlign = "right";
        ctx.fillText(`$${p.pUnit.toFixed(2)}`, 240, y + 18);
        ctx.font = `bold ${cfg.fontSize}px Arial`;
        ctx.fillText(`$${p.importe.toFixed(2)}`, canvas.width - 5, y + 18);
        y += rowH;
    });
    return canvasToBytes(ctx, canvas.width, h);
}

// --- BLOQUE FINAL CON LETRA MÁS GRANDE ---
async function getFooterBytes(total) {
    const cfg = PAPER_PROFILES[currentPaper];
    const canvas = document.createElement('canvas');
    const h = 180; // Aumentamos altura para acomodar fuentes más grandes
    canvas.width = cfg.width; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, h);
    ctx.fillStyle = "black";

    ctx.fillRect(5, 5, canvas.width - 10, 2);

    // Forma de Pago y Efectivo (Más grande)
    ctx.font = `bold ${cfg.fontSize + 1}px Arial`;
    ctx.textAlign = "left";
    ctx.fillText("FORMA DE PAGO", 5, 40);
    ctx.font = `${cfg.fontSize + 1}px Arial`;
    ctx.fillText(`EFECTIVO: $${total.toFixed(2)}`, 5, 65);

    // Total resaltado (Considerablemente más grande)
    ctx.textAlign = "right";
    ctx.font = `bold ${cfg.fontSize + 6}px Arial`;
    ctx.fillText(`TOTAL     $${total.toFixed(2)}`, canvas.width - 5, 65);

    // Total en letra dinámico (Más legible)
    ctx.textAlign = "center";
    ctx.font = `bold ${cfg.smallSize + 1}px Arial`;
    const textoTotal = numeroALetras(total);
    ctx.fillText(textoTotal, canvas.width / 2, 105);

    // Despedida
    ctx.font = "bold 16px Arial";
    ctx.fillText("GRACIAS POR SU COMPRA", canvas.width / 2, 140);
    ctx.fillRect(40, 155, canvas.width - 80, 1);

    return canvasToBytes(ctx, canvas.width, h);
}

// --- RESTO DE LÓGICA DE CONEXIÓN Y EVENTOS (SIN CAMBIOS) ---

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

window.onload = () => {
    document.getElementById('fechaManual').valueAsDate = new Date();
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
            document.getElementById('statusLabel').textContent = "CONECTADO";
            document.getElementById('btnTest').disabled = false;
        } catch (e) { alert("Error: " + e.message); }
    };

    document.getElementById('btnAdd').onclick = () => {
        const cod = document.getElementById('prodCod').value || "S/C";
        const desc = document.getElementById('prodDesc').value.toUpperCase();
        const cant = parseFloat(document.getElementById('prodCant').value);
        const pUnit = parseFloat(document.getElementById('prodPrice').value);
        if (!desc || isNaN(cant)) return;
        productosVenta.push({ cod, desc, cant, pUnit, importe: cant * pUnit });
        const tbody = document.querySelector('#listaPrevia tbody');
        tbody.innerHTML += `<tr><td>${cant}</td><td>${desc}</td><td>$${(cant*pUnit).toFixed(2)}</td></tr>`;
        const total = productosVenta.reduce((s, p) => s + p.importe, 0);
        document.getElementById('totalLabel').textContent = `TOTAL: $${total.toFixed(2)}`;
        ['prodCod', 'prodDesc', 'prodCant', 'prodPrice'].forEach(id => document.getElementById(id).value = "");
        document.getElementById('prodCod').focus();
    };

    document.getElementById('btnTest').onclick = async () => {
        if (!printerChar || productosVenta.length === 0) return;
        const totalVenta = productosVenta.reduce((s, p) => s + p.importe, 0);
        const h1 = await getFullHeaderBytes(document.getElementById('fechaManual').value.split('-').reverse().join('/'));
        const table = await getProductsTableBytes(productosVenta);
        const foot = await getFooterBytes(totalVenta);
        const final = new Uint8Array([0x1B, 0x40, ...h1, ...table, ...foot, 0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x41, 0x03]);
        for (let i = 0; i < final.length; i += 20) { await printerChar.writeValue(final.slice(i, i + 20)); }
    };
};
=======
/*
   PROYECTO: PROVEEDOR DEL PINTOR
   MEJORA: BLOQUE DE PAGO CON FUENTE MÁS GRANDE
*/

let printerChar = null;
let productosVenta = [];
let currentPaper = 58;

const PAPER_PROFILES = {
    58: { width: 384, fontSize: 13, smallSize: 11, limit: 22 },
    80: { width: 576, fontSize: 18, smallSize: 14, limit: 32 }
};

function numeroALetras(num) {
    const aLetras = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num);
    return `(${aLetras} PESOS 00/100 MXN)`.toUpperCase();
}

// --- LAS FUNCIONES DE ENCABEZADO Y TABLA SE MANTIENEN IGUAL ---

async function getFullHeaderBytes(fechaTxt) {
    const cfg = PAPER_PROFILES[currentPaper];
    return new Promise((resolve) => {
        const img = new Image();
        img.src = 'logo.jpg';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const h = 220;
            canvas.width = cfg.width; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, h);
            ctx.fillStyle = "black";
            ctx.drawImage(img, 5, 25, 90, 90);
            ctx.textAlign = "center";
            const mid = (canvas.width / 2) + 25;
            ctx.font = `bold ${cfg.fontSize + 2}px Arial`;
            ctx.fillText("TICKET DE VENTA", mid, 30);
            ctx.font = `${cfg.fontSize}px Arial`;
            ctx.fillText("PROVEEDOR DE PINTURAS Y FERRETER", mid, 50);
            ctx.font = `${cfg.smallSize}px Arial`;
            ctx.fillText("PPF060103EC0       EXPEDIDO EN: 97700", mid, 70);
            ctx.fillText("SUCURSAL:  TIZIMIN", mid, 90);
            ctx.textAlign = "right";
            ctx.fillText(`FECHA: ${fechaTxt} 10:18:35`, canvas.width - 5, 115);
            ctx.fillText("FOLIO: 0000063434", canvas.width - 5, 130);
            ctx.textAlign = "left";
            ctx.font = `${cfg.smallSize}px Arial`;
            ctx.fillText(`VENDEDOR: VC01`, 5, 155);
            ctx.fillText(`CLIENTE: 04472`, 5, 170);
            ctx.fillText(`R.F.C. XAXX010101000`, 5, 185);
            ctx.textAlign = "right";
            ctx.font = `bold ${cfg.smallSize + 1}px Arial`;
            ctx.fillText('"PUBLICO EN GENERAL"', canvas.width - 15, 170);
            resolve(canvasToBytes(ctx, canvas.width, h));
        };
        img.onerror = () => resolve(new Uint8Array(0));
    });
}

async function getProductsTableBytes(productos) {
    const cfg = PAPER_PROFILES[currentPaper];
    const canvas = document.createElement('canvas');
    const rowH = 60;
    const h = 45 + (productos.length * rowH);
    canvas.width = cfg.width; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, h);
    ctx.fillStyle = "#444"; ctx.fillRect(0, 0, canvas.width, 38);
    ctx.fillStyle = "white";
    ctx.font = `bold ${cfg.smallSize}px Arial`;
    ctx.textAlign = "left";
    ctx.fillText("CANT.", 5, 16); ctx.fillText("COD.", 5, 32);
    ctx.fillText("DESCRIPCION", 75, 16); ctx.fillText("P/UNIT.", 180, 32);
    ctx.textAlign = "right"; ctx.fillText("IMPORTE", canvas.width - 5, 16);
    ctx.fillStyle = "black";
    let y = 60;
    productos.forEach(p => {
        ctx.textAlign = "left";
        ctx.font = `bold ${cfg.fontSize}px Arial`;
        ctx.fillText(p.cant.toFixed(2), 5, y);
        let d = p.desc;
        if (d.length > cfg.limit) d = d.substring(0, cfg.limit);
        ctx.fillText(d, 75, y);
        ctx.font = `${cfg.smallSize}px Arial`;
        ctx.fillText(p.cod, 5, y + 18);
        ctx.textAlign = "right";
        ctx.fillText(`$${p.pUnit.toFixed(2)}`, 240, y + 18);
        ctx.font = `bold ${cfg.fontSize}px Arial`;
        ctx.fillText(`$${p.importe.toFixed(2)}`, canvas.width - 5, y + 18);
        y += rowH;
    });
    return canvasToBytes(ctx, canvas.width, h);
}

// --- BLOQUE FINAL CON LETRA MÁS GRANDE ---
async function getFooterBytes(total) {
    const cfg = PAPER_PROFILES[currentPaper];
    const canvas = document.createElement('canvas');
    const h = 180; // Aumentamos altura para acomodar fuentes más grandes
    canvas.width = cfg.width; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, h);
    ctx.fillStyle = "black";

    ctx.fillRect(5, 5, canvas.width - 10, 2);

    // Forma de Pago y Efectivo (Más grande)
    ctx.font = `bold ${cfg.fontSize + 1}px Arial`;
    ctx.textAlign = "left";
    ctx.fillText("FORMA DE PAGO", 5, 40);
    ctx.font = `${cfg.fontSize + 1}px Arial`;
    ctx.fillText(`EFECTIVO: $${total.toFixed(2)}`, 5, 65);

    // Total resaltado (Considerablemente más grande)
    ctx.textAlign = "right";
    ctx.font = `bold ${cfg.fontSize + 6}px Arial`;
    ctx.fillText(`TOTAL     $${total.toFixed(2)}`, canvas.width - 5, 65);

    // Total en letra dinámico (Más legible)
    ctx.textAlign = "center";
    ctx.font = `bold ${cfg.smallSize + 1}px Arial`;
    const textoTotal = numeroALetras(total);
    ctx.fillText(textoTotal, canvas.width / 2, 105);

    // Despedida
    ctx.font = "bold 16px Arial";
    ctx.fillText("GRACIAS POR SU COMPRA", canvas.width / 2, 140);
    ctx.fillRect(40, 155, canvas.width - 80, 1);

    return canvasToBytes(ctx, canvas.width, h);
}

// --- RESTO DE LÓGICA DE CONEXIÓN Y EVENTOS (SIN CAMBIOS) ---

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

window.onload = () => {
    document.getElementById('fechaManual').valueAsDate = new Date();
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
            document.getElementById('statusLabel').textContent = "CONECTADO";
            document.getElementById('btnTest').disabled = false;
        } catch (e) { alert("Error: " + e.message); }
    };

    document.getElementById('btnAdd').onclick = () => {
        const cod = document.getElementById('prodCod').value || "S/C";
        const desc = document.getElementById('prodDesc').value.toUpperCase();
        const cant = parseFloat(document.getElementById('prodCant').value);
        const pUnit = parseFloat(document.getElementById('prodPrice').value);
        if (!desc || isNaN(cant)) return;
        productosVenta.push({ cod, desc, cant, pUnit, importe: cant * pUnit });
        const tbody = document.querySelector('#listaPrevia tbody');
        tbody.innerHTML += `<tr><td>${cant}</td><td>${desc}</td><td>$${(cant*pUnit).toFixed(2)}</td></tr>`;
        const total = productosVenta.reduce((s, p) => s + p.importe, 0);
        document.getElementById('totalLabel').textContent = `TOTAL: $${total.toFixed(2)}`;
        ['prodCod', 'prodDesc', 'prodCant', 'prodPrice'].forEach(id => document.getElementById(id).value = "");
        document.getElementById('prodCod').focus();
    };

    document.getElementById('btnTest').onclick = async () => {
        if (!printerChar || productosVenta.length === 0) return;
        const totalVenta = productosVenta.reduce((s, p) => s + p.importe, 0);
        const h1 = await getFullHeaderBytes(document.getElementById('fechaManual').value.split('-').reverse().join('/'));
        const table = await getProductsTableBytes(productosVenta);
        const foot = await getFooterBytes(totalVenta);
        const final = new Uint8Array([0x1B, 0x40, ...h1, ...table, ...foot, 0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x41, 0x03]);
        for (let i = 0; i < final.length; i += 20) { await printerChar.writeValue(final.slice(i, i + 20)); }
    };
};
>>>>>>> 00478fdb232def41c49d5b3c3dfeac6da455fe35
