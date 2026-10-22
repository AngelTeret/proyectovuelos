const tieneVuelo = () => {
  let busqueda = {};
  try {
    busqueda = JSON.parse(localStorage.getItem('busquedaVuelo')) || {};
  } catch (error) {
    busqueda = {};
  }
  return Boolean(busqueda.vuelo_id);
};

const prepararEntrada = () => {
  if (!tieneVuelo()) {
    location.replace('/index.html');
    return;
  }
  ['token', 'rol', 'nombre', 'usuario_id'].forEach((clave) => localStorage.removeItem(clave));
  if (!sessionStorage.getItem('token')) {
    localStorage.setItem('redirectAfterLogin', '/asientos.html');
    location.replace('/login.html');
  }
};

prepararEntrada();
window.addEventListener('pageshow', (evento) => {
  if (evento.persisted) {
    prepararEntrada();
  }
});

const clasesPorCategoria = {
  Premium: ['bg-indigo-900', 'text-white', 'hover:-translate-y-0.5', 'hover:bg-indigo-800', 'hover:shadow-md'],
  'Estándar': ['bg-blue-600', 'text-white', 'hover:-translate-y-0.5', 'hover:bg-blue-700', 'hover:shadow-md'],
  'Básica': ['bg-slate-300', 'text-slate-700', 'hover:-translate-y-0.5', 'hover:bg-slate-400', 'hover:shadow-md'],
};
const franjas = {
  Premium: {
    barra: 'bg-gradient-to-r from-indigo-900 to-slate-900 text-white',
    pildora: 'bg-indigo-500/20 text-indigo-300',
  },
  'Estándar': {
    barra: 'bg-gradient-to-r from-blue-600 to-blue-800 text-white',
    pildora: 'bg-white/20 text-white',
  },
  'Básica': {
    barra: 'bg-slate-200 text-slate-700',
    pildora: 'bg-white text-slate-600',
  },
};
const letras = ['A', 'B', 'C', 'D', 'E', 'F'];
const MAX_ASIENTOS = 102;
const MAX_FILA = MAX_ASIENTOS / letras.length;

let tarifaVuelo = 0;
let mapaVersion = 0;
let seleccionEnCurso = false;

const estaOcupado = (asiento) => asiento.estado !== 'disponible' || Boolean(asiento.ocupado);

const franjaCategoria = (categoria, cargo) => {
  const estilo = franjas[categoria] || franjas['Básica'];
  const desde = quetzales(tarifaVuelo + cargo);
  return `<div class="mt-3 flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${estilo.barra}"><span class="min-w-0">${escapar(categoria)}</span><span class="shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${estilo.pildora}">Desde ${desde}</span></div>`;
};

const muestraDeFila = (asientosFila) => {
  for (const letra of letras) {
    const asiento = asientosFila.get(letra);
    if (asiento) {
      return asiento;
    }
  }
  return null;
};

const leerBusqueda = () => leerJson('busquedaVuelo');

const mostrarPrecioVuelo = async (vueloId) => {
  let precio = Number(leerBusqueda().precio_base);
  if (!precio && vueloId) {
    const respuesta = await fetch('/api/vuelos');
    if (respuesta.ok) {
      const vuelos = await respuesta.json();
      const vuelo = vuelos.find((item) => Number(item.id) === Number(vueloId));
      precio = Number(vuelo?.precio_base) || 0;
    }
  }
  tarifaVuelo = precio || 0;
};

