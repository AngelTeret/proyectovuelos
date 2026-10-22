if (!tokenDeSesion()) {
  window.location.replace('/login.html');
} else if (rolDeSesion() !== 'admin' && rolDeSesion() !== 'despacho') {
  window.location.replace('/index.html');
}

const params = new URLSearchParams(window.location.search);
const vueloId = Number(params.get('vuelo'));
const titulosEstado = {
  chequeado: 'Todavía no entra',
  abordado: 'Ya entró',
  no_show: 'No se presentó',
  sin_checkin: 'No hizo check-in',
};
const nombreEstadoVuelo = {
  Programado: 'Listo para empezar',
  Retrasado: 'Vuelo retrasado',
  Abordando: 'Dejando entrar',
  Cerrado: 'Puerta cerrada',
  'En Curso': 'En vuelo',
};
const clasesEstado = {
  chequeado: 'bg-amber-50 text-amber-800',
  abordado: 'bg-emerald-50 text-emerald-800',
  no_show: 'bg-slate-100 text-slate-600',
  sin_checkin: 'bg-orange-50 text-orange-800',
};

let vueloActual = null;

const mostrar = (id) => {
  document.getElementById('estado-carga').classList.add('hidden');
  document.getElementById(id).classList.remove('hidden');
};

const pedir = async (ruta, metodo = 'GET', cuerpo) => {
  const respuesta = await fetch(ruta, {
    method: metodo,
    headers: cuerpo ? { ...autorizacion(), 'Content-Type': 'application/json' } : autorizacion(),
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  if (respuesta.status === 401) {
    cerrarSesionInvalida(`${window.location.pathname}${window.location.search}`);
    return null;
  }
  const data = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new Error(data.mensaje || 'Intenta de nuevo.');
  }
  return data;
};

const frasePersonas = (cantidad, una, varias) => `${cantidad} ${Number(cantidad) === 1 ? una : varias}`;

const resumenConteo = (vuelo) => {
  const conBoleto = Number(vuelo.chequeados) + Number(vuelo.abordados) + Number(vuelo.no_show);
  const sinCheckin = Number(vuelo.sin_checkin) || 0;
  const partes = [frasePersonas(conBoleto + sinCheckin, 'persona en el vuelo', 'personas en el vuelo')];
  if (sinCheckin > 0) {
    partes.push(frasePersonas(sinCheckin, 'no hizo check-in', 'no hicieron check-in'));
  }
  partes.push(Number(vuelo.abordados) === 0
    ? 'nadie ha entrado'
    : frasePersonas(vuelo.abordados, 'ya entró', 'ya entraron'));
  if (Number(vuelo.no_show) > 0) {
    partes.push(frasePersonas(vuelo.no_show, 'tenía boleto y no se presentó', 'tenían boleto y no se presentaron'));
  }
  return partes.join(' · ');
};

const faltaMasDeUnaHora = (vuelo) => {
  const salida = new Date(vuelo.fecha_salida).getTime();
  return Number.isFinite(salida) && salida - Date.now() > 60 * 60 * 1000;
};

const guiaDe = (vuelo) => {
  if (vuelo.estado === 'Abordando' && faltaMasDeUnaHora(vuelo)) {
    return 'Puedes marcar a quien muestre el boleto. La puerta se cierra cuando falte una hora o menos. Hasta entonces el check-in sigue abierto.';
  }
  if (vuelo.estado === 'Abordando') {
    return 'Paso 2. Cuando la persona muestre su boleto, búscalo y pulsa Ya entró. Quien no hizo check-in no tiene boleto y no entra. Cuando ya no vaya a entrar nadie más, cierra la puerta.';
  }
  if (vuelo.estado === 'Cerrado') {
    return 'La puerta ya cerró. Quien tenía boleto y no entró quedó como que no se presentó. Quien nunca hizo check-in sigue aparte: no tenía boleto. El avión figura en vuelo cuando llega la hora de salida.';
  }
  if (vuelo.estado === 'En Curso') {
    return 'El avión ya salió. Quien tenía boleto y no entró quedó como que no se presentó.';
  }
  return 'Paso 1. Pulsa Empezar abordaje. Después podrás marcar a cada persona cuando muestre su boleto.';
};

const pintarVuelos = (vuelos) => {
  const lista = document.getElementById('vuelos');
  if (vuelos.length === 0) {
    lista.innerHTML = '<p class="rounded-2xl bg-white p-6 text-sm text-slate-500 shadow-sm">No hay vuelos listos para abordar.</p>';
    mostrar('lista-vuelos');
    return;
  }
  lista.innerHTML = vuelos.map((vuelo) => `
    <a href="/abordaje.html?vuelo=${vuelo.id}" class="block rounded-2xl bg-white p-5 shadow-sm hover:bg-slate-50">
      <p class="text-sm font-semibold text-emerald-800">${escapar(nombreEstadoVuelo[vuelo.estado] || vuelo.estado)}</p>
      <p class="mt-1 text-lg font-bold text-slate-900">${escapar(vuelo.origen)} → ${escapar(vuelo.destino)}</p>
      <p class="mt-1 text-sm text-slate-500">${escapar([formatearSalida(vuelo.fecha_salida), duracionVisible(vuelo.duracion_minutos)].filter(Boolean).join(' · '))}</p>
      <p class="mt-3 text-sm text-slate-700">${escapar(resumenConteo(vuelo))}</p>
      <p class="mt-3 text-sm font-semibold text-emerald-800">Abrir la lista</p>
    </a>
  `).join('');
  mostrar('lista-vuelos');
};

const accionesVuelo = (vuelo) => {
  if (vuelo.estado === 'Programado' || vuelo.estado === 'Retrasado') {
    return '<button type="button" id="btn-iniciar" class="h-11 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900">Empezar abordaje</button>';
  }
  if (vuelo.estado === 'Abordando' && !faltaMasDeUnaHora(vuelo)) {
    return '<button type="button" id="btn-cerrar" class="h-11 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700">Cerrar la puerta</button>';
  }
  return '';
};

const pintarPasajeros = () => {
  const consulta = document.getElementById('buscar-boleto').value.trim().toUpperCase();
  const pasajeros = [...(vueloActual?.pasajeros || [])].sort((a, b) => {
    if (!a.numero_asiento) {
      return 1;
    }
    if (!b.numero_asiento) {
      return -1;
    }
    return String(a.numero_asiento).localeCompare(String(b.numero_asiento), 'es', { numeric: true });
  }).filter((pasajero) => {
    if (!consulta) {
      return true;
    }
    const texto = `${pasajero.codigo_boleto || ''} ${pasajero.nombre} ${pasajero.apellido} ${pasajero.numero_asiento || ''} ${pasajero.codigo_pnr}`.toUpperCase();
    return texto.includes(consulta);
  });
  const vacio = document.getElementById('vacio-pasajeros');
  const lista = document.getElementById('pasajeros');
  vacio.classList.toggle('hidden', (vueloActual?.pasajeros || []).length > 0);
  if (pasajeros.length === 0) {
    lista.innerHTML = consulta
      ? '<p class="text-sm text-slate-500">No hay nadie con ese dato en este vuelo.</p>'
      : '';
    return;
  }
  const puedeMarcar = vueloActual.estado === 'Abordando';
  lista.innerHTML = pasajeros.map((pasajero) => {
    const nombre = `${pasajero.nombre || ''} ${pasajero.apellido || ''}`.trim();
    const asiento = pasajero.numero_asiento ? `Asiento ${pasajero.numero_asiento}` : 'Viaja en regazo, sin asiento';
    const accion = puedeMarcar && pasajero.estado === 'chequeado'
      ? `<button type="button" data-abordar="${escapar(pasajero.codigo_boleto)}" data-nombre="${escapar(nombre)}" class="h-9 rounded-lg bg-emerald-800 px-3 text-sm font-semibold text-white hover:bg-emerald-900">Ya entró</button>`
      : '';
    return `
      <article class="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <div>
          <p class="text-base font-bold text-slate-900">${escapar(nombre)}</p>
          <p class="mt-1 text-sm text-slate-500">${escapar(asiento)} · Reserva ${escapar(pasajero.codigo_pnr)}</p>
          ${pasajero.codigo_boleto ? `<p class="mt-1 font-mono text-sm font-semibold tracking-wide text-slate-800">${escapar(pasajero.codigo_boleto)}</p>` : ''}
        </div>
        <div class="flex items-center gap-2">
          <span class="rounded-full px-2.5 py-1 text-xs font-semibold ${clasesEstado[pasajero.estado] || 'bg-slate-100 text-slate-600'}">${escapar(titulosEstado[pasajero.estado] || pasajero.estado)}</span>
          ${accion}
        </div>
      </article>`;
  }).join('');
};

const pintarDetalle = (vuelo) => {
  vueloActual = vuelo;
  document.getElementById('estado-vuelo').textContent = nombreEstadoVuelo[vuelo.estado] || vuelo.estado;
  document.getElementById('ruta-vuelo').textContent = `${vuelo.origen} → ${vuelo.destino}`;
  document.getElementById('salida-vuelo').textContent = [formatearSalida(vuelo.fecha_salida), duracionVisible(vuelo.duracion_minutos), resumenConteo(vuelo)].filter(Boolean).join(' · ');
  document.getElementById('guia-vuelo').textContent = guiaDe(vuelo);
  document.getElementById('acciones-vuelo').innerHTML = accionesVuelo(vuelo);
  pintarPasajeros();
  mostrar('detalle-vuelo');
};

const cargarDetalle = async () => {
  const data = await pedir(`/api/abordaje/vuelos/${vueloId}`);
  if (data) {
    pintarDetalle(data);
  }
};

const confirmarAccion = async (titulo, texto, confirmar, color) => {
  const resultado = await Swal.fire({
    icon: 'question',
    title: titulo,
    text: texto,
    showCancelButton: true,
    confirmButtonText: confirmar,
    cancelButtonText: 'No',
    confirmButtonColor: color,
  });
  return resultado.isConfirmed;
};

document.getElementById('detalle-vuelo').addEventListener('click', async (evento) => {
  const abordar = evento.target.closest('[data-abordar]');
  if (abordar) {
    const seguro = await confirmarAccion(
      `¿${abordar.dataset.nombre || 'Esta persona'} ya entró al avión?`,
      `Boleto ${abordar.dataset.abordar}.`,
      'Sí, ya entró',
      '#065f46',
    );
    if (!seguro) {
      return;
    }
    try {
      pintarDetalle(await pedir(`/api/abordaje/vuelos/${vueloId}/abordar`, 'POST', { codigo_boleto: abordar.dataset.abordar }));
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'No se pudo marcar', text: error.message });
    }
    return;
  }
  if (evento.target.id === 'btn-iniciar') {
    const seguro = await confirmarAccion(
      '¿Empezar el abordaje?',
      'A partir de ahora marcas a cada persona cuando muestre el boleto.',
      'Sí, empezar',
      '#065f46',
    );
    if (!seguro) {
      return;
    }
    try {
      pintarDetalle(await pedir(`/api/abordaje/vuelos/${vueloId}/iniciar`, 'POST'));
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'No se pudo iniciar', text: error.message });
    }
    return;
  }
  if (evento.target.id === 'btn-cerrar') {
    const seguro = await confirmarAccion(
      '¿Cerrar la puerta?',
      'Quien tiene boleto y no entró queda como que no se presentó. El vuelo sigue su camino.',
      'Sí, cerrar',
      '#dc2626',
    );
    if (!seguro) {
      return;
    }
    try {
      const data = await pedir(`/api/abordaje/vuelos/${vueloId}/cerrar`, 'POST');
      pintarDetalle(data);
      Swal.fire({
        icon: 'success',
        title: 'Abordaje cerrado',
        text: [
          Number(data.ausentes) > 0
            ? `${data.ausentes} ${Number(data.ausentes) === 1 ? 'tenía boleto y quedó como que no se presentó' : 'tenían boleto y quedaron como que no se presentaron'}.`
            : 'Todos los que tenían boleto abordaron.',
          Number(data.sin_checkin) > 0
            ? 'Quien no hizo check-in no tenía boleto y no entra en esa cuenta.'
            : '',
        ].filter(Boolean).join(' '),
        confirmButtonText: 'Listo',
      });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'No se pudo cerrar', text: error.message });
    }
  }
});

document.getElementById('buscar-boleto').addEventListener('input', pintarPasajeros);

const cargar = async () => {
  try {
    if (Number.isInteger(vueloId) && vueloId > 0) {
      await cargarDetalle();
      return;
    }
    pintarVuelos(await pedir('/api/abordaje/vuelos'));
  } catch (error) {
    document.getElementById('estado-carga').textContent = error.message || 'No se pudo abrir el abordaje.';
  }
};

cargar();
