// VARIABLES GLOBALES DEL SISTEMA DE CARPINTERÍA
let printerPort = null;      // Objeto para conexión por Cable (Serial)
let printerChar = null;      // Objeto para conexión por Bluetooth
let productosVenta = [];
let currentPaper = 58;
let deferredPrompt = null;   // Guardará el evento nativo de instalación PWA

// URL Activa y verificada de tu Google Apps Script
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyGmQ7LG5Cltw-hTMmElBHmN2D5GBSNNIiiYzjzP1p3QWARuoP3BggkwHVz5CxcDMst/exec";

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

// --- 🔥 FUNCIÓN AUXILIAR PARA CARGAR PROCESAR EL LOGO RECIEDO EN LA CARPETA ---
function cargarLogoImagen(src, maxWidth) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Mantener la proporción del círculo del logo original
            const escala = maxWidth / img.width;
            canvas.width = maxWidth;
            canvas.height = img.height * escala;

            // Dibujar en blanco y negro limpio
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas);
        };
        img.onerror = (err) => reject(err);
    });
}

// --- ENCABEZADO GRÁFICO PREMIUM CON EL LOGO.PNG INTEGRADO ---
async function getHeaderBazar(datos) {
    const cfg = PAPER_PROFILES[currentPaper];

    // Altura calculada para dar espacio al logo arriba (180px para el logo + texto)
    const logoH = 170;
    const h = 260 + logoH;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = cfg.width; canvas.height = h;

    ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, h);

    // 1. Intentar estampar el Logotipo centrado en la parte superior
    try {
        // Reducimos un poco el ancho máximo para dejar márgenes elegantes a los lados
        const logoCanvas = await cargarLogoImagen('logo.png', canvas.width - 60);
        const xCentrado = (canvas.width - logoCanvas.width) / 2;
        ctx.drawImage(logoCanvas, xCentrado, 5);
    } catch (e) {
        console.log("No se pudo cargar logo.png, se continuará imprimiendo solo texto:", e);
    }

    // 2. Bloque Negro Sólido Invertido para el Nombre de la Empresa
    let y = logoH + 20;
    ctx.fillStyle = "black";
    ctx.fillRect(10, y, canvas.width - 20, 42);

    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = `bold ${cfg.fontSize + 1}px Arial`;
    const nombreTaller = datos.empNombre || "CARPINTERIA CASTORES";
    ctx.fillText(nombreTaller, canvas.width / 2, y + 28);

    // 3. Detalles de ubicación e información fija
    ctx.fillStyle = "black";
    ctx.textAlign = "center";

    y += 65;
    ctx.font = `italic ${cfg.smallSize}px Arial`;
    ctx.fillText("Muebles Finos & Diseños", canvas.width / 2, y);

    ctx.font = `${cfg.smallSize - 1}px Arial`;
    y += 20; ctx.fillText("Cargo: PROPIETARIO", canvas.width / 2, y);
    y += 18; ctx.fillText(datos.empRfc || "TIZIMÍN, YUCATÁN", canvas.width / 2, y);
    y += 18; ctx.fillText(datos.empDireccion || "MÉXICO", canvas.width / 2, y);

    y += 25; ctx.font = `bold ${cfg.fontSize - 1}px Arial`;
    ctx.fillText(datos.docTipo, canvas.width / 2, y);
    y += 20; ctx.font = `${cfg.smallSize}px Arial`;
    ctx.fillText(`FECHA: ${datos.fecha} ${datos.hora}`, canvas.width / 2, y);

    y += 25; ctx.textAlign = "left";
    ctx.font = `bold ${cfg.smallSize}px Arial`;
    ctx.fillText(`CLIENTE: ${datos.cliNombre}`, 5, y);
    y += 18; ctx.font = `${cfg.smallSize}px Arial`;
    ctx.fillText(`CONTACTO: ${datos.cliRfc}`, 5, y);

    y += 15; ctx.textAlign = "center";
    ctx.fillText("==================================", canvas.width / 2, y);

    return canvasToBytes(ctx, canvas.width, h);
}

// --- CUERPO DE CONCEPTOS MANUALES (CARRITO RÁPIDO) ---
async function getBodyBazar(productos) {
    const cfg = PAPER_PROFILES[currentPaper];
    const canvas = document.createElement('canvas');
    const rowH = 40;
    const h = (productos.length * rowH) + 130;
    canvas.width = cfg.width; canvas.height = h;
    const ctx = canvas.getContext('2d');
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

    return canvasToBytes(ctx, canvas.width, h);
}

// --- CUERPO AUTOMÁTICO DE MEDIDAS CON BLOQUE DE SALDO RESTANTE ---
async function getBodyAnticipoAutomatico(payload) {
    const cfg = PAPER_PROFILES[currentPaper];
    const canvas = document.createElement('canvas');

    let lineasDetalle = [];
    const t = payload.detalles_tecnicos;
    if (t.type === 'puerta' || t.tipo === 'puerta') {
        lineasDetalle.push(`Estructura: Puerta Principal`, `Alto Vano: ${t.alto} m`, `Ancho Vano: ${t.ancho} m`, `Espesor: ${t.espesor}`, `Madera: ${t.madera}`);
    } else if (t.type === 'silla' || t.tipo === 'silla') {
        lineasDetalle.push(`Estructura: Fabricación Silla`, `Cant. Piezas: ${t.cantidad}`, `Altura Asiento: ${t.altura_asiento}`, `Detalles: ${t.tapizado}`);
    } else if (t.type === 'comedor' || t.tipo === 'comedor') {
        lineasDetalle.push(`Estructura: Juego Comedor`, `Cubierta Mesa: ${t.medida_mesa}`, `Num. Sillas: ${t.num_sillas}`, `Estilo: ${t.detalles}`);
    }

    const h = 260 + (lineasDetalle.length * 22);
    canvas.width = cfg.width; canvas.height = h;
    const ctx = canvas.getContext('2d');
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

    // Franja Invertida de Alto Impacto para el Saldo Pendiente
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

    return canvasToBytes(ctx, canvas.width, h);
}