const pintarAsientos = (asientos) => {
  const contenedor = document.getElementById('contenedor-asientos');
  const filas = new Map();

  asientos.forEach((asiento) => {
    const coincidencia = String(asiento.numero_asiento).match(/^(\d+)([A-F])$/i);
    if (!coincidencia) {
      return;
    }
    const fila = Number(coincidencia[1]);
    const letra = coincidencia[2].toUpperCase();
    if (!filas.has(fila)) {
      filas.set(fila, new Map());
    }
    filas.get(fila).set(letra, asiento);
  });

  const numeros = [...filas.keys()]
    .filter((fila) => fila >= 1 && fila <= MAX_FILA)
    .sort((a, b) => a - b)
    .slice(0, MAX_FILA);
  if (numeros.length === 0) {
    contenedor.innerHTML = '<p class="text-center text-sm text-slate-500">No hay asientos para este vuelo.</p>';
    return;
  }

  let categoriaAnterior = '';
  contenedor.innerHTML = numeros.map((fila) => {
    const asientosFila = filas.get(fila);
    const muestra = muestraDeFila(asientosFila);
    const categoriaFila = muestra?.categoria || 'Básica';
    const franja = categoriaFila === categoriaAnterior
      ? ''
      : franjaCategoria(categoriaFila, Number(muestra?.precio_adicional) || 0);
    categoriaAnterior = categoriaFila;
    const celdas = letras.map((letra) => {
      const asiento = asientosFila.get(letra);
      if (!asiento) {
        return '<span class="h-10 w-10 shrink-0"></span>';
      }
      const codigo = escapar(asiento.numero_asiento);
      const precio = Number(asiento.precio_adicional) || 0;
      const categoria = escapar(asiento.categoria || 'Básica');
      const tono = (clasesPorCategoria[asiento.categoria] || clasesPorCategoria['Básica']).join(' ');
      if (asientosElegidos().some((item) => item.codigo === asiento.numero_asiento)) {
        return `<button type="button" class="asiento-disponible asiento-marcado flex h-10 w-10 shrink-0 scale-105 items-center justify-center rounded-xl border-2 border-emerald-400 bg-emerald-500 text-xs font-semibold text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]" data-codigo="${codigo}" data-precio="${precio}" data-categoria="${categoria}" aria-pressed="true" aria-label="Asiento ${codigo}, seleccionado. Pulsa para quitarlo.">${codigo}</button>`;
      }
      if (estaOcupado(asiento)) {
        return `<button type="button" disabled class="flex h-10 w-10 shrink-0 cursor-not-allowed items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-400 opacity-60" aria-label="Asiento ${codigo}, ocupado"><span aria-hidden="true">×</span></button>`;
      }
      const propio = asiento.propio ? '1' : '0';
      return `<button type="button" class="asiento-disponible relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-semibold transition-all duration-200 ${tono}" data-codigo="${codigo}" data-precio="${precio}" data-categoria="${categoria}" data-propio="${propio}" aria-label="Asiento ${codigo}, ${categoria}, disponible">${codigo}</button>`;
    });

    return `${franja}<div class="flex w-max items-center justify-center gap-1.5">${celdas[0]}${celdas[1]}${celdas[2]}<span class="w-6 shrink-0 text-center text-xs text-slate-400">${fila}</span>${celdas[3]}${celdas[4]}${celdas[5]}</div>`;
  }).join('');

  contenedor.querySelectorAll('.asiento-disponible').forEach((boton) => {
    boton.addEventListener('click', () => elegirAsiento(boton, asientos));
  });
};

const cargarAsientos = async () => {
  const contenedor = document.getElementById('contenedor-asientos');
  const busqueda = leerBusqueda();
  await mostrarPrecioVuelo(busqueda.vuelo_id);

  const vueloId = busqueda.vuelo_id;
  if (!vueloId) {
    contenedor.innerHTML = '<p class="text-center text-sm text-slate-500">Selecciona un vuelo antes de elegir asiento.</p>';
    return;
  }

  const version = ++mapaVersion;
  const llave = leerTextoTemporal('bloqueoLlave');
  const respuesta = await fetch(`/api/vuelos/${vueloId}/asientos`, {
    headers: llave ? { 'x-bloqueo-llave': llave } : {},
  });
  if (version !== mapaVersion) {
    return;
  }
  if (!respuesta.ok) {
    throw new Error('No se pudieron cargar los asientos');
  }
  const asientos = await respuesta.json();
  if (version !== mapaVersion) {
    return;
  }
  const vigentes = new Set(asientos.filter((asiento) => !estaOcupado(asiento)).map((asiento) => asiento.numero_asiento));
  const puestos = cuposPasajeros();
  const perdidos = puestos.filter((item) => item && !vigentes.has(item.codigo));
  if (perdidos.length) {
    guardarSeleccion(puestos.map((item) => (item && vigentes.has(item.codigo) ? item : null)));
    mostrarResumen();
    const texto = perdidos.length === 1
      ? `El asiento ${perdidos[0].codigo} ya no está reservado. Elige otro.`
      : 'Algunos asientos ya no están reservados. Elige de nuevo.';
    Swal.fire({ icon: 'warning', title: 'Asiento liberado', text: texto });
  }
  pintarAsientos(asientos);
};

const viajerosSentados = () => {
  const datos = leerJsonTemporal('datosPasajeros');
  const lista = Array.isArray(datos.viajeros) ? datos.viajeros : [];
  return lista.filter((viajero) => viajero.tipo !== 'infante');
};

const asientosGuardados = () => {
  const lista = leerJsonTemporal('datosAsientos');
  return Array.isArray(lista) ? lista : [];
};

const cuposPasajeros = () => {
  const sentados = viajerosSentados();
  const cupos = sentados.map(() => null);
  asientosGuardados().forEach((item, indice) => {
    if (!item?.codigo) {
      return;
    }
    const puesto = Number.isInteger(item.pasajero) ? item.pasajero : indice;
    if (puesto >= 0 && puesto < cupos.length && !cupos[puesto]) {
      cupos[puesto] = item;
    }
  });
  return cupos;
};

