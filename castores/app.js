// VARIABLES GLOBALES DEL SISTEMA DE CARPINTERÍA
let printerPort = null;      // Objeto para conexión por Cable (Serial)
let printerChar = null;      // Objeto para conexión por Bluetooth
let productosVenta = [];
let currentPaper = 80;       // Configurado por defecto para tu POS-80 (cambiable a 58 en caliente)
let deferredPrompt = null;   // Guardará el evento nativo de instalación PWA

// URL Activa y verificada de tu Google Apps Script
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyGmQ7LG5Cltw-hTMmElBHmN2D5GBSNNIiiYzjzP1p3QWARuoP3BggkwHVz5CxcDMst/exec";

const PAPER_PROFILES = {
    58: { width: 384, fontSize: 18, smallSize: 15, limit: 22 },
    80: { width: 576, fontSize: 25, smallSize: 20, limit: 32 }
};

// --- FUNCIÓN REGISTRADA EN EL ÁMBITO WINDOW PARA ACCESO DIRECTO DESDE EL HTML ---
window.setPaper = function(size) {
    currentPaper = size;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    const chip = document.getElementById(`chip${size}`);
    if(chip) chip.classList.add('active');
    console.log("Papel del sistema configurado a: " + size + "mm");
};

// --- 🖨️ FUNCIÓN DE PROCESADO DE LOGO CON FILTRO DE TRAMADO (EFECTO GRIS) ---
function cargarLogoImagen(src, maxWidth) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            const escala = maxWidth / img.width;
            canvas.width = maxWidth;
            canvas.height = img.height * escala;

            ctx.imageSmoothingEnabled = false;
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;

            for (let i = 0; i < data.length; i += 4) {
                const gris = data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114;
                if (gris > 80 && gris < 200) {
                    const x = (i / 4) % canvas.width;
                    const y = Math.floor((i / 4) / canvas.width);
                    const nuevoColor = ((x + y) % 2 === 0) ? 0 : 255;
                    data[i] = data[i+1] = data[i+2] = nuevoColor;
                } else if (gris <= 80) {
                    data[i] = data[i+1] = data[i+2] = 0;
                } else {
                    data[i] = data[i+1] = data[i+2] = 255;
                }
            }
            ctx.putImageData(imgData, 0, 0);
            resolve(canvas);
        };
        img.onerror = (err) => reject(err);
    });
}

// --- 📐 ENCABEZADO OPTIMIZADO: SEPARA EL TEXTO DEL LOGO PARA EVITAR COMPRESIÓN EN MÓVILES ---
async function getHeaderBazar(datos) {
    const cfg = PAPER_PROFILES[currentPaper];
    const h = 340;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Forzar dimensiones nativas sin interferencia de pantalla móvil
    canvas.width = cfg.width;
    canvas.height = h;
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, h);

    let y = 20;
    const anchoBloque = canvas.width - 24;
    const xBloque = (canvas.width - anchoBloque) / 2;

    ctx.fillStyle = "black";
    ctx.fillRect(xBloque, y, anchoBloque, 45);

    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = `bold ${cfg.fontSize + 1}px Arial`;
    const nombreTaller = datos.empNombre || "CARPINTERIA CASTORES";
    ctx.fillText(nombreTaller, canvas.width / 2, y + 31);

    ctx.fillStyle = "black";
    ctx.textAlign = "center";

    y += 75;
    ctx.font = `italic ${cfg.smallSize}px Arial`;
    ctx.fillText("Creaciones en Madera sin Límites", canvas.width / 2, y);

    ctx.font = `${cfg.smallSize - 1}px Arial`;
    y += 26; ctx.fillText("Cargo: PROPIETARIO", canvas.width / 2, y);
    y += 24; ctx.fillText(datos.empRfc || "TIZIMÍN, YUCATÁN", canvas.width / 2, y);
    y += 24; ctx.fillText(datos.empDireccion || "MÉXICO", canvas.width / 2, y);

    y += 32; ctx.font = `bold ${cfg.fontSize - 1}px Arial`;
    ctx.fillText(datos.docTipo, canvas.width / 2, y);
    y += 24; ctx.font = `${cfg.smallSize}px Arial`;
    ctx.fillText(`FECHA: ${datos.fecha} ${datos.hora}`, canvas.width / 2, y);

    y += 38; ctx.textAlign = "left";
    ctx.font = `bold ${cfg.smallSize}px Arial`;
    ctx.fillText(`CLIENTE: ${datos.cliNombre}`, 5, y);

    y += 26; ctx.font = `${cfg.smallSize}px Arial`;
    ctx.fillText(`CONTACTO: ${datos.cliRfc}`, 5, y);

    y += 24; ctx.textAlign = "center";
    ctx.fillText("==================================", canvas.width / 2, y);

    return canvas;
}

