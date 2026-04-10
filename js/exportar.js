// ============================================================
//  js/exportar.js - Exportacion, respaldo e importacion
// ============================================================

function obtenerVentasFiltradasExportacion() {
  var ventas = cargarVentas();
  var filtro = document.getElementById('exp-filtro')?.value || 'todas';

  if (filtro === 'activas') {
    ventas = ventas.filter(function (v) { return v.cuotaActual <= v.semanasTotales; });
  }
  if (filtro === 'terminadas') {
    ventas = ventas.filter(function (v) { return v.cuotaActual > v.semanasTotales; });
  }
  if (filtro === 'vencidas') {
    ventas = ventas.filter(function (v) {
      var d = diasHasta(v.proximoVenc);
      return d !== null && d < 0 && v.cuotaActual <= v.semanasTotales;
    });
  }

  return ventas;
}

function descargarArchivo(nombre, contenido, type) {
  var blob = new Blob([contenido], { type: type });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 1000);
}

function abrirModalExportar() {
  var modal = document.getElementById('modal-exportar');
  if (!modal) return;
  modal.style.display = 'flex';
  actualizarResumenExportacion();
}

function cerrarModalExportar() {
  var modal = document.getElementById('modal-exportar');
  if (modal) modal.style.display = 'none';
}

function actualizarResumenExportacion() {
  var ventas = cargarVentas();
  var activas = ventas.filter(function (v) { return v.cuotaActual <= v.semanasTotales; }).length;
  var terminadas = ventas.length - activas;
  var totalCobrado = 0;

  ventas.forEach(function (v) {
    (v.historial || []).forEach(function (h) {
      totalCobrado += Number(h.monto) || v.cuotaMonto || 0;
    });
  });

  var resEl = document.getElementById('exp-resumen');
  if (!resEl) return;
  resEl.innerHTML =
    '<div class="exp-stat"><span>' + ventas.length + '</span><small>Total ventas</small></div>' +
    '<div class="exp-stat"><span>' + activas + '</span><small>En curso</small></div>' +
    '<div class="exp-stat"><span>' + terminadas + '</span><small>Terminadas</small></div>' +
    '<div class="exp-stat"><span>$' + totalCobrado.toLocaleString('es-AR') + '</span><small>Total cobrado</small></div>';
}

function exportarExcel() {
  var ventas = obtenerVentasFiltradasExportacion();
  if (!ventas.length) {
    mostrarToast('Sin registros con ese filtro');
    return;
  }

  var sep = ',';
  var encabezados = [
    'Nombre', 'Telefono', 'DNI', 'Direccion', 'Producto',
    'Precio total', 'Cuota semanal', 'Semanas total',
    'Cuota actual', 'Cuotas restantes', 'Estado',
    'Proximo vencimiento', 'Vendedor', 'Metodo cobro', 'Fecha venta'
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
    var diasV = diasHasta(v.proximoVenc);
    var estado = terminado ? 'Terminado' : (diasV < 0 ? 'Vencido' : 'En curso');
    var restantes = terminado ? 0 : (v.semanasTotales - v.cuotaActual + 1);
    return [
      v.nombre, v.telefono, v.dni || '', v.direccion || '', v.producto || '',
      v.precioTotal, v.cuotaMonto, v.semanasTotales,
      v.cuotaActual, restantes, estado,
      v.proximoVenc || '', v.vendedor || '', v.pago || '', v.fechaVenta || ''
    ].map(esc).join(sep);
  });

  var encHist = ['Nombre', 'Producto', 'Cuota nro', 'Fecha cobro', 'Monto', 'Metodo', 'Vendedor', 'Nota'];
  var filasHist = [];
  ventas.forEach(function (v) {
    (v.historial || []).forEach(function (h) {
      filasHist.push([
        v.nombre, v.producto || '', h.cuota, h.fecha, Number(h.monto) || v.cuotaMonto || 0, h.pago || '', h.vendedor || '', h.nota || ''
      ].map(esc).join(sep));
    });
  });

  var contenido = '\uFEFF';
  contenido += encabezados.join(sep) + '\n';
  contenido += filas.join('\n');
  contenido += '\n\nHISTORIAL DE COBROS\n';
  contenido += encHist.join(sep) + '\n';
  contenido += filasHist.join('\n');

  descargarArchivo('mi-gestion-' + hoyInputLocal() + '.csv', contenido, 'text/csv;charset=utf-8;');
  mostrarToast('CSV descargado');
  cerrarModalExportar();
}

