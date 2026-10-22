const grupos = {
  proximos: {
    texto: 'Próximo',
    clase: 'bg-emerald-50 text-emerald-700',
    vacio: 'No tienes vuelos próximos.',
  },
  pasados: {
    texto: 'Pasado',
    clase: 'bg-slate-100 text-slate-600',
    vacio: 'No tienes vuelos pasados.',
  },
  cancelados: {
    texto: 'Cancelado',
    clase: 'bg-red-50 text-red-700',
    vacio: 'No tienes vuelos cancelados.',
  },
};

const claseActiva = 'h-11 shrink-0 rounded-lg bg-blue-950 px-4 text-sm font-semibold text-white';
const claseInactiva = 'h-11 shrink-0 rounded-lg bg-white px-4 text-sm font-medium text-slate-500 hover:bg-slate-50';

let reservasGuardadas = [];
let pestanaActiva = 'proximos';

const mostrar = (id) => {
  document.getElementById('estado-carga').classList.add('hidden');
  document.getElementById(id).classList.remove('hidden');
};

const clasificar = (reserva) => {
  if (reserva.estado_pago === 'reembolsado' || String(reserva.estado_vuelo || '').toLowerCase() === 'cancelado') {
    return 'cancelados';
  }
  const segundos = Number(reserva.segundos_para_salida);
  if (Number.isFinite(segundos)) {
    return segundos > 0 ? 'proximos' : 'pasados';
  }
  const salida = new Date(reserva.fecha_salida);
  if (Number.isNaN(salida.getTime()) || salida.getTime() >= Date.now()) {
    return 'proximos';
  }
  return 'pasados';
};

const SEGUNDOS_DIA = 24 * 60 * 60;
const SEGUNDOS_DOS_DIAS = 2 * SEGUNDOS_DIA;

const puedeDescargar = (reserva) => (
  reserva.estado_pago === 'aprobado' || reserva.estado_pago === 'reembolsado'
);

const puedeCancelar = (reserva) => (
  clasificar(reserva) === 'proximos'
  && reserva.estado_pago === 'aprobado'
  && reserva.metodo_pago === 'saldo'
  && Number(reserva.segundos_para_salida) > 0
);

const compraReciente = (reserva) => {
  const creada = new Date(reserva.fecha_creacion);
  if (Number.isNaN(creada.getTime())) {
    return false;
  }
  return Date.now() - creada.getTime() <= SEGUNDOS_DIA * 1000;
};

const reembolsoPrevisto = (reserva) => {
  const total = Number(reserva.monto_total) || 0;
  const segundos = Number(reserva.segundos_para_salida);
  if (!Number.isFinite(segundos) || segundos <= 0) {
    return { permitido: false, motivo: 'salio', parcial: false, reembolso: 0 };
  }
  if (segundos < SEGUNDOS_DIA) {
    return { permitido: false, motivo: 'cercano', parcial: false, reembolso: 0 };
  }
  const parcial = segundos <= SEGUNDOS_DOS_DIAS;
  const reembolso = parcial ? Math.round((total / 2) * 100) / 100 : total;
  return { permitido: true, parcial, reembolso };
};

const textoSinDevolucion = (reserva) => {
  const base = 'Por el poco tiempo que queda para el vuelo no se puede devolver el dinero.';
  if (compraReciente(reserva)) {
    return `${base} Aunque la compra sea reciente, no hay devolución.`;
  }
  return base;
};

const cancelarReserva = async (reserva, boton) => {
  const previsto = reembolsoPrevisto(reserva);
  if (!previsto.permitido) {
    await Swal.fire({
      icon: 'warning',
      title: 'No se puede cancelar',
      text: previsto.motivo === 'cercano' ? textoSinDevolucion(reserva) : 'El vuelo ya salió y no se puede cancelar.',
      confirmButtonText: 'Entendido',
    });
    return;
  }
  const texto = previsto.parcial
    ? `Faltan 2 días o menos. Solo se devolverán ${quetzales(previsto.reembolso)} a tu billetera.`
    : `Se devolverán ${quetzales(previsto.reembolso)} a tu billetera.`;
  const confirmacion = await Swal.fire({
    icon: 'warning',
    title: '¿Cancelar este vuelo?',
    text: texto,
    showCancelButton: true,
    confirmButtonText: 'Sí, cancelar',
    cancelButtonText: 'No',
    confirmButtonColor: '#dc2626',
  });
  if (!confirmacion.isConfirmed) {
    return;
  }

  boton.disabled = true;
  try {
    const respuesta = await fetch(`/api/reservas/${reserva.id}/cancelar`, {
      method: 'PUT',
      headers: autorizacion(),
    });
    const data = await respuesta.json().catch(() => ({}));
    if (respuesta.status === 401) {
      localStorage.setItem('redirectAfterLogin', '/mis-vuelos.html');
      window.location.replace('/login.html');
      return;
    }
    if (!respuesta.ok) {
      Swal.fire({ icon: 'error', title: 'No se pudo cancelar', text: data.mensaje || 'Intenta de nuevo.' });
      boton.disabled = false;
      return;
    }

    const devuelto = quetzales(data.reembolso);
    reserva.estado_pago = 'reembolsado';
    reserva.monto_reembolsado = data.reembolso;
    pestanaActiva = 'cancelados';
    pintarGrupo();
    if (data.correo_enviado) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `Reserva cancelada. Se devolvieron ${devuelto} a tu billetera. Te enviamos el aviso por correo.`,
        showConfirmButton: false,
        timer: 4200,
      });
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Reserva cancelada',
        text: `Se devolvieron ${devuelto} a tu billetera. No pudimos enviar el aviso por correo.`,
        confirmButtonText: 'Entendido',
      });
    }
    cargarHistorial(true);
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'No se pudo cancelar', text: 'Intenta de nuevo.' });
    boton.disabled = false;
  }
};

