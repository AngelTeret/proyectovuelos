if (!tokenDeSesion()) {
  window.location.replace('/login');
} else if (rolDeSesion() !== 'admin') {
  window.location.replace('/');
}

let reservasCargadas = [];

const pintarReservas = (reservas, buscando = false) => {
  const total = reservasCargadas.reduce((suma, reserva) => suma + Number(reserva.total_pagado || 0), 0);
  document.getElementById('total-ingresos').textContent = quetzales(total);
  const nota = document.getElementById('conteo-reservas');
  const consulta = document.getElementById('buscar-reserva').value.trim();
  nota.textContent = consulta ? `${reservas.length} de ${reservasCargadas.length} reservas` : '';
  nota.classList.toggle('hidden', !consulta);

  const cuerpo = document.getElementById('cuerpo-reservas');
  if (reservas.length === 0) {
    const mensaje = buscando ? 'No hay reservas con ese dato.' : 'No hay reservas registradas.';
    cuerpo.innerHTML = `<tr><td colspan="6" class="px-5 py-8 text-center text-sm text-slate-500">${mensaje}</td></tr>`;
    return;
  }

  cuerpo.innerHTML = reservas.map((reserva) => `
    <tr class="hover:bg-slate-50">
      <td data-etiqueta="PNR" class="px-5 py-4 font-medium text-slate-900">${escapar(reserva.codigo_pnr)}</td>
      <td data-etiqueta="Cliente" class="px-5 py-4">${escapar(reserva.nombre_cliente)}</td>
      <td data-etiqueta="Ruta" class="px-5 py-4">${escapar(reserva.origen)} → ${escapar(reserva.destino)}</td>
      <td data-etiqueta="Asiento" class="px-5 py-4">${escapar(reserva.numero_asiento)}</td>
      <td data-etiqueta="Compra" class="px-5 py-4">${escapar(formatearFecha(reserva.fecha_creacion))}</td>
      <td data-etiqueta="Total" class="px-5 py-4 font-medium text-slate-900">${escapar(quetzales(reserva.total_pagado))}</td>
    </tr>
  `).join('');
};

const cargarReservas = async () => {
  const cuerpo = document.getElementById('cuerpo-reservas');
  try {
    const respuesta = await fetch('/api/reservas', { headers: autorizacion() });
    if (await cerrarSiSesionRechazada(respuesta, '/finanzas')) {
      return;
    }
    if (!respuesta.ok) {
      throw new Error('No se pudieron cargar las reservas');
    }
    reservasCargadas = await respuesta.json();
    aplicarBusquedaReservas();
  } catch (error) {
    document.getElementById('total-ingresos').textContent = 'Q 0.00';
    cuerpo.innerHTML = '<tr><td colspan="6" class="px-5 py-8 text-center text-sm text-red-600">No se pudieron cargar las reservas.</td></tr>';
  }
};

const aplicarBusquedaReservas = () => {
  const consulta = sinAcentos(document.getElementById('buscar-reserva').value.trim());
  const visibles = consulta
    ? reservasCargadas.filter((reserva) => sinAcentos(`${reserva.codigo_pnr} ${reserva.nombre_cliente} ${reserva.origen} ${reserva.destino}`).includes(consulta))
    : reservasCargadas;
  pintarReservas(visibles, Boolean(consulta));
};

document.addEventListener('DOMContentLoaded', () => {
  if (!tokenDeSesion() || rolDeSesion() !== 'admin') {
    return;
  }

  document.getElementById('buscar-reserva').addEventListener('input', aplicarBusquedaReservas);
  cargarReservas();
});
