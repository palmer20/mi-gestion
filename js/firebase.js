// ============================================================
//  js/firebase.js - Sincronizacion compartida con Firestore
// ============================================================

window.__xsCloud = {
  enabled: false,
  ready: false,
  started: false,
  applyingRemote: false,
  unsubscribe: null,
  docRef: null
};

function getFirebaseSyncConfig() {
  if (typeof CFG === 'undefined' || !CFG.firebase || !CFG.firebase.enabled) return null;
  if (!window.firebase || !window.firebase.firestore) return null;
  return CFG.firebase;
}

function nubeActiva() {
  return Boolean(window.__xsCloud && window.__xsCloud.ready && window.__xsCloud.docRef);
}

function refrescarUIDesdeNube() {
  if (typeof renderizarVencimientos === 'function') renderizarVencimientos();
  if (typeof renderizarRegistros === 'function') renderizarRegistros();
  if (typeof actualizarContadorMes === 'function') actualizarContadorMes();
  if (typeof actualizarResumenExportacion === 'function') actualizarResumenExportacion();
  if (typeof renderGrafico === 'function') {
    renderGrafico('grafico-cobros', 'grafico-total');
    renderGrafico('grafico-cobros-drawer', 'grafico-total-drawer');
  }
}

function inicializarFirebaseApp() {
  var syncCfg = getFirebaseSyncConfig();
  if (!syncCfg) return null;

  if (!firebase.apps.length) {
    firebase.initializeApp(syncCfg.config);
  }

  return firebase.app();
}

function getVentasDocRef() {
  var syncCfg = getFirebaseSyncConfig();
  if (!syncCfg) return null;
  inicializarFirebaseApp();
  var authUser = firebase.auth && firebase.auth().currentUser;
  var docId = (authUser && authUser.uid) || syncCfg.document;
  return firebase.firestore().collection(syncCfg.collection).doc(docId);
}

function guardarVentasNube(ventas) {
  if (!nubeActiva() || window.__xsCloud.applyingRemote) return Promise.resolve();

  var payload = {
    ventas: (ventas || []).map(normalizarVenta).filter(Boolean),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedBy: (window.__xsSecurity && window.__xsSecurity.user) || 'local'
  };

  return window.__xsCloud.docRef.set(payload, { merge: true })
    .catch(function (error) {
      console.error('No se pudieron sincronizar las ventas en Firestore', error);
      if (typeof mostrarToast === 'function') mostrarToast('No se pudo sincronizar con Firebase');
    });
}

function iniciarSincronizacionNube() {
  var syncCfg = getFirebaseSyncConfig();
  if (!syncCfg || window.__xsCloud.started) return;

  try {
    window.__xsCloud.docRef = getVentasDocRef();
    if (!window.__xsCloud.docRef) return;

    window.__xsCloud.enabled = true;
    window.__xsCloud.ready = true;
    window.__xsCloud.started = true;

    window.__xsCloud.unsubscribe = window.__xsCloud.docRef.onSnapshot(function (snapshot) {
      var data = snapshot.exists ? snapshot.data() : null;

      if (data && Array.isArray(data.ventas)) {
        window.__xsCloud.applyingRemote = true;
        setVentasCache(data.ventas);
        window.__xsCloud.applyingRemote = false;
        refrescarUIDesdeNube();
        return;
      }

      var locales = cargarVentas();
      if (locales.length) guardarVentasNube(locales);
    }, function (error) {
      console.error('Error escuchando cambios de Firestore', error);
      if (typeof mostrarToast === 'function') mostrarToast('Firebase sin conexion');
    });
  } catch (error) {
    console.error('No se pudo iniciar Firebase', error);
    window.__xsCloud.enabled = false;
    window.__xsCloud.ready = false;
    window.__xsCloud.started = false;
  }
}

function detenerSincronizacionNube() {
  if (window.__xsCloud && typeof window.__xsCloud.unsubscribe === 'function') {
    window.__xsCloud.unsubscribe();
  }

  window.__xsCloud.unsubscribe = null;
  window.__xsCloud.docRef = null;
  window.__xsCloud.started = false;
  window.__xsCloud.ready = false;
  window.__xsCloud.applyingRemote = false;
}