async function getFooterBazar(payload) {
    const cfg = PAPER_PROFILES[currentPaper];
    const canvas = document.createElement('canvas');
    const h = 140;
    canvas.width = cfg.width; canvas.height = h;
    const ctx = canvas.getContext('2d');
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

async function enviarDatosATiquetera(dataBytes) {
    if (printerChar) {
        for (let i = 0; i < dataBytes.length; i += 20) {
            await printerChar.writeValue(dataBytes.slice(i, i + 20));
        }
    } else if (printerPort && printerPort.writable) {
        const writer = printerPort.writable.getWriter();
        await writer.write(dataBytes);
        writer.releaseLock();
    } else {
        console.log("Tiquetera no lista o desconectada.");
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

// --- SUBIR A GOOGLE SHEETS E IMPRIMIR DE FORMA AUTOMÁTICA ---
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

    const inputNombreTaller = document.getElementById('empNombre') ? document.getElementById('empNombre').value.toUpperCase() : "";

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

        alert("¡Pedido guardado! Expulsando tique con Logotipo...");

        const datosHeader = {
            empNombre: inputNombreTaller || "CARPINTERIA CASTORES",
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

        // Envía comandos ESC/POS con el bloque completo del logotipo e información técnica
        const ticketBytes = new Uint8Array([0x1B, 0x40, ...h1, ...body, ...foot, 0x1B, 0x64, 0x05]);
        await enviarDatosATiquetera(ticketBytes);

        document.getElementById('formPedido').reset();
        alternarCamposDinamicos();
        cargarProyectosPendientes();

    } catch (error) {
        alert("Error en la automatización de impresión: " + error.message);
    }
}

// --- CONTROL DE CARGA DEL DOM ---
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
                    printerPort = await navigator.serial.requestPort();
                    await printerPort.open({ baudRate: 9600 });
                    document.getElementById('statusText').textContent = "Conectado por Cable";
                }
                document.getElementById('led').className = 'led-on';
                document.getElementById('btnTest').disabled = false;
            } catch (e) {
                document.getElementById('led').className = 'led-off';
                document.getElementById('statusText').textContent = "Desconectado";
                alert("Error al conectar: " + e.message);
            }
        };
    }

    const btnAdd = document.getElementById('btnAdd');
    if(btnAdd) {
        btnAdd.onclick = () => {
            const desc = document.getElementById('prodDesc').value.toUpperCase();
            const cant = parseFloat(document.getElementById('prodCant').value) || 1.000;
            const pUnit = parseFloat(document.getElementById('prodPrice').value);
            const cod = document.getElementById('prodCod').value || "ELEMENTO";

            if (!desc || isNaN(pUnit)) {
                alert("Asigna una descripción y el precio del concepto.");
                return;
            }

            productosVenta.push({ cod, desc, cant, pUnit, importe: cant * pUnit });

            const tbody = document.querySelector('#listaPrevia tbody');
            if(tbody) {
                tbody.innerHTML += `<tr>
                    <td>${cant.toFixed(3)}</td>
                    <td><b>${desc}</b><br><span style="font-size:11px;color:#a1b0cb">${cod}</span></td>
                    <td style="text-align:right;">$${(cant*pUnit).toFixed(2)}</td>
                </tr>`;
            }

            const totalAcumulado = productosVenta.reduce((s, p) => s + p.importe, 0);
            document.getElementById('totalLabel').textContent = `TOTAL: $${totalAcumulado.toFixed(2)}`;

            document.getElementById('prodDesc').value = "";
            document.getElementById('prodPrice').value = "";
            document.getElementById('prodCod').value = "";
        };
    }

    const btnTest = document.getElementById('btnTest');
    if(btnTest) {
        btnTest.onclick = async () => {
            if (productosVenta.length === 0) return;

            const datosCampos = {
                empNombre: document.getElementById('empNombre') ? document.getElementById('empNombre').value.toUpperCase() : "CARPINTERIA CASTORES",
                empPropietario: "PROPIETARIO",
                empRfc: "TIZIMÍN, YUCATÁN",
                empDireccion: "MÉXICO",
                docTipo: document.getElementById('docTipo').value.toUpperCase(),
                docFolio: document.getElementById('docFolio').value,
                fecha: document.getElementById('fechaManual').value.split('-').reverse().join('/'),
                hora: document.getElementById('horaManual').value,
                cliNombre: document.getElementById('cliNombre').value.toUpperCase(),
                cliRfc: document.getElementById('cliRfc').value.toUpperCase()
            };

            const h1 = await getHeaderBazar(datosCampos);
            const body = await getBodyBazar(productosVenta);
            const foot = await getFooterBazar(null);

            const ticketBytes = new Uint8Array([0x1B, 0x40, ...h1, ...body, ...foot, 0x1B, 0x64, 0x04]);
            await enviarDatosATiquetera(ticketBytes);
        };
    }

    const btnReset = document.getElementById('btnReset');
    if(btnReset) btnReset.onclick = () => location.reload();

    const banner = document.getElementById('pwaInstallBanner');
    const btnInstall = document.getElementById('btnPwaInstall');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault(); deferredPrompt = e;
        if (banner) banner.style.setProperty('display', 'block', 'important');
    });

    if (btnInstall) {
        btnInstall.onclick = async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            deferredPrompt = null;
            if (banner) banner.style.display = 'none';
        };
    }
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => console.log(err));
    });
}