const asientosElegidos = () => cuposPasajeros().filter(Boolean);

const asientosCompletos = () => {
  const cupos = cuposPasajeros();
  return cupos.length > 0 && cupos.every(Boolean);
};

const guardarSeleccion = (lista) => {
  const cupos = Array.isArray(lista) ? lista : [];
  guardarJsonTemporal('datosAsientos', cupos);
  const primero = cupos.find(Boolean);
  if (primero) {
    guardarJsonTemporal('datosAsiento', primero);
    return;
  }
  borrarTemporal('datosAsiento');
};

const nombreViajero = (viajero) => [viajero?.nombre, viajero?.apellido].filter(Boolean).join(' ') || 'Pasajero';

const mostrarResumen = () => {
  const sentados = viajerosSentados();
  const guardados = cuposPasajeros();
  const datos = leerJsonTemporal('datosPasajeros');
  const infantes = Array.isArray(datos.viajeros) ? datos.viajeros.filter((viajero) => viajero.tipo === 'infante').length : 0;
  const nota = document.getElementById('nota-infantes');
  if (infantes) {
    nota.textContent = infantes === 1
      ? 'El infante va en el regazo y no elige asiento.'
      : `Los ${infantes} infantes van en el regazo y no eligen asiento.`;
    nota.classList.remove('hidden');
  } else {
    nota.textContent = '';
    nota.classList.add('hidden');
  }

  document.getElementById('lista-pasajeros').innerHTML = sentados.map((viajero, indice) => {
    const asiento = guardados[indice];
    const nombre = escapar(nombreViajero(viajero));
    if (!asiento) {
      return `<li class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <div class="flex min-w-0 items-start gap-2">
          <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">${indice + 1}</span>
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-slate-800">${nombre}</p>
            <p class="text-xs text-slate-500">Elige un asiento</p>
          </div>
        </div>
      </li>`;
    }
    const cargo = Number(asiento.precioAdicional) || 0;
    const detalle = cargo > 0
      ? `Tarifa ${quetzales(tarifaVuelo)} + asiento ${quetzales(cargo)}`
      : 'La tarifa del vuelo ya incluye este asiento';
    return `<li class="rounded-xl border border-emerald-400 bg-emerald-50 px-3 py-2.5">
      <div class="flex min-w-0 items-start gap-2">
        <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">${indice + 1}</span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-slate-800">${nombre}</p>
          <div class="mt-1 flex items-start justify-between gap-3">
            <p class="min-w-0 text-sm font-semibold text-slate-800">Asiento ${escapar(asiento.codigo)}</p>
            <span class="shrink-0 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-semibold leading-4 text-white">Seleccionado</span>
          </div>
          <div class="mt-1 flex items-start justify-between gap-3">
            <p class="min-w-0 text-xs font-medium text-slate-600">${escapar(asiento.categoria || '')}</p>
            <p class="shrink-0 whitespace-nowrap text-sm font-semibold text-slate-800">${quetzales(tarifaVuelo + cargo)}</p>
          </div>
          <p class="mt-0.5 text-xs leading-4 text-slate-500">${detalle}</p>
          <button type="button" data-quitar="${escapar(asiento.codigo)}" class="mt-2 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50" aria-label="Quitar asiento ${escapar(asiento.codigo)} de ${nombre}">Quitar</button>
        </div>
      </div>
    </li>`;
  }).join('');

  const boton = document.getElementById('btnConfirmarAsiento');
  boton.disabled = !asientosCompletos();
};

const asegurarLlave = () => {
  let llave = leerTextoTemporal('bloqueoLlave');
  if (!/^[A-Za-z0-9-]{16,64}$/.test(llave)) {
    llave = crypto.randomUUID();
    guardarTextoTemporal('bloqueoLlave', llave);
  }
  return llave;
};

const liberarAsiento = async (asientoId) => {
  const busqueda = leerBusqueda();
  const llave = leerTextoTemporal('bloqueoLlave');
  if (!asientoId || !llave) {
    return null;
  }
  return fetch('/api/asientos/liberar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-bloqueo-llave': llave },
    body: JSON.stringify({
      asiento_id: asientoId,
      vuelo_id: Number(busqueda.vuelo_id),
      llave,
    }),
  });
};

const liberarTodos = async () => {
  const busqueda = leerBusqueda();
  const llave = leerTextoTemporal('bloqueoLlave');
  if (!llave || !busqueda.vuelo_id) {
    return;
  }
  await fetch('/api/asientos/liberar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-bloqueo-llave': llave },
    body: JSON.stringify({
      vuelo_id: Number(busqueda.vuelo_id),
      llave,
      todos: true,
    }),
  });
};