function exportarPDF() {
  var ventas = obtenerVentasFiltradasExportacion();
  if (!ventas.length) {
    mostrarToast('Sin registros con ese filtro');
    return;
  }

  var fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  var totalCobrado = 0;
  ventas.forEach(function (v) {
    (v.historial || []).forEach(function (h) {
      totalCobrado += Number(h.monto) || v.cuotaMonto || 0;
    });
  });

  var activas = ventas.filter(function (v) { return v.cuotaActual <= v.semanasTotales; }).length;
  var terminadas = ventas.length - activas;
  var vencidas = ventas.filter(function (v) {
    var d = diasHasta(v.proximoVenc);
    return d !== null && d < 0 && v.cuotaActual <= v.semanasTotales;
  }).length;

  function estadoBadge(v) {
    var terminado = v.cuotaActual > v.semanasTotales;
    var diasV = diasHasta(v.proximoVenc);
    if (terminado) return '<span style="color:#16a34a;font-weight:700">Terminado</span>';
    if (diasV < 0) return '<span style="color:#dc2626;font-weight:700">Vencido</span>';
    if (diasV <= 3) return '<span style="color:#d97706;font-weight:700">Por vencer</span>';
    return '<span style="color:#2563eb;font-weight:700">En curso</span>';
  }

  var filas = ventas.map(function (v) {
    var pct = Math.max(0, Math.min(100, Math.round(((v.cuotaActual - 1) / v.semanasTotales) * 100)));
    return '<tr>' +
      '<td>' + escapeHtml(v.nombre) + '<br><small style="color:#666">' + escapeHtml(v.telefono || '') + '</small></td>' +
      '<td>' + escapeHtml(v.producto || '-') + '</td>' +
      '<td style="text-align:right">$' + v.cuotaMonto.toLocaleString('es-AR') + '</td>' +
      '<td style="text-align:center">' + Math.max(0, v.cuotaActual - 1) + '/' + v.semanasTotales + '</td>' +
      '<td style="text-align:center">' +
        '<div style="background:#e5e7eb;border-radius:4px;height:8px;width:80px;margin:auto">' +
          '<div style="background:#2563eb;height:8px;border-radius:4px;width:' + pct + '%"></div>' +
        '</div>' +
        '<small>' + pct + '%</small>' +
      '</td>' +
      '<td style="text-align:center">' + escapeHtml(v.proximoVenc || '-') + '</td>' +
      '<td>' + estadoBadge(v) + '</td>' +
    '</tr>';
  }).join('');

  var html = '<!DOCTYPE html><html lang="es"><head>' +
    '<meta charset="UTF-8">' +
    '<title>XSemana Totoras - Reporte</title>' +
    '<style>' +
    'body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:0;padding:24px}' +
    'h1{font-size:20px;margin-bottom:2px}' +
    '.sub{color:#666;font-size:12px;margin-bottom:20px}' +
    '.stats{display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap}' +
    '.stat{background:#f3f4f6;border-radius:8px;padding:12px 16px;flex:1;min-width:120px;text-align:center}' +
    '.stat .val{font-size:22px;font-weight:700;color:#1d4ed8}' +
    '.stat .lbl{font-size:10px;color:#666;margin-top:2px}' +
    'table{width:100%;border-collapse:collapse;margin-top:8px}' +
    'th{background:#1d4ed8;color:#fff;padding:8px;text-align:left;font-size:11px}' +
    'td{padding:8px;border-bottom:1px solid #e5e7eb;vertical-align:middle}' +
    'tr:nth-child(even) td{background:#f9fafb}' +
    '.footer{margin-top:24px;text-align:center;font-size:10px;color:#9ca3af}' +
    '@media print{body{padding:0}}' +
    '</style></head><body>' +
    '<h1>XSemana Totoras - Cobros semanales</h1>' +
    '<div class="sub">Reporte generado el ' + escapeHtml(fecha) + '</div>' +
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
      '<th style="text-align:center">Prox. venc.</th><th>Estado</th>' +
    '</tr></thead>' +
    '<tbody>' + filas + '</tbody>' +
    '</table>' +
    '<div class="footer">XSemana Totoras · ' + escapeHtml(fecha) + '</div>' +
    '</body></html>';

  var win = window.open('', '_blank');
  if (!win) {
    mostrarToast('El navegador bloqueo la ventana del PDF');
    return;
  }

  win.document.write(html);
  win.document.close();
  setTimeout(function () { win.print(); }, 500);
  mostrarToast('PDF generado');
  cerrarModalExportar();
}

