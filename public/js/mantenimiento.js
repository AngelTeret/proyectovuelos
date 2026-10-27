if (!tokenDeSesion()) {
  window.location.replace('/login');
} else if (rolDeSesion() !== 'admin' && rolDeSesion() !== 'mantenimiento') {
  window.location.replace('/');
}

const params = new URLSearchParams(window.location.search);
const vueloId = Number(params.get('vuelo'));
let asientosActuales = [];

const mostrar = (id) => {
  document.getElementById('estado-carga').classList.add('hidden');
  document.getElementById(id).classList.remove('hidden');
};

const resumenAsientos = (vuelo) => {
  const fuera = Number(vuelo.fuera_servicio) || 0;
  const libres = Number(vuelo.libres) || 0;
  const partes = [`${libres} ${libres === 1 ? 'libre' : 'libres'}`];
  if (fuera > 0) {
    partes.push(`${fuera} fuera de servicio`);
  }
  return partes.join(' · ');
};

const pedir = (url, metodo = 'GET') => pedirJson(url, {
  metodo,
  volver: `/mantenimiento${window.location.search}`,
});

const pintarVuelos = (vuelos) => {
  const lista = document.getElementById('vuelos');
  if (vuelos.length === 0) {
    lista.innerHTML = '<p class="rounded-2xl bg-white p-6 text-sm text-slate-500 shadow-sm">No hay vuelos con asientos por revisar.</p>';
    mostrar('lista-vuelos');
    return;
  }
  lista.innerHTML = vuelos.map((vuelo) => `
    <a href="/mantenimiento?vuelo=${vuelo.id}" class="block rounded-2xl bg-white p-5 shadow-sm hover:bg-slate-50">
      <p class="text-lg font-bold text-slate-900">${escapar(vuelo.origen)} → ${escapar(vuelo.destino)}</p>
      <p class="mt-1 text-sm text-slate-500">${escapar([formatearSalida(vuelo.fecha_salida), duracionVisible(vuelo.duracion_minutos)].filter(Boolean).join(' · '))}</p>
      <p class="mt-3 text-sm text-slate-700">${escapar(resumenAsientos(vuelo))}</p>
    </a>
  `).join('');
  mostrar('lista-vuelos');
};

const filaDe = (numero) => {
  const coincidencia = String(numero || '').match(/^(\d+)/);
  return coincidencia ? coincidencia[1] : numero;
};

const letraDe = (numero) => String(numero || '').replace(/^\d+/, '');

const clasesSituacion = {
  libre: 'border-slate-200 bg-white text-slate-800 hover:border-blue-400',
  fuera: 'border-amber-300 bg-amber-50 text-amber-800',
  vendido: 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400',
};

const tituloSituacion = {
  libre: 'Libre',
  fuera: 'Fuera de servicio',
  vendido: 'Vendido',
};

const pintarMapa = (asientos) => {
  asientosActuales = asientos;
  const filas = new Map();
  asientos.forEach((asiento) => {
    const fila = filaDe(asiento.numero_asiento);
    if (!filas.has(fila)) {
      filas.set(fila, []);
    }
    filas.get(fila).push(asiento);
  });
  document.getElementById('mapa').innerHTML = [...filas.entries()].map(([fila, grupo]) => `
    <div class="flex flex-wrap items-center gap-2">
      <span class="w-8 text-xs font-semibold text-slate-400">${escapar(fila)}</span>
      ${grupo.map((asiento) => {
        const situacion = asiento.situacion || 'vendido';
        const activo = situacion === 'libre' || situacion === 'fuera';
        return `<button type="button" ${activo ? `data-asiento-id="${asiento.id}"` : 'disabled'} class="flex h-11 w-12 items-center justify-center rounded-xl border text-xs font-semibold ${clasesSituacion[situacion] || clasesSituacion.vendido}" title="${escapar(tituloSituacion[situacion] || situacion)}">${escapar(letraDe(asiento.numero_asiento))}</button>`;
      }).join('')}
    </div>
  `).join('');
};

const pintarDetalle = (vuelo) => {
  document.getElementById('ruta-vuelo').textContent = `${vuelo.origen} → ${vuelo.destino}`;
  document.getElementById('salida-vuelo').textContent = [formatearSalida(vuelo.fecha_salida), duracionVisible(vuelo.duracion_minutos)].filter(Boolean).join(' · ');
  pintarMapa(vuelo.asientos || []);
  mostrar('detalle-vuelo');
};

document.getElementById('mapa').addEventListener('click', async (evento) => {
  const boton = evento.target.closest('[data-asiento-id]');
  if (!boton || boton.disabled) {
    return;
  }
  const asiento = asientosActuales.find((item) => item.id === Number(boton.dataset.asientoId));
  if (!asiento || (asiento.situacion !== 'libre' && asiento.situacion !== 'fuera')) {
    return;
  }
  const dejarFuera = asiento.situacion === 'libre';
  const seguro = await Swal.fire({
    title: dejarFuera ? `¿Dejas el asiento ${asiento.numero_asiento} fuera de servicio?` : `¿Vuelves a poner el asiento ${asiento.numero_asiento} a la venta?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: dejarFuera ? 'Sí, dejarlo fuera' : 'Sí, ponerlo a la venta',
    cancelButtonText: 'Cancelar',
  });
  if (!seguro.isConfirmed) {
    return;
  }
  try {
    const data = await pedir(
      `/api/mantenimiento/vuelos/${vueloId}/asientos/${asiento.id}/${dejarFuera ? 'bloquear' : 'liberar'}`,
      'POST',
    );
    if (data) {
      pintarMapa(data.asientos || []);
      mostrarExito(dejarFuera
        ? `Asiento ${asiento.numero_asiento} fuera de servicio`
        : `Asiento ${asiento.numero_asiento} otra vez a la venta`);
    }
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'No se pudo guardar', text: error.message });
  }
});

const iniciar = async () => {
  try {
    if (vueloId) {
      const vuelo = await pedir(`/api/mantenimiento/vuelos/${vueloId}`);
      if (vuelo) {
        pintarDetalle(vuelo);
      }
      return;
    }
    const vuelos = await pedir('/api/mantenimiento/vuelos');
    if (vuelos) {
      pintarVuelos(vuelos);
    }
  } catch (error) {
    document.getElementById('estado-carga').textContent = error.message;
  }
};

iniciar();