// --- CUERPO DE CONCEPTOS MANUALES (CARRITO RÁPIDO) ---
async function getBodyBazar(productos) {
    const cfg = PAPER_PROFILES[currentPaper];
    const canvas = document.createElement('canvas');
    const rowH = 40;
    const h = (productos.length * rowH) + 130;

    canvas.width = cfg.width; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, h);

    let y = 5;
    ctx.fillStyle = "black"; ctx.fillRect(0, y, canvas.width, 24);

    y += 17;
    ctx.textAlign = "left";
    ctx.font = `bold ${cfg.smallSize - 1}px Arial`;
    ctx.fillStyle = "white";
    ctx.fillText("CANT.  DESCRIPCION/MAT.        IMPORTE", 5, y);

    ctx.fillStyle = "black";
    y += 15;
    let subtotal = 0;

    productos.forEach(p => {
        ctx.textAlign = "left";
        ctx.font = `${cfg.smallSize}px Arial`;
        ctx.fillText(p.cant.toFixed(3), 5, y);

        ctx.font = `bold ${cfg.smallSize}px Arial`;
        ctx.fillText(p.desc.substring(0, cfg.limit), 55, y);

        ctx.font = `${cfg.smallSize - 3}px Arial`;
        ctx.fillText(p.cod.substring(0, 25), 55, y + 15);

        ctx.textAlign = "right";
        ctx.font = `bold ${cfg.smallSize}px Arial`;
        ctx.fillText(p.importe.toFixed(2), canvas.width - 5, y);

        subtotal += p.importe;
        y += rowH;
    });

    y += 20;
    ctx.font = `bold ${cfg.fontSize}px Arial`;
    ctx.textAlign = "right";
    ctx.fillText(`Total Obra:  $${subtotal.toFixed(2)}`, canvas.width - 5, y);

    return canvas;
}

// --- CUERPO AUTOMÁTICO DE MEDIDAS CON BLOQUE DE SALDO RESTANTE ---
async function getBodyAnticipoAutomatico(payload) {
    const cfg = PAPER_PROFILES[currentPaper];
    const canvas = document.createElement('canvas');

    let lineasDetalle = [];
    const t = payload.detalles_tecnicos;
    if (t && (t.type === 'puerta' || t.tipo === 'puerta')) {
        lineasDetalle.push(`Estructura: Puerta Principal`, `Alto Vano: ${t.alto} m`, `Ancho Vano: ${t.ancho} m`, `Espesor: ${t.espesor}`, `Madera: ${t.madera}`);
    } else if (t && (t.type === 'silla' || t.tipo === 'silla')) {
        lineasDetalle.push(`Estructura: Fabricación Silla`, `Cant. Piezas: ${t.cantidad}`, `Altura Asiento: ${t.altura_asiento}`, `Detalles: ${t.tapizado}`);
    } else if (t && (t.type === 'comedor' || t.tipo === 'comedor')) {
        lineasDetalle.push(`Estructura: Juego Comedor`, `Cubierta Mesa: ${t.medida_mesa}`, `Num. Sillas: ${t.num_sillas}`, `Estilo: ${t.detalles}`);
    }

    const h = 260 + (lineasDetalle.length * 22);
    canvas.width = cfg.width; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, h);
    ctx.fillStyle = "black";

    let y = 20;
    ctx.textAlign = "left";
    ctx.font = `bold ${cfg.smallSize}px Arial`;
    ctx.fillText("🔨 CONCEPTO DEL PROYECTO", 5, y);

    ctx.font = `${cfg.smallSize}px Arial`;
    y += 22; ctx.fillText(payload.descripcion.substring(0, 35), 10, y);

    y += 25;
    ctx.font = `bold ${cfg.smallSize}px Arial`;
    ctx.fillText("📐 ESPECIFICACIONES TÉCNICAS", 5, y);
    ctx.font = `italic ${cfg.smallSize}px Arial`;

    lineasDetalle.forEach(lin => {
        y += 22;
        ctx.fillText(` • ${lin}`, 10, y);
    });

    y += 30;
    ctx.font = `${cfg.smallSize}px Arial`;
    ctx.fillText("----------------------------------", 5, y);

    y += 22;
    ctx.font = `${cfg.smallSize}px Arial`;
    ctx.fillText(`Costo Total Obra:`, 5, y);
    ctx.textAlign = "right";
    ctx.fillText(`$${payload.total.toFixed(2)}`, canvas.width - 5, y);

    y += 22;
    ctx.textAlign = "left";
    ctx.fillText(`Anticipo Recibido:`, 5, y);
    ctx.textAlign = "right";
    ctx.fillText(`-$${payload.anticipo.toFixed(2)}`, canvas.width - 5, y);

    y += 20;
    ctx.fillStyle = "black";
    ctx.fillRect(5, y, canvas.width - 10, 38);

    ctx.fillStyle = "white";
    ctx.textAlign = "left";
    ctx.font = `bold ${cfg.smallSize + 1}px Arial`;
    ctx.fillText(`  SALDO RESTANTE:`, 10, y + 24);

    ctx.textAlign = "right";
    const resta = (payload.total - payload.anticipo).toFixed(2);
    ctx.fillText(`$${resta}  `, canvas.width - 10, y + 24);

    return canvas;
}