function exportarRespaldo() {
  var ventas = cargarVentas();
  if (!ventas.length) {
    mostrarToast('No hay registros para respaldar');
    return;
  }

  var contenido = JSON.stringify({
    app: 'mi-gestion',
    version: 2,
    exportedAt: new Date().toISOString(),
    ventas: ventas
  }, null, 2);

  descargarArchivo('mi-gestion-respaldo-' + hoyInputLocal() + '.json', contenido, 'application/json;charset=utf-8;');
  mostrarToast('Respaldo descargado');
}

function descargarPlantillaImportacion() {
  var contenido = '\uFEFF' +
    'cliente,telefono,dni,producto,total,cuota,prox vencimiento,estado,vendedor,metodo cobro\n' +
    'Juan Perez,3476364606,12345678,TV Smart 55,75000,7500,30/04/2026,activo,Juan,Efectivo\n' +
    'Maria Gomez,3476123456,23456789,Lavarropas,120000,12000,07/05/2026,activo,Juan,Transferencia\n';
  descargarArchivo('plantilla-importacion-mi-gestion.csv', contenido, 'text/csv;charset=utf-8;');
  mostrarToast('Plantilla descargada');
}

function abrirImportacionPlanilla() {
  var input = document.getElementById('importar-planilla-input');
  if (!input) return;
  input.value = '';
  input.click();
}

function abrirImportacionRespaldo() {
  var input = document.getElementById('importar-respaldo-input');
  if (!input) return;
  input.value = '';
  input.click();
}

function normalizarEncabezadoImportacion(valor) {
  return String(valor == null ? '' : valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function detectarSeparadorCSV(texto) {
  var primeraLinea = String(texto || '').split(/\r?\n/).find(function (linea) {
    return String(linea || '').trim();
  }) || '';
  var comas = (primeraLinea.match(/,/g) || []).length;
  var puntosYComa = (primeraLinea.match(/;/g) || []).length;
  return puntosYComa > comas ? ';' : ',';
}

function partirLineaCSV(linea, separador) {
  var resultado = [];
  var actual = '';
  var entreComillas = false;

  for (var i = 0; i < linea.length; i++) {
    var ch = linea[i];

    if (ch === '"') {
      if (entreComillas && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else {
        entreComillas = !entreComillas;
      }
      continue;
    }

    if (ch === separador && !entreComillas) {
      resultado.push(actual);
      actual = '';
      continue;
    }

    actual += ch;
  }

  resultado.push(actual);
  return resultado.map(function (campo) {
    return String(campo || '').trim();
  });
}

function parsearCSV(texto) {
  var sep = detectarSeparadorCSV(texto);
  var lineas = String(texto || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter(function (linea) { return String(linea || '').trim(); });

  if (lineas.length < 2) return [];

  var encabezados = partirLineaCSV(lineas[0], sep);
  return lineas.slice(1).map(function (linea) {
    var columnas = partirLineaCSV(linea, sep);
    var fila = {};
    encabezados.forEach(function (enc, idx) {
      fila[enc] = columnas[idx] == null ? '' : columnas[idx];
    });
    return fila;
  });
}

function leerArchivoComoTexto(file, encoding) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function () { resolve(String(reader.result || '')); };
    reader.onerror = function () { reject(reader.error || new Error('No se pudo leer el archivo')); };
    reader.readAsText(file, encoding || 'utf-8');
  });
}

function leerArchivoComoArrayBuffer(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function () { resolve(reader.result); };
    reader.onerror = function () { reject(reader.error || new Error('No se pudo leer el archivo')); };
    reader.readAsArrayBuffer(file);
  });
}

function textoDesdeBytes(bytes) {
  return new TextDecoder('utf-8').decode(bytes);
}

function leerUint16LE(view, offset) {
  return view.getUint16(offset, true);
}

function leerUint32LE(view, offset) {
  return view.getUint32(offset, true);
}

