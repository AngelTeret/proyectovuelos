const exigirVuelo = () => {
  let busqueda = {};
  try {
    busqueda = JSON.parse(localStorage.getItem('busquedaVuelo')) || {};
  } catch (error) {
    busqueda = {};
  }
  if (!busqueda.vuelo_id) {
    location.replace('/index.html');
  }
};

exigirVuelo();
window.addEventListener('pageshow', (evento) => {
  if (evento.persisted) {
    exigirVuelo();
  }
});

const clasesSeleccionado = ['scale-105', 'border-2', 'border-emerald-400', 'bg-emerald-500', 'text-white', 'shadow-[0_0_15px_rgba(16,185,129,0.4)]'];
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
const clasesDeCategoria = (categoria) => clasesPorCategoria[categoria] || clasesPorCategoria['Básica'];
const letras = ['A', 'B', 'C', 'D', 'E', 'F'];
const MAX_ASIENTOS = 102;
const MAX_FILA = MAX_ASIENTOS / letras.length;

let asientoElegido = null;
let tarifaVuelo = 0;

const estaOcupado = (asiento) => asiento.estado !== 'disponible' || Boolean(asiento.ocupado);

const marcarDisponible = (boton) => {
  boton.classList.remove('asiento-marcado', ...clasesSeleccionado, ...Object.values(clasesPorCategoria).flat());
  boton.classList.add(...clasesDeCategoria(boton.dataset.categoria));
  boton.setAttribute('aria-label', `Asiento ${boton.dataset.codigo}, ${boton.dataset.categoria || 'Básica'}, disponible`);
};

const marcarSeleccionado = (boton) => {
  boton.classList.remove(...Object.values(clasesPorCategoria).flat());
  boton.classList.add('asiento-marcado', ...clasesSeleccionado);
  boton.setAttribute('aria-label', `Asiento ${boton.dataset.codigo}, ${boton.dataset.categoria || 'Básica'}, seleccionado`);
};

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

const mostrarCategoria = (categoria) => {
  const elemento = document.getElementById('categoria-asiento');
  if (!categoria) {
    elemento.textContent = '';
    elemento.classList.add('hidden');
    return;
  }
  elemento.textContent = categoria;
  elemento.classList.remove('hidden');
};

const actualizarResumen = (codigo, categoria, cargo = 0) => {
  const detalle = document.getElementById('detalle-tarifa');
  const precio = document.getElementById('precio-extra');
  const tarjeta = document.getElementById('tarjeta-asiento');
  const badge = document.getElementById('badge-seleccionado');
  const fila = document.getElementById('detalle-precio');
  document.getElementById('asiento-seleccionado').textContent = codigo
    ? `Asiento ${codigo}`
    : 'Elige un asiento';
  mostrarCategoria(categoria);
  if (!codigo) {
    precio.textContent = '';
    precio.classList.add('hidden');
    detalle.classList.add('hidden');
    fila.classList.add('hidden');
    badge.classList.add('hidden');
    tarjeta.classList.remove('border-emerald-400', 'bg-emerald-50');
    tarjeta.classList.add('border-slate-200', 'bg-slate-50');
    return;
  }
  precio.textContent = quetzales(tarifaVuelo + cargo);
  precio.classList.remove('hidden');
  detalle.textContent = cargo > 0
    ? `Tarifa ${quetzales(tarifaVuelo)} + asiento ${quetzales(cargo)}`
    : 'La tarifa del vuelo ya incluye este asiento';
  detalle.classList.remove('hidden');
  fila.classList.remove('hidden');
  badge.classList.remove('hidden');
  tarjeta.classList.remove('border-slate-200', 'bg-slate-50');
  tarjeta.classList.add('border-emerald-400', 'bg-emerald-50');
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
      if (estaOcupado(asiento)) {
        return `<button type="button" disabled class="flex h-10 w-10 shrink-0 cursor-not-allowed items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-400 opacity-60" aria-label="Asiento ${codigo}, ocupado"><span aria-hidden="true">×</span></button>`;
      }
      const propio = asiento.propio ? '1' : '0';
      return `<button type="button" class="asiento-disponible relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-semibold transition-all duration-200 ${tono}" data-codigo="${codigo}" data-precio="${precio}" data-categoria="${categoria}" data-propio="${propio}" aria-label="Asiento ${codigo}, ${categoria}, disponible">${codigo}</button>`;
    });

    return `${franja}<div class="flex w-max items-center justify-center gap-1.5">${celdas[0]}${celdas[1]}${celdas[2]}<span class="w-6 shrink-0 text-center text-xs text-slate-400">${fila}</span>${celdas[3]}${celdas[4]}${celdas[5]}</div>`;
  }).join('');

  const categorias = [...new Set(asientos.map((asiento) => asiento.categoria).filter(Boolean))];
  if (categorias.length === 1) {
    mostrarCategoria(categorias[0]);
  }

  contenedor.querySelectorAll('.asiento-disponible').forEach((boton) => {
    boton.addEventListener('click', () => {
      contenedor.querySelectorAll('.asiento-disponible.asiento-marcado').forEach(marcarDisponible);
      marcarSeleccionado(boton);
      asientoElegido = {
        codigo: boton.dataset.codigo,
        precioAdicional: Number(boton.dataset.precio) || 0,
        categoria: boton.dataset.categoria || '',
        asientoId: null,
      };
      const asiento = asientos.find((item) => item.numero_asiento === boton.dataset.codigo);
      if (asiento) {
        asientoElegido.asientoId = asiento.id;
        asientoElegido.precioAdicional = Number(asiento.precio_adicional) || 0;
        asientoElegido.categoria = asiento.categoria || asientoElegido.categoria;
      }
      actualizarResumen(asientoElegido.codigo, asientoElegido.categoria, asientoElegido.precioAdicional);
    });
  });

  const codigoActivo = asientoElegido?.codigo;
  const botonActivo = codigoActivo
    ? contenedor.querySelector(`.asiento-disponible[data-codigo="${CSS.escape(codigoActivo)}"]`)
    : null;

  if (botonActivo) {
    marcarSeleccionado(botonActivo);
    return;
  }

  if (codigoActivo) {
    asientoElegido = null;
    actualizarResumen('', '');
  }

  const propio = asientos.find((asiento) => asiento.propio);
  const botonPropio = propio
    ? contenedor.querySelector(`.asiento-disponible[data-codigo="${CSS.escape(propio.numero_asiento)}"]`)
    : null;
  if (botonPropio) {
    botonPropio.click();
  }
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

  const llave = localStorage.getItem('bloqueoLlave') || '';
  const respuesta = await fetch(`/api/vuelos/${vueloId}/asientos`, {
    headers: llave ? { 'x-bloqueo-llave': llave } : {},
  });
  if (!respuesta.ok) {
    throw new Error('No se pudieron cargar los asientos');
  }
  pintarAsientos(await respuesta.json());
};

