// ============================================================
//  js/formulario.js — Estado del formulario y selectores de UI
// ============================================================

// ── Estado global ──────────────────────────────────────────
var tipoActivo  = 'nueva';
var planActivo  = '10s';
var pagoActivo  = 'Efectivo';
var mensajeActual = '';

// ── Inicializar ────────────────────────────────────────────
function inicializar() {
  setVencimientoDefault();
  calcularCuota();
  cargarAliasGuardado();
  poblarSelectMeses();
  renderizarVencimientos();
  renderizarRegistros();
  actualizarContadorMes();
}

// ── Tipo ───────────────────────────────────────────────────
function seleccionarTipo(tipo, btn) {
  tipoActivo = tipo;
  document.querySelectorAll('.tipo-btn').forEach(function (b) {
    b.classList.remove('activo');
  });
  if (btn) btn.classList.add('activo');

  var esNueva   = tipo === 'nueva';
  var planSec   = document.getElementById('plan-section');
  var prodSec   = document.getElementById('producto-section');
  if (planSec) planSec.style.display = esNueva ? '' : 'none';
  if (prodSec) prodSec.style.display = esNueva ? '' : 'none';

  var buscadorSec = document.getElementById('buscador-cliente-sec');
  if (buscadorSec) buscadorSec.style.display = esNueva ? 'none' : '';
}

// ── Plan ───────────────────────────────────────────────────
function seleccionarPlan(plan, btn) {
  planActivo = plan;
  document.querySelectorAll('.tab-plan').forEach(function (b) {
    b.classList.remove('activo');
  });
  if (btn) btn.classList.add('activo');
  var libreWrap = document.getElementById('cuotas-libre-wrap');
  if (libreWrap) libreWrap.style.display = (plan === 'libre') ? 'block' : 'none';
  calcularCuota();
}

// ── Pago ───────────────────────────────────────────────────
function seleccionarPago(btn) {
  pagoActivo = btn.dataset.pago;
  document.querySelectorAll('.pill-tab').forEach(function (b) {
    b.classList.remove('activo');
  });
  btn.classList.add('activo');
}

// ── Semanas según plan activo ──────────────────────────────
function getSemanas() {
  if (planActivo === '10s')  return 10;
  if (planActivo === '20s')  return 20;
  if (planActivo === '30s')  return 30;
  if (planActivo === 'libre') {
    var v = parseInt(document.getElementById('cuotas-libre')?.value || '0');
    return v > 0 ? v : null;
  }
  return null;
}

// ── Calcular cuota semanal ─────────────────────────────────
function calcularCuota() {
  var precio  = parseFloat(document.getElementById('precio-total')?.value || '0');
  var semanas = getSemanas();
  var resumen = document.getElementById('cuota-resumen');
  var cuotaEl = document.getElementById('cuota-val');
  var semEl   = document.getElementById('cuota-semanas-lbl');
  if (!resumen) return;
  if (precio > 0 && semanas) {
    var cuota = Math.ceil(precio / semanas);
    cuotaEl.textContent = '$' + cuota.toLocaleString('es-AR');
    semEl.textContent   = semanas + ' sem.';
    resumen.classList.add('visible');
  } else {
    resumen.classList.remove('visible');
  }
}

// ── Fecha default del input de vencimiento ─────────────────
function setVencimientoDefault() {
  var inp = document.getElementById('vencimiento');
  if (!inp || inp.value) return;
  inp.value = hoyInputLocal();
}

// ── Limpiar formulario nueva venta ─────────────────────────
function limpiarFormularioNueva() {
  ['nombre','telefono','dni','direccion','producto','precio-total','vendedor-nombre'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  var btnPlan = document.querySelector('.tab-plan[data-plan="10s"]');
  seleccionarPlan('10s', btnPlan);
  var btnPago = document.querySelector('.pill-tab[data-pago="Efectivo"]');
  if (btnPago) seleccionarPago(btnPago);
  calcularCuota();
  setVencimientoDefault();
}
