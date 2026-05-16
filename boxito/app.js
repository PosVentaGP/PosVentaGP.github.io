/* SISTEMA DE TICKETS: FERRETERIA BOXITO
   CONTROLADOR DE IMPRESIÓN BLUETOOTH Y RENDERIZADO GRÁFICO (OPTIMIZADO PARA 58MM)
   *** VERSIÓN ESTABLE CON FORMATO DE FECHA PERSONALIZADO (DD-MMM-YYYY) ***
*/

let printerChar = null;
let productosVenta = [];
const PAPER_WIDTH = 384; // 58mm reales libres a los bordes de impresión gráfica

// --- CONFIGURACIÓN DE BASE DE DATOS LOCAL (INDEXEDDB) ---
let db = null;
const requestDB = indexedDB.open("BoxitoPuntoDeVenta", 1);

requestDB.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("ventas")) {
        db.createObjectStore("ventas", { keyPath: "id", autoIncrement: true });
    }
};

requestDB.onsuccess = (e) => {
    db = e.target.result;
    console.log("Base de datos de historial conectada con éxito.");
};

requestDB.onerror = (e) => {
    console.error("Error al abrir la base de datos de historial:", e.target.error);
};

function guardarVentaHistorial(datosTicket, articulos) {
    if (!db) {
        console.error("La base de datos no está lista.");
        return;
    }
    const transaccion = db.transaction(["ventas"], "readwrite");
    const almacen = transaccion.objectStore("ventas");

    const nuevaVenta = {
        factura: datosTicket.docFactura,
        fecha: datosTicket.fecha, // Guarda el formato ya corregido
        hora: datosTicket.hora,
        cliente: datosTicket.cliNombre,
        vendedor: datosTicket.docVendedor,
        condPago: datosTicket.docCondPago,
        empGrupo: datosTicket.empGrupo,
        empRfc: datosTicket.empRfc,
        empSucursal: datosTicket.empSucursal,
        docTipo: datosTicket.docTipo,
        articulos: articulos.map(p => ({
            art: p.art,
            cant: p.cant,
            desc: p.desc,
            pUnit: p.pUnit,
            importe: p.importe
        }))
    };

    const solicitud = almacen.add(nuevaVenta);
    solicitud.onsuccess = () => { console.log("Venta respaldada en el historial local."); };
    solicitud.onerror = (e) => { console.error("Error al respaldar venta:", e.target.error); };
}

async function reimprimirTicketPorId(id) {
    if (!db || !printerChar) {
        alert("Asegúrate de estar conectado a la impresora.");
        return;
    }

    const transaccion = db.transaction(["ventas"], "readonly");
    const almacen = transaccion.objectStore("ventas");
    const solicitud = almacen.get(id);

    solicitud.onsuccess = async (e) => {
        const venta = e.target.result;
        if (!venta) {
            alert("No se encontró ese ticket en el historial.");
            return;
        }

        const datosCampos = {
            empGrupo: venta.empGrupo,
            empRfc: venta.empRfc,
            empSucursal: venta.empSucursal,
            docTipo: venta.docTipo,
            docFactura: venta.factura,
            cliNombre: venta.cliente,
            docCondPago: venta.condPago,
            fecha: venta.fecha,
            hora: venta.hora,
            docVendedor: venta.vendedor
        };

        const header = await getHeaderBoxito(datosCampos);
        const body = await getBodyBoxito(venta.articulos, venta.factura);

        const data = new Uint8Array([0x1B, 0x40, ...header, ...body, 0x1B, 0x64, 0x05]);

        for (let i = 0; i < data.length; i += 20) {
            await printerChar.writeValue(data.slice(i, i + 20));
        }
        console.log("Ticket reimpreso con éxito.");
    };
}

// --- HELPER PARA CARGAR LOGO PRINCIPAL ---
function loadLogo() {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = 'logo.jpg';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
    });
}

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