const mostrarPasajero = () => {
  const pasajero = leerJson('datosPasajeros');
  const nombre = [pasajero.nombre, pasajero.apellido].filter(Boolean).join(' ');
  const elemento = document.getElementById('nombre-pasajero');
  elemento.textContent = nombre || 'Pasajero';
  elemento.title = nombre;
};

document.addEventListener('DOMContentLoaded', () => {
  mostrarPasajero();

  document.getElementById('btnConfirmarAsiento').addEventListener('click', async (evento) => {
    evento.preventDefault();

    if (!asientoElegido) {
      document.getElementById('asiento-seleccionado').textContent = 'Elige un asiento disponible';
      Swal.fire({ icon: 'warning', title: 'Faltan datos', text: 'Por favor completa todos los campos' });
      return;
    }

    const boton = evento.currentTarget;
    boton.classList.add('pointer-events-none', 'opacity-70');

    try {
      let llave = localStorage.getItem('bloqueoLlave');
      if (!/^[A-Za-z0-9-]{16,64}$/.test(llave || '')) {
        llave = crypto.randomUUID();
        localStorage.setItem('bloqueoLlave', llave);
      }

      const busqueda = leerBusqueda();
      const respuesta = await fetch('/api/asientos/bloquear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-bloqueo-llave': llave },
        body: JSON.stringify({
          asiento_id: asientoElegido.asientoId,
          vuelo_id: Number(busqueda.vuelo_id),
          llave,
        }),
      });
      const data = await respuesta.json();

      if (!respuesta.ok) {
        asientoElegido = null;
        actualizarResumen('', '');
        await cargarAsientos();
        Swal.fire({
          icon: 'error',
          title: 'Asiento no disponible',
          text: data.mensaje || 'Ese asiento acaba de ser reservado. Elige otro.',
        });
        return;
      }

      localStorage.setItem('datosAsiento', JSON.stringify({
        codigo: asientoElegido.codigo,
        precioAdicional: asientoElegido.precioAdicional,
        categoria: asientoElegido.categoria,
        asientoId: asientoElegido.asientoId,
        segundos: data.segundos,
      }));

      if (!localStorage.getItem('token')) {
        localStorage.setItem('redirectAfterLogin', '/pago.html');
        window.location.replace('/login.html');
        return;
      }

      window.location.href = '/pago.html';
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Oops...', text: 'No se pudo reservar el asiento' });
    } finally {
      boton.classList.remove('pointer-events-none', 'opacity-70');
    }
  });

  document.getElementById('btnVolver').addEventListener('click', (evento) => {
    evento.preventDefault();
    window.location.href = '/pasajeros.html';
  });

  const mostrarMapa = () => cargarAsientos().catch(() => {
    document.getElementById('contenedor-asientos').innerHTML = '<p class="text-center text-sm text-slate-500">No se pudieron cargar los asientos.</p>';
  });

  mostrarMapa();
  setInterval(mostrarMapa, 4000);
});
