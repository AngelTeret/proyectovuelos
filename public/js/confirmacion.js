const mostrar = (id) => {
  document.getElementById('estado-carga').classList.add('hidden');
  document.getElementById(id).classList.remove('hidden');
};

const metodoTexto = (metodo) => (metodo === 'saldo' ? 'Billetera' : 'Tarjeta');

const titulosTipo = { adulto: 'Adulto', nino: 'Niño', infante: 'Infante' };

const viajerosDe = (boleto) => {
  if (Array.isArray(boleto.viajeros) && boleto.viajeros.length) {
    return boleto.viajeros;
  }
  return [{
    nombre: boleto.nombre,
    apellido: boleto.apellido,
    documento_identidad: boleto.documento_identidad,
    numero_asiento: boleto.numero_asiento,
    tipo: 'adulto',
  }];
};

const datoPasajero = (etiqueta, texto) => {
  if (!texto) {
    return '';
  }
  return `<div><dt class="text-xs font-medium uppercase tracking-wide text-slate-400">${etiqueta}</dt><dd class="mt-0.5 font-medium text-slate-800">${escapar(texto)}</dd></div>`;
};

const pintarPasajeros = (viajeros) => {
  document.getElementById('titulo-pasajeros').textContent = viajeros.length > 1 ? 'Pasajeros' : 'Pasajero';
  document.getElementById('lista-pasajeros').innerHTML = viajeros.map((viajero) => {
    const nombre = `${viajero.nombre || ''} ${viajero.apellido || ''}`.trim();
    const asiento = viajero.numero_asiento || 'Regazo';
    const tipo = titulosTipo[viajero.tipo] || 'Pasajero';
    const nacimiento = viajero.fecha_nacimiento ? formatearDia(viajero.fecha_nacimiento) : '';
    return `
      <article class="rounded-xl bg-slate-50 px-4 py-3">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="font-semibold text-slate-900">${escapar(nombre)}</p>
            <p class="mt-0.5 text-sm text-slate-500">${escapar(tipo)}</p>
          </div>
          <p class="shrink-0 rounded-full bg-white px-2.5 py-1 text-sm font-semibold text-slate-800">${escapar(asiento)}</p>
        </div>
        <dl class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          ${datoPasajero('Documento', viajero.documento_identidad)}
          ${datoPasajero('Nacionalidad', viajero.nacionalidad)}
          ${datoPasajero('Nacimiento', nacimiento)}
        </dl>
      </article>`;
  }).join('');
};

const pintarConfirmacion = (boleto) => {
  const viajeros = viajerosDe(boleto);
  const asientos = viajeros.map((viajero) => viajero.numero_asiento).filter(Boolean);
  document.getElementById('pnr').textContent = boleto.codigo_pnr || '';
  document.getElementById('factura').textContent = boleto.numero_factura || '';
  document.getElementById('origen').textContent = boleto.origen || '';
  document.getElementById('destino').textContent = boleto.destino || '';
  document.getElementById('salida').textContent = formatearSalida(boleto.fecha_salida);
  document.getElementById('etiqueta-asiento').textContent = asientos.length > 1 ? 'Asientos' : 'Asiento';
  document.getElementById('asiento').textContent = asientos.join(', ') || boleto.numero_asiento || 'Regazo';
  document.getElementById('total').textContent = quetzales(boleto.monto_total);
  document.getElementById('pago').textContent = metodoTexto(boleto.metodo_pago);
  document.getElementById('compra').textContent = `Comprado el ${formatearSalida(boleto.fecha_creacion)}`;
  const correoEnviado = sessionStorage.getItem('correoEnviado');
  const avisoCorreo = document.getElementById('aviso-correo');
  if (correoEnviado === '1' && boleto.email) {
    avisoCorreo.textContent = `Enviamos la factura a ${boleto.email}.`;
  } else if (correoEnviado === '0' && boleto.email) {
    avisoCorreo.textContent = `La reserva quedó confirmada, pero no pudimos enviar la factura a ${boleto.email}. Puedes descargarla.`;
  } else if (correoEnviado === '0') {
    avisoCorreo.textContent = 'La reserva quedó confirmada, pero no pudimos enviar la factura. Puedes descargarla.';
  } else if (boleto.email) {
    avisoCorreo.textContent = `La factura corresponde al correo ${boleto.email}.`;
  } else {
    avisoCorreo.textContent = 'Puedes descargar la factura de tu reserva.';
  }
  pintarPasajeros(viajeros);
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
    const respuesta = await fetch(`/api/reservas/${reservaId}/factura`, {
      headers: autorizacion(),
    });
    if (respuesta.status === 401) {
      localStorage.setItem('redirectAfterLogin', '/confirmacion.html');
      window.location.replace('/login.html');
      return;
    }
    const data = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      document.getElementById('mensaje-error').textContent = data.mensaje || 'No se pudo mostrar la factura.';
      mostrar('error-confirmacion');
      return;
    }
    pintarConfirmacion(data);
  } catch (error) {
    mostrar('error-confirmacion');
  }
};

cargarConfirmacion();