async function descomprimirZipEntry(bytes, method) {
  if (method === 0) return bytes;
  if (method !== 8 || typeof DecompressionStream === 'undefined') {
    throw new Error('Este navegador no soporta la importacion directa de este Excel. Guardalo como CSV e importalo asi.');
  }

  var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  var buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

function extraerEntradasZip(buffer) {
  var bytes = new Uint8Array(buffer);
  var view = new DataView(buffer);
  var firmaEOCD = 0x06054b50;
  var firmaCentral = 0x02014b50;
  var firmaLocal = 0x04034b50;
  var eocdOffset = -1;

  for (var i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (leerUint32LE(view, i) === firmaEOCD) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset < 0) throw new Error('No se pudo leer el archivo Excel.');

  var centralOffset = leerUint32LE(view, eocdOffset + 16);
  var totalEntradas = leerUint16LE(view, eocdOffset + 10);
  var entradas = {};
  var ptr = centralOffset;

  for (var idx = 0; idx < totalEntradas; idx++) {
    if (leerUint32LE(view, ptr) !== firmaCentral) break;

    var compressionMethod = leerUint16LE(view, ptr + 10);
    var compressedSize = leerUint32LE(view, ptr + 20);
    var fileNameLength = leerUint16LE(view, ptr + 28);
    var extraLength = leerUint16LE(view, ptr + 30);
    var commentLength = leerUint16LE(view, ptr + 32);
    var localHeaderOffset = leerUint32LE(view, ptr + 42);
    var fileName = textoDesdeBytes(bytes.slice(ptr + 46, ptr + 46 + fileNameLength));

    if (leerUint32LE(view, localHeaderOffset) !== firmaLocal) {
      throw new Error('No se pudo leer el contenido interno del Excel.');
    }

    var localNameLength = leerUint16LE(view, localHeaderOffset + 26);
    var localExtraLength = leerUint16LE(view, localHeaderOffset + 28);
    var dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    var dataEnd = dataStart + compressedSize;

    entradas[fileName] = {
      method: compressionMethod,
      bytes: bytes.slice(dataStart, dataEnd)
    };

    ptr += 46 + fileNameLength + extraLength + commentLength;
  }

  return entradas;
}

async function obtenerTextoZip(entradas, path) {
  var entry = entradas[path];
  if (!entry) return '';
  var bytes = await descomprimirZipEntry(entry.bytes, entry.method);
  return textoDesdeBytes(bytes);
}

function textoCeldaExcel(celda, sharedStrings) {
  var tipo = celda.getAttribute('t') || '';
  if (tipo === 'inlineStr') {
    var inline = celda.getElementsByTagName('t')[0];
    return inline ? inline.textContent || '' : '';
  }

  var valor = '';
  var nodoV = celda.getElementsByTagName('v')[0];
  if (nodoV) valor = nodoV.textContent || '';

  if (tipo === 's') {
    var index = parseInt(valor, 10);
    return sharedStrings[index] || '';
  }

  return valor;
}

function indiceColumnaExcel(ref) {
  var letras = String(ref || '').replace(/[0-9]/g, '').toUpperCase();
  var total = 0;
  for (var i = 0; i < letras.length; i++) {
    total = total * 26 + (letras.charCodeAt(i) - 64);
  }
  return Math.max(0, total - 1);
}

function parsearWorksheetXml(xmlText, sharedStrings) {
  var parser = new DOMParser();
  var xml = parser.parseFromString(xmlText, 'application/xml');
  var rows = Array.from(xml.getElementsByTagName('row'));
  var matriz = rows.map(function (row) {
    var fila = [];
    Array.from(row.getElementsByTagName('c')).forEach(function (celda) {
      var ref = celda.getAttribute('r') || '';
      var colIndex = indiceColumnaExcel(ref);
      fila[colIndex] = textoCeldaExcel(celda, sharedStrings);
    });
    return fila;
  }).filter(function (fila) {
    return fila.some(function (valor) { return String(valor || '').trim(); });
  });

  if (matriz.length < 2) return [];

  var encabezados = matriz[0].map(function (valor) {
    return String(valor || '').trim();
  });

  return matriz.slice(1).map(function (fila) {
    var obj = {};
    encabezados.forEach(function (encabezado, index) {
      if (!encabezado) return;
      obj[encabezado] = fila[index] == null ? '' : String(fila[index]).trim();
    });
    return obj;
  });
}

async function parsearXLSX(file) {
  var buffer = await leerArchivoComoArrayBuffer(file);
  var entradas = extraerEntradasZip(buffer);
  var sharedStringsXml = await obtenerTextoZip(entradas, 'xl/sharedStrings.xml');
  var worksheetPath = Object.keys(entradas).find(function (key) {
    return /^xl\/worksheets\/sheet\d+\.xml$/i.test(key);
  });

  if (!worksheetPath) throw new Error('No se encontro ninguna hoja para importar en el Excel.');

  var worksheetXml = await obtenerTextoZip(entradas, worksheetPath);
  if (!worksheetXml) throw new Error('No se pudo leer la hoja del Excel.');

  var sharedStrings = [];
  if (sharedStringsXml) {
    var parser = new DOMParser();
    var xml = parser.parseFromString(sharedStringsXml, 'application/xml');
    sharedStrings = Array.from(xml.getElementsByTagName('si')).map(function (item) {
      return Array.from(item.getElementsByTagName('t')).map(function (nodo) {
        return nodo.textContent || '';
      }).join('');
    });
  }

  return parsearWorksheetXml(worksheetXml, sharedStrings);
}

function obtenerValorFila(fila, aliases) {
  var mapa = {};
  Object.keys(fila || {}).forEach(function (key) {
    mapa[normalizarEncabezadoImportacion(key)] = fila[key];
  });

  for (var i = 0; i < aliases.length; i++) {
    var valor = mapa[aliases[i]];
    if (valor !== undefined && String(valor).trim() !== '') return String(valor).trim();
  }
  return '';
}

function parseNumeroImportacion(valor) {
  var txt = String(valor == null ? '' : valor).trim();
  if (!txt) return 0;
  txt = txt.replace(/\$/g, '').replace(/\s+/g, '');

  if (txt.includes(',') && txt.includes('.')) {
    if (txt.lastIndexOf(',') > txt.lastIndexOf('.')) {
      txt = txt.replace(/\./g, '').replace(',', '.');
    } else {
      txt = txt.replace(/,/g, '');
    }
  } else if (txt.includes(',')) {
    txt = txt.replace(/\./g, '').replace(',', '.');
  }

  var num = Number(txt);
  return Number.isFinite(num) ? num : 0;
}

function normalizarFechaPartes(dia, mes, anio) {
  var d = Number(dia);
  var m = Number(mes);
  var y = Number(anio);
  if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(y)) return '';
  if (m < 1 || m > 12) return '';
  var ultimoDia = new Date(y, m, 0).getDate();
  d = Math.max(1, Math.min(d, ultimoDia));
  return String(d).padStart(2, '0') + '/' + String(m).padStart(2, '0') + '/' + y;
}

