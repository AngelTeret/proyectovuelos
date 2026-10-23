if (!tokenDeSesion()) {
  localStorage.setItem('redirectAfterLogin', window.location.pathname);
  window.location.replace('/login.html');
} else {

olvidarCopiasDurables();

const metodoSeleccionado = () => document.querySelector('input[name="metodo_pago"]:checked')?.value || 'saldo';

const mostrarFormularioTarjeta = () => {
  document.getElementById('formulario-tarjeta').classList.toggle('hidden', metodoSeleccionado() !== 'tarjeta');
};

const cargarSaldo = async () => {
  const saldo = document.getElementById('saldo-disponible');
  const token = tokenDeSesion();
  if (!token) {
    saldo.textContent = '0.00';
    return;
  }

  try {
    const respuesta = await fetch('/api/auth/perfil', {
      headers: autorizacion(),
    });
    if (!respuesta.ok) {
      saldo.textContent = '0.00';
      return;
    }
    const usuario = await respuesta.json();
    saldo.textContent = Number(usuario.saldo_virtual || 0).toFixed(2);
    if (usuario.id) {
      guardarIdUsuario(usuario.id);
    }
  } catch (error) {
    saldo.textContent = '0.00';
  }
};

const mostrarTotal = async () => {
  const busqueda = leerJson('busquedaVuelo');
  let precio = Number(busqueda.precio_base);
  if (!precio && busqueda.vuelo_id) {
    const respuesta = await fetch('/api/vuelos');
    if (respuesta.ok) {
      const vuelos = await respuesta.json();
      const vuelo = vuelos.find((item) => Number(item.id) === Number(busqueda.vuelo_id));
      precio = Number(vuelo?.precio_base) || 0;
    }
  }
  const tarifa = precio || 0;
  const guardados = leerJsonTemporal('datosAsientos');
  const asientos = Array.isArray(guardados) && guardados.length ? guardados : [leerJsonTemporal('datosAsiento')];
  const cargo = asientos.reduce((suma, asiento) => suma + (Number(asiento.precioAdicional) || 0), 0);
  const etiqueta = document.querySelector('#precio-vuelo')?.previousElementSibling;
  if (etiqueta) {
    etiqueta.textContent = asientos.length > 1 ? `Tarifa del vuelo × ${asientos.length}` : 'Tarifa del vuelo';
  }
  document.getElementById('precio-vuelo').textContent = quetzales(tarifa * asientos.length);
  document.getElementById('etiqueta-asiento').textContent = asientos.length > 1
    ? `Asientos ${asientos.map((asiento) => asiento.codigo).filter(Boolean).join(', ')}`
    : (asientos[0]?.categoria ? `Asiento ${asientos[0].categoria}` : 'Asiento');
  document.getElementById('cargo-asiento').textContent = quetzales(cargo);
  document.getElementById('total-pagar').textContent = quetzales(tarifa * asientos.length + cargo);
};

let relojBloqueo = null;
let bloqueoTerminado = false;

const textoTiempo = (segundos) => {
  const restante = Math.max(0, segundos);
  const minutos = String(Math.floor(restante / 60)).padStart(2, '0');
  const segs = String(restante % 60).padStart(2, '0');
  const guardados = leerJsonTemporal('datosAsientos');
  const varios = Array.isArray(guardados) && guardados.length > 1;
  if (varios) {
    return `Asientos reservados por ${minutos}:${segs}. Si el tiempo termina, vuelven a quedar libres.`;
  }
  return `Asiento reservado por ${minutos}:${segs}. Si el tiempo termina, vuelve a quedar libre.`;
};

const liberarPantalla = async () => {
  if (bloqueoTerminado) {
    return;
  }
  bloqueoTerminado = true;
  if (relojBloqueo) {
    clearInterval(relojBloqueo);
  }
  const pagar = document.getElementById('btnPagar');
  if (pagar) {
    pagar.disabled = true;
  }
  await Swal.fire({
    icon: 'warning',
    title: 'Asiento liberado',
    text: 'El tiempo para completar el pago terminó. Vuelve a elegir un asiento.',
  });
  borrarTemporal('datosAsiento');
  borrarTemporal('datosAsientos');
  window.location.replace('/asientos.html');
};

const iniciarReloj = async () => {
  const asiento = leerJsonTemporal('datosAsiento');
  const llave = leerTextoTemporal('bloqueoLlave');
  if (!asiento.asientoId || !llave) {
    window.location.replace('/asientos.html');
    return;
  }

  const respuesta = await fetch(`/api/asientos/${asiento.asientoId}/bloqueo`, {
    headers: { 'x-bloqueo-llave': llave },
  });
  if (!respuesta.ok) {
    await liberarPantalla();
    return;
  }

  const data = await respuesta.json();
  let segundos = Number(data.segundos) || 0;
  const aviso = document.getElementById('tiempo-bloqueo');
  const pintar = () => {
    aviso.textContent = textoTiempo(segundos);
    aviso.classList.remove('hidden');
  };
  pintar();
  relojBloqueo = setInterval(() => {
    segundos -= 1;
    if (segundos <= 0) {
      liberarPantalla();
      return;
    }
    pintar();
  }, 1000);
};

document.addEventListener('DOMContentLoaded', () => {
  mostrarFormularioTarjeta();
  cargarSaldo();
  mostrarTotal();
  iniciarReloj();

  document.querySelectorAll('input[name="metodo_pago"]').forEach((radio) => {
    radio.addEventListener('change', mostrarFormularioTarjeta);
  });

  document.getElementById('btnVolver').addEventListener('click', async (evento) => {
    evento.preventDefault();
    if (document.getElementById('btnPagar').disabled) {
      return;
    }

    const enlace = evento.currentTarget;
    enlace.classList.add('pointer-events-none', 'opacity-70');
    const asiento = leerJsonTemporal('datosAsiento');
    const busqueda = leerJson('busquedaVuelo');
    const llave = leerTextoTemporal('bloqueoLlave');

    try {
      const guardados = leerJsonTemporal('datosAsientos');
      const hayAsientos = asiento.asientoId || (Array.isArray(guardados) && guardados.length);
      if (llave && hayAsientos) {
        const respuesta = await fetch('/api/asientos/liberar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-bloqueo-llave': llave,
          },
          body: JSON.stringify({
            vuelo_id: Number(busqueda.vuelo_id),
            llave,
            todos: true,
          }),
        });
        const data = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) {
          Swal.fire({ icon: 'error', title: 'Oops...', text: data.mensaje || 'No se pudo liberar el asiento' });
          return;
        }
      }

      if (relojBloqueo) {
        clearInterval(relojBloqueo);
      }
      borrarTemporal('datosAsiento');
      borrarTemporal('datosAsientos');
      window.location.replace('/asientos.html');
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Oops...', text: 'No se pudo liberar el asiento' });
    } finally {
      if (document.body) {
        enlace.classList.remove('pointer-events-none', 'opacity-70');
      }
    }
  });

  const botonPagar = document.getElementById('btnPagar');
  const textoPagar = botonPagar.textContent;

  const marcarProcesando = () => {
    botonPagar.disabled = true;
    botonPagar.textContent = 'Procesando pago...';
    botonPagar.classList.add('cursor-not-allowed', 'opacity-70');
  };

  const restaurarPagar = () => {
    if (bloqueoTerminado) {
      return;
    }
    botonPagar.disabled = false;
    botonPagar.textContent = textoPagar;
    botonPagar.classList.remove('cursor-not-allowed', 'opacity-70');
  };

  document.getElementById('form-pago').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (botonPagar.disabled) {
      return;
    }

    const busqueda = leerJson('busquedaVuelo');
    const pasajero = leerJsonTemporal('datosPasajeros');
    const asiento = leerJsonTemporal('datosAsiento');
    const guardados = leerJsonTemporal('datosAsientos');
    const asientosElegidos = Array.isArray(guardados) && guardados.length ? guardados : (asiento.asientoId ? [asiento] : []);
    const metodo = metodoSeleccionado();

    if (!asientosElegidos.length || !Array.isArray(pasajero.viajeros) || !pasajero.viajeros.length) {
      Swal.fire({ icon: 'warning', title: 'Faltan datos', text: 'Por favor completa todos los campos' });
      return;
    }

    marcarProcesando();
    let pagoConfirmado = false;
    const idempotencyKey = crypto.randomUUID();
    const payload = {
      email: pasajero.email,
      telefono: pasajero.telefono,
      equipaje_extra_kg: 0,
      costo_servicios_extra: 0,
      vuelo_id: Number(busqueda.vuelo_id),
      asiento_id: Number(asientosElegidos[0].asientoId),
      viajeros: pasajero.viajeros,
      asientos: asientosElegidos.map((item) => Number(item.asientoId)),
      metodo_pago: metodo,
      bloqueo_llave: leerTextoTemporal('bloqueoLlave'),
    };

    try {
      const respuesta = await fetch('/api/reservas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'idempotency-key': idempotencyKey,
          ...autorizacion(),
        },
        body: JSON.stringify(payload),
      });
      const data = await respuesta.json();

      if (respuesta.status === 201) {
        pagoConfirmado = true;
        if (relojBloqueo) {
          clearInterval(relojBloqueo);
        }
        localStorage.removeItem('busquedaVuelo');
        borrarTemporal('datosPasajeros');
        borrarTemporal('datosAsiento');
        borrarTemporal('datosAsientos');
        borrarTemporal('tempPasajero');
        borrarTemporal('bloqueoLlave');
        if (data.id) {
          sessionStorage.setItem('reservaConfirmada', String(data.id));
          sessionStorage.setItem('correoEnviado', data.correo_enviado ? '1' : '0');
          window.location.replace('/confirmacion.html');
          return;
        }
        window.location.replace('/mis-vuelos.html');
        return;
      }

      if (respuesta.status === 400 && metodo === 'saldo' && /saldo insuficiente/i.test(data.mensaje || '')) {
        Swal.fire({
          icon: 'error',
          title: 'Saldo insuficiente',
          text: 'Tu saldo virtual no es suficiente para cubrir esta tarifa. Por favor, usa una tarjeta de crédito.',
        });
        return;
      }

      if (/ya no se puede comprar|ya salió/i.test(data.mensaje || '')) {
        pagoConfirmado = true;
        abandonarReserva();
        localStorage.removeItem('busquedaVuelo');
        Swal.fire({
          icon: 'warning',
          title: 'Este vuelo ya no se puede comprar',
          text: data.mensaje,
        }).then(() => {
          window.location.replace('/index.html');
        });
        return;
      }

      if (/tiempo para completar el pago|ya no está disponible/i.test(data.mensaje || '')) {
        pagoConfirmado = true;
        Swal.fire({ icon: 'error', title: 'Oops...', text: data.mensaje }).then(() => {
          borrarTemporal('datosAsiento');
          borrarTemporal('datosAsientos');
          window.location.replace('/asientos.html');
        });
        return;
      }

      Swal.fire({ icon: 'error', title: 'Oops...', text: data.mensaje || data.error || 'No se pudo confirmar la reserva' });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Oops...', text: error.message });
    } finally {
      if (!pagoConfirmado) {
        restaurarPagar();
      }
    }
  });
});
}
