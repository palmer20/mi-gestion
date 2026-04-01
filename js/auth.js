// ============================================================
//  js/auth.js — Autenticación (login / logout)
// ============================================================

// Hash simple (no texto plano en código)
function _hash(s) {
  var h = 0;
  for (var i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  }
  return h.toString(36);
}

var USUARIOS = {
  'admin':    _hash('1234'),
  'vendedor': _hash('0000')
};

function hacerLogin() {
  var u = (document.getElementById('login-user').value || '').trim().toLowerCase();
  var p =  document.getElementById('login-pass').value || '';
  if (USUARIOS[u] && USUARIOS[u] === _hash(p)) {
    localStorage.setItem('xs_user', u);
    mostrarApp(u);
  } else {
    document.getElementById('login-error').textContent = 'Usuario o contraseña incorrectos';
  }
}

function mostrarApp(u) {
  document.getElementById('login-screen').style.display  = 'none';
  document.getElementById('top-bar').style.display       = 'flex';
  document.getElementById('main-wrap').style.display     = 'flex';
  document.getElementById('usuario-badge').textContent   = '👤 ' + u;
  inicializar();
}

function cerrarSesion() {
  localStorage.removeItem('xs_user');
  location.reload();
}

window.addEventListener('DOMContentLoaded', function () {
  var u = localStorage.getItem('xs_user');
  if (u && USUARIOS[u] !== undefined) mostrarApp(u);
});