function parseFechaImportacion(valor, warnings, filaNumero, etiqueta) {
  var txt = String(valor == null ? '' : valor).trim();
  if (!txt) return '';

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(txt)) {
    var fechaDirecta = strToFecha(txt);
    if (fechaDirecta && fechaToStr(fechaDirecta) === txt) return txt;
    var partesSlash = txt.split('/');
    var fechaAjustada = normalizarFechaPartes(partesSlash[0], partesSlash[1], partesSlash[2]);
    if (fechaAjustada) {
      if (warnings) warnings.push('Fila ' + filaNumero + ': "' + etiqueta + '" se ajusto de ' + txt + ' a ' + fechaAjustada + '.');
      return fechaAjustada;
    }
    return '';
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(txt)) {
    var fechaIso = inputToStr(txt);
    var fechaConvertida = strToFecha(fechaIso);
    if (fechaConvertida && strToInput(fechaToStr(fechaConvertida)) === txt) return fechaIso;
    var partesIso = txt.split('-');
    var fechaAjustadaIso = normalizarFechaPartes(partesIso[2], partesIso[1], partesIso[0]);
    if (fechaAjustadaIso) {
      if (warnings) warnings.push('Fila ' + filaNumero + ': "' + etiqueta + '" se ajusto de ' + txt + ' a ' + fechaAjustadaIso + '.');
      return fechaAjustadaIso;
    }
    return '';
  }
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(txt)) {
    var partes = txt.split('-');
    var fechaTexto = normalizarFechaPartes(partes[0], partes[1], partes[2]);
    if (fechaTexto) {
      if (fechaTexto !== partes[0].padStart(2, '0') + '/' + partes[1].padStart(2, '0') + '/' + partes[2] && warnings) {
        warnings.push('Fila ' + filaNumero + ': "' + etiqueta + '" se ajusto de ' + txt + ' a ' + fechaTexto + '.');
      }
      return fechaTexto;
    }
    return '';
  }

  var fecha = new Date(txt);
  if (!Number.isNaN(fecha.getTime())) {
    fecha.setHours(0, 0, 0, 0);
    return fechaToStr(fecha);
  }

  return '';
}

function mesKeyDesdeFecha(fechaStr) {
  var fecha = strToFecha(fechaStr);
  if (!fecha) return mesKey();
  return fecha.getFullYear() + '-' + String(fecha.getMonth() + 1).padStart(2, '0');
}

