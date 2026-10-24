const valor = (id) => document.getElementById(id).value.trim();

document.getElementById('btnVolver').addEventListener('click', (evento) => {
  evento.preventDefault();
  window.location.href = '/';
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

  guardarJsonTemporal('datosPasajeros', pasajero);
  window.location.href = '/asientos';
});
