// ============================================================
//  js/auth.js - Autenticacion local segura y sesion
// ============================================================

var XS_AUTH_KEY = 'xs_auth_config';
var XS_SESSION_KEY = 'xs_session_meta';
var XS_LOGIN_ATTEMPTS_KEY = 'xs_login_attempts';
var XS_SESSION_TIMEOUT_MS = 15 * 60 * 1000;
var XS_LOCKOUT_MS = 5 * 60 * 1000;
var XS_MAX_LOGIN_ATTEMPTS = 5;
var XS_PBKDF2_ITERATIONS = 150000;
var XS_FIREBASE_LAST_USER_KEY = 'xs_firebase_last_user';
var xsSessionHeartbeat = null;
var xsSessionListenersReady = false;
var xsFirebaseObserverStarted = false;
window.__xsSecurity = { user: null, key: null };

function getAuthConfig() {
  try {
    var raw = JSON.parse(localStorage.getItem(XS_AUTH_KEY) || 'null');
    if (!raw || !raw.username || !raw.salt || !raw.passwordHash) return null;
    return raw;
  } catch (e) {
    return null;
  }
}

function guardarAuthConfig(config) {
  localStorage.setItem(XS_AUTH_KEY, JSON.stringify(config));
}

function getLoginAttempts() {
  try {
    return JSON.parse(localStorage.getItem(XS_LOGIN_ATTEMPTS_KEY) || '{"count":0,"blockedUntil":0}');
  } catch (e) {
    return { count: 0, blockedUntil: 0 };
  }
}

function resetLoginAttempts() {
  localStorage.setItem(XS_LOGIN_ATTEMPTS_KEY, JSON.stringify({ count: 0, blockedUntil: 0 }));
}

function registrarLoginFallido() {
  var state = getLoginAttempts();
  state.count = (state.count || 0) + 1;
  if (state.count >= XS_MAX_LOGIN_ATTEMPTS) {
    state.blockedUntil = Date.now() + XS_LOCKOUT_MS;
    state.count = 0;
  }
  localStorage.setItem(XS_LOGIN_ATTEMPTS_KEY, JSON.stringify(state));
  return state;
}

function getLockoutRemainingMs() {
  var state = getLoginAttempts();
  var blockedUntil = Number(state.blockedUntil) || 0;
  return Math.max(0, blockedUntil - Date.now());
}

function setLoginMessage(msg, isError) {
  var el = document.getElementById('login-error');
  if (!el) return;
  el.textContent = msg || '';
  el.style.color = isError ? 'var(--red)' : 'var(--muted)';
}

function setLoginHelp(msg) {
  var el = document.getElementById('login-help');
  if (!el) return;
  el.textContent = msg || '';
}

function limpiarCamposLogin() {
  var pass = document.getElementById('login-pass');
  var pass2 = document.getElementById('login-pass-confirm');
  if (pass) pass.value = '';
  if (pass2) pass2.value = '';
}

function usarFirebaseAuth() {
  return Boolean(
    typeof CFG !== 'undefined' &&
    CFG.firebase &&
    CFG.firebase.enabled &&
    window.firebase &&
    typeof window.firebase.auth === 'function'
  );
}

function getFirebaseLastUser() {
  return (localStorage.getItem(XS_FIREBASE_LAST_USER_KEY) || '').trim().toLowerCase();
}

function setFirebaseLastUser(user) {
  if (!user) {
    localStorage.removeItem(XS_FIREBASE_LAST_USER_KEY);
    return;
  }
  localStorage.setItem(XS_FIREBASE_LAST_USER_KEY, String(user).trim().toLowerCase());
}

function normalizarCredencialFirebase(value) {
  var limpio = (value || '').trim().toLowerCase();
  if (!limpio) return '';
  if (limpio.indexOf('@') !== -1) return limpio;
  return limpio.replace(/\s+/g, '') + '@xsemana.app';
}

