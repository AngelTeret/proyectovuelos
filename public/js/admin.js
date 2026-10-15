const tablaVuelos = document.getElementById('tabla-vuelos');
const formVuelo = document.getElementById('form-vuelo');
const sesion = App.obtenerSesion();

const cargarVuelos = async () => {
  if (!tablaVuelos) {
    return;
  }

  tablaVuelos.innerHTML = '<tr><td colspan="5">Cargando vuelos...</td></tr>';

  try {
    const respuesta = await fetch('/api/vuelos');
    if (!respuesta.ok) {
      throw new Error('No se pudieron cargar los vuelos');
    }

    const vuelos = await respuesta.json();
    if (vuelos.length === 0) {
      tablaVuelos.innerHTML = '<tr><td colspan="5">No hay vuelos registrados.</td></tr>';
      return;
    }

    tablaVuelos.innerHTML = vuelos.map((vuelo) => `
      <tr>
        <td>${App.escaparHtml(vuelo.id)}</td>
        <td>${App.escaparHtml(vuelo.origen)}</td>
        <td>${App.escaparHtml(vuelo.destino)}</td>
        <td>${App.escaparHtml(App.formatearFecha(vuelo.fecha_salida))}</td>
        <td>${App.escaparHtml(vuelo.estado)}</td>
      </tr>
    `).join('');
  } catch (error) {
    tablaVuelos.innerHTML = '<tr><td colspan="5">No se pudieron cargar los vuelos.</td></tr>';
  }
};

if (formVuelo && sesion?.usuario.rol === 'admin') {
  formVuelo.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const boton = formVuelo.querySelector('button[type="submit"]');
    const fechaLocal = document.getElementById('fecha-salida').value;
    const fechaSalida = fechaLocal.length === 16 ? `${fechaLocal.replace('T', ' ')}:00` : fechaLocal;
    boton.disabled = true;

    try {
      const respuesta = await fetch('/api/vuelos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origen: document.getElementById('origen').value.trim(),
          destino: document.getElementById('destino').value.trim(),
          fecha_salida: fechaSalida,
          estado: 'Programado',
        }),
      });

      if (respuesta.status !== 201) {
        alert('No se pudo crear el vuelo.');
        return;
      }

      alert('Vuelo creado exitosamente');
      formVuelo.reset();
      await cargarVuelos();
    } catch (error) {
      alert('No se pudo crear el vuelo.');
    } finally {
      boton.disabled = false;
    }
  });

  cargarVuelos();
}
