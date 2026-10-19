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
  if (String(reserva.estado_vuelo || '').toLowerCase() === 'cancelado') {
    return 'cancelados';
  }
  const salida = new Date(reserva.fecha_salida);
  if (Number.isNaN(salida.getTime()) || salida.getTime() >= Date.now()) {
    return 'proximos';
  }
  return 'pasados';
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
    etiqueta.textContent = grupo.texto;
    etiqueta.className = `rounded-full px-2.5 py-1 text-xs font-medium ${grupo.clase}`;
    nodo.querySelector('[data-campo="ruta"]').textContent = `${reserva.origen || ''} → ${reserva.destino || ''}`;
    nodo.querySelector('[data-campo="salida"]').textContent = formatearSalida(reserva.fecha_salida);
    nodo.querySelector('[data-campo="asiento"]').textContent = reserva.numero_asiento || '';
    nodo.querySelector('[data-campo="total"]').textContent = quetzales(reserva.monto_total);
    lista.appendChild(nodo);
  });
  lista.classList.remove('hidden');
};

const prepararPestanas = () => {
  document.querySelectorAll('[role="tab"]').forEach((boton) => {
    boton.addEventListener('click', () => {
      pestanaActiva = boton.dataset.pestana;
      pintarGrupo();
    });
  });
};

const pintarHistorial = (reservas) => {
  if (reservas.length === 0) {
    mostrar('vacio');
    return;
  }

  reservasGuardadas = reservas;
  pestanaActiva = 'proximos';
  prepararPestanas();
  mostrar('panel-historial');
  pintarGrupo();
};

const cargarHistorial = async () => {
  try {
    const respuesta = await fetch('/api/reservas/mi-historial', {
      headers: autorizacion(),
    });
    if (respuesta.status === 401) {
      localStorage.setItem('redirectAfterLogin', '/mis-vuelos.html');
      window.location.href = '/login.html';
      return;
    }
    if (!respuesta.ok) {
      throw new Error('No se pudo cargar el historial');
    }
    pintarHistorial(await respuesta.json());
  } catch (error) {
    mostrar('error-historial');
  }
};

cargarHistorial();