// --- AUXILIAR PARA FORMATO DE FECHA (Ej: 12-may-2026) ---
function formatearFechaEspecial(fechaStr) {
    if (!fechaStr) return "";
    // Separamos el input YYYY-MM-DD
    const partes = fechaStr.split('-');
    if (partes.length !== 3) return fechaStr;

    const meses = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const anio = partes[0];
    const mesIndex = parseInt(partes[1], 10) - 1;
    const dia = partes[2];

    const mesTexto = meses[mesIndex] || "may";
    return `${dia}-${mesTexto}-${anio}`;
}

// --- ENCABEZADO GRÁFICO ---
async function getHeaderBoxito(datos) {
    const canvas = document.createElement('canvas');
    const h = 450;
    canvas.width = PAPER_WIDTH; canvas.height = h;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, h);
    ctx.fillStyle = "black";
    let y = 10;

    const logo = await loadLogo();
    if (logo) {
        const aspect = logo.width / logo.height;
        const targetW = 376;
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
    ctx.font = "bold 18px Arial";
    ctx.fillText(datos.empGrupo, canvas.width / 2, y);

    ctx.font = "bold 13px Arial";
    y += 22; ctx.fillText("Calle 96 x 99 y 107 No. 892 Edif. A Int. 101", canvas.width / 2, y);
    y += 16; ctx.fillText("Col. Obrera C.P. 97260 Mérida, Yuc.", canvas.width / 2, y);
    y += 16; ctx.fillText(datos.empRfc, canvas.width / 2, y);

    y += 24; ctx.font = "bold 19px Arial";
    ctx.fillText(datos.empSucursal, canvas.width / 2, y);
    ctx.font = "bold 13px Arial";
    y += 18; ctx.fillText("Circuito Colonias Smz 5 x Calle 4 Lote 7 Mza. 153 Lote 8 N/A", canvas.width / 2, y);
    y += 16; ctx.fillText("C.P. 77400 Isla Mujeres, QRO, MX", canvas.width / 2, y);

    y += 28; ctx.font = "bold 17px Arial";
    ctx.fillText(datos.docTipo, canvas.width / 2, y);
    y += 22; ctx.font = "bold 22px Arial";
    ctx.fillText(datos.docFactura, canvas.width / 2, y);

    y += 28; ctx.textAlign = "left";
    ctx.font = "bold 14px Arial";
    ctx.fillText(`Cliente: ${datos.cliNombre}`, 2, y);
    y += 18; ctx.fillText(`COND. PAGO: ${datos.docCondPago}`, 2, y);
    y += 18; ctx.fillText(`FECHA: ${datos.fecha} ${datos.hora}`, 2, y); // Renderiza la fecha formateada
    y += 18; ctx.fillText(`VENDEDOR: ${datos.docVendedor}`, 2, y);

    return canvasToBytes(ctx, canvas.width, h);
}