function construirVentaDesdeFilaImportada(fila, index, warnings) {
  var filaNumero = index + 2;
  var nombre = obtenerValorFila(fila, ['nombre', 'cliente', 'clientenombre', 'apellidoynombre', 'apellidoynombre']);
  var telefono = obtenerValorFila(fila, ['telefono', 'tel', 'celular', 'whatsapp', 'movil']);
  var producto = obtenerValorFila(fila, ['producto', 'articulo', 'descripcion', 'detalle']);
  var precioTotalRaw = obtenerValorFila(fila, ['preciototal', 'montototal', 'total', 'importetotal', 'monto']);
  var cuotaMontoRaw = obtenerValorFila(fila, ['cuotasemanal', 'cuota', 'montocuota', 'valorcuota']);
  var precioTotal = parseNumeroImportacion(precioTotalRaw);
  var cuotaMonto = parseNumeroImportacion(cuotaMontoRaw);
  var semanasTotales = Math.round(parseNumeroImportacion(obtenerValorFila(fila, ['semanastotal', 'semanas', 'cuotastotal', 'cuotas', 'plancuotas', 'cantidadcuotas'])));
  var cuotaActual = Math.round(parseNumeroImportacion(obtenerValorFila(fila, ['cuotaactual', 'proximacuota', 'nrocuotaactual', 'numerocuotaactual'])));
  var cuotasPagadas = Math.round(parseNumeroImportacion(obtenerValorFila(fila, ['cuotaspagadas', 'pagadas', 'cobradas'])));
  var cuotasRestantes = Math.round(parseNumeroImportacion(obtenerValorFila(fila, ['cuotasrestantes', 'restantes', 'saldocuotas'])));
  var proximoVencRaw = obtenerValorFila(fila, ['proximovencimiento', 'proximovenc', 'vencimiento', 'fechavencimiento', 'proxvencimiento']);
  var proximoVenc = parseFechaImportacion(proximoVencRaw, warnings, filaNumero, 'prox vencimiento');
  var fechaVenta = parseFechaImportacion(obtenerValorFila(fila, ['fechaventa', 'fechaalta', 'fecha']), warnings, filaNumero, 'fecha');
  var estado = obtenerValorFila(fila, ['estado', 'situacion']);

  if (!nombre) return null;

  if ((!cuotaMonto || cuotaMonto <= 0) && precioTotal > 0) {
    if (semanasTotales > 0) {
      cuotaMonto = Math.ceil(precioTotal / semanasTotales);
      if (warnings) warnings.push('Fila ' + filaNumero + ': se calculo la cuota automaticamente en $' + cuotaMonto.toLocaleString('es-AR') + '.');
    } else {
      cuotaMonto = precioTotal;
      semanasTotales = 1;
      if (warnings) warnings.push('Fila ' + filaNumero + ': sin cuota ni plan; se importo como pago unico por $' + cuotaMonto.toLocaleString('es-AR') + '.');
    }
  }
  if (!cuotaMonto || cuotaMonto <= 0) {
    throw new Error('Fila ' + filaNumero + ': la columna cuota debe tener un numero valido mayor a 0.');
  }
  if (proximoVencRaw && !proximoVenc) {
    throw new Error('Fila ' + filaNumero + ': la fecha de proximo vencimiento no es valida.');
  }
  if (precioTotalRaw && !precioTotal) {
    throw new Error('Fila ' + filaNumero + ': la columna total debe tener un numero valido.');
  }

  if (!semanasTotales && cuotaMonto > 0 && precioTotal > 0) {
    semanasTotales = Math.max(1, Math.round(precioTotal / cuotaMonto));
  }
  if (!precioTotal && cuotaMonto > 0 && semanasTotales > 0) {
    precioTotal = cuotaMonto * semanasTotales;
  }

  if (precioTotal > 0 && cuotaMonto > 0) {
    var semanasCalculadas = Math.ceil(precioTotal / cuotaMonto);
    if (semanasCalculadas > 104) {
      throw new Error('Fila ' + filaNumero + ': la cuota parece incorrecta porque genera ' + semanasCalculadas + ' semanas. Revisa la columna cuota.');
    }
    if (!semanasTotales) semanasTotales = semanasCalculadas;
  }

  if (!cuotaActual && cuotasPagadas > 0) cuotaActual = cuotasPagadas + 1;
  if (!cuotaActual && cuotasRestantes > 0 && semanasTotales > 0) cuotaActual = (semanasTotales - cuotasRestantes) + 1;
  if (!cuotaActual) cuotaActual = 1;

  var estadoNorm = normalizarEncabezadoImportacion(estado);
  if (estadoNorm.includes('terminad') || estadoNorm.includes('pagad') || estadoNorm.includes('finaliz')) {
    cuotaActual = semanasTotales > 0 ? semanasTotales + 1 : cuotaActual;
    proximoVenc = '';
  }

  if (!proximoVenc && cuotaActual <= semanasTotales) {
    proximoVenc = fechaVenta || fechaToStr(hoy());
  }

  return {
    id: Date.now() + index,
    nombre: nombre,
    telefono: telefono,
    dni: obtenerValorFila(fila, ['dni', 'documento']),
    direccion: obtenerValorFila(fila, ['direccion', 'domicilio']),
    producto: producto,
    precioTotal: precioTotal,
    semanasTotales: semanasTotales || 1,
    cuotaMonto: cuotaMonto,
    cuotaActual: cuotaActual,
    proximoVenc: proximoVenc,
    vendedor: obtenerValorFila(fila, ['vendedor', 'cobrador', 'asesor']),
    pago: obtenerValorFila(fila, ['metodocobro', 'metodo', 'pago', 'formadepago']),
    fechaVenta: fechaVenta || fechaToStr(hoy()),
    mes_key: mesKeyDesdeFecha(fechaVenta || fechaToStr(hoy())),
    historial: []
  };
}

