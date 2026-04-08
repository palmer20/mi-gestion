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
var xsSessionHeartbeat = null;
var xsSessionListenersReady = false;
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

function setLoginMode() {
  var config = getAuthConfig();
  var confirmInp = document.getElementById('login-pass-confirm');
  var mainBtn = document.getElementById('login-btn-main');
  var userInp = document.getElementById('login-user');

  if (!confirmInp || !mainBtn || !userInp) return;

  if (config) {
    confirmInp.style.display = 'none';
    mainBtn.textContent = 'Ingresar';
    userInp.placeholder = 'Usuario';
    setLoginHelp('Ingresá con tu usuario y clave. La sesión se bloquea por inactividad.');
  } else {
    confirmInp.style.display = '';
    mainBtn.textContent = 'Crear acceso';
    userInp.placeholder = 'Usuario administrador';
    setLoginHelp('Primera vez: creá el acceso del dueño. Los registros quedarán cifrados con esa clave.');
  }
}

function bufferToBase64(buffer) {
  var bytes = new Uint8Array(buffer);
  var binary = '';
  for (var i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(base64) {
  var binary = atob(base64);
  var bytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function randomBase64(size) {
  var bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bufferToBase64(bytes.buffer);
}

async function derivarMaterialClave(password) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
}

async function derivarHashPassword(password, saltBase64) {
  var material = await derivarMaterialClave(password);
  var bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: base64ToBytes(saltBase64),
      iterations: XS_PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    material,
    256
  );
  return bufferToBase64(bits);
}

async function derivarClaveCifrado(password, saltBase64) {
  var material = await derivarMaterialClave(password);
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: base64ToBytes(saltBase64),
      iterations: XS_PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function cifrarJSON(data, key) {
  var iv = crypto.getRandomValues(new Uint8Array(12));
  var encoded = new TextEncoder().encode(JSON.stringify(data));
  var encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, encoded);
  return JSON.stringify({
    iv: bufferToBase64(iv.buffer),
    data: bufferToBase64(encrypted)
  });
}

async function descifrarJSON(payload, key) {
  var parsed = JSON.parse(payload);
  var iv = base64ToBytes(parsed.iv);
  var data = base64ToBytes(parsed.data);
  var decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, data);
  return JSON.parse(new TextDecoder().decode(decrypted));
}

async function persistirVentasSeguras(ventas) {
  if (!window.__xsSecurity || !window.__xsSecurity.key) return;
  try {
    var payload = await cifrarJSON((ventas || []).map(normalizarVenta).filter(Boolean), window.__xsSecurity.key);
    localStorage.setItem(XS_VENTAS_KEY, payload);
    limpiarVentasLegacy();
  } catch (e) {
    console.error('No se pudieron guardar las ventas cifradas', e);
    setLoginMessage('No se pudieron guardar los datos cifrados.', true);
  }
}

async function desbloquearVentas(password, config) {
  var key = await derivarClaveCifrado(password, config.salt);
  window.__xsSecurity = { user: config.username, key: key };
  window.__xsStorageUnlocked = true;

  var rawSecure = localStorage.getItem(XS_VENTAS_KEY);
  if (rawSecure) {
    var decrypted = await descifrarJSON(rawSecure, key);
    setVentasCache(decrypted);
    return;
  }

  var legacy = obtenerVentasLegacy();
  setVentasCache(legacy);
  await persistirVentasSeguras(legacy);
}

async function crearAccesoInicial(username, password, passwordConfirm) {
  if (!username || username.length < 3) {
    setLoginMessage('Elegí un usuario de al menos 3 caracteres.', true);
    return;
  }
  if (!password || password.length < 6) {
    setLoginMessage('La contraseña debe tener al menos 6 caracteres.', true);
    return;
  }
  if (password !== passwordConfirm) {
    setLoginMessage('Las contraseñas no coinciden.', true);
    return;
  }

  var salt = randomBase64(16);
  var passwordHash = await derivarHashPassword(password, salt);
  guardarAuthConfig({
    username: username,
    salt: salt,
    passwordHash: passwordHash,
    iterations: XS_PBKDF2_ITERATIONS,
    createdAt: new Date().toISOString()
  });

  resetLoginAttempts();
  await desbloquearVentas(password, getAuthConfig());
  guardarSesionActiva(username);
  limpiarCamposLogin();
  setLoginMessage('');
  mostrarApp(username);
}

function guardarSesionActiva(username) {
  sessionStorage.setItem(XS_SESSION_KEY, JSON.stringify({
    username: username,
    lastActivity: Date.now()
  }));
}

function actualizarSesionActiva() {
  if (!window.__xsSecurity || !window.__xsSecurity.user) return;
  guardarSesionActiva(window.__xsSecurity.user);
}

function registrarActividadSesion() {
  if (!window.__xsSecurity || !window.__xsSecurity.user) return;
  actualizarSesionActiva();
}

function iniciarVigilanciaSesion() {
  if (!xsSessionListenersReady) {
    ['click', 'keydown', 'touchstart', 'mousemove'].forEach(function (eventName) {
      document.addEventListener(eventName, registrarActividadSesion, { passive: true });
    });
    xsSessionListenersReady = true;
  }

  if (xsSessionHeartbeat) clearInterval(xsSessionHeartbeat);
  xsSessionHeartbeat = setInterval(function () {
    var raw = sessionStorage.getItem(XS_SESSION_KEY);
    if (!raw || !window.__xsSecurity || !window.__xsSecurity.user) return;
    try {
      var session = JSON.parse(raw);
      var lastActivity = Number(session.lastActivity) || 0;
      if (Date.now() - lastActivity > XS_SESSION_TIMEOUT_MS) {
        cerrarSesion('Sesión bloqueada por inactividad.');
      }
    } catch (e) {
      cerrarSesion('Sesión expirada.');
    }
  }, 30000);
}

async function hacerLogin() {
  var username = (document.getElementById('login-user').value || '').trim().toLowerCase();
  var password = document.getElementById('login-pass').value || '';
  var passwordConfirm = document.getElementById('login-pass-confirm')?.value || '';
  var config = getAuthConfig();

  setLoginMessage('');

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
    setLoginMessage('Acceso bloqueado temporalmente. Probá de nuevo en ' + Math.ceil(remaining / 60000) + ' min.', true);
    return;
  }

  if (username !== config.username) {
    registrarLoginFallido();
    setLoginMessage('Usuario o contraseña incorrectos.', true);
    return;
  }

  try {
    var passwordHash = await derivarHashPassword(password, config.salt);
    if (passwordHash !== config.passwordHash) {
      var state = registrarLoginFallido();
      if (state.blockedUntil && state.blockedUntil > Date.now()) {
        setLoginMessage('Demasiados intentos. Acceso bloqueado 5 minutos.', true);
      } else {
        setLoginMessage('Usuario o contraseña incorrectos.', true);
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
    setLoginMessage('No se pudo desbloquear la base local. Verificá la contraseña.', true);
  }
}

function mostrarApp(u) {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('top-bar').style.display = 'flex';
  document.getElementById('main-wrap').style.display = 'flex';
  document.getElementById('bottom-nav').style.display = '';
  document.getElementById('usuario-badge').textContent = 'Usuario: ' + u;
  iniciarVigilanciaSesion();
  inicializar();
}

function cerrarSesion(motivo) {
  sessionStorage.removeItem(XS_SESSION_KEY);
  window.__xsSecurity = { user: null, key: null };
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
  setLoginMode();
  var config = getAuthConfig();
  if (config) {
    var userInput = document.getElementById('login-user');
    if (userInput) userInput.value = config.username;
  }
});
