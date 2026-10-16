const nombreDeSesion = () => {
  const guardado = localStorage.getItem('nombre');
  if (guardado) {
    return guardado;
  }

  const token = localStorage.getItem('token');
  if (!token) {
    return '';
  }

  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const datos = JSON.parse(atob(base64));
    return datos.nombre || '';
  } catch (error) {
    return '';
  }
};

const nombreUsuario = document.getElementById('nombre-usuario');
if (nombreUsuario) {
  nombreUsuario.textContent = nombreDeSesion();
}

const iniciarSesion = document.getElementById('btn-iniciar-sesion');
const cerrarSesion = document.getElementById('btn-cerrar-sesion');
if (iniciarSesion && cerrarSesion) {
  const autenticado = Boolean(localStorage.getItem('token'));
  iniciarSesion.classList.toggle('hidden', autenticado);
  cerrarSesion.classList.toggle('hidden', !autenticado);
}
