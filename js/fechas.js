// ============================================================
//  js/fechas.js — Helpers de fecha
// ============================================================

function hoy() {
  var d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function sumarDias(fecha, dias) {
  var d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d;
}

function fechaToStr(d) {
  return String(d.getDate()).padStart(2, '0') + '/' +
         String(d.getMonth() + 1).padStart(2, '0') + '/' +
         d.getFullYear();
}

function strToFecha(str) {
  if (!str) return null;
  var p = str.split('/');
  if (p.length !== 3) return null;
  return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
}

function inputToStr(val) {
  if (!val) return '';
  var p = val.split('-');
  return p[2] + '/' + p[1] + '/' + p[0];
}

function strToInput(str) {
  if (!str) return '';
  var p = str.split('/');
  if (p.length !== 3) return '';
  return p[2] + '-' + p[1].padStart(2, '0') + '-' + p[0].padStart(2, '0');
}

function diasHasta(fechaStr) {
  var f = strToFecha(fechaStr);
  if (!f) return null;
  f.setHours(0, 0, 0, 0);
  return Math.round((f - hoy()) / 86400000);
}

function mesKey() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
