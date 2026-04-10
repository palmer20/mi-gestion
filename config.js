// ============================================================
//  config.js — XSemana Totoras
// ============================================================

const CFG = {
  empresa: {
    nombre:   'XSemana Totoras',
    fantasia: 'XSemana Totoras',
    emoji:    '✖️',
    soporte:  '',          // Opcional: ej. 'xsemana.totoras' o '3476000000'
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
  pagos: ['Efectivo', 'Transferencia'],
  firebase: {
    enabled: true,
    config: {
      apiKey: 'AIzaSyAhzKfxK8ds4f-p6pvzm-6NEyTCeqVA618',
      authDomain: 'migestion-399c7.firebaseapp.com',
      projectId: 'migestion-399c7',
      storageBucket: 'migestion-399c7.firebasestorage.app',
      messagingSenderId: '446401073547',
      appId: '1:446401073547:web:95387ab8b976e091601f8e'
    },
    collection: 'app_state',
    document: 'ventas_compartidas'
  }
};
