// ============================================================
//  comprobante.js — Comprobante CRM profesional
//  Formato portrait (vertical) · Auto-descarga al generar
// ============================================================

(function inyectarComprobante() {

  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600&display=swap');

    #comp-overlay {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: rgba(0,0,0,0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      align-items: flex-end;
      justify-content: center;
      padding: 0;
    }
    #comp-overlay.abierto { display: flex; animation: compFadeIn 0.25s ease; }
    @keyframes compFadeIn { from { opacity:0 } to { opacity:1 } }

    #comp-modal {
      width: 100%;
      max-width: 440px;
      background: #f9fafb;
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 28px 28px 0 0;
      padding-bottom: 28px;
      animation: compSlideUp 0.35s cubic-bezier(0.34,1.4,0.64,1);
      max-height: 95vh;
      overflow-y: auto;
    }
    @media (min-width:600px) {
      #comp-overlay { align-items:center; padding:20px; }
      #comp-modal   { border-radius:24px; max-height:92vh; }
    }
    @keyframes compSlideUp {
      from { transform:translateY(80px); opacity:0 }
      to   { transform:translateY(0); opacity:1 }
    }

    .comp-handle {
      width:36px; height:4px;
      background:rgba(0,0,0,0.10);
      border-radius:99px;
      margin:14px auto 0;
    }
    .comp-modal-header {
      padding: 16px 20px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(0,0,0,0.07);
    }
    .comp-modal-title {
      font-family: 'Syne', sans-serif;
      font-size: 14px; font-weight: 700; color: #111827;
      display: flex; align-items: center; gap: 8px;
    }
    .comp-modal-dot {
      width:8px; height:8px; border-radius:50%;
      background:#a78bfa; box-shadow:0 0 8px rgba(167,139,250,0.7);
    }
    .comp-close {
      background:rgba(0,0,0,0.05); border:none; color:rgba(0,0,0,0.35);
      width:30px; height:30px; border-radius:50%; cursor:pointer; font-size:14px;
      display:flex; align-items:center; justify-content:center; transition:all 0.15s;
    }
    .comp-close:hover { background:rgba(0,0,0,0.1); color:#111; }

    .comp-preview-wrap { padding: 14px 18px; }
    .comp-tipo-row {
      display:flex; align-items:center; justify-content:space-between;
      margin-bottom:12px;
    }
    .comp-tipo-badge {
      display:inline-flex; align-items:center; gap:5px;
      padding:4px 11px; border-radius:99px;
      font-size:10px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase;
      font-family:'DM Mono',monospace;
    }
    .comp-tipo-nueva      { background:rgba(74,222,128,0.12);  color:#4ade80; border:1px solid rgba(74,222,128,0.25); }
    .comp-tipo-renovacion { background:rgba(96,165,250,0.12);  color:#60a5fa; border:1px solid rgba(96,165,250,0.25); }
    .comp-tipo-porvencer  { background:rgba(251,191,36,0.12);  color:#fbbf24; border:1px solid rgba(251,191,36,0.25); }
    .comp-tipo-expirada   { background:rgba(248,113,113,0.12); color:#f87171; border:1px solid rgba(248,113,113,0.25); }
    .comp-num-badge {
      font-family:'DM Mono',monospace; font-size:10px;
      color:rgba(0,0,0,0.3); letter-spacing:0.08em;
    }

    #comp-canvas-wrap {
      border-radius:14px; overflow:hidden;
      box-shadow:0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06);
    }
    #comp-canvas { display:block; width:100%; height:auto; }

    .comp-footer {
      padding:0 18px; display:flex; flex-direction:column; gap:9px; margin-top:14px;
    }
    .comp-btn {
      width:100%; padding:13px; border:none; border-radius:13px;
      font-size:13px; font-weight:700; cursor:pointer; transition:all 0.18s;
      display:flex; align-items:center; justify-content:center; gap:7px;
      font-family:'DM Sans',sans-serif; letter-spacing:0.02em;
    }
    .comp-btn-wa {
      background:linear-gradient(135deg,#25d366,#128c7e);
      color:#fff; box-shadow:0 6px 20px rgba(37,211,102,0.25);
    }
    .comp-btn-wa:hover { opacity:0.92; transform:translateY(-1px); }
    .comp-btn-copiar {
      background:rgba(0,0,0,0.04); color:rgba(0,0,0,0.5);
      border:1px solid rgba(0,0,0,0.08);
    }
    .comp-btn-copiar:hover { background:rgba(0,0,0,0.08); color:#111; }
    .comp-btn-cerrar {
      background:transparent; color:rgba(0,0,0,0.3);
      border:1px solid rgba(0,0,0,0.1); font-size:12px;
    }
    .comp-btn-cerrar:hover { color:rgba(0,0,0,0.6); }

    .comp-toast {
      position:fixed; bottom:28px; left:50%;
      transform:translateX(-50%) translateY(16px);
      background:#1a1b2e; border:1px solid rgba(74,222,128,0.3);
      color:#4ade80; padding:9px 20px; border-radius:99px;
      font-size:12px; font-weight:600; z-index:10001;
      opacity:0; transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);
      pointer-events:none; white-space:nowrap; font-family:'DM Sans',sans-serif;
    }
    .comp-toast.visible { opacity:1; transform:translateX(-50%) translateY(0); }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'comp-overlay';
  overlay.innerHTML = `
    <div id="comp-modal">
      <div class="comp-handle"></div>
      <div class="comp-modal-header">
        <div class="comp-modal-title">
          <span class="comp-modal-dot"></span>Comprobante
        </div>
        <button class="comp-close" onclick="cerrarComprobante()">✕</button>
      </div>
      <div class="comp-preview-wrap">
        <div class="comp-tipo-row">
          <span class="comp-tipo-badge comp-tipo-nueva" id="comp-tipo-badge">⚡ Nueva cuenta</span>
          <span class="comp-num-badge" id="comp-num-badge">#000001</span>
        </div>
        <div id="comp-canvas-wrap">
          <canvas id="comp-canvas"></canvas>
        </div>
      </div>
      <div class="comp-footer">
        <button class="comp-btn comp-btn-wa"     onclick="enviarWAComp()">📲 Enviar por WhatsApp</button>
        <button class="comp-btn comp-btn-copiar" onclick="copiarMensajeComp()">📋 Copiar mensaje de texto</button>
        <button class="comp-btn comp-btn-cerrar" onclick="cerrarComprobante()">Cerrar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const toast = document.createElement('div');
  toast.className = 'comp-toast';
  toast.id = 'comp-toast';
  document.body.appendChild(toast);

  overlay.addEventListener('click', e => { if (e.target === overlay) cerrarComprobante(); });
})();

// ── Número de comprobante ─────────────────────────────────────
function generarNumComp() {
  const n = parseInt(localStorage.getItem('xsemana_comp_num') || '0') + 1;
  localStorage.setItem('xsemana_comp_num', String(n));
  return String(n).padStart(6, '0');
}

// ── Helpers canvas ────────────────────────────────────────────
function _roundRect(ctx, x, y, w, h, r) {
  const rr = typeof r === 'number' ? [r,r,r,r] : r;
  const [tl,tr,br,bl] = rr;
  ctx.beginPath();
  ctx.moveTo(x+tl, y);
  ctx.lineTo(x+w-tr, y); ctx.quadraticCurveTo(x+w, y, x+w, y+tr);
  ctx.lineTo(x+w, y+h-br); ctx.quadraticCurveTo(x+w, y+h, x+w-br, y+h);
  ctx.lineTo(x+bl, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-bl);
  ctx.lineTo(x, y+tl); ctx.quadraticCurveTo(x, y, x+tl, y);
  ctx.closePath();
}

function _hexRgba(hex, a) {
  if (!hex || hex.length < 7) return `rgba(124,58,237,${a})`;
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

// ── Dibujar comprobante portrait ──────────────────────────────
function dibujarComprobante(datos, tipo, numComp) {
  const canvas = document.getElementById('comp-canvas');
  if (!canvas) return;

  const emp      = (typeof CFG !== 'undefined') ? (CFG.empresa || {}) : {};
  const primario = (typeof CFG !== 'undefined' && CFG.colores) ? CFG.colores.primario : '#7c3aed';

  // Campos según tipo
  var esAviso = tipo === 'aviso' || tipo === 'vencida';
  var campos = [
    { label: 'Empresa', val: emp.fantasia || emp.nombre || 'XSemana' },
  ];
  if (!esAviso) {
    if (datos.producto) campos.push({ label: 'Producto',        val: datos.producto });
    // Precio total NO se muestra al cliente — solo la cuota semanal
    if (datos.semanas)  campos.push({ label: 'Plan de cuotas',  val: datos.semanas });
    if (datos.cuota)    campos.push({ label: 'Cuota semanal',   val: datos.cuota, highlight: true });
  }
  campos.push({ label: 'Cliente',          val: datos.nombre     || '—' });
  campos.push({ label: 'Teléfono',         val: datos.telefono   || '—' });
  if (datos.dni)       campos.push({ label: 'DNI',              val: datos.dni });
  if (datos.direccion) campos.push({ label: 'Dirección',        val: datos.direccion });
  campos.push({ label: 'Próx. vencimiento', val: datos.fechaStr  || '—' });
  campos.push({ label: 'Método de pago',   val: datos.pago       || '—' });
  if (datos.vendedor)  campos.push({ label: 'Vendedor',         val: datos.vendedor });
  if (emp.soporte)     campos.push({ label: 'Soporte',          val: emp.soporte });

  // Calcular altura dinámica
  const W = 480, SCALE = 2;
  const PAD = 32;
  const HEADER_H = 210; // check + monto + fecha + separador
  const ROW_H = 52;
  const FOOTER_H = 56;
  // Separador "Persona destinataria"
  const SEC_H = 36;
  // Filas: primera (Enviado por) sola, luego separador, luego el resto
  const H = HEADER_H + ROW_H + SEC_H + (campos.length - 1) * ROW_H + FOOTER_H + 24;

  canvas.width  = W * SCALE;
  canvas.height = H * SCALE;
  canvas.style.width  = '100%';
  canvas.style.height = 'auto';

  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);

  // ── Fondo blanco ──
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // ── Curva gris top ──
  ctx.fillStyle = '#f0f0f0';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, 90);
  ctx.quadraticCurveTo(W / 2, 130, 0, 90);
  ctx.closePath();
  ctx.fill();

  // ── Círculo check verde ──
  const cx = W / 2, cy = 90;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 36, 0, Math.PI * 2);
  ctx.fillStyle = '#22c55e';
  ctx.shadowColor = 'rgba(34,197,94,0.35)';
  ctx.shadowBlur = 18;
  ctx.fill();
  ctx.restore();

  // Check mark
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy + 1);
  ctx.lineTo(cx - 3, cy + 13);
  ctx.lineTo(cx + 16, cy - 12);
  ctx.stroke();
  ctx.restore();

  // ── Tipo badge ──
  const tipoConf = {
    nueva:        { label: 'Nueva venta',       color: '#16a34a' },
    cobro:        { label: 'Cuota cobrada',     color: '#2563eb' },
    aviso:        { label: 'Aviso de pago',     color: '#d97706' },
    vencida:      { label: 'Cuota vencida',     color: '#dc2626' },
    felicitacion: { label: '🎉 ¡Pagado total!', color: '#e8614a' },
  };
  const esFelicitacion = tipo === 'felicitacion';
  const tc = tipoConf[tipo] || tipoConf.cobro;
  ctx.font = esFelicitacion ? 'bold 15px sans-serif' : '13px sans-serif';
  ctx.fillStyle = tc.color;
  ctx.textAlign = 'center';
  ctx.fillText(tc.label.toUpperCase(), W / 2, cy + 58);

  // ── Nombre cliente grande ──
  ctx.font = 'bold 28px sans-serif';
  ctx.fillStyle = '#111827';
  ctx.textAlign = 'center';
  let nom = datos.nombre || '—';
  while (ctx.measureText(nom).width > W - PAD * 2 && nom.length > 3) nom = nom.slice(0, -1);
  if (nom !== datos.nombre) nom += '…';
  ctx.fillText(nom, W / 2, cy + 88);

  // ── Felicitación extra ──
  if (esFelicitacion) {
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'center';
    ctx.fillText('¡Terminaste de pagar tu producto!', W / 2, cy + 108);
  }

  // ── Fecha ──
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#6b7280';
  ctx.fillText(new Date().toLocaleString('es-AR'), W / 2, esFelicitacion ? cy + 126 : cy + 112);

  // ── Separador top ──
  let rowY = HEADER_H;
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PAD, rowY); ctx.lineTo(W - PAD, rowY); ctx.stroke();
  rowY += 6;

  // ── Fila "Enviado por" ──
  const primerCampo = campos[0];
  _dibujarFila(ctx, PAD, rowY, W, ROW_H, primerCampo.label, primerCampo.val, false, primario);
  rowY += ROW_H;

  // ── Separador sección ──
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PAD, rowY); ctx.lineTo(W - PAD, rowY); ctx.stroke();

  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = '#9ca3af';
  ctx.textAlign = 'left';
  ctx.fillText('DETALLE', PAD, rowY + 22);
  rowY += SEC_H;

  // ── Resto de filas ──
  for (let i = 1; i < campos.length; i++) {
    const c = campos[i];
    // Separador entre filas (no el primero)
    if (i > 1) {
      ctx.strokeStyle = '#f3f4f6';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PAD, rowY); ctx.lineTo(W - PAD, rowY); ctx.stroke();
    }
    _dibujarFila(ctx, PAD, rowY, W, ROW_H, c.label, c.val, c.highlight || false, primario);
    rowY += ROW_H;
  }

  // ── Footer ──
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PAD, rowY + 8); ctx.lineTo(W - PAD, rowY + 8); ctx.stroke();

  // Logo empresa centrado
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#111827';
  ctx.textAlign = 'center';
  ctx.fillText((emp.emoji || '♾️') + '  ' + (emp.fantasia || emp.nombre || 'Infinity'), W / 2, rowY + 36);

  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#9ca3af';
  ctx.fillText('Comprobante #' + numComp, W / 2, rowY + 56);
}

function _dibujarFila(ctx, pad, y, W, rowH, label, val, highlight, primario) {
  const midY = y + rowH * 0.58;

  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#9ca3af';
  ctx.textAlign = 'left';
  ctx.fillText(label, pad, midY);

  ctx.font = highlight ? 'bold 20px sans-serif' : 'bold 16px sans-serif';
  ctx.fillStyle = highlight ? primario : '#111827';
  ctx.textAlign = 'right';
  let v = String(val);
  while (ctx.measureText(v).width > W * 0.55 && v.length > 4) v = v.slice(0, -1);
  if (v !== String(val)) v += '…';
  ctx.fillText(v, W - pad, midY);

  ctx.textAlign = 'left';
}

// ── Abrir comprobante + auto-descarga ─────────────────────────
function abrirComprobante(datos, tipo) {
  if (typeof CFG !== 'undefined' && CFG.empresa?.comprobante === false) return;

  const numComp = generarNumComp();

  const tipoMap = {
    nueva:        { label: '⚡ Nueva cuenta',   cls: 'comp-tipo-nueva'      },
    cobro:        { label: '✅ Cuota cobrada',  cls: 'comp-tipo-renovacion' },
    aviso:        { label: '⏰ Aviso de pago',  cls: 'comp-tipo-porvencer'  },
    vencida:      { label: '❌ Cuota vencida',  cls: 'comp-tipo-expirada'   },
    renovacion:   { label: '🔄 Renovación',    cls: 'comp-tipo-renovacion' },
    porvencer:    { label: '⏰ Por vencer',     cls: 'comp-tipo-porvencer'  },
    expirada:     { label: '❌ Expirada',       cls: 'comp-tipo-expirada'   },
  };
  const tm = tipoMap[tipo] || tipoMap.nueva;
  const badge = document.getElementById('comp-tipo-badge');
  if (badge) { badge.textContent = tm.label; badge.className = 'comp-tipo-badge ' + tm.cls; }
  const numBadge = document.getElementById('comp-num-badge');
  if (numBadge) numBadge.textContent = '#' + numComp;

  window._compDatos = datos;
  window._compTipo  = tipo;
  window._compNum   = numComp;

  // Abrir modal
  document.getElementById('comp-overlay').classList.add('abierto');
  document.body.style.overflow = 'hidden';

  // Dibujar preview
  setTimeout(() => dibujarComprobante(datos, tipo, numComp), 60);

  // AUTO-DESCARGA — espera a que el canvas esté dibujado
  setTimeout(() => {
    const canvas = document.getElementById('comp-canvas');
    if (!canvas) return;
    try {
      const link = document.createElement('a');
      const nombre = (datos.nombre || 'cliente').replace(/\s+/g,'_').toLowerCase();
      link.download = `comprobante_${nombre}_${numComp}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      mostrarToastComp('📥 Comprobante descargado');
    } catch(e) {}
  }, 500);
}

function cerrarComprobante() {
  document.getElementById('comp-overlay').classList.remove('abierto');
  document.body.style.overflow = '';
}

// ── WhatsApp ──────────────────────────────────────────────────
function enviarWAComp() {
  const d = window._compDatos;
  if (!d) return;
  const tel = (d.telefono || '').replace(/\D/g, '');
  if (!tel) { alert('No hay teléfono cargado.'); return; }
  let num = tel;
  if (num.startsWith('0')) num = num.slice(1);
  if (!num.startsWith('54')) num = '54' + num;
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(window.mensajeActual||'')}`, 'whatsappTab');
}

// ── Copiar mensaje texto ──────────────────────────────────────
function copiarMensajeComp() {
  const texto = window.mensajeActual || '';
  if (!texto) return;
  navigator.clipboard.writeText(texto)
    .then(() => mostrarToastComp('✅ Mensaje copiado'))
    .catch(() => {
      const ta = document.createElement('textarea');
      ta.value = texto; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      mostrarToastComp('✅ Mensaje copiado');
    });
}

// ── Toast ─────────────────────────────────────────────────────
function mostrarToastComp(msg) {
  const t = document.getElementById('comp-toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('visible');
  setTimeout(() => t.classList.remove('visible'), 2500);
}