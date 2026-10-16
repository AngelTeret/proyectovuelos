if (localStorage.getItem('rol') !== 'admin') {
  document.querySelectorAll('.solo-admin').forEach((enlace) => enlace.remove());
}

document.getElementById('btn-cerrar-sesion').addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('rol');
  localStorage.removeItem('nombre');
  localStorage.removeItem('usuario_id');
  window.location.href = '/login.html';
});

const valor = (id) => document.getElementById(id).value.trim();

document.getElementById('btnVolver').addEventListener('click', (evento) => {
  evento.preventDefault();
  window.location.href = '/index.html';
});

document.getElementById('btnContinuar').addEventListener('click', (evento) => {
  evento.preventDefault();

  const pasajero = {
    nombre: valor('nombre'),
    apellido: valor('apellido'),
    fecha: valor('fecha'),
    tipoDocumento: valor('tipoDocumento'),
    numeroDocumento: valor('numeroDocumento'),
    nacionalidad: valor('nacionalidad'),
    email: valor('email'),
    telefono: valor('telefono'),
  };

  localStorage.setItem('datosPasajeros', JSON.stringify(pasajero));
  window.location.href = '/asientos.html';
});
