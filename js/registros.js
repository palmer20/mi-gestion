// ============================================================
//  js/registros.js — Lista de registros, filtros y contador
// ============================================================

var filtroEstado = 'todos'; // todos | en_curso | vencido | terminado

// ── Filtro de estado ───────────────────────────────────────
function setFiltroEstado(estado, btn) {
  filtroEstado = estado;
  var claseActivo = estado === 'terminado' ? 'activo-green' :
                    estado === 'vencido'   ? 'activo-red'   :
                    estado === 'en_curso'  ? 'activo-yellow' : 'activo';
  document.querySelectorAll('#reg-filtros-estado .reg-filtro-btn[data-estado]').forEach(function (b) {
    b.classList.remove('activo', 'activo-green', 'activo-red', 'activo-yellow');
  });
  if (btn) btn.classList.add(claseActivo);
  renderizarRegistros();
}

// ── Poblar select de meses ─────────────────────────────────
function poblarSelectMeses() {
  var sel = document.getElementById('reg-filtro-mes');
  if (!sel) return;
  var ventas = cargarVentas();
  var meses  = {};
  ventas.forEach(function (v) { if (v.mes_key) meses[v.mes_key] = true; });
  var keys       = Object.keys(meses).sort().reverse();
  var valorActual = sel.value;
  sel.innerHTML = '<option value="">Todos los meses</option>' +
    keys.map(function (k) {
      var partes = k.split('-');
      var d      = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, 1);
      var label  = d.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
      label = label.charAt(0).toUpperCase() + label.slice(1);
      return '<option value="' + k + '"' + (k === valorActual ? ' selected' : '') + '>' + label + '</option>';
    }).join('');
}

// ── Eliminar registro ──────────────────────────────────────
function eliminarRegistro(id) {
  if (!confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) return;
  var ventas = cargarVentas().filter(function (v) { return v.id !== id; });
  guardarVentas(ventas);
  renderizarRegistros();
  renderizarVencimientos();
  actualizarContadorMes();
  mostrarToast('🗑 Registro eliminado');
}

// ── Renderizar lista de registros ──────────────────────────
function renderizarRegistros() {
  poblarSelectMeses();
  var buscar    = (document.getElementById('reg-buscar')?.value || '').toLowerCase();
  var mesFiltro = document.getElementById('reg-filtro-mes')?.value || '';

  var ventas = cargarVentas()
    .filter(function (v) {
      if (buscar && !v.nombre.toLowerCase().includes(buscar) && !(v.producto || '').toLowerCase().includes(buscar)) return false;
      if (mesFiltro && v.mes_key !== mesFiltro) return false;
      var terminado = v.cuotaActual > v.semanasTotales;
      var diasV     = diasHasta(v.proximoVenc);
      if (filtroEstado === 'terminado' && !terminado) return false;
      if (filtroEstado === 'vencido'   && (terminado || diasV === null || diasV >= 0)) return false;
      if (filtroEstado === 'en_curso'  && (terminado || (diasV !== null && diasV < 0))) return false;
      return true;
    })
    .sort(function (a, b) { return b.id - a.id; });

  var lista = document.getElementById('reg-lista');
  if (!lista) return;

  var totalFiltrado = ventas.length;
  var countEl       = document.getElementById('reg-count');
  if (countEl) {
    countEl.textContent = totalFiltrado === 0 ? '' :
      (totalFiltrado === 1 ? '1 registro' : totalFiltrado + ' registros');
  }

  if (!ventas.length) { lista.innerHTML = '<div class="venc-empty">Sin registros para estos filtros</div>'; return; }

  lista.innerHTML = ventas.slice(0, 30).map(function (v) {
    var terminado   = v.cuotaActual > v.semanasTotales;
    var diasV       = diasHasta(v.proximoVenc);
    var estadoColor = terminado ? 'var(--green)' : (diasV < 0 ? 'var(--red)' : diasV <= 3 ? 'var(--yellow)' : 'var(--muted)');
    var estadoTxt   = terminado ? '✅ Pagado' : ('Cuota ' + v.cuotaActual + '/' + v.semanasTotales);
    var progPct     = Math.min(100, Math.round(((v.cuotaActual - 1) / v.semanasTotales) * 100));
    var progColor   = terminado ? 'var(--green)' : 'var(--accent)';
    var claseEstado = terminado ? 'neon-green' : (diasV < 0 ? 'neon-red' : diasV <= 3 ? 'neon-yellow' : '');

    // Botones de acción rápida (solo si no terminado)
    var accionesHTML = '';
    if (!terminado) {
      accionesHTML =
        '<div style="display:flex;gap:4px;margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">' +
          '<button class="reg-accion-btn reg-accion-cobro" onclick="seleccionarDesdeRegistro(' + v.id + ',\'cobro\')" title="Registrar cobro">✅ Cobrar</button>' +
          '<button class="reg-accion-btn reg-accion-aviso" onclick="seleccionarDesdeRegistro(' + v.id + ',\'aviso\')" title="Enviar aviso">⏰ Avisar</button>' +
          '<button class="reg-accion-btn reg-accion-venc"  onclick="seleccionarDesdeRegistro(' + v.id + ',\'vencida\')" title="Marcar vencida">❌ Vencida</button>' +
        '</div>';
    }

    return '<div class="reg-item ' + claseEstado + '">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">' +
        '<div style="flex:1;min-width:0">' +
          '<div class="reg-nombre">' + v.nombre + '</div>' +
          '<div class="reg-detalle">' + (v.producto || '—') + ' · $' + v.precioTotal.toLocaleString('es-AR') + '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:flex-start;gap:10px;flex-shrink:0">' +
          '<div style="text-align:right">' +
            '<div style="font-size:12px;font-weight:700;color:' + estadoColor + '">' + estadoTxt + '</div>' +
            '<div style="font-size:11px;color:var(--muted)">$' + v.cuotaMonto.toLocaleString('es-AR') + '/sem</div>' +
          '</div>' +
          '<button onclick="eliminarRegistro(' + v.id + ')" title="Eliminar" style="background:none;border:1px solid var(--border2);border-radius:7px;padding:4px 7px;cursor:pointer;font-size:13px;color:var(--muted);transition:all 0.12s;flex-shrink:0" ' +
            'onmouseover="this.style.borderColor=\'var(--red)\';this.style.color=\'var(--red)\';this.style.background=\'var(--red-bg)\'" ' +
            'onmouseout="this.style.borderColor=\'var(--border2)\';this.style.color=\'var(--muted)\';this.style.background=\'none\'">🗑</button>' +
        '</div>' +
      '</div>' +
      '<div style="margin-top:8px;background:var(--border);border-radius:99px;height:4px;overflow:hidden">' +
        '<div style="background:' + progColor + ';height:100%;border-radius:99px;width:' + progPct + '%"></div>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;margin-top:4px">' +
        '<span style="font-size:10px;color:var(--muted2)">' + v.fechaVenta + (v.vendedor ? ' · ' + v.vendedor : '') + '</span>' +
        '<span style="font-size:10px;color:var(--muted2)">' + progPct + '%</span>' +
      '</div>' +
      accionesHTML +
    '</div>';
  }).join('');

  if (ventas.length > 30) {
    lista.innerHTML += '<div style="text-align:center;padding:10px;font-size:12px;color:var(--muted)">Mostrando 30 de ' + ventas.length + ' registros. Usá el buscador para encontrar los demás.</div>';
  }
}

