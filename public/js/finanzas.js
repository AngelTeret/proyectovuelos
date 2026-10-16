if (!localStorage.getItem('token')) {
  window.location.href = '/login.html';
} else if (localStorage.getItem('rol') !== 'admin') {
  window.location.href = '/index.html';
}

const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const escapar = (texto) => String(texto ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const formatearPrecio = (monto) => `Q ${Number(monto).toFixed(2)}`;

const formatearFecha = (valor) => {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    return '';
  }
  const dosDigitos = (numero) => String(numero).padStart(2, '0');
  return `${fecha.getDate()} ${meses[fecha.getMonth()]} ${fecha.getFullYear()}, ${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
};

const pintarReservas = (reservas) => {
  const total = reservas.reduce((suma, reserva) => suma + Number(reserva.total_pagado || 0), 0);
  document.getElementById('total-ingresos').textContent = formatearPrecio(total);

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
      <td class="px-5 py-4 font-medium text-slate-900">${escapar(formatearPrecio(reserva.total_pagado))}</td>
    </tr>
  `).join('');
};

const cargarReservas = async () => {
  const cuerpo = document.getElementById('cuerpo-reservas');
  try {
    const respuesta = await fetch('/api/reservas');
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
  if (!localStorage.getItem('token') || localStorage.getItem('rol') !== 'admin') {
    return;
  }

  document.getElementById('btn-cerrar-sesion').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('rol');
    localStorage.removeItem('nombre');
    localStorage.removeItem('usuario_id');
    window.location.href = '/login.html';
  });
  cargarReservas();
});
