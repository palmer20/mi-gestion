// ============================================================
//  js/mensajes.js — Generación de mensajes y envío WhatsApp
// ============================================================

// ── Construir texto según tipo ─────────────────────────────
function construirTexto(tipo, d) {
  var emp     = (typeof CFG !== 'undefined' && CFG.empresa) ? CFG.empresa : {};
  var empresa = emp.nombre  || 'ADP';
  var soporte = emp.soporte || '';
  var sep     = '─────────────────────';

  if (tipo === 'nueva') {
    return '🗓️ *' + empresa + ' — Nueva venta* 🗓️\n' + sep + '\n' +
      '*Cliente:* ' + d.nombre + '\n' +
      (d.dni       ? '*DNI:* '       + d.dni       + '\n' : '') +
      '*Teléfono:* ' + d.telefono + '\n' +
      (d.direccion ? '*Dirección:* ' + d.direccion + '\n' : '') +
      '*Producto:* ' + (d.producto || '—') + '\n' +
      '*Cuota semanal:* ' + d.cuota + '\n' +
      '*Plan:* ' + d.semanas + '\n' +
      '*1ª cuota:* ' + d.fechaStr + '\n' +
      '*Cobro:* ' + d.pago + '\n' +
      sep + '\n' +
      (soporte ? 'Consultas: ' + soporte : '');
  }

  if (tipo === 'cobro') {
    if (d.esUltima) {
      return '🎉🎉🎉 *¡FELICITACIONES ' + d.nombre.toUpperCase() + '!* 🎉🎉🎉\n' + sep + '\n' +
        'Terminaste de pagar tu ' + d.producto + ' completamente.\n\n' +
        '*Cuotas:* ' + d.semanasTotales + ' semanas · ' + d.cuota + ' c/u\n' +
        '*Última cuota:* ' + d.cuotaNum + '\n' +
        '*Método:* ' + d.pago + '\n' +
        sep + '\n' +
        '¡Gracias por tu confianza! 🙌\n' +
        (soporte ? 'Consultas: ' + soporte : '');
    }
    return '✅ *' + empresa + ' — Cuota cobrada* ✅\n' + sep + '\n' +
      'Hola *' + d.nombre + '*, registramos el pago de tu cuota.\n\n' +
      '*Producto:* ' + d.producto + '\n' +
      '*Cuota:* ' + d.cuotaNum + '\n' +
      '*Monto:* ' + d.cuota + '\n' +
      '*Método:* ' + d.pago + '\n' +
      '_Quedan ' + d.cuotasRestantes + ' cuotas. Próx. venc.: ' + d.fechaStr + '_\n' +
      sep + '\n' +
      (soporte ? 'Consultas: ' + soporte : '');
  }

  if (tipo === 'aviso') {
    return '⏰ *' + empresa + ' — Recordatorio de cuota* ⏰\n' + sep + '\n' +
      'Hola *' + d.nombre + '*, tu cuota *' + d.cuotaNum + '* vence el *' + d.fechaStr + '*.\n\n' +
      '*Producto:* ' + d.producto + '\n' +
      '*Monto a pagar:* ' + d.cuota + '\n' +
      sep + '\n' +
      'Recordá pagar para no generar mora 🙏\n' +
      (soporte ? 'Consultas: ' + soporte : '');
  }

  if (tipo === 'vencida') {
    return '❌ *' + empresa + ' — Cuota vencida* ❌\n' + sep + '\n' +
      'Hola *' + d.nombre + '*, tu cuota *' + d.cuotaNum + '* del *' + d.fechaStr + '* no fue registrada.\n\n' +
      '*Producto:* ' + d.producto + '\n' +
      '*Monto pendiente:* ' + d.cuota + '\n' +
      sep + '\n' +
      'Por favor regularizá tu situación a la brevedad.\n' +
      (soporte ? 'Contacto: ' + soporte : '');
  }
  return '';
}

