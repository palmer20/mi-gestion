// ============================================================
//  js/exportar.js — Exportar datos a Excel (CSV) y PDF
// ============================================================

// ── Modal de exportación ───────────────────────────────────
function abrirModalExportar() {
  var ventas = cargarVentas();
  if (!ventas.length) { mostrarToast('⚠ No hay registros para exportar'); return; }

  var modal = document.getElementById('modal-exportar');
  if (!modal) return;
  modal.style.display = 'flex';

  // Resumen rápido
  var activas   = ventas.filter(function (v) { return v.cuotaActual <= v.semanasTotales; }).length;
  var terminadas = ventas.length - activas;
  var totalCobrado = 0;
  ventas.forEach(function (v) {
    (v.historial || []).forEach(function (h) { totalCobrado += v.cuotaMonto || 0; });
  });

  var resEl = document.getElementById('exp-resumen');
  if (resEl) {
    resEl.innerHTML =
      '<div class="exp-stat"><span>' + ventas.length + '</span><small>Total ventas</small></div>' +
      '<div class="exp-stat"><span>' + activas + '</span><small>En curso</small></div>' +
      '<div class="exp-stat"><span>' + terminadas + '</span><small>Terminadas</small></div>' +
      '<div class="exp-stat"><span>$' + totalCobrado.toLocaleString('es-AR') + '</span><small>Total cobrado</small></div>';
  }
}

function cerrarModalExportar() {
  var modal = document.getElementById('modal-exportar');
  if (modal) modal.style.display = 'none';
}

// ── Exportar Excel (CSV descargable) ──────────────────────
function exportarExcel() {
  var ventas = cargarVentas();
  var filtro = document.getElementById('exp-filtro')?.value || 'todas';

  if (filtro === 'activas')    ventas = ventas.filter(function (v) { return v.cuotaActual <= v.semanasTotales; });
  if (filtro === 'terminadas') ventas = ventas.filter(function (v) { return v.cuotaActual > v.semanasTotales; });
  if (filtro === 'vencidas')   ventas = ventas.filter(function (v) {
    var d = diasHasta(v.proximoVenc);
    return d !== null && d < 0 && v.cuotaActual <= v.semanasTotales;
  });

  if (!ventas.length) { mostrarToast('⚠ Sin registros con ese filtro'); return; }

  var sep = ',';
  var encabezados = [
    'Nombre', 'Teléfono', 'DNI', 'Dirección', 'Producto',
    'Precio Total', 'Cuota Semanal', 'Semanas Total',
    'Cuota Actual', 'Cuotas Restantes', 'Estado',
    'Próx. Vencimiento', 'Vendedor', 'Método Cobro', 'Fecha Venta'
  ];

  function esc(v) {
    var s = String(v == null ? '' : v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      s = '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  var filas = ventas.map(function (v) {
    var terminado = v.cuotaActual > v.semanasTotales;
    var diasV     = diasHasta(v.proximoVenc);
    var estado    = terminado ? 'Terminado' : (diasV < 0 ? 'Vencido' : 'En curso');
    var restantes = terminado ? 0 : (v.semanasTotales - v.cuotaActual + 1);
    return [
      v.nombre, v.telefono, v.dni || '', v.direccion || '', v.producto || '',
      v.precioTotal, v.cuotaMonto, v.semanasTotales,
      v.cuotaActual, restantes, estado,
      v.proximoVenc || '', v.vendedor || '', v.pago || '', v.fechaVenta || ''
    ].map(esc).join(sep);
  });

  // Hoja de historial de cobros
  var encHist = ['Nombre', 'Producto', 'Cuota Nro', 'Fecha Cobro', 'Método', 'Vendedor', 'Nota'];
  var filasHist = [];
  ventas.forEach(function (v) {
    (v.historial || []).forEach(function (h) {
      filasHist.push([
        v.nombre, v.producto || '', h.cuota, h.fecha, h.pago || '', h.vendedor || '', h.nota || ''
      ].map(esc).join(sep));
    });
  });

  // CSV con dos secciones separadas por línea vacía
  var contenido = '\uFEFF'; // BOM para UTF-8 en Excel
  contenido += encabezados.join(sep) + '\n';
  contenido += filas.join('\n');
  contenido += '\n\n';
  contenido += '── HISTORIAL DE COBROS ──\n';
  contenido += encHist.join(sep) + '\n';
  contenido += filasHist.join('\n');

  var blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href     = url;
  a.download = 'mi-gestion-' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  mostrarToast('✅ Excel descargado');
  cerrarModalExportar();
}

