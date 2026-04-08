// ============================================================
//  js/clientes.js - Autocomplete y busqueda de clientes
// ============================================================

function autocompletarNombre(val) {
  var lista = document.getElementById('autocomplete-nueva');
  if (!lista) return;
  if (!val || val.length < 2) {
    lista.style.display = 'none';
    return;
  }

  var ventas = cargarVentas();
  var vistos = {};
  var matches = [];
  ventas.forEach(function (v) {
    var key = (v.nombre || '').toLowerCase();
    if (!vistos[key] && key.includes(val.toLowerCase())) {
      vistos[key] = true;
      matches.push(v);
    }
  });

  if (!matches.length) {
    lista.style.display = 'none';
    return;
  }

  lista.style.display = 'block';
  lista.innerHTML = matches.slice(0, 5).map(function (v) {
    return '<div class="suggest-item" onclick="autorellenarNueva(' + v.id + ')">' +
      '<div style="font-weight:600;font-size:13px">' + textoSeguro(v.nombre) + '</div>' +
      '<div style="font-size:11px;color:var(--muted)">' +
        textoSeguro(v.telefono) + (v.producto ? ' · ' + textoSeguro(v.producto) : '') +
      '</div>' +
    '</div>';
  }).join('');
}

function autorellenarNueva(id) {
  var ventas = cargarVentas();
  var v = ventas.find(function (x) { return x.id === id; });
  if (!v) return;

  var set = function (elId, val) {
    var el = document.getElementById(elId);
    if (el && val) el.value = val;
  };

  set('nombre', v.nombre);
  set('telefono', v.telefono);
  set('dni', v.dni);
  set('direccion', v.direccion);
  set('producto', v.producto);
  set('vendedor-nombre', v.vendedor);

  var lista = document.getElementById('autocomplete-nueva');
  if (lista) lista.style.display = 'none';

  setTimeout(function () {
    document.getElementById('precio-total')?.focus();
  }, 50);
}

function buscarClienteExistente(val) {
  var lista = document.getElementById('lista-clientes-existentes');
  if (!lista) return;
  if (!val || val.length < 2) {
    lista.innerHTML = '';
    lista.style.display = 'none';
    return;
  }

  var ventas = cargarVentas();
  var matches = ventas.filter(function (v) {
    return (v.nombre || '').toLowerCase().includes(val.toLowerCase()) && v.cuotaActual <= v.semanasTotales;
  });

  if (!matches.length) {
    lista.innerHTML = '';
    lista.style.display = 'none';
    return;
  }

  lista.style.display = 'block';
  lista.innerHTML = matches.slice(0, 6).map(function (v) {
    var diasV = diasHasta(v.proximoVenc);
    var estadoColor = diasV === null ? 'var(--muted)' : (diasV < 0 ? '#f87171' : diasV <= 3 ? '#fbbf24' : '#52d68a');
    var estadoTxt = diasV === null ? 'Sin fecha' : (diasV < 0 ? 'Vencida hace ' + Math.abs(diasV) + 'd' : 'Vence en ' + diasV + 'd');
    return '<div class="suggest-item" onclick="seleccionarClienteExistente(' + v.id + ')">' +
      '<div style="font-weight:600;font-size:13px">' + textoSeguro(v.nombre) + '</div>' +
      '<div style="font-size:11px;color:var(--muted)">' + textoSeguro(v.producto, 'Sin producto') + '</div>' +
      '<div style="display:flex;justify-content:space-between;margin-top:4px">' +
        '<span style="font-size:11px;color:var(--blue)">Cuota ' + v.cuotaActual + '/' + v.semanasTotales + ' - $' + v.cuotaMonto.toLocaleString('es-AR') + '</span>' +
        '<span style="font-size:11px;color:' + estadoColor + '">' + estadoTxt + '</span>' +
      '</div>' +
    '</div>';
  }).join('');
}

var _clienteSeleccionado = null;

function seleccionarClienteExistente(id) {
  var ventas = cargarVentas();
  var v = ventas.find(function (x) { return x.id === id; });
  if (!v) return;
  _clienteSeleccionado = v;

  var resumen = document.getElementById('cliente-seleccionado-info');
  if (resumen) {
    var diasV = diasHasta(v.proximoVenc);
    var estadoColor = diasV < 0 ? '#f87171' : diasV <= 3 ? '#fbbf24' : '#52d68a';
    var progreso = Math.max(0, Math.min(100, Math.round(((v.cuotaActual - 1) / v.semanasTotales) * 100)));
    resumen.style.display = 'block';
    resumen.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">' +
        '<div>' +
          '<div style="font-weight:700;font-size:15px">' + textoSeguro(v.nombre) + '</div>' +
          '<div style="font-size:12px;color:var(--muted);margin-top:2px">' + textoSeguro(v.producto, 'Sin producto') + '</div>' +
          '<div style="font-size:12px;color:var(--muted)">' + textoSeguro(v.telefono) + '</div>' +
        '</div>' +
        '<div style="text-align:right">' +
          '<div style="font-size:18px;font-weight:800;color:var(--blue)">$' + v.cuotaMonto.toLocaleString('es-AR') + '</div>' +
          '<div style="font-size:11px;color:var(--muted)">cuota semanal</div>' +
        '</div>' +
      '</div>' +
      '<div style="margin-top:10px;background:var(--border);border-radius:10px;padding:10px;display:flex;justify-content:space-between">' +
        '<div>' +
          '<div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em">Progreso</div>' +
          '<div style="font-size:14px;font-weight:700;margin-top:2px">Cuota ' + v.cuotaActual + ' de ' + v.semanasTotales + '</div>' +
          '<div style="font-size:11px;color:var(--muted)">Quedan ' + Math.max(0, v.semanasTotales - v.cuotaActual + 1) + ' por cobrar</div>' +
        '</div>' +
        '<div style="text-align:right">' +
          '<div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em">Prox. venc.</div>' +
          '<div style="font-size:14px;font-weight:700;margin-top:2px;color:' + estadoColor + '">' + textoSeguro(v.proximoVenc, 'Sin fecha') + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="margin-top:8px;background:var(--border);border-radius:99px;height:6px;overflow:hidden">' +
        '<div style="background:linear-gradient(90deg,var(--blue),#7db8ff);height:100%;border-radius:99px;width:' + progreso + '%"></div>' +
      '</div>' +
      '<div style="font-size:10px;color:var(--muted2);text-align:right;margin-top:3px">' + progreso + '% completado</div>';
  }

  var lista = document.getElementById('lista-clientes-existentes');
  if (lista) lista.style.display = 'none';
  var buscadorInp = document.getElementById('buscar-cliente-inp');
  if (buscadorInp) buscadorInp.value = v.nombre;

  var pillBtn = document.querySelector('.pill-tab[data-pago="' + v.pago + '"]');
  if (pillBtn) seleccionarPago(pillBtn);
}