// ── Generar mensaje principal ──────────────────────────────
function generarMensaje() {
  var ventas = cargarVentas();

  if (tipoActivo === 'nueva') {
    // ── NUEVA VENTA ──
    var nombre      = (document.getElementById('nombre')?.value    || '').trim();
    var telefono    = (document.getElementById('telefono')?.value  || '').trim();
    var dni         = (document.getElementById('dni')?.value       || '').trim();
    var direccion   = (document.getElementById('direccion')?.value || '').trim();
    var producto    = (document.getElementById('producto')?.value  || '').trim();
    var vencInp     = document.getElementById('vencimiento')?.value || '';
    var vendedor    = (document.getElementById('vendedor-nombre')?.value || '').trim();
    var precioTotal = parseFloat(document.getElementById('precio-total')?.value || '0');
    var semanas     = getSemanas();
    var cuota       = (precioTotal > 0 && semanas) ? Math.ceil(precioTotal / semanas) : 0;
    var fechaStr    = inputToStr(vencInp);
    var proxVencDate = sumarDias(new Date(), 7);
    var proxVencStr  = fechaToStr(proxVencDate);

    if (!nombre || !telefono) { alert('Completá nombre y teléfono'); return; }
    if (!semanas || precioTotal <= 0) { alert('Completá precio y plan de cuotas'); return; }

    var nuevaVenta = {
      id:             Date.now(),
      nombre:         nombre,
      telefono:       telefono,
      dni:            dni,
      direccion:      direccion,
      producto:       producto,
      precioTotal:    precioTotal,
      semanasTotales: semanas,
      cuotaMonto:     cuota,
      cuotaActual:    2,
      proximoVenc:    proxVencStr,
      vendedor:       vendedor,
      pago:           pagoActivo,
      fechaVenta:     new Date().toLocaleDateString('es-AR'),
      mes_key:        mesKey(),
      historial: [
        { cuota: 1, fecha: new Date().toLocaleDateString('es-AR'), pago: pagoActivo, vendedor: vendedor, nota: 'Cobro al retirar' }
      ]
    };
    ventas.push(nuevaVenta);
    guardarVentas(ventas);

    var datos = {
      nombre, telefono, dni, direccion, producto,
      precio:   '$' + precioTotal.toLocaleString('es-AR'),
      cuota:    '$' + cuota.toLocaleString('es-AR'),
      semanas:  semanas + ' semanas',
      fechaStr, pago: pagoActivo, vendedor,
      cuotaNum: null
    };
    mensajeActual = construirTexto('nueva', datos);
    mostrarPreview(mensajeActual);
    abrirComprobanteSi(datos, 'nueva');
    mostrarToast('✅ Venta registrada');
    limpiarFormularioNueva();

  } else {
    // ── COBRO / AVISO / VENCIDA ──
    if (!_clienteSeleccionado) { alert('Seleccioná un cliente primero'); return; }
    var v = ventas.find(function (x) { return x.id === _clienteSeleccionado.id; });
    if (!v) { alert('Cliente no encontrado'); return; }

    if (tipoActivo === 'cobro') {
      var hoyStr    = new Date().toLocaleDateString('es-AR');
      var yaCobroHoy = (v.historial || []).some(function (h) {
        return h.cuota === v.cuotaActual && h.fecha === hoyStr;
      });
      if (yaCobroHoy) {
        if (!confirm('⚠️ Esta cuota ya fue registrada hoy. ¿Querés registrarla de nuevo?')) return;
      }

      v.historial = v.historial || [];
      v.historial.push({
        cuota:    v.cuotaActual,
        fecha:    new Date().toLocaleDateString('es-AR'),
        pago:     pagoActivo,
        vendedor: (document.getElementById('vendedor-nombre')?.value || v.vendedor || '').trim()
      });

      var cuotaCobrada = v.cuotaActual;
      v.cuotaActual++;

      var baseVenc = strToFecha(v.proximoVenc);
      if (!baseVenc) {
        console.warn('proximoVenc inválido para id=' + v.id + ': ' + v.proximoVenc + '. Usando hoy.');
        baseVenc = new Date();
      }
      var proxFecha = sumarDias(baseVenc, 7);
      v.proximoVenc = fechaToStr(proxFecha);
      guardarVentas(ventas);

      var queda   = v.semanasTotales - cuotaCobrada;
      var esUltima = queda === 0;
      var datosCobro = {
        nombre: v.nombre, telefono: v.telefono,
        producto: v.producto,
        cuota:        '$' + v.cuotaMonto.toLocaleString('es-AR'),
        cuotaNum:     cuotaCobrada + ' de ' + v.semanasTotales,
        cuotasRestantes: queda,
        esUltima,
        precioTotal:  '$' + v.precioTotal.toLocaleString('es-AR'),
        semanasTotales: v.semanasTotales,
        fechaStr:     esUltima ? null : fechaToStr(proxFecha),
        pago:         pagoActivo,
        vendedor:     v.vendedor,
        precio: null, semanas: null, dni: null, direccion: null
      };
      mensajeActual = construirTexto('cobro', datosCobro);
      mostrarPreview(mensajeActual);
      abrirComprobanteSi(datosCobro, esUltima ? 'felicitacion' : 'cobro');
      mostrarToast(esUltima ? '🎉 ¡Última cuota cobrada!' : '✅ Cuota ' + cuotaCobrada + ' cobrada — quedan ' + queda);

    } else {
      // aviso o vencida — sin modificar cuotas
      var datosAviso = {
        nombre: v.nombre, telefono: v.telefono,
        producto:   v.producto,
        cuota:      '$' + v.cuotaMonto.toLocaleString('es-AR'),
        cuotaNum:   v.cuotaActual + ' de ' + v.semanasTotales,
        fechaStr:   v.proximoVenc,
        pago:       pagoActivo,
        vendedor:   v.vendedor,
        precio: null, semanas: null, dni: null, direccion: null, cuotasRestantes: null
      };
      mensajeActual = construirTexto(tipoActivo, datosAviso);
      mostrarPreview(mensajeActual);
      abrirComprobanteSi(datosAviso, tipoActivo);
      mostrarToast('✅ Mensaje generado');
    }
  }

  renderizarVencimientos();
  renderizarRegistros();
  actualizarContadorMes();
}