const quitarAsiento = async (codigo) => {
  if (seleccionEnCurso || !codigo) {
    return;
  }
  const guardados = cuposPasajeros();
  const puesto = guardados.findIndex((item) => item?.codigo === codigo);
  if (puesto === -1) {
    return;
  }
  seleccionEnCurso = true;
  mapaVersion += 1;
  try {
    const liberacion = await liberarAsiento(guardados[puesto].asientoId);
    if (liberacion && !liberacion.ok && liberacion.status !== 409) {
      throw new Error('No se pudo liberar el asiento');
    }
    guardados[puesto] = null;
    guardarSeleccion(guardados);
    mostrarResumen();
    await cargarAsientos();
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'No se pudo actualizar', text: 'Intenta de nuevo.' });
  } finally {
    seleccionEnCurso = false;
  }
};

const elegirAsiento = async (boton, asientos) => {
  if (seleccionEnCurso) {
    return;
  }
  const codigo = boton.dataset.codigo;
  const guardados = cuposPasajeros();
  const puestoExistente = guardados.findIndex((item) => item?.codigo === codigo);
  if (puestoExistente >= 0) {
    await quitarAsiento(codigo);
    return;
  }
  if (guardados.every(Boolean)) {
    Swal.fire({
      icon: 'info',
      title: 'Asientos completos',
      text: 'Ya elegiste un asiento para cada pasajero. Quita uno si quieres cambiarlo.',
    });
    return;
  }

  const asiento = asientos.find((item) => item.numero_asiento === codigo);
  if (!asiento) {
    return;
  }

  seleccionEnCurso = true;
  mapaVersion += 1;
  try {
    const llave = asegurarLlave();
    const busqueda = leerBusqueda();
    const respuesta = await fetch('/api/asientos/bloquear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-bloqueo-llave': llave, ...autorizacion() },
      body: JSON.stringify({
        asiento_id: asiento.id,
        vuelo_id: Number(busqueda.vuelo_id),
        llave,
        conservar_ids: guardados.filter(Boolean).map((item) => item.asientoId),
      }),
    });
    const data = await respuesta.json().catch(() => ({}));
    if (respuesta.status === 401) {
      cerrarSesionInvalida('/asientos.html');
      return;
    }
    if (!respuesta.ok) {
      await cargarAsientos();
      Swal.fire({
        icon: 'error',
        title: 'Asiento no disponible',
        text: data.mensaje || 'Ese asiento acaba de ser reservado. Elige otro.',
      });
      return;
    }

    const puestoLibre = guardados.findIndex((item) => !item);
    guardados[puestoLibre] = {
      codigo,
      precioAdicional: Number(asiento.precio_adicional) || 0,
      categoria: asiento.categoria || boton.dataset.categoria || '',
      asientoId: asiento.id,
      segundos: data.segundos,
      pasajero: puestoLibre,
    };
    guardarSeleccion(guardados);
    mostrarResumen();
    await cargarAsientos();
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'No se pudo actualizar', text: 'Intenta de nuevo.' });
  } finally {
    seleccionEnCurso = false;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  olvidarCopiasDurables();
  const sentados = viajerosSentados();
  if (!sentados.length) {
    window.location.replace('/pasajeros.html');
    return;
  }
  mostrarResumen();

  document.getElementById('lista-pasajeros').addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-quitar]');
    if (!boton) {
      return;
    }
    quitarAsiento(boton.dataset.quitar);
  });

  document.getElementById('btnConfirmarAsiento').addEventListener('click', () => {
    if (!asientosCompletos()) {
      return;
    }
    if (!tokenDeSesion()) {
      localStorage.setItem('redirectAfterLogin', '/pago.html');
      window.location.replace('/login.html');
      return;
    }
    window.location.href = '/pago.html';
  });

  document.getElementById('btnVolver').addEventListener('click', async (evento) => {
    evento.preventDefault();
    if (seleccionEnCurso) {
      return;
    }
    seleccionEnCurso = true;
    mapaVersion += 1;
    try {
      await liberarTodos();
    } catch (error) {
      /* La reserva temporal vence sola si la liberación no responde. */
    }
    guardarSeleccion([]);
    window.location.href = '/pasajeros.html';
  });

  const mostrarMapa = () => {
    if (seleccionEnCurso) {
      return;
    }
    cargarAsientos().catch(() => {
      document.getElementById('contenedor-asientos').innerHTML = '<p class="text-center text-sm text-slate-500">No se pudieron cargar los asientos.</p>';
    });
  };

  mostrarMapa();
  setInterval(mostrarMapa, 4000);
});
