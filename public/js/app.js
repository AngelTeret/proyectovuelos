const CLAVE_TOKEN = 'token';
const CLAVE_USUARIO = 'usuario';

const escaparHtml = (valor) => String(valor ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const formatearFecha = (fecha) => new Date(fecha).toLocaleString('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const formatearSaldo = (saldo) => {
  const numero = Number(saldo);
  return Number.isFinite(numero) ? numero.toFixed(2) : '0.00';
};

const obtenerSesion = () => {
  const token = localStorage.getItem(CLAVE_TOKEN);
  const crudo = localStorage.getItem(CLAVE_USUARIO);
  if (!token || !crudo) {
    return null;
  }

  try {
    return { token, usuario: JSON.parse(crudo) };
  } catch (error) {
    localStorage.removeItem(CLAVE_TOKEN);
    localStorage.removeItem(CLAVE_USUARIO);
    return null;
  }
};

const guardarSesion = (token, usuario) => {
  localStorage.setItem(CLAVE_TOKEN, token);
  localStorage.setItem(CLAVE_USUARIO, JSON.stringify({
    id: usuario.id,
    nombre: usuario.nombre,
    rol: usuario.rol,
    saldo: usuario.saldo_virtual ?? usuario.saldo,
  }));
};

const paginaDeRol = (rol) => (rol === 'admin' ? 'admin.html' : 'cliente.html');

const cerrarSesion = () => {
  localStorage.removeItem(CLAVE_TOKEN);
  localStorage.removeItem(CLAVE_USUARIO);
  window.location.replace('login.html');
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