// ── Contador del mes ───────────────────────────────────────
function actualizarContadorMes() {
  var el = document.getElementById('contador-mes');
  if (!el) return;
  var mk       = mesKey();
  var hoyMes   = new Date().getMonth();
  var hoyAnio  = new Date().getFullYear();
  var todas    = cargarVentas();
  var total    = todas.filter(function (v) { return v.mes_key === mk; }).length;
  var cobrado  = 0;
  todas.forEach(function (v) {
    (v.historial || []).forEach(function (h) {
      var partes = (h.fecha || '').split('/');
      if (partes.length === 3) {
        var mes  = parseInt(partes[1]) - 1;
        var anio = parseInt(partes[2]);
        if (mes === hoyMes && anio === hoyAnio) cobrado += v.cuotaMonto || 0;
      }
    });
  });
  var mes = new Date().toLocaleString('es-AR', { month: 'long' });
  el.innerHTML = '<span style="text-transform:capitalize">' + mes + '</span>' +
    ' — <strong>' + total + '</strong> venta' + (total !== 1 ? 's' : '') +
    ' · <strong style="color:#52d68a">$' + cobrado.toLocaleString('es-AR') + '</strong> cobrado';
}

// ── Toast ──────────────────────────────────────────────────
function mostrarToast(msg) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('visible');
  setTimeout(function () { t.classList.remove('visible'); }, 2800);
}

// ── Seleccionar venta desde lista de registros ─────────────
function seleccionarDesdeRegistro(id, tipo) {
  var btnTipo = document.querySelector('.tipo-btn[data-tipo="' + tipo + '"]');
  seleccionarTipo(tipo, btnTipo);
  var ventas = cargarVentas();
  var v = ventas.find(function (x) { return x.id === id; });
  if (v) {
    seleccionarClienteExistente(id);
    var inp = document.getElementById('buscar-cliente-inp');
    if (inp) inp.value = v.nombre;
  }
  // Scroll suave al formulario solo en desktop (en mobile ya está arriba por order:-1)
  if (window.innerWidth > 768) {
    var colRight = document.querySelector('.col-right');
    if (colRight) colRight.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  mostrarToast('📋 ' + (v ? v.nombre : '') + ' seleccionado');
}
