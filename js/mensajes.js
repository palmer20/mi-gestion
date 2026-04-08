// ============================================================
//  js/mensajes.js - Generacion de mensajes y envio WhatsApp
// ============================================================

function guardarAlias(val) {
  localStorage.setItem('xs_alias', (val || '').trim());
}

function getAlias() {
  return localStorage.getItem('xs_alias') || '';
}

function cargarAliasGuardado() {
  var inp = document.getElementById('alias-vendedor');
  if (inp) inp.value = getAlias();
}

function validarNuevaVenta(datos) {
  if (!datos.nombre || !datos.telefono) return 'Completa nombre y telefono.';
  if (!datos.producto) return 'Completa el producto.';
  if (!datos.semanas || datos.precioTotal <= 0) return 'Completa precio y plan de cuotas.';
  if (!datos.vencInp || !datos.fechaStr) return 'Elige una fecha valida para la primera cuota.';
  return '';
}

function construirTexto(tipo, d) {
  var emp = (typeof CFG !== 'undefined' && CFG.empresa) ? CFG.empresa : {};
  var empresa = emp.nombre || 'ADP';
  var soporte = emp.soporte || '';
  var alias = getAlias();
  var saludo = 'Hola *' + d.nombre + '*,';
  var aliasPago = alias ? '*Alias de pago:* ' + alias : '';
  var sep = '---------------------';

  if (tipo === 'nueva') {
    return 'Nueva venta - *' + empresa + '*\n' + sep + '\n' +
      '*Cliente:* ' + d.nombre + '\n' +
      (d.dni ? '*DNI:* ' + d.dni + '\n' : '') +
      '*Telefono:* ' + d.telefono + '\n' +
      (d.direccion ? '*Direccion:* ' + d.direccion + '\n' : '') +
      '*Producto:* ' + (d.producto || '-') + '\n' +
      '*Cuota semanal:* ' + d.cuota + '\n' +
      '*Plan:* ' + d.semanas + '\n' +
      '*1ra cuota:* ' + d.fechaStr + '\n' +
      '*Cobro:* ' + d.pago + '\n' +
      (aliasPago ? aliasPago + '\n' : '') +
      sep + '\n' +
      (soporte ? 'Consultas: ' + soporte : '');
  }

  if (tipo === 'cobro') {
    if (d.esUltima) {
      return 'Felicitaciones *' + d.nombre.toUpperCase() + '*\n' + sep + '\n' +
        saludo + '\n' +
        'Terminaste de pagar tu ' + d.producto + ' completamente.\n\n' +
        '*Cuotas:* ' + d.semanasTotales + ' semanas · ' + d.cuota + ' c/u\n' +
        '*Ultima cuota:* ' + d.cuotaNum + '\n' +
        '*Metodo:* ' + d.pago + '\n' +
        sep + '\n' +
        'Gracias por tu confianza.\n' +
        (soporte ? 'Consultas: ' + soporte + '\n' : '') +
        (alias ? '_' + alias + '_' : '');
    }
    var restTxt = d.cuotasRestantes === 1 ? 'Queda 1 cuota' : 'Quedan ' + d.cuotasRestantes + ' cuotas';
    return '*' + empresa + ' - Cuota cobrada*\n' + sep + '\n' +
      saludo + ' Registramos el pago de tu cuota.\n' +
      '*Producto:* ' + d.producto + '\n' +
      '*Cuota:* ' + d.cuotaNum + '\n' +
      '*Monto:* ' + d.cuota + '\n' +
      '*Metodo:* ' + d.pago + '\n' +
      (aliasPago ? aliasPago + '\n' : '') +
      '_' + restTxt + '. Prox. venc.: ' + d.fechaStr + '_\n' +
      sep + '\n' +
      (soporte ? 'Consultas: ' + soporte : '');
  }

  if (tipo === 'aviso') {
    return '*' + empresa + ' - Recordatorio de cuota*\n' + sep + '\n' +
      saludo + ' Tu cuota *' + d.cuotaNum + '* vence el *' + d.fechaStr + '*.\n' +
      '*Producto:* ' + d.producto + '\n' +
      '*Monto a pagar:* ' + d.cuota + '\n' +
      (aliasPago ? aliasPago + '\n' : '') +
      sep + '\n' +
      'Recuerda pagar para no generar mora.\n' +
      (soporte ? 'Consultas: ' + soporte : '');
  }

  if (tipo === 'vencida') {
    return '*' + empresa + ' - Cuota vencida*\n' + sep + '\n' +
      saludo + ' Tu cuota *' + d.cuotaNum + '* del *' + d.fechaStr + '* no fue registrada.\n\n' +
      '*Producto:* ' + d.producto + '\n' +
      '*Monto pendiente:* ' + d.cuota + '\n' +
      (aliasPago ? aliasPago + '\n' : '') +
      sep + '\n' +
      'Por favor regulariza tu situacion a la brevedad.\n' +
      (soporte ? 'Contacto: ' + soporte : '');
  }

  return '';
}