const pintarGrupo = () => {
  const lista = document.getElementById('lista-vuelos');
  const aviso = document.getElementById('vacio-pestana');
  const plantilla = document.getElementById('plantilla-vuelo');
  const visibles = reservasGuardadas.filter((reserva) => clasificar(reserva) === pestanaActiva);
  const grupo = grupos[pestanaActiva];

  document.querySelectorAll('[role="tab"]').forEach((boton) => {
    const activo = boton.dataset.pestana === pestanaActiva;
    boton.setAttribute('aria-selected', String(activo));
    boton.className = activo ? claseActiva : claseInactiva;
  });

  lista.replaceChildren();
  if (visibles.length === 0) {
    lista.classList.add('hidden');
    aviso.textContent = grupo.vacio;
    aviso.classList.remove('hidden');
    return;
  }

  aviso.classList.add('hidden');
  visibles.forEach((reserva) => {
    const nodo = plantilla.content.cloneNode(true);
    const etiqueta = nodo.querySelector('[data-campo="estado"]');
    nodo.querySelector('[data-campo="pnr"]').textContent = reserva.codigo_pnr || '';
    nodo.querySelector('[data-campo="factura"]').textContent = reserva.numero_factura || '';
    etiqueta.textContent = grupo.texto;
    etiqueta.className = `rounded-full px-2.5 py-1 text-xs font-medium ${grupo.clase}`;
    nodo.querySelector('[data-campo="ruta"]').textContent = `${reserva.origen || ''} → ${reserva.destino || ''}`;
    nodo.querySelector('[data-campo="salida"]').textContent = formatearSalida(reserva.fecha_salida);
    nodo.querySelector('[data-campo="asiento"]').textContent = reserva.numero_asiento || '';
    nodo.querySelector('[data-campo="total"]').textContent = quetzales(reserva.monto_total);
    const reembolso = nodo.querySelector('[data-campo="reembolso"]');
    if (Number(reserva.monto_reembolsado) > 0) {
      reembolso.textContent = `Se devolvieron ${quetzales(reserva.monto_reembolsado)} a tu billetera.`;
      reembolso.classList.remove('hidden');
    }
    const boleto = nodo.querySelector('[data-boleto]');
    if (puedeDescargar(reserva)) {
      boleto.classList.remove('hidden');
      boleto.addEventListener('click', () => descargarBoleto(reserva.id, boleto));
    }
    const boton = nodo.querySelector('[data-cancelar]');
    if (puedeCancelar(reserva)) {
      boton.classList.remove('hidden');
      boton.addEventListener('click', () => cancelarReserva(reserva, boton));
    }
    lista.appendChild(nodo);
  });
  lista.classList.remove('hidden');
};

document.querySelectorAll('[role="tab"]').forEach((boton) => {
  boton.addEventListener('click', () => {
    pestanaActiva = boton.dataset.pestana;
    pintarGrupo();
  });
});

const pintarHistorial = (reservas, conservarPestana = false) => {
  if (reservas.length === 0) {
    mostrar('vacio');
    return;
  }

  reservasGuardadas = reservas;
  if (!conservarPestana) {
    pestanaActiva = 'proximos';
  }
  mostrar('panel-historial');
  pintarGrupo();
};

const cargarHistorial = async (conservarPestana = false) => {
  try {
    const respuesta = await fetch('/api/reservas/mi-historial', {
      headers: autorizacion(),
    });
    if (respuesta.status === 401) {
      localStorage.setItem('redirectAfterLogin', '/mis-vuelos.html');
      window.location.replace('/login.html');
      return;
    }
    if (!respuesta.ok) {
      throw new Error('No se pudo cargar el historial');
    }
    pintarHistorial(await respuesta.json(), conservarPestana);
  } catch (error) {
    mostrar('error-historial');
  }
};

cargarHistorial();
