// ============================================================
//  js/storage.js — Persistencia en localStorage
// ============================================================
//
//  Estructura de cada venta:
//  {
//    id, nombre, telefono, dni, direccion, producto,
//    precioTotal, semanasTotales, cuotaMonto,
//    cuotaActual (nro de cuota que viene),
//    proximoVenc (DD/MM/YYYY),
//    vendedor, pago,
//    fechaVenta, mes_key,
//    historial: [{ cuota, fecha, pago, vendedor, nota? }]
//  }

function cargarVentas() {
  try {
    return JSON.parse(localStorage.getItem('xs_ventas') || '[]');
  } catch (e) {
    return [];
  }
}

function guardarVentas(v) {
  localStorage.setItem('xs_ventas', JSON.stringify(v));
}
