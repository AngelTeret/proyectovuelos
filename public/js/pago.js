if (!localStorage.getItem('token')) {
  localStorage.setItem('redirectAfterLogin', window.location.pathname);
  window.location.href = '/login.html';
} else {
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

const leer = (clave) => {
  try {
    return JSON.parse(localStorage.getItem(clave)) || {};
  } catch {
    return {};
  }
};

const quetzales = (monto) => `Q ${Number(monto || 0).toFixed(2)}`;

const metodoSeleccionado = () => document.querySelector('input[name="metodo_pago"]:checked')?.value || 'saldo';

const mostrarFormularioTarjeta = () => {
  document.getElementById('formulario-tarjeta').classList.toggle('hidden', metodoSeleccionado() !== 'tarjeta');
};

const cargarSaldo = async () => {
  const saldo = document.getElementById('saldo-disponible');
  const token = localStorage.getItem('token');
  if (!token) {
    saldo.textContent = '0.00';
    return;
  }

  try {
    const respuesta = await fetch('/api/auth/perfil', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!respuesta.ok) {
      saldo.textContent = '0.00';
      return;
    }
    const usuario = await respuesta.json();
    saldo.textContent = Number(usuario.saldo_virtual || 0).toFixed(2);
    if (usuario.id) {
      localStorage.setItem('usuario_id', String(usuario.id));
    }
  } catch (error) {
    saldo.textContent = '0.00';
  }
};

const mostrarTotal = async () => {
  const busqueda = leer('busquedaVuelo');
  let precio = Number(busqueda.precio_base);
  if (!precio && busqueda.vuelo_id) {
    const respuesta = await fetch('/api/vuelos');
    if (respuesta.ok) {
      const vuelos = await respuesta.json();
      const vuelo = vuelos.find((item) => Number(item.id) === Number(busqueda.vuelo_id));
      precio = Number(vuelo?.precio_base) || 0;
    }
  }
  const total = precio || 0;
  document.getElementById('precio-vuelo').textContent = quetzales(total);
  document.getElementById('total-pagar').textContent = quetzales(total);
};

let relojBloqueo = null;
let bloqueoTerminado = false;

const textoTiempo = (segundos) => {
  const restante = Math.max(0, segundos);
  const minutos = String(Math.floor(restante / 60)).padStart(2, '0');
  const segs = String(restante % 60).padStart(2, '0');
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
  localStorage.removeItem('datosAsiento');
  window.location.href = '/asientos.html';
};

const iniciarReloj = async () => {
  const asiento = leer('datosAsiento');
  const llave = localStorage.getItem('bloqueoLlave');
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

  document.getElementById('btnVolver').addEventListener('click', (evento) => {
    evento.preventDefault();
    window.location.href = '/asientos.html';
  });

  document.getElementById('form-pago').addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const busqueda = leer('busquedaVuelo');
    const pasajero = leer('datosPasajeros');
    const asiento = leer('datosAsiento');
    const metodo = metodoSeleccionado();
    const token = localStorage.getItem('token');

    if (!asiento.asientoId) {
      Swal.fire({ icon: 'warning', title: 'Faltan datos', text: 'Por favor completa todos los campos' });
      return;
    }

    const idempotencyKey = crypto.randomUUID();
    const payload = {
      nombre: pasajero.nombre,
      apellido: pasajero.apellido,
      documento_identidad: pasajero.documento_identidad,
      pasajero_id: pasajero.id,
      usuario_id: pasajero.usuario_id || Number(localStorage.getItem('usuario_id')) || null,
      email: pasajero.email,
      telefono: pasajero.telefono,
      equipaje_extra_kg: 0,
      costo_servicios_extra: 0,
      vuelo_id: Number(busqueda.vuelo_id),
      asiento_id: Number(asiento.asientoId),
      metodo_pago: metodo,
      bloqueo_llave: localStorage.getItem('bloqueoLlave'),
    };

    try {
      const respuesta = await fetch('/api/reservas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'idempotency-key': idempotencyKey,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const data = await respuesta.json();

      if (respuesta.status === 201) {
        if (relojBloqueo) {
          clearInterval(relojBloqueo);
        }
        localStorage.removeItem('busquedaVuelo');
        localStorage.removeItem('datosPasajeros');
        localStorage.removeItem('datosAsiento');
        localStorage.removeItem('bloqueoLlave');
        Swal.fire({
          icon: 'success',
          title: '¡Reserva Confirmada!',
          text: 'Tu pago ha sido procesado con éxito.',
        }).then(() => {
          window.location.href = '/index.html';
        });
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

      if (/tiempo para completar el pago|ya no está disponible/i.test(data.mensaje || '')) {
        Swal.fire({ icon: 'error', title: 'Oops...', text: data.mensaje }).then(() => {
          localStorage.removeItem('datosAsiento');
          window.location.href = '/asientos.html';
        });
        return;
      }

      Swal.fire({ icon: 'error', title: 'Oops...', text: data.mensaje || data.error || 'No se pudo confirmar la reserva' });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Oops...', text: error.message });
    }
  });
});
}