async function importarPlanilla(event) {
  var file = event.target.files && event.target.files[0];
  if (!file) return;

  var nombre = String(file.name || '').toLowerCase();
  try {
    var filas = [];
    if (nombre.endsWith('.csv')) {
      var texto = await leerArchivoComoTexto(file, 'utf-8');
      filas = parsearCSV(texto);
    } else if (nombre.endsWith('.xlsx')) {
      filas = await parsearXLSX(file);
    } else {
      throw new Error('Formato no soportado. Usa CSV o XLSX.');
    }

    if (!filas.length) throw new Error('Sin filas para importar.');

    var warnings = [];
    var ventas = filas.map(function (fila, index) {
      return construirVentaDesdeFilaImportada(fila, index, warnings);
    }).filter(Boolean);
    if (!ventas.length) throw new Error('Sin ventas validas');

    if (!confirm('Se importaran ' + ventas.length + ' registros y se reemplazaran los actuales. Continuar?')) return;

    guardarVentas(ventas);
    renderizarVencimientos();
    renderizarRegistros();
    actualizarContadorMes();
    actualizarResumenExportacion();
    if (warnings.length) {
      alert('Importacion completada con ajustes:\n\n- ' + warnings.slice(0, 8).join('\n- '));
    }
    mostrarToast('Planilla importada correctamente');
    cerrarModalExportar();
  } catch (e) {
    console.error('Error al importar planilla', e);
    alert(e && e.message ? e.message : 'No se pudo importar la planilla');
    mostrarToast('Importacion cancelada');
  }
}

function importarRespaldo(event) {
  var file = event.target.files && event.target.files[0];
  if (!file) return;

  var reader = new FileReader();
  reader.onload = function () {
    try {
      var raw = JSON.parse(String(reader.result || '{}'));
      var ventas = Array.isArray(raw) ? raw : raw.ventas;
      if (!Array.isArray(ventas)) throw new Error('Formato invalido');
      if (!confirm('Esto reemplazara los registros actuales. Continuar?')) return;

      guardarVentas(ventas);
      renderizarVencimientos();
      renderizarRegistros();
      actualizarContadorMes();
      actualizarResumenExportacion();
      mostrarToast('Respaldo importado correctamente');
      cerrarModalExportar();
    } catch (e) {
      console.error('Error al importar respaldo', e);
      mostrarToast('No se pudo importar el archivo');
    }
  };
  reader.readAsText(file, 'utf-8');
}

