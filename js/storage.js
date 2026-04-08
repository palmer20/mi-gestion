// ============================================================
//  js/storage.js - Persistencia local y helpers de datos
// ============================================================

var XS_VENTAS_KEY = 'xs_ventas_secure';
var XS_VENTAS_LEGACY_KEY = 'xs_ventas';
window.__xsVentasCache = [];
window.__xsStorageUnlocked = false;

function cargarVentas() {
  return (window.__xsVentasCache || []).map(normalizarVenta).filter(Boolean);
}

function guardarVentas(v) {
  var normalizadas = (v || []).map(normalizarVenta).filter(Boolean);
  window.__xsVentasCache = normalizadas;

  if (typeof guardarVentasNube === 'function') {
    guardarVentasNube(normalizadas);
  }

  if (window.__xsStorageUnlocked && typeof persistirVentasSeguras === 'function') {
    persistirVentasSeguras(normalizadas);
    return;
  }

  localStorage.setItem(XS_VENTAS_LEGACY_KEY, JSON.stringify(normalizadas));
}

function obtenerVentasLegacy() {
  try {
    var ventas = JSON.parse(localStorage.getItem(XS_VENTAS_LEGACY_KEY) || '[]');
    if (!Array.isArray(ventas)) return [];
    return ventas.map(normalizarVenta).filter(Boolean);
  } catch (e) {
    return [];
  }
}

function limpiarVentasLegacy() {
  localStorage.removeItem(XS_VENTAS_LEGACY_KEY);
}

function setVentasCache(ventas) {
  window.__xsVentasCache = (ventas || []).map(normalizarVenta).filter(Boolean);
}

function resetVentasCache() {
  window.__xsVentasCache = [];
  window.__xsStorageUnlocked = false;
}

function normalizarVenta(v) {
  if (!v || typeof v !== 'object') return null;

  var historial = Array.isArray(v.historial) ? v.historial.map(function (h) {
    return {
      cuota: Number(h && h.cuota) || 0,
      fecha: String((h && h.fecha) || ''),
      monto: Number(h && h.monto) || 0,
      pago: String((h && h.pago) || ''),
      vendedor: String((h && h.vendedor) || ''),
      nota: String((h && h.nota) || '')
    };
  }) : [];

  return {
    id: Number(v.id) || Date.now(),
    nombre: String(v.nombre || '').trim(),
    telefono: String(v.telefono || '').trim(),
    dni: String(v.dni || '').trim(),
    direccion: String(v.direccion || '').trim(),
    producto: String(v.producto || '').trim(),
    precioTotal: Number(v.precioTotal) || 0,
    semanasTotales: Number(v.semanasTotales) || 0,
    cuotaMonto: Number(v.cuotaMonto) || 0,
    cuotaActual: Number(v.cuotaActual) || 1,
    proximoVenc: String(v.proximoVenc || '').trim(),
    vendedor: String(v.vendedor || '').trim(),
    pago: String(v.pago || '').trim(),
    fechaVenta: String(v.fechaVenta || '').trim(),
    mes_key: String(v.mes_key || '').trim(),
    historial: historial
  };
}

function escapeHtml(valor) {
  return String(valor == null ? '' : valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function textoSeguro(valor, fallback) {
  var texto = String(valor == null ? '' : valor).trim();
  if (texto) return escapeHtml(texto);
  if (fallback === undefined) return '';
  return escapeHtml(fallback);
}
