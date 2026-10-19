const mostrar = (id) => {
  document.getElementById('estado-carga').classList.add('hidden');
  document.getElementById(id).classList.remove('hidden');
};

const metodoTexto = (metodo) => (metodo === 'saldo' ? 'Billetera' : 'Tarjeta');

const pintarConfirmacion = (boleto) => {
  document.getElementById('pnr').textContent = boleto.codigo_pnr || '';
  document.getElementById('pasajero').textContent = `${boleto.nombre || ''} ${boleto.apellido || ''}`.trim();
  document.getElementById('documento').textContent = boleto.documento_identidad || '';
  document.getElementById('origen').textContent = boleto.origen || '';
  document.getElementById('destino').textContent = boleto.destino || '';
  document.getElementById('salida').textContent = formatearSalida(boleto.fecha_salida);
  document.getElementById('asiento').textContent = boleto.numero_asiento || '';
  document.getElementById('total').textContent = quetzales(boleto.monto_total);
  document.getElementById('pago').textContent = metodoTexto(boleto.metodo_pago);
  document.getElementById('compra').textContent = `Comprado el ${formatearSalida(boleto.fecha_creacion)}`;
  document.getElementById('btn-boleto').addEventListener('click', (evento) => {
    descargarBoleto(boleto.id, evento.currentTarget);
  });
  mostrar('panel-confirmacion');
};

const cargarConfirmacion = async () => {
  const reservaId = sessionStorage.getItem('reservaConfirmada');
  if (!reservaId) {
    window.location.replace('/mis-vuelos.html');
    return;
  }

  try {
    const respuesta = await fetch(`/api/reservas/${reservaId}/comprobante`, {
      headers: autorizacion(),
    });
    if (respuesta.status === 401) {
      localStorage.setItem('redirectAfterLogin', '/confirmacion.html');
      window.location.href = '/login.html';
      return;
    }
    const data = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      document.getElementById('mensaje-error').textContent = data.mensaje || 'No se pudo mostrar el comprobante.';
      mostrar('error-confirmacion');
      return;
    }
    pintarConfirmacion(data);
  } catch (error) {
    mostrar('error-confirmacion');
  }
};

cargarConfirmacion();