function generarMensaje() {
  var ventas = cargarVentas();

  if (tipoActivo === 'nueva') {
    var nombre = (document.getElementById('nombre')?.value || '').trim();
    var telefono = (document.getElementById('telefono')?.value || '').trim();
    var dni = (document.getElementById('dni')?.value || '').trim();
    var direccion = (document.getElementById('direccion')?.value || '').trim();
    var producto = (document.getElementById('producto')?.value || '').trim();
    var vencInp = document.getElementById('vencimiento')?.value || '';
    var vendedor = (document.getElementById('vendedor-nombre')?.value || '').trim();
    var precioTotal = parseFloat(document.getElementById('precio-total')?.value || '0');
    var semanas = getSemanas();
    var cuota = (precioTotal > 0 && semanas) ? Math.ceil(precioTotal / semanas) : 0;
    var fechaStr = inputToStr(vencInp);
    var errorValidacion = validarNuevaVenta({
      nombre: nombre,
      telefono: telefono,
      producto: producto,
      precioTotal: precioTotal,
      semanas: semanas,
      vencInp: vencInp,
      fechaStr: fechaStr
    });

    if (errorValidacion) { alert(errorValidacion); return; }

    var nuevaVenta = {
      id: Date.now(),
      nombre: nombre,
      telefono: telefono,
      dni: dni,
      direccion: direccion,
      producto: producto,
      precioTotal: precioTotal,
      semanasTotales: semanas,
      cuotaMonto: cuota,
      cuotaActual: 1,
      proximoVenc: fechaStr,
      vendedor: vendedor,
      pago: pagoActivo,
      fechaVenta: new Date().toLocaleDateString('es-AR'),
      mes_key: mesKey(),
      historial: []
    };
    ventas.push(nuevaVenta);
    guardarVentas(ventas);

    var datos = {
      nombre: nombre,
      telefono: telefono,
      dni: dni,
      direccion: direccion,
      producto: producto,
      precio: '$' + precioTotal.toLocaleString('es-AR'),
      cuota: '$' + cuota.toLocaleString('es-AR'),
      semanas: semanas + ' semanas',
      fechaStr: fechaStr,
      pago: pagoActivo,
      vendedor: vendedor,
      cuotaNum: null
    };
    mensajeActual = construirTexto('nueva', datos);
    window.mensajeActual = mensajeActual;
    mostrarPreview(mensajeActual);
    abrirComprobanteSi(datos, 'nueva');
    mostrarToast('Venta registrada correctamente');
    limpiarFormularioNueva();
  } else {
    if (!_clienteSeleccionado) { alert('Selecciona un cliente primero'); return; }
    var v = ventas.find(function (x) { return x.id === _clienteSeleccionado.id; });
    if (!v) { alert('Cliente no encontrado'); return; }

    if (tipoActivo === 'cobro') {
      var hoyStr = new Date().toLocaleDateString('es-AR');
      var yaCobroHoy = (v.historial || []).some(function (h) {
        return h.cuota === v.cuotaActual && h.fecha === hoyStr;
      });
      if (yaCobroHoy) {
        if (!confirm('Esta cuota ya fue registrada hoy. ¿Quieres registrarla de nuevo?')) return;
      }

      v.historial = v.historial || [];
      v.historial.push({
        cuota: v.cuotaActual,
        fecha: hoyStr,
        monto: v.cuotaMonto,
        pago: pagoActivo,
        vendedor: (document.getElementById('vendedor-nombre')?.value || v.vendedor || '').trim()
      });

      var cuotaCobrada = v.cuotaActual;
      v.cuotaActual++;

      var baseVenc = strToFecha(v.proximoVenc);
      if (!baseVenc) baseVenc = hoy();
      var proxFecha = sumarDias(baseVenc, 7);
      v.proximoVenc = fechaToStr(proxFecha);
      guardarVentas(ventas);

      var queda = v.semanasTotales - cuotaCobrada;
      var esUltima = queda === 0;
      var datosCobro = {
        nombre: v.nombre,
        telefono: v.telefono,
        producto: v.producto,
        cuota: '$' + v.cuotaMonto.toLocaleString('es-AR'),
        cuotaNum: cuotaCobrada + ' de ' + v.semanasTotales,
        cuotasRestantes: queda,
        esUltima: esUltima,
        precioTotal: '$' + v.precioTotal.toLocaleString('es-AR'),
        semanasTotales: v.semanasTotales,
        fechaStr: esUltima ? null : fechaToStr(proxFecha),
        pago: pagoActivo,
        vendedor: v.vendedor,
        precio: null,
        semanas: null,
        dni: null,
        direccion: null
      };
      mensajeActual = construirTexto('cobro', datosCobro);
      window.mensajeActual = mensajeActual;
      mostrarPreview(mensajeActual);
      abrirComprobanteSi(datosCobro, esUltima ? 'felicitacion' : 'cobro');
      mostrarToast(esUltima ? 'Ultima cuota cobrada' : 'Cuota ' + cuotaCobrada + ' cobrada; quedan ' + queda);
    } else {
      var datosAviso = {
        nombre: v.nombre,
        telefono: v.telefono,
        producto: v.producto,
        cuota: '$' + v.cuotaMonto.toLocaleString('es-AR'),
        cuotaNum: v.cuotaActual + ' de ' + v.semanasTotales,
        fechaStr: v.proximoVenc,
        pago: pagoActivo,
        vendedor: v.vendedor,
        precio: null,
        semanas: null,
        dni: null,
        direccion: null,
        cuotasRestantes: null
      };
      mensajeActual = construirTexto(tipoActivo, datosAviso);
      window.mensajeActual = mensajeActual;
      mostrarPreview(mensajeActual);
      abrirComprobanteSi(datosAviso, tipoActivo);
      mostrarToast('Mensaje generado');
    }
  }

  renderizarVencimientos();
  renderizarRegistros();
  actualizarContadorMes();
}

