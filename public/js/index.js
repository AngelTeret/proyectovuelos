let vuelosCargados = [];

const fechaISO = (valor) => fechaCalendario(valor);

const hoyISO = () => fechaCalendario(new Date());

const vueloVigente = (vuelo) => vueloEnVenta(vuelo);

const llenarSelect = (select, lugares) => {
  const opciones = lugares.map((lugar) => `<option value="${escapar(lugar)}">${escapar(lugar)}</option>`);
  select.innerHTML = `<option value="">Todos</option>${opciones.join('')}`;
};

const vuelosFiltrados = () => {
  const origen = document.getElementById('origen').value.trim();
  const destino = document.getElementById('destino').value.trim();
  const salida = document.getElementById('fecha-salida').value;

  return vuelosCargados.filter((vuelo) => {
    if (!vueloVigente(vuelo)) {
      return false;
    }
    if (origen && vuelo.origen !== origen) {
      return false;
    }
    if (destino && vuelo.destino !== destino) {
      return false;
    }
    const fecha = fechaISO(vuelo.fecha_salida);
    return !(salida && fecha && fecha < salida);
  });
};

const busquedaSoloIda = ({ origen, destino, salida, vuelo = null }) => ({
  origen,
  destino,
  tipo_viaje: 'solo_ida',
  fechas: {
    salida,
  },
  vuelo_id: vuelo?.id ?? null,
  precio_base: vuelo ? Number(vuelo.precio_base) : null,
});

const guardarBusqueda = (datos, redirigir) => {
  localStorage.setItem('busquedaVuelo', JSON.stringify(datos));
  if (redirigir) {
    window.location.href = '/pasajeros';
  }
};

const pintarDestinos = (vuelos, mensajeVacio = 'No hay vuelos disponibles.') => {
  const contenedor = document.getElementById('destinos');
  if (vuelos.length === 0) {
    contenedor.innerHTML = `<p class="col-span-3 text-sm text-slate-500">${mensajeVacio}</p>`;
    return;
  }

  contenedor.innerHTML = vuelos.map((vuelo) => `
    <article class="relative h-48 overflow-hidden rounded-2xl shadow-md">
      <img src="${escapar(vuelo.imagen_url)}" alt="${escapar(vuelo.destino)}" class="h-full w-full object-cover">
      <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent"></div>
      <div class="absolute bottom-3 left-4 right-14 text-white">
        <p class="text-base font-semibold">${escapar(vuelo.destino)}</p>
        <p class="text-xs text-white/80">${escapar(vuelo.origen)} · desde ${quetzales(vuelo.precio_base)}</p>
        <p class="text-xs text-white/90">Sale ${escapar(formatearDia(vuelo.fecha_salida))}</p>
        ${retrasoVisible(vuelo.retraso_minutos) ? `<p class="text-xs text-amber-200">${escapar(retrasoVisible(vuelo.retraso_minutos))}</p>` : ''}
        ${duracionVisible(vuelo.duracion_minutos) ? `<p class="text-xs text-white/90">${escapar(duracionVisible(vuelo.duracion_minutos))}</p>` : ''}
      </div>
      <button type="button" data-vuelo-id="${vuelo.id}" class="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow" aria-label="Ver ${escapar(vuelo.destino)}">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5"/></svg>
      </button>
    </article>
  `).join('');

  contenedor.querySelectorAll('[data-vuelo-id]').forEach((boton) => {
    boton.addEventListener('click', () => {
      const vuelo = vuelos.find((item) => String(item.id) === boton.dataset.vueloId);
      if (vuelo) {
        guardarBusqueda(busquedaSoloIda({
          origen: vuelo.origen,
          destino: vuelo.destino,
          salida: fechaISO(vuelo.fecha_salida),
          vuelo,
        }), true);
      }
    });
  });
};

const cargarVuelos = async () => {
  const respuesta = await fetch('/api/vuelos');
  if (!respuesta.ok) {
    throw new Error('No se pudieron cargar los vuelos');
  }
  const vuelos = await respuesta.json();
  vuelosCargados = vuelos;
  const vigentes = vuelos.filter(vueloVigente);
  const origenes = [...new Set(vigentes.map((vuelo) => vuelo.origen))];
  const destinos = [...new Set(vigentes.map((vuelo) => vuelo.destino))];
  llenarSelect(document.getElementById('origen'), origenes);
  llenarSelect(document.getElementById('destino'), destinos);
  pintarDestinos(vigentes);
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('fecha-salida').min = hoyISO();

  document.getElementById('buscar-vuelo').addEventListener('click', (evento) => {
    evento.preventDefault();
    const origen = document.getElementById('origen').value.trim();
    const destino = document.getElementById('destino').value.trim();
    const salida = document.getElementById('fecha-salida').value;
    const coincidencias = vuelosFiltrados();
    pintarDestinos(coincidencias, 'No hay vuelos para esa búsqueda.');
    guardarBusqueda(busquedaSoloIda({
      origen,
      destino,
      salida,
      vuelo: coincidencias.length === 1 ? coincidencias[0] : null,
    }), false);
  });

  cargarVuelos().catch(() => {
    document.getElementById('destinos').innerHTML = '<p class="col-span-3 text-sm text-slate-500">No se pudieron cargar los vuelos.</p>';
  });
});