async function getFooterBazar(payload) {
    const cfg = PAPER_PROFILES[currentPaper];
    const canvas = document.createElement('canvas');
    const h = 140;
    canvas.width = cfg.width; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, h);
    ctx.fillStyle = "black";

    let y = 25;
    ctx.font = `bold ${cfg.smallSize - 2}px Arial`;
    ctx.textAlign = "left";
    ctx.fillText(`📅 DETALLES DE ENTREGA`, 5, y);

    ctx.font = `${cfg.smallSize}px Arial`;
    y += 22; ctx.fillText(`• Estatus Inicial: ${payload ? payload.estatus.toUpperCase() : 'POR INICIAR'}`, 10, y);
    y += 22; ctx.fillText(`• Promesa de Entrega: ${payload ? payload.fecha_entrega : '--/--/----'}`, 10, y);

    y += 30;
    ctx.textAlign = "center";
    ctx.font = `italic ${cfg.smallSize - 2}px Arial`;
    ctx.fillText('"La calidad se nota en los detalles. Gracias."', canvas.width / 2, y);

    y += 25;
    ctx.font = `${cfg.smallSize - 3}px Arial`;
    ctx.fillText("___________________________", canvas.width / 2, y);
    y += 14;
    ctx.fillText("Firma de Conformidad", canvas.width / 2, y);

    return canvas;
}

// --- 🛠️ LA FUNCIÓN CRUCIAL DE EXTRACCIÓN MODIFICADA (OBLIGA TAMAÑO REAL EN MÓVILES) ---
function canvasToBytes(canvas) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Forzamos al contexto a que nos extraiga los píxeles lógicos declarados, no los de la pantalla del celular
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

// --- 🔥 DESPACHADOR ULTRA RÁPIDO EN CADENA ---
async function despacharImpresion(cHeader, cBody, cFooter) {
    if (printerChar) {
        console.log("Despachando ráfaga optimizada por bloques...");

        let bLogo = new Uint8Array(0);
        const cfg = PAPER_PROFILES[currentPaper];

        try {
            const logoCanvas = await cargarLogoImagen('logo.png', cfg.width - 60);
            bLogo = canvasToBytes(logoCanvas);
        } catch (e) {
            console.log("No se pudo procesar logo independiente, se omite:", e);
        }

        const bHeader = canvasToBytes(cHeader);
        const bBody = canvasToBytes(cBody);
        const bFooter = canvasToBytes(cFooter);

        const initPrinter = [0x1B, 0x40, 0x1D, 0x7C, 0x02];
        const feedAndCut = [0x1B, 0x64, 0x06, 0x1D, 0x56, 0x42, 0x00];

        const ticketBytes = new Uint8Array([...initPrinter, ...bLogo, ...bHeader, ...bBody, ...bFooter, ...feedAndCut]);

        const TAMANO_PAQUETE = 512;
        for (let i = 0; i < ticketBytes.length; i += TAMANO_PAQUETE) {
            const paquete = ticketBytes.slice(i, i + TAMANO_PAQUETE);
            await printerChar.writeValue(paquete);
        }
        console.log("¡Tique completo enviado sin restricciones de memoria móvil!");
    }
}

