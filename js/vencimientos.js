// ============================================================
//  js/vencimientos.js — Panel de cuotas por cobrar
// ============================================================

function toggleVencimientos() {
  var body   = document.getElementById('venc-body');
  var toggle = document.getElementById('venc-toggle');
  if (!body) return;
  body.classList.toggle('open');
  if (toggle) toggle.style.transform = body.classList.contains('open') ? 'rotate(180deg)' : '';
}

function irAVencimientos() {
  var panel = document.getElementById('venc-panel');
  if (panel) panel.scrollIntoView({ behavior: 'smooth' });
  var body = document.getElementById('venc-body');
  if (body) body.classList.add('open');
}

function renderizarVencimientos() {
  var ventas  = cargarVentas().filter(function (v) { return v.cuotaActual <= v.semanasTotales; });
  var vencidas = ventas.filter(function (v) { var d = diasHasta(v.proximoVenc); return d !== null && d < 0; });
  var proximas = ventas.filter(function (v) { var d = diasHasta(v.proximoVenc); return d !== null && d >= 0 && d <= 7; });

  function buildCard(v) {
    var dias  = diasHasta(v.proximoVenc);
    var clase = dias < 0 ? 'venc-exp' : 'venc-warn';
    var label = dias < 0 ? 'Venció hace ' + Math.abs(dias) + 'd' : (dias === 0 ? 'Vence hoy' : 'Vence en ' + dias + 'd');
    var progPct = Math.round(((v.cuotaActual - 1) / v.semanasTotales) * 100);
    return '<div class="venc-item ' + clase + '">' +
      '<div class="venc-info">' +
        '<div class="venc-nombre">' + v.nombre + '</div>' +
        '<div class="venc-det">' + v.producto + ' · Cuota <strong>' + v.cuotaActual + '</strong>/' + v.semanasTotales + '</div>' +
        '<div style="margin-top:5px;background:var(--border);border-radius:99px;height:4px;overflow:hidden">' +
          '<div style="background:linear-gradient(90deg,#e8614a,#f0795f);height:100%;border-radius:99px;width:' + progPct + '%"></div>' +
        '</div>' +
      '</div>' +
      '<div class="venc-right">' +
        '<div class="venc-dias">' + label + '</div>' +
        '<div class="venc-fecha">$' + v.cuotaMonto.toLocaleString('es-AR') + '</div>' +
      '</div>' +
      '<div class="venc-actions">' +
        '<button class="vbtn" title="Cobrar" onclick="cobrarDesdeVenc(' + v.id + ')">✅</button>' +
        '<button class="vbtn" title="Avisar" onclick="avisarDesdeVenc(' + v.id + ')">⏰</button>' +
      '</div>' +
    '</div>';
  }

  var lV = document.getElementById('venc-lista-vencidos');
  var lP = document.getElementById('venc-lista-proximos');
  if (lV) lV.innerHTML = vencidas.length ? vencidas.map(buildCard).join('') : '<div class="venc-empty">Sin cuotas vencidas</div>';
  if (lP) lP.innerHTML = proximas.length ? proximas.map(buildCard).join('') : '<div class="venc-empty">Sin cuotas próximas</div>';

  var total  = vencidas.length + proximas.length;
  var btnA   = document.getElementById('btn-alerta-venc');
  var badgeC = document.getElementById('badge-venc-count');
  if (btnA)   btnA.style.display   = total > 0 ? 'inline-flex' : 'none';
  if (badgeC) badgeC.textContent   = total;

  var bV = document.getElementById('venc-badge-vencidos');
  var bP = document.getElementById('venc-badge-proximos');
  if (bV) bV.textContent = vencidas.length + ' vencidas';
  if (bP) bP.textContent = proximas.length + ' próximas';
}

function cobrarDesdeVenc(id) {
  var btn = document.querySelector('.tipo-btn[data-tipo="cobro"]');
  seleccionarTipo('cobro', btn);
  var ventas = cargarVentas();
  var v = ventas.find(function (x) { return x.id === id; });
  if (v) {
    seleccionarClienteExistente(id);
    document.getElementById('buscar-cliente-inp').value = v.nombre;
  }
  document.getElementById('nombre')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function avisarDesdeVenc(id) {
  var btn = document.querySelector('.tipo-btn[data-tipo="aviso"]');
  seleccionarTipo('aviso', btn);
  var ventas = cargarVentas();
  var v = ventas.find(function (x) { return x.id === id; });
  if (v) {
    seleccionarClienteExistente(id);
    document.getElementById('buscar-cliente-inp').value = v.nombre;
  }
  document.getElementById('nombre')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