function aplicarTextosUI() {
  document.title = 'XSemana Totoras - Cobros Semanales';

  var loginHelp = document.getElementById('login-help');
  if (loginHelp) loginHelp.textContent = 'Ingresa con tu usuario y clave.';

  var pass = document.getElementById('login-pass');
  var pass2 = document.getElementById('login-pass-confirm');
  var nombre = document.getElementById('nombre');
  var telefono = document.getElementById('telefono');
  var direccion = document.getElementById('direccion');
  if (pass) pass.placeholder = 'Contrasena';
  if (pass2) pass2.placeholder = 'Repetir contrasena';
  if (nombre) nombre.placeholder = 'Juan Perez';
  if (telefono) telefono.placeholder = '3476 364606';
  if (direccion) direccion.placeholder = 'Av. Siempreviva 742';

  document.querySelectorAll('.lbl').forEach(function (el) {
    var txt = (el.textContent || '').trim();
    if (txt.includes('Tel')) el.textContent = 'Telefono';
    if (txt.includes('Direcci')) el.textContent = 'Direccion';
    if (txt.includes('cobro') || txt.includes('Metodo')) el.textContent = 'Metodo de cobro';
  });

  document.querySelectorAll('.card-title').forEach(function (el) {
    var txt = (el.textContent || '').trim();
    if (txt.indexOf('Cobros') >= 0) el.childNodes[0].textContent = 'Cobros ultimos 7 dias';
    if (txt.indexOf('Nueva operaci') >= 0) el.textContent = 'Nueva operacion';
  });

  var exportBtn = document.querySelector('.tb-btn[title="Exportar"]');
  if (exportBtn) exportBtn.textContent = 'Exportar';

  var alertBtn = document.getElementById('btn-alerta-venc');
  if (alertBtn && alertBtn.childNodes.length > 0) alertBtn.childNodes[0].textContent = 'Alertas ';

  var waBtn = document.getElementById('wa-link');
  if (waBtn) waBtn.textContent = 'WhatsApp';

  document.querySelectorAll('.venc-sec-lbl.y').forEach(function (el) {
    el.textContent = 'Proximos 2 dias';
  });

  document.querySelectorAll('.venc-empty').forEach(function (el) {
    var txt = (el.textContent || '').trim();
    if (txt.toLowerCase().includes('proxim')) el.textContent = 'Sin cuotas proximas';
    if (txt.toLowerCase().includes('aun')) el.textContent = 'Sin registros aun';
  });
}

function prepararUIExportacion() {
  var modal = document.getElementById('modal-exportar');
  if (!modal) return;

  var heading = modal.querySelector('div[style*="font-size:14px"]');
  if (heading) heading.textContent = 'Exportar y respaldar';

  var closeBtn = modal.querySelector('button[onclick="cerrarModalExportar()"]');
  if (closeBtn) closeBtn.textContent = 'X';

  var actions = modal.querySelector('div[style="display:flex;gap:10px"]');
  if (actions && !modal.querySelector('.exp-actions')) {
    actions.className = 'exp-actions';
    actions.innerHTML =
      '<button onclick="exportarExcel()" class="exp-btn exp-btn-primary">Excel / CSV</button>' +
      '<button onclick="exportarPDF()" class="exp-btn exp-btn-secondary">PDF</button>';

    var extra = document.createElement('div');
    extra.className = 'exp-actions';
    extra.style.marginTop = '10px';
    extra.innerHTML =
      '<button onclick="exportarRespaldo()" class="exp-btn exp-btn-neutral">Respaldo JSON</button>' +
      '<button onclick="abrirImportacionRespaldo()" class="exp-btn exp-btn-neutral">Importar respaldo</button>';
    actions.parentNode.insertBefore(extra, actions.nextSibling);

    var extra2 = document.createElement('div');
    extra2.className = 'exp-actions';
    extra2.style.marginTop = '10px';
    extra2.innerHTML =
      '<button onclick="abrirImportacionPlanilla()" class="exp-btn exp-btn-neutral">Importar Excel / CSV</button>' +
      '<button onclick="descargarPlantillaImportacion()" class="exp-btn exp-btn-neutral">Descargar plantilla</button>';
    extra.parentNode.insertBefore(extra2, extra.nextSibling);

    var input = document.createElement('input');
    input.type = 'file';
    input.id = 'importar-respaldo-input';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    input.setAttribute('onchange', 'importarRespaldo(event)');
    extra2.parentNode.insertBefore(input, extra2.nextSibling);

    var inputPlanilla = document.createElement('input');
    inputPlanilla.type = 'file';
    inputPlanilla.id = 'importar-planilla-input';
    inputPlanilla.accept = '.csv,text/csv';
    inputPlanilla.style.display = 'none';
    inputPlanilla.setAttribute('onchange', 'importarPlanilla(event)');
    input.parentNode.insertBefore(inputPlanilla, input.nextSibling);
  }

  var helper = modal.querySelector('div[style*="font-size:11px;color:var(--muted);text-align:center"]');
  if (helper) {
    helper.textContent = 'Puedes exportar en CSV o PDF, importar un respaldo JSON o traer una planilla CSV guardada desde Excel.';
  }
}

document.addEventListener('DOMContentLoaded', function () {
  prepararUIExportacion();
  aplicarTextosUI();
  var filtro = document.getElementById('exp-filtro');
  if (filtro) filtro.addEventListener('change', actualizarResumenExportacion);
});