// ── Exportar PDF ───────────────────────────────────────────
function exportarPDF() {
  var ventas = cargarVentas();
  var filtro = document.getElementById('exp-filtro')?.value || 'todas';

  if (filtro === 'activas')    ventas = ventas.filter(function (v) { return v.cuotaActual <= v.semanasTotales; });
  if (filtro === 'terminadas') ventas = ventas.filter(function (v) { return v.cuotaActual > v.semanasTotales; });
  if (filtro === 'vencidas')   ventas = ventas.filter(function (v) {
    var d = diasHasta(v.proximoVenc);
    return d !== null && d < 0 && v.cuotaActual <= v.semanasTotales;
  });

  if (!ventas.length) { mostrarToast('⚠ Sin registros con ese filtro'); return; }

  var fecha = new Date().toLocaleDateString('es-AR', { day:'2-digit', month:'long', year:'numeric' });

  // Totales
  var totalCobrado = 0;
  ventas.forEach(function (v) {
    (v.historial || []).forEach(function () { totalCobrado += v.cuotaMonto || 0; });
  });
  var activas    = ventas.filter(function (v) { return v.cuotaActual <= v.semanasTotales; }).length;
  var terminadas = ventas.length - activas;
  var vencidas   = ventas.filter(function (v) {
    var d = diasHasta(v.proximoVenc);
    return d !== null && d < 0 && v.cuotaActual <= v.semanasTotales;
  }).length;

  function estadoBadge(v) {
    var terminado = v.cuotaActual > v.semanasTotales;
    var diasV     = diasHasta(v.proximoVenc);
    if (terminado)      return '<span style="color:#16a34a;font-weight:700">✅ Terminado</span>';
    if (diasV < 0)      return '<span style="color:#dc2626;font-weight:700">❌ Vencido</span>';
    if (diasV <= 3)     return '<span style="color:#d97706;font-weight:700">⏰ Por vencer</span>';
    return '<span style="color:#2563eb;font-weight:700">▶ En curso</span>';
  }

  var filas = ventas.map(function (v) {
    var pct = Math.min(100, Math.round(((v.cuotaActual - 1) / v.semanasTotales) * 100));
    return '<tr>' +
      '<td>' + v.nombre + '<br><small style="color:#666">' + (v.telefono || '') + '</small></td>' +
      '<td>' + (v.producto || '—') + '</td>' +
      '<td style="text-align:right">$' + v.cuotaMonto.toLocaleString('es-AR') + '</td>' +
      '<td style="text-align:center">' + (v.cuotaActual - 1) + '/' + v.semanasTotales + '</td>' +
      '<td style="text-align:center">' +
        '<div style="background:#e5e7eb;border-radius:4px;height:8px;width:80px;margin:auto">' +
          '<div style="background:#2563eb;height:8px;border-radius:4px;width:' + pct + '%"></div>' +
        '</div>' +
        '<small>' + pct + '%</small>' +
      '</td>' +
      '<td style="text-align:center">' + (v.proximoVenc || '—') + '</td>' +
      '<td>' + estadoBadge(v) + '</td>' +
    '</tr>';
  }).join('');

  var html = '<!DOCTYPE html><html lang="es"><head>' +
    '<meta charset="UTF-8">' +
    '<title>Mi Gestión — Reporte</title>' +
    '<style>' +
    'body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:0;padding:24px}' +
    'h1{font-size:20px;margin-bottom:2px}' +
    '.sub{color:#666;font-size:12px;margin-bottom:20px}' +
    '.stats{display:flex;gap:16px;margin-bottom:24px}' +
    '.stat{background:#f3f4f6;border-radius:8px;padding:12px 16px;flex:1;text-align:center}' +
    '.stat .val{font-size:22px;font-weight:700;color:#1d4ed8}' +
    '.stat .lbl{font-size:10px;color:#666;margin-top:2px}' +
    'table{width:100%;border-collapse:collapse;margin-top:8px}' +
    'th{background:#1d4ed8;color:#fff;padding:8px;text-align:left;font-size:11px}' +
    'td{padding:8px;border-bottom:1px solid #e5e7eb;vertical-align:middle}' +
    'tr:nth-child(even) td{background:#f9fafb}' +
    '.footer{margin-top:24px;text-align:center;font-size:10px;color:#9ca3af}' +
    '@media print{body{padding:0}}' +
    '</style></head><body>' +
    '<h1>📋 Mi Gestión — Cobros Semanales</h1>' +
    '<div class="sub">Reporte generado el ' + fecha + ' · ' + filtro.charAt(0).toUpperCase() + filtro.slice(1) + '</div>' +
    '<div class="stats">' +
      '<div class="stat"><div class="val">' + ventas.length + '</div><div class="lbl">Registros</div></div>' +
      '<div class="stat"><div class="val">' + activas + '</div><div class="lbl">En curso</div></div>' +
      '<div class="stat"><div class="val" style="color:#dc2626">' + vencidas + '</div><div class="lbl">Vencidas</div></div>' +
      '<div class="stat"><div class="val" style="color:#16a34a">' + terminadas + '</div><div class="lbl">Terminadas</div></div>' +
      '<div class="stat"><div class="val" style="font-size:16px">$' + totalCobrado.toLocaleString('es-AR') + '</div><div class="lbl">Total cobrado</div></div>' +
    '</div>' +
    '<table>' +
    '<thead><tr>' +
      '<th>Cliente</th><th>Producto</th><th>Cuota/sem</th>' +
      '<th style="text-align:center">Pagadas</th><th style="text-align:center">Progreso</th>' +
      '<th style="text-align:center">Próx. venc.</th><th>Estado</th>' +
    '</tr></thead>' +
    '<tbody>' + filas + '</tbody>' +
    '</table>' +
    '<div class="footer">Mi Gestión · ' + fecha + '</div>' +
    '</body></html>';

  var win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  setTimeout(function () { win.print(); }, 500);
  mostrarToast('✅ PDF generado');
  cerrarModalExportar();
}