function mostrarPreview(texto) {
  var prev = document.getElementById('preview');
  if (prev) {
    prev.style.display = texto ? 'block' : 'none';
    prev.innerText = texto;
  }
  var wa = document.getElementById('wa-link');
  var copy = document.getElementById('btn-copiar');
  if (wa) wa.style.display = 'flex';
  if (copy) copy.style.display = 'flex';
}

function abrirComprobanteSi(datos, tipo) {
  if (typeof abrirComprobante === 'function') abrirComprobante(datos, tipo);
}

function enviarWA() {
  var tel = '';
  if (_clienteSeleccionado) tel = (_clienteSeleccionado.telefono || '').replace(/\D/g, '');
  else tel = (document.getElementById('telefono')?.value || '').replace(/\D/g, '');
  if (!tel) { alert('No hay telefono'); return; }
  if (tel.startsWith('0')) tel = tel.slice(1);
  if (!tel.startsWith('54')) tel = '54' + tel;
  window.open('https://wa.me/' + tel + '?text=' + encodeURIComponent(mensajeActual || ''), '_blank');
}

function copiarMensaje() {
  if (!mensajeActual) return;
  navigator.clipboard.writeText(mensajeActual)
    .then(function () { mostrarToast('Mensaje copiado'); })
    .catch(function () { mostrarToast('Copiado'); });
}