// --- CUERPO DE CONCEPTOS Y PIE DE PÁGINA ---
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

    ctx.fillText("Articulo", 2, y);
    ctx.fillText("Cantidad", 115, y);
    ctx.fillText("P.Unit", 230, y);
    ctx.fillText("Importe", 325, y);

    y += 12;
    ctx.fillText("--------------------------------------------------", 2, y);

    y += 24;
    let subtotal = 0;

    productos.forEach(p => {
        ctx.textAlign = "left";
        ctx.font = "bold 14px Arial";
        ctx.fillText(p.art, 2, y);
        ctx.fillText(`${p.cant.toFixed(2)} PZ`, 115, y);

        ctx.font = "bold 14px Arial";
        ctx.fillText(p.desc.substring(0, 26), 2, y + 16);

        ctx.textAlign = "right";
        ctx.font = "bold 14px Arial";
        ctx.fillText(p.pUnit.toFixed(2), 275, y);
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

    y += 28; ctx.font = "bold 22px Arial";
    ctx.fillText(`TOTAL:   $${subtotal.toFixed(2)}`, canvas.width - 2, y);

    y += 26; ctx.textAlign = "center";
    ctx.font = "bold italic 12px Arial";
    ctx.fillText(`( ${numeroALetras(subtotal)} )`, canvas.width / 2, y);

    y += 22; ctx.font = "bold 12px Arial";
    ctx.fillText("DESCUENTO OTORGADO EN MOSTRADOR: 18.00", canvas.width / 2, y);

    y += 25; ctx.font = "bold 11px Arial";
    ctx.fillText("Para cualquier cambio u aclaración es indispensable", canvas.width / 2, y);
    y += 14; ctx.fillText("presentar este comprobante de pago original.", canvas.width / 2, y);
    y += 14; ctx.fillText("¡Gracias por su compra en Ferreterías Boxito!", canvas.width / 2, y);

    y += 25;
    const barcodeWidth = 260;
    const barcodeHeight = 45;
    drawBarcode(ctx, barcodeVal, (canvas.width - barcodeWidth) / 2, y, barcodeWidth, barcodeHeight);

    y += barcodeHeight + 14;
    ctx.font = "bold 12px Courier New";
    ctx.fillText(barcodeVal, canvas.width / 2, y);

    return canvasToBytes(ctx, canvas.width, h);
}

// --- CONVERSOR ESC/POS BITMAP ---
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
                if (gray < 235) b |= (0x80 >> i);
            }
            data[pos++] = b;
        }
    }
    return data;
}

// --- ALGORITMO DINÁMICO DE REAL A LETRAS ---
function numeroALetras(num) {
    const unidades = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
    const decenas = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
    const especiales = ["ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];
    const centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINCENTOS", "SEISCIENTOS", "SIETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

    function seccion(n) {
        if (n === 0) return "";
        if (n < 10) return unidades[n];
        if (n === 10) return "DIEZ";
        if (n < 20) return especiales[n - 11];
        if (n === 20) return "VEINTE";
        if (n < 30) return "VEINTI" + unidades[n - 20];

        let d = Math.floor(n / 10);
        let u = n % 10;
        return decenas[d] + (u > 0 ? " Y " + unidades[u] : "");
    }

    function convertirGrupo(n) {
        let c = Math.floor(n / 100);
        let resto = n % 100;
        if (n === 100) return "CIEN";
        return centenas[c] + (resto > 0 ? " " + seccion(resto) : "");
    }

    let entero = Math.floor(num);
    let centavos = Math.round((num - entero) * 100);
    let centavosTexto = centavos.toString().padStart(2, '0') + "/100 M.N.";

    if (entero === 0) return "CERO PESOS " + centavosTexto;

    let texto = "";

    if (entero >= 1000) {
        let miles = Math.floor(entero / 1000);
        entero = entero % 1000;
        if (miles === 1) texto += "MIL ";
        else texto += convertirGrupo(miles) + " MIL ";
    }

    if (entero > 0) {
        texto += convertirGrupo(entero);
    }

    texto = texto.trim() + (texto.trim() === "UN" ? " PESO " : " PESOS ");
    return texto + centavosTexto;
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

        // CORREGIDO: Aplicamos la función para que la fecha vaya con formato "DD-mmm-YYYY"
        const fechaFormateada = formatearFechaEspecial(document.getElementById('fechaManual').value);

        const datosCampos = {
            empGrupo: document.getElementById('empGrupo').value.toUpperCase(),
            empRfc: document.getElementById('empRfc').value.toUpperCase(),
            empSucursal: document.getElementById('empSucursal').value.toUpperCase(),
            docTipo: document.getElementById('docTipo').value.toUpperCase(),
            docFactura: document.getElementById('docFactura').value.toUpperCase(),
            cliNombre: document.getElementById('cliNombre').value.toUpperCase(),
            docCondPago: document.getElementById('docCondPago').value.toUpperCase(),
            fecha: fechaFormateada,
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

        guardarVentaHistorial(datosCampos, productosVenta);
    };

    document.getElementById('btnReset').onclick = () => location.reload();
};