function getAliasDesdeCredencialFirebase(value) {
  var email = normalizarCredencialFirebase(value);
  if (!email) return '';
  return email.split('@')[0];
}

function getDisplayNameFirebase(user) {
  if (!user) return '';
  var email = user.email || '';
  return getAliasDesdeCredencialFirebase(email) || email;
}

function setLoginMode() {
  if (usarFirebaseAuth()) {
    var confirmInp = document.getElementById('login-pass-confirm');
    var mainBtn = document.getElementById('login-btn-main');
    var userInp = document.getElementById('login-user');
    var lastUser = getFirebaseLastUser();

    if (!confirmInp || !mainBtn || !userInp) return;

    confirmInp.style.display = lastUser ? 'none' : '';
    mainBtn.textContent = lastUser ? 'Ingresar' : 'Ingresar o crear';
    userInp.placeholder = 'Usuario o email';
    if (lastUser && !userInp.value) userInp.value = lastUser;
    setLoginHelp('Usa el mismo acceso en PC e iPhone. Si la cuenta no existe todavia, completa "Repetir contrasena" para crearla.');
    return;
  }

  var config = getAuthConfig();
  var confirmInpLocal = document.getElementById('login-pass-confirm');
  var mainBtnLocal = document.getElementById('login-btn-main');
  var userInpLocal = document.getElementById('login-user');

  if (!confirmInpLocal || !mainBtnLocal || !userInpLocal) return;

  if (config) {
    confirmInpLocal.style.display = 'none';
    mainBtnLocal.textContent = 'Ingresar';
    userInpLocal.placeholder = 'Usuario';
    setLoginHelp('Ingresa con tu usuario y clave. La sesion se bloquea por inactividad.');
  } else {
    confirmInpLocal.style.display = '';
    mainBtnLocal.textContent = 'Crear acceso';
    userInpLocal.placeholder = 'Usuario administrador';
    setLoginHelp('Primera vez: crea el acceso del dueno. Los registros quedaran cifrados con esa clave.');
  }
}

async function hacerLoginFirebase(username, password, passwordConfirm) {
  var email = normalizarCredencialFirebase(username);

  if (!email) {
    setLoginMessage('Ingresa un usuario o email valido.', true);
    return;
  }
  if (!password || password.length < 6) {
    setLoginMessage('La contrasena debe tener al menos 6 caracteres.', true);
    return;
  }

  var remaining = getLockoutRemainingMs();
  if (remaining > 0) {
    setLoginMessage('Acceso bloqueado temporalmente. Proba de nuevo en ' + Math.ceil(remaining / 60000) + ' min.', true);
    return;
  }

  try {
    inicializarFirebaseApp();
    if (passwordConfirm) {
      if (password !== passwordConfirm) {
        setLoginMessage('Las contrasenas no coinciden.', true);
        return;
      }
      await firebase.auth().createUserWithEmailAndPassword(email, password);
    } else {
      await firebase.auth().signInWithEmailAndPassword(email, password);
    }

    resetLoginAttempts();
    setFirebaseLastUser(username);
    limpiarCamposLogin();
    setLoginMessage('');
  } catch (e) {
    console.error('Error de acceso con Firebase', e);
    var code = e && e.code;

    if (code === 'auth/email-already-in-use') {
      setLoginMessage('Ese usuario ya existe. Ingresa sin repetir contrasena.', true);
      return;
    }

    if (code === 'auth/user-not-found') {
      registrarLoginFallido();
      setLoginMessage('Ese usuario no existe todavia. Completa "Repetir contrasena" para crearlo.', true);
      return;
    }

    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials') {
      var state = registrarLoginFallido();
      if (state.blockedUntil && state.blockedUntil > Date.now()) {
        setLoginMessage('Demasiados intentos. Acceso bloqueado 5 minutos.', true);
      } else {
        setLoginMessage('Usuario o contrasena incorrectos.', true);
      }
      return;
    }

    if (code === 'auth/invalid-email') {
      setLoginMessage('El usuario o email no es valido.', true);
      return;
    }

    setLoginMessage('No se pudo acceder con Firebase. Proba de nuevo.', true);
  }
}

