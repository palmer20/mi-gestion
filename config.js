// ============================================================
//  config.js — XSemana Totoras
// ============================================================

const CFG = {
  empresa: {
    nombre:   'XSemana Totoras',
    fantasia: 'Cobros Semanales',
    emoji:    '✖️',
    soporte:  '',
    comprobante: true,
  },
  colores: {
    primario: '#E8354A',
    acento:   '#E8354A',
    fondo:    '#0D0D0D',
  },
  planes: [
    { key: '10s',   label: '10 semanas',    semanas: 10 },
    { key: '20s',   label: '20 semanas',    semanas: 20 },
    { key: '30s',   label: '30 semanas',    semanas: 30 },
    { key: 'libre', label: 'Personalizado', semanas: null },
  ],
  pagos: ['Efectivo', 'Transferencia', 'Mercado Pago'],
};
