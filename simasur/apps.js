const ESC = {
    INIT: [0x1B, 0x40],
    LEFT: [0x1B, 0x61, 0x00],
    CENTER: [0x1B, 0x61, 0x01],
    BOLD_ON: [0x1B, 0x45, 0x01],
    BOLD_OFF: [0x1B, 0x45, 0x00],
    FEED: [0x0A, 0x0A, 0x0A, 0x0A]
};

let printerChar = null;
let itemsVenta = [];

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
        document.getElementById('statusText').textContent = "Impresora Lista";
        document.getElementById('btnPrint').disabled = false;
    } catch (e) { alert("Error de conexión: " + e.message); }
});

// --- PROCESAMIENTO DEL LOGO Y ENCABEZADO 1 ---
async function getLogoBytes(url) {
    return new Promise((resolve) => {
        const img = new Image(); img.src = url;
        img.onload = () => {
            const get = (id) => document.getElementById(id).value.toUpperCase();
            const canvas = document.createElement('canvas');
            const w = 384;

            // Altura del logo (ancho 120 para dejar espacio al texto)
            const logoW = 120;
            const logoH = Math.floor(img.height * (logoW / img.width));

            // Ajustamos la altura total para que quepan todos los textos del Bloque 1
            const h = Math.max(logoH, 160);

            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = "white"; ctx.fillRect(0,0,w,h);

            // 1. Dibuja el Logo a la izquierda
            ctx.drawImage(img, 0, 0, logoW, logoH);

            // 2. Dibuja el Encabezado 1 a la derecha del Logo
            ctx.fillStyle = "black";
            ctx.textBaseline = "top";

            ctx.font = "bold 20px monospace";
            ctx.fillText(get('e1_name').substring(0, 18), logoW + 10, 5);

            ctx.font = "16px monospace";
            ctx.fillText(get('e1_sub').substring(0, 22), logoW + 10, 25);
            ctx.fillText(get('e1_dir').substring(0, 22), logoW + 10, 45);
            ctx.fillText(get('e1_c1').substring(0, 22), logoW + 10, 65);
            ctx.fillText("C.P. " + get('e1_cp') + " " + get('e1_city').substring(0, 12), logoW + 10, 85);
            ctx.fillText(get('e1_c2').substring(0, 22), logoW + 10, 105);
            ctx.fillText("TEL: " + get('e1_tel').substring(0, 17), logoW + 10, 125);
            ctx.fillText(get('e1_mail').substring(0, 22), logoW + 10, 145);

            // Convierte todo a bits para la impresora
            const imgData = ctx.getImageData(0,0,w,h);
            const bytesPerRow = w / 8;
            const data = new Uint8Array(8 + (bytesPerRow * h));
            data.set([0x1D, 0x76, 0x30, 0x00, bytesPerRow & 0xFF, (bytesPerRow >> 8) & 0xFF, h & 0xFF, (h >> 8) & 0xFF]);
            let pos = 8;
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < bytesPerRow; x++) {
                    let b = 0;
                    for (let i = 0; i < 8; i++) {
                        const idx = (y * w + (x * 8 + i)) * 4;
                        if ((imgData.data[idx] + imgData.data[idx+1] + imgData.data[idx+2])/3 < 128) b |= (0x80 >> i);
                    }
                    data[pos++] = b;
                }
            }
            resolve(data);
        };
        // Si no hay logo, devuelve array vacío para no trabar el proceso
        img.onerror = () => resolve(new Uint8Array(0));
    });
}

// --- NÚMEROS A LETRAS (CORREGIDO PARA MILES) ---
function convertirMontoALetras(total) {
    const unidades = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
    const decenas = ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];
    const decenasMas = ["", "", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
    const centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

    function transformar(n) {
        if (n === 0) return "CERO";
        if (n === 100) return "CIEN";
        if (n < 10) return unidades[n];
        if (n < 20) return decenas[n - 10];
        if (n < 100) {
            let d = Math.floor(n / 10);
            let u = n % 10;
            return decenasMas[d] + (u > 0 ? " Y " + unidades[u] : "");
        }
        if (n < 1000) {
            let c = Math.floor(n / 100);
            let resto = n % 100;
            return centenas[c] + (resto > 0 ? " " + transformar(resto) : "");
        }
        return "";
    }

    let entero = Math.floor(total);
    let decimales = Math.round((total - entero) * 100);
    let textoEntero = "";

    // Lógica para miles
    if (entero >= 1000) {
        let miles = Math.floor(entero / 1000);
        let resto = entero % 1000;
        let textoMiles = miles === 1 ? "MIL" : transformar(miles) + " MIL";
        textoEntero = textoMiles + (resto > 0 ? " " + transformar(resto) : "");
    } else {
        textoEntero = transformar(entero);
    }

    let textoCents = decimales < 10 ? "0" + decimales : decimales.toString();
    return "(" + textoEntero + " PESOS " + textoCents + "/100 M.N.)";
}

// --- GESTIÓN DE LA LISTA ---
document.getElementById('btnAddProduct').addEventListener('click', () => {
    const id = document.getElementById('p_id').value || "---";
    const desc = document.getElementById('p_desc').value.toUpperCase();
    const qty = parseFloat(document.getElementById('p_qty').value);
    const price = parseFloat(document.getElementById('p_price').value);
    if(!desc || isNaN(qty)) return;
    itemsVenta.push({ id, desc, qty, price, total: (qty * price).toFixed(2) });
    renderLista();
    document.getElementById('p_id').value = "";
    document.getElementById('p_desc').value = "";
});

