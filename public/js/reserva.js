const inputPnr = document.getElementById('pnr');
const botonBuscar = document.getElementById('buscar');
const resultado = document.getElementById('resultado');
let reservaId = null;

const sesion = App.obtenerSesion();
if (!inputPnr || !sesion) {
  // La consulta exige una sesión activa.
} else {
  const mostrarAlerta = (mensaje) => {
    reservaId = null;
    resultado.innerHTML = `
      <div class="alert alert-danger" role="alert">${App.escaparHtml(mensaje)}</div>
    `;
  };

  const htmlEstadoPago = (estadoPago) => {
    if (estadoPago === 'pendiente') {
      return `
        <span class="badge text-bg-warning">Pendiente</span>
        <button id="pagar" class="btn btn-success mt-3" type="button">Simular Pago de Reserva</button>
      `;
    }

    if (estadoPago === 'aprobado') {
      return '<span class="badge text-bg-success">Pagado</span>';
    }

    return `<span class="badge text-bg-light">${App.escaparHtml(estadoPago)}</span>`;
  };

  const mostrarPase = (reserva) => {
    const pasajero = `${reserva.nombre} ${reserva.apellido}`;
    resultado.innerHTML = `
      <article class="card boarding-pass">
        <div class="row g-0">
          <div class="col-md-8">
            <div class="card-body p-4">
              <p class="text-uppercase text-secondary small mb-1">Boarding Pass</p>
              <h2 class="pnr display-6 mb-4">${App.escaparHtml(reserva.codigo_pnr)}</h2>
              <p class="mb-1 text-secondary small">Pasajero</p>
              <p class="fs-5 fw-semibold mb-4">${App.escaparHtml(pasajero)}</p>
              <div class="d-flex justify-content-between align-items-center route">
                <div>
                  <p class="mb-1 text-secondary small">Origen</p>
                  <p class="fs-4 fw-bold mb-0">${App.escaparHtml(reserva.origen)}</p>
                </div>
                <span class="text-primary fs-3" aria-hidden="true">→</span>
                <div class="text-end">
                  <p class="mb-1 text-secondary small">Destino</p>
                  <p class="fs-4 fw-bold mb-0">${App.escaparHtml(reserva.destino)}</p>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-4 boarding-stub d-flex flex-column justify-content-center p-4">
            <p class="small text-uppercase mb-1">Asiento</p>
            <p class="display-6 fw-bold mb-4">${App.escaparHtml(reserva.numero_asiento)}</p>
            <p class="small text-uppercase mb-1">Estado de pago</p>
            ${htmlEstadoPago(reserva.estado_pago)}
          </div>
        </div>
      </article>
    `;

    document.getElementById('pagar')?.addEventListener('click', simularPago);
  };

  const buscarReserva = async () => {
    const pnr = inputPnr.value.trim().toUpperCase();

    if (!pnr) {
      mostrarAlerta('Ingresa un código PNR.');
      return;
    }

    botonBuscar.disabled = true;

    try {
      const respuesta = await fetch(`/api/reservas/pnr/${encodeURIComponent(pnr)}`);

      if (respuesta.status === 404) {
        mostrarAlerta('La reserva no existe.');
        return;
      }

      if (!respuesta.ok) {
        mostrarAlerta('No se pudo consultar la reserva.');
        return;
      }

      const reserva = await respuesta.json();
      reservaId = reserva.id;
      mostrarPase(reserva);
    } catch (error) {
      mostrarAlerta('No se pudo consultar la reserva.');
    } finally {
      botonBuscar.disabled = false;
    }
  };

  const simularPago = async () => {
    const botonPagar = document.getElementById('pagar');
    if (!reservaId || !botonPagar) {
      return;
    }

    botonPagar.disabled = true;

    try {
      const respuesta = await fetch(`/api/reservas/${reservaId}/pago`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado_pago: 'aprobado' }),
      });

      if (!respuesta.ok) {
        mostrarAlerta('No se pudo registrar el pago.');
        return;
      }

      const datos = await respuesta.json();
      const sesionActual = App.obtenerSesion();
      if (sesionActual) {
        App.guardarSesion(sesionActual.token, {
          ...sesionActual.usuario,
          saldo_virtual: datos.saldo_virtual,
        });
        const badge = document.getElementById('saldo-usuario');
        if (badge) {
          badge.textContent = `Saldo: $${App.formatearSaldo(datos.saldo_virtual)}`;
        }
      }

      alert('Pago aprobado');
      await buscarReserva();
    } catch (error) {
      mostrarAlerta('No se pudo registrar el pago.');
    }
  };

  botonBuscar.addEventListener('click', buscarReserva);

  const pnrInicial = new URLSearchParams(window.location.search).get('pnr');
  if (pnrInicial) {
    inputPnr.value = pnrInicial.toUpperCase();
    buscarReserva();
  }
}
