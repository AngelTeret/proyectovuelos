const CLAVE_TOKEN = 'token';
const CLAVE_USUARIO = 'usuario';

const escaparHtml = (valor) => String(valor ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const formatearFecha = (fecha) => new Date(fecha).toLocaleString('es-GT', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Guatemala',
});

const formatearSaldo = (saldo) => {
  const numero = Number(saldo);
  return Number.isFinite(numero) ? numero.toFixed(2) : '0.00';
};

const obtenerSesion = () => {
  localStorage.removeItem(CLAVE_TOKEN);
  localStorage.removeItem(CLAVE_USUARIO);
  const token = sessionStorage.getItem(CLAVE_TOKEN);
  const crudo = sessionStorage.getItem(CLAVE_USUARIO);
  if (!token || !crudo) {
    return null;
  }

  try {
    return { token, usuario: JSON.parse(crudo) };
  } catch (error) {
    sessionStorage.removeItem(CLAVE_TOKEN);
    sessionStorage.removeItem(CLAVE_USUARIO);
    return null;
  }
};

const guardarSesion = (token, usuario) => {
  sessionStorage.setItem(CLAVE_TOKEN, token);
  sessionStorage.setItem(CLAVE_USUARIO, JSON.stringify({
    id: usuario.id,
    nombre: usuario.nombre,
    rol: usuario.rol,
    saldo: usuario.saldo_virtual ?? usuario.saldo,
  }));
  localStorage.removeItem(CLAVE_TOKEN);
  localStorage.removeItem(CLAVE_USUARIO);
  sessionStorage.setItem('sesionActiva', String(Date.now()));
};

const paginaDeRol = (rol) => {
  if (rol === 'admin') {
    return 'administracion.html';
  }
  if (rol === 'despacho') {
    return 'abordaje.html';
  }
  if (rol === 'mantenimiento') {
    return 'mantenimiento.html';
  }
  return 'cliente.html';
};

const cerrarSesion = () => {
  ['tempPasajero', 'datosPasajeros', 'datosAsientos', 'datosAsiento', 'bloqueoLlave', 'redirectAfterLogin', 'reservaConfirmada', 'correoEnviado', 'usuario_id', 'rol', 'nombre'].forEach((clave) => {
    localStorage.removeItem(clave);
    sessionStorage.removeItem(clave);
  });
  localStorage.removeItem(CLAVE_TOKEN);
  localStorage.removeItem(CLAVE_USUARIO);
  sessionStorage.removeItem(CLAVE_TOKEN);
  sessionStorage.removeItem(CLAVE_USUARIO);
  sessionStorage.removeItem('sesionActiva');
  window.location.replace('/index.html');
};

const pintarNavbar = (sesion) => {
  const barra = document.getElementById('barra-sesion');
  const nombre = document.getElementById('nombre-usuario');
  const saldo = document.getElementById('saldo-usuario');
  if (!barra || !nombre || !saldo) {
    return;
  }

  barra.classList.remove('d-none');
  barra.classList.add('d-flex');
  nombre.textContent = sesion.usuario.nombre;
  saldo.textContent = `Saldo: $${formatearSaldo(sesion.usuario.saldo)}`;

  const esAdmin = sesion.usuario.rol === 'admin';
  document.getElementById('item-comprar')?.classList.toggle('d-none', esAdmin);
  document.getElementById('item-admin')?.classList.toggle('d-none', !esAdmin);

  const pagina = document.body.dataset.pagina;
  document.querySelector(`[data-nav="${pagina}"]`)?.classList.add('active');
};

const proteger = () => {
  const pagina = document.body.dataset.pagina;
  const sesion = obtenerSesion();

  if (pagina === 'inicio') {
    window.location.replace(sesion ? paginaDeRol(sesion.usuario.rol) : 'login.html');
    return false;
  }

  if (pagina === 'login') {
    if (sesion) {
      window.location.replace(paginaDeRol(sesion.usuario.rol));
      return false;
    }
    return true;
  }

  if (!sesion) {
    window.location.replace('login.html');
    return false;
  }

  if (pagina === 'cliente' && sesion.usuario.rol === 'admin') {
    window.location.replace('admin.html');
    return false;
  }

  if (pagina === 'admin' && sesion.usuario.rol !== 'admin') {
    window.location.replace('cliente.html');
    return false;
  }

  pintarNavbar(sesion);
  return true;
};

document.getElementById('cerrar-sesion')?.addEventListener('click', cerrarSesion);

window.App = {
  escaparHtml,
  formatearFecha,
  formatearSaldo,
  obtenerSesion,
  guardarSesion,
  cerrarSesion,
  proteger,
};

proteger();

const minutosInactividad = 15;
window.setInterval(() => {
  if (!sessionStorage.getItem(CLAVE_TOKEN)) {
    return;
  }
  const marca = Number(sessionStorage.getItem('sesionActiva') || 0);
  if (!marca) {
    sessionStorage.setItem('sesionActiva', String(Date.now()));
    return;
  }
  if (Date.now() - marca > minutosInactividad * 60 * 1000) {
    cerrarSesion();
  }
}, 30000);