// ── Mostrar preview ────────────────────────────────────────
function mostrarPreview(texto) {
  var prev = document.getElementById('preview');
  if (prev) { prev.style.display = texto ? 'block' : 'none'; prev.innerText = texto; }
  var wa   = document.getElementById('wa-link');
  var copy = document.getElementById('btn-copiar');
  if (wa)   wa.style.display   = 'flex';
  if (copy) copy.style.display = 'flex';
}

// ── Delegación a comprobante.js (si existe) ────────────────
function abrirComprobanteSi(datos, tipo) {
  if (typeof abrirComprobante === 'function') abrirComprobante(datos, tipo);
}

// ── WhatsApp ───────────────────────────────────────────────
function enviarWA() {
  var tel = '';
  if (_clienteSeleccionado) tel = (_clienteSeleccionado.telefono || '').replace(/\D/g, '');
  else tel = (document.getElementById('telefono')?.value || '').replace(/\D/g, '');
  if (!tel) { alert('No hay teléfono'); return; }
  if (tel.startsWith('0')) tel = tel.slice(1);
  if (!tel.startsWith('54')) tel = '54' + tel;
  window.open('https://wa.me/' + tel + '?text=' + encodeURIComponent(mensajeActual || ''), '_blank');
}

// ── Copiar mensaje ─────────────────────────────────────────
function copiarMensaje() {
  if (!mensajeActual) return;
  navigator.clipboard.writeText(mensajeActual)
    .then(function () { mostrarToast('✅ Mensaje copiado'); })
    .catch(function () { mostrarToast('✅ Copiado'); });
}
