if (!tokenDeSesion()) {
  window.location.replace('/login.html');
} else if (rolDeSesion() !== 'admin') {
  window.location.replace('/index.html');
}

const pintarReservas = (reservas) => {
  const total = reservas.reduce((suma, reserva) => suma + Number(reserva.total_pagado || 0), 0);
  document.getElementById('total-ingresos').textContent = quetzales(total);

  const cuerpo = document.getElementById('cuerpo-reservas');
  if (reservas.length === 0) {
    cuerpo.innerHTML = '<tr><td colspan="6" class="px-5 py-8 text-center text-sm text-slate-500">No hay reservas registradas.</td></tr>';
    return;
  }

  cuerpo.innerHTML = reservas.map((reserva) => `
    <tr class="hover:bg-slate-50">
      <td class="px-5 py-4 font-medium text-slate-900">${escapar(reserva.codigo_pnr)}</td>
      <td class="px-5 py-4">${escapar(reserva.nombre_cliente)}</td>
      <td class="px-5 py-4">${escapar(reserva.origen)} → ${escapar(reserva.destino)}</td>
      <td class="px-5 py-4">${escapar(reserva.numero_asiento)}</td>
      <td class="px-5 py-4">${escapar(formatearFecha(reserva.fecha_creacion))}</td>
      <td class="px-5 py-4 font-medium text-slate-900">${escapar(quetzales(reserva.total_pagado))}</td>
    </tr>
  `).join('');
};

const cargarReservas = async () => {
  const cuerpo = document.getElementById('cuerpo-reservas');
  try {
    const respuesta = await fetch('/api/reservas', { headers: autorizacion() });
    if (respuesta.status === 401) {
      window.location.replace('/login.html');
      return;
    }
    if (!respuesta.ok) {
      throw new Error('No se pudieron cargar las reservas');
    }
    const reservas = await respuesta.json();
    pintarReservas(reservas);
  } catch (error) {
    document.getElementById('total-ingresos').textContent = 'Q 0.00';
    cuerpo.innerHTML = '<tr><td colspan="6" class="px-5 py-8 text-center text-sm text-red-600">No se pudieron cargar las reservas.</td></tr>';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (!tokenDeSesion() || rolDeSesion() !== 'admin') {
    return;
  }

  cargarReservas();
});