function restaurarSesionFirebase(user) {
  var alias = getDisplayNameFirebase(user);
  window.__xsSecurity = { user: alias || user.email || 'usuario', key: null };
  window.__xsStorageUnlocked = false;
  setFirebaseLastUser(alias || user.email || '');
  setVentasCache(obtenerVentasLegacy());
  guardarSesionActiva(alias || user.email || 'usuario');
  mostrarApp(alias || user.email || 'usuario');
}

async function hacerLogin() {
  var username = (document.getElementById('login-user').value || '').trim().toLowerCase();
  var password = document.getElementById('login-pass').value || '';
  var passwordConfirm = document.getElementById('login-pass-confirm')?.value || '';

  setLoginMessage('');

  if (usarFirebaseAuth()) {
    await hacerLoginFirebase(username, password, passwordConfirm);
    return;
  }

  var config = getAuthConfig();

  if (!window.crypto || !window.crypto.subtle) {
    setLoginMessage('Este navegador no soporta cifrado seguro.', true);
    return;
  }

  if (!config) {
    await crearAccesoInicial(username, password, passwordConfirm);
    return;
  }

  var remaining = getLockoutRemainingMs();
  if (remaining > 0) {
    setLoginMessage('Acceso bloqueado temporalmente. Proba de nuevo en ' + Math.ceil(remaining / 60000) + ' min.', true);
    return;
  }

  if (username !== config.username) {
    registrarLoginFallido();
    setLoginMessage('Usuario o contrasena incorrectos.', true);
    return;
  }

  try {
    var passwordHash = await derivarHashPassword(password, config.salt);
    if (passwordHash !== config.passwordHash) {
      var stateLocal = registrarLoginFallido();
      if (stateLocal.blockedUntil && stateLocal.blockedUntil > Date.now()) {
        setLoginMessage('Demasiados intentos. Acceso bloqueado 5 minutos.', true);
      } else {
        setLoginMessage('Usuario o contrasena incorrectos.', true);
      }
      return;
    }

    resetLoginAttempts();
    await desbloquearVentas(password, config);
    guardarSesionActiva(config.username);
    limpiarCamposLogin();
    mostrarApp(config.username);
  } catch (e) {
    console.error('Error de login', e);
    setLoginMessage('No se pudo desbloquear la base local. Verifica la contrasena.', true);
  }
}

function cerrarSesion(motivo, skipFirebaseSignOut) {
  sessionStorage.removeItem(XS_SESSION_KEY);
  if (usarFirebaseAuth() && !skipFirebaseSignOut) {
    firebase.auth().signOut().catch(function (error) {
      console.error('No se pudo cerrar la sesion de Firebase', error);
    });
  }
  window.__xsSecurity = { user: null, key: null };
  if (typeof detenerSincronizacionNube === 'function') {
    detenerSincronizacionNube();
  }
  resetVentasCache();

  if (xsSessionHeartbeat) {
    clearInterval(xsSessionHeartbeat);
    xsSessionHeartbeat = null;
  }

  document.getElementById('login-screen').style.display = '';
  document.getElementById('top-bar').style.display = 'none';
  document.getElementById('main-wrap').style.display = 'none';
  document.getElementById('bottom-nav').style.display = 'none';
  document.getElementById('usuario-badge').textContent = '';
  limpiarCamposLogin();
  setLoginMode();
  setLoginMessage(motivo || '', Boolean(motivo));
}

window.addEventListener('DOMContentLoaded', function () {
  if (!usarFirebaseAuth() || xsFirebaseObserverStarted) return;

  inicializarFirebaseApp();
  xsFirebaseObserverStarted = true;

  firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
      restaurarSesionFirebase(user);
      return;
    }

    if (document.getElementById('top-bar').style.display !== 'none') {
      cerrarSesion('', true);
    }
  });
});