function alternarCamposDinamicos() {
    const secPuerta = document.getElementById('secPuerta');
    const secSilla = document.getElementById('secSilla');
    const secComedor = document.getElementById('secComedor');

    if(secPuerta) secPuerta.style.display = 'none';
    if(secSilla) secSilla.style.display = 'none';
    if(secComedor) secComedor.style.display = 'none';

    const tipo = document.getElementById('tipoMueble').value;
    if (tipo === 'puerta' && secPuerta) secPuerta.style.display = 'block';
    if (tipo === 'silla' && secSilla) secSilla.style.display = 'block';
    if (tipo === 'comedor' && secComedor) secComedor.style.display = 'block';
}

async function cambiarEstatusTrabajo(idPedido, nuevoEstatus) {
    try {
        const payload = { accion: "actualizar_estatus", id_pedido: idPedido, nuevo_estatus: nuevoEstatus };
        const card = document.querySelector(`[data-id="${idPedido}"]`);
        if(card) card.style.opacity = "0.5";

        await fetch(SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        setTimeout(cargarProyectosPendientes, 500);
    } catch (error) {
        alert("Error al cambiar el estatus: " + error.message);
    }
}

async function cargarProyectosPendientes() {
    const contenedor = document.getElementById('listaPendientes');
    if (!contenedor) return;

    try {
        const response = await fetch(SCRIPT_URL);
        const pedidos = await response.json();
        const pendientes = pedidos.filter(p => p.estatus !== "Listo");

        if (pendientes.length === 0) {
            contenedor.innerHTML = `<p style="color: #22c55e; text-align: center; padding: 10px; font-weight: bold;">✅ ¡Al día! No hay pendientes.</p>`;
            return;
        }

        contenedor.innerHTML = "";
        pendientes.forEach(p => {
            const colorEstatus = p.estatus === "Por Iniciar" ? "#ef4444" : "#eab308";
            const saldoPendiente = (parseFloat(p.total) - parseFloat(p.anticipo)).toFixed(2);

            let botonAccion = "";
            if (p.estatus === "Por Iniciar") {
                botonAccion = `<button onclick="cambiarEstatusTrabajo(${p.id_pedido}, 'En Proceso')" style="background: #eab308; color: #000; border: none; padding: 4px 8px; border-radius: 4px; font-size: 10px; cursor: pointer; font-weight: bold;">🔧 Empezar</button>`;
            } else if (p.estatus === "En Proceso") {
                botonAccion = `<button onclick="cambiarEstatusTrabajo(${p.id_pedido}, 'Listo')" style="background: #22c55e; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; font-size: 10px; cursor: pointer; font-weight: bold;">✅ Terminar</button>`;
            }

            contenedor.innerHTML += `
                <div data-id="${p.id_pedido}" style="background: #1e293b; border-left: 4px solid ${colorEstatus}; padding: 10px; margin-bottom: 8px; border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: bold; color: #f8fafc;">${p.id_cliente}</span>
                        ${botonAccion}
                    </div>
                    <div style="color: #94a3b8; margin: 4px 0; font-size: 12px;">${p.descripcion}</div>
                    <div style="display: flex; justify-content: space-between; font-size: 11px; color: #cbd5e1; margin-top: 6px;">
                        <span>Estatus: <b style="color: ${colorEstatus}">${p.estatus}</b></span>
                        <span style="color: #f43f5e; font-weight: bold;">Resta: $${saldoPendiente}</span>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        contenedor.innerHTML = `<p style="color: #ef4444; text-align: center; padding: 10px;">⚠️ Error de sincronización.</p>`;
    }
}

async function enviarPedidoAGoogle(e) {
    e.preventDefault();
    const tipo = document.getElementById('tipoMueble').value;
    let detallesTecnicos = { tipo: tipo };

    if (tipo === 'puerta') {
        detallesTecnicos.alto = document.getElementById('pAlto').value;
        detallesTecnicos.ancho = document.getElementById('pAncho').value;
        detallesTecnicos.espesor = document.getElementById('pEspesor').value;
        detallesTecnicos.madera = document.getElementById('pMadera').value;
    } else if (tipo === 'silla') {
        detallesTecnicos.cantidad = document.getElementById('sCantidad').value;
        detallesTecnicos.altura_asiento = document.getElementById('sAltura').value;
        detallesTecnicos.tapizado = document.getElementById('sTapizado').value;
    } else if (tipo === 'comedor') {
        detallesTecnicos.medida_mesa = document.getElementById('cMesa').value;
        detallesTecnicos.num_sillas = document.getElementById('cNumSillas').value;
        detallesTecnicos.detalles = document.getElementById('cDetalles').value;
    }

    const payload = {
        id_cliente: document.getElementById('idCliente').value.toUpperCase(),
        descripcion: document.getElementById('descripcion').value.toUpperCase(),
        total: parseFloat(document.getElementById('totalPedido').value) || 0,
        anticipo: parseFloat(document.getElementById('anticipoPedido').value) || 0,
        estatus: document.getElementById('estatusPedido').value,
        fecha_entrega: document.getElementById('fechaEntrega').value.split('-').reverse().join('/'),
        detalles_tecnicos: detallesTecnicos
    };

    try {
        await fetch(SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        alert("¡Pedido guardado en la nube! Procesando impresión...");

        const datosHeader = {
            empNombre: "CARPINTERIA CASTORES",
            empPropietario: "PROPIETARIO",
            empRfc: "TIZIMÍN, YUCATÁN",
            empDireccion: "MÉXICO",
            docTipo: "RECIBO DE ANTICIPO",
            fecha: document.getElementById('fechaManual').value.split('-').reverse().join('/'),
            hora: document.getElementById('horaManual').value,
            cliNombre: payload.id_cliente,
            cliRfc: document.getElementById('idCliente').value.toUpperCase()
        };

        const h1 = await getHeaderBazar(datosHeader);
        const body = await getBodyAnticipoAutomatico(payload);
        const foot = await getFooterBazar(payload);

        await despacharImpresion(h1, body, foot);

        document.getElementById('formPedido').reset();
        alternarCamposDinamicos();
        cargarProyectosPendientes();

    } catch (error) {
        alert("Error en la automatización de impresión: " + error.message);
    }
}

// --- ESCUCHA E INICIALIZACIÓN DEL DOM ---
document.addEventListener('DOMContentLoaded', () => {
    const ahora = new Date();
    if(document.getElementById('fechaManual')) document.getElementById('fechaManual').valueAsDate = ahora;
    if(document.getElementById('horaManual')) {
        document.getElementById('horaManual').value = ahora.getHours().toString().padStart(2, '0') + ":" + ahora.getMinutes().toString().padStart(2, '0');
    }

    const formPed = document.getElementById('formPedido');
    if(formPed) formPed.onsubmit = enviarPedidoAGoogle;

    cargarProyectosPendientes();

    const btnRefrescar = document.getElementById('btnRefrescarPedidos');
    if (btnRefrescar) btnRefrescar.onclick = () => cargarProyectosPendientes();

    const btnConnect = document.getElementById('btnConnect');
    if(btnConnect) {
        btnConnect.onclick = async () => {
            const modo = document.getElementById('tipoConexion').value;
            printerChar = null; printerPort = null;
            try {
                if (modo === "bluetooth") {
                    const device = await navigator.bluetooth.requestDevice({
                        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
                        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
                    });
                    const server = await device.gatt.connect();
                    const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
                    printerChar = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
                    document.getElementById('statusText').textContent = "Conectado vía BT";
                } else {
                    document.getElementById('statusText').textContent = "Modo Cable Seleccionado";
                }
                document.getElementById('led').className = 'led-on';
                document.getElementById('btnTest').disabled = false;
            } catch (e) {
                document.getElementById('led').className = 'led-off';
                document.getElementById('status