function renderLista() {
    const list = document.getElementById('productList');
    list.innerHTML = "";
    let subtotal = 0;
    let totalArticulos = 0;

    itemsVenta.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.id + " " + item.desc + " | " + item.qty + " x $" + item.price + " = $" + item.total;
        list.appendChild(li);
        subtotal += parseFloat(item.total);
        totalArticulos += item.qty;
    });

    const iva = subtotal * 0.16;
    const total = subtotal + iva;
    const recibido = parseFloat(document.getElementById('pago_recibido').value) || 0;
    const cambio = recibido > total ? recibido - total : 0;

    document.getElementById('st_val').textContent = "$" + subtotal.toFixed(2);
    document.getElementById('iva_val').textContent = "$" + iva.toFixed(2);
    document.getElementById('total_val').textContent = "$" + total.toFixed(2);
    document.getElementById('total_letras').textContent = convertirMontoALetras(total);
    document.getElementById('cambio_val').textContent = "$" + cambio.toFixed(2);

    window.articulosCount = totalArticulos;
}

// Escuchar cambios en el pago para actualizar el cambio en tiempo real
document.getElementById('pago_recibido').addEventListener('input', renderLista);

document.getElementById('btnClear').addEventListener('click', () => {
    itemsVenta = [];
    renderLista();
});

// --- IMPRESIÓN FINAL ---
document.getElementById('btnPrint').addEventListener('click', async () => {
    const get = (id) => document.getElementById(id).value.toUpperCase();
    const enc = new TextEncoder();

    // Aquí el logo ya trae el texto del Bloque 1 fusionado a la derecha
    const logoYEncabezadoBytes = await getLogoBytes('logo.png?v=1')

    let st = 0;
    itemsVenta.forEach(i => st += parseFloat(i.total));
    const iva = st * 0.16;
    const total = st + iva;
    const recibido = parseFloat(document.getElementById('pago_recibido').value) || 0;
    const cambio = recibido > total ? recibido - total : 0;

    let pBytes = [];
    itemsVenta.forEach(item => {
        pBytes.push(...enc.encode(item.id + " " + item.desc + "\n"));
        const row2 = item.qty + " X " + item.price;
        const sp = " ".repeat(Math.max(1, 32 - row2.length - item.total.length));
        pBytes.push(...enc.encode(row2 + sp + item.total + "\n"));
    });

    const ticket = new Uint8Array([
        ...ESC.INIT, ...ESC.LEFT,

        // Se imprime Logo y Encabezado 1 juntos
        ...(logoYEncabezadoBytes.length > 0 ? logoYEncabezadoBytes : []),
        ...enc.encode("\n"),

        // Bloque 2: Ubicación
        ...enc.encode("________________________________\n"),
        ...ESC.BOLD_ON, ...enc.encode(get('e2_bold') + "\n"), ...ESC.BOLD_OFF,
        ...enc.encode(get('e2_t2') + "\n" + get('e2_t3') + "\n"),
        ...enc.encode("________________________________\n"),

        // Bloque 3: Datos de Venta
        ...enc.encode(get('e3_val') + "\n" + "FECHA: " + (document.getElementById('e3_date').value || new Date().toLocaleString()) + "\n"),
        ...enc.encode("CTE: " + get('e3_client') + "\nRFC: " + get('e3_rfc') + "\nATENDIO: " + get('e3_staff') + "\n"),
        ...enc.encode("________________________________\n"),

        // Productos
        ...pBytes,

        // PIE DE PÁGINA 1
        ...enc.encode("________________________________\n"),
        ...enc.encode("SUBTOTAL: $" + st.toFixed(2) + "\n"),
        ...enc.encode("IVA 16%:  $" + iva.toFixed(2) + "\n"),
        ...ESC.BOLD_ON,
        ...enc.encode("TOTAL:    $" + total.toFixed(2) + "\n"),
        ...ESC.BOLD_OFF,
        ...enc.encode("\n" + convertirMontoALetras(total) + "\n"),
        ...enc.encode("________________________________\n"),

        // PIE DE PÁGINA 2
        ...enc.encode("01 EFECTIVO\n\n"),
        ...enc.encode("RECIBIDO: " + recibido.toFixed(2) + "  CAMBIO: " + cambio.toFixed(2) + "\n"),
        ...enc.encode("ARTICULOS VENDIDOS: " + (window.articulosCount || 0) + "\n"),
        ...enc.encode("ATENDIDO POR: " + get('atendio_nombre') + "\n\n"),

        ...enc.encode("CUENTA CON 3 DIAS NATURALES\nPARA SOLICITAR SU FACTURA\n"),
        ...enc.encode("________________________________\n"),

        ...ESC.CENTER,
        ...ESC.BOLD_ON, ...enc.encode("GRACIAS POR SU COMPRA\n"), ...ESC.BOLD_OFF,

        ...ESC.FEED
    ]);

    for (let i = 0; i < ticket.length; i += 20) {
        await printerChar.writeValue(ticket.slice(i, i + 20));
    }
});
