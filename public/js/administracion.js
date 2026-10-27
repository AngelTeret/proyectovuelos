if (!tokenDeSesion()) {
  window.location.replace('/login');
} else if (rolDeSesion() !== 'admin') {
  window.location.replace('/');
}

const miniatura = (url) => {
  const ruta = String(url ?? '').trim();
  if (!ruta) {
    return '';
  }
  return `<img src="${escapar(ruta)}" alt="" class="h-12 w-12 rounded object-cover">`;
};

const aDatetimeLocal = (valor) => {
  const partes = partesGuatemala(valor);
  if (!partes?.hora) {
    return '';
  }
  const dosDigitos = (numero) => String(numero).padStart(2, '0');
  return `${partes.anio}-${dosDigitos(partes.mes)}-${dosDigitos(partes.dia)}T${partes.hora}:${partes.minuto}`;
};

let vuelosCargados = [];

const textoBusquedaVuelo = (vuelo) => {
  const partes = partesGuatemala(vuelo.fecha_salida);
  const corta = partes
    ? `${String(partes.dia).padStart(2, '0')}/${String(partes.mes).padStart(2, '0')}/${partes.anio}`
    : '';
  return sinAcentos(`${vuelo.origen} ${vuelo.destino} ${formatearSalida(vuelo.fecha_salida)} ${fechaCalendario(vuelo.fecha_salida)} ${corta}`);
};

const pintarConteo = (visibles, total) => {
  const nota = document.getElementById('conteo-vuelos');
  const consulta = document.getElementById('buscar-vuelo').value.trim();
  nota.textContent = consulta ? `${visibles} de ${total} vuelos` : '';
  nota.classList.toggle('hidden', !consulta);
};

const pintarVuelos = (vuelos, buscando = false) => {
  const cuerpo = document.getElementById('cuerpo-vuelos');
  pintarConteo(vuelos.length, vuelosCargados.length);
  if (vuelos.length === 0) {
    const mensaje = buscando ? 'No hay vuelos con ese dato.' : 'No hay vuelos registrados.';
    cuerpo.innerHTML = `<tr><td colspan="10" class="px-5 py-8 text-center text-sm text-slate-500">${mensaje}</td></tr>`;
    return;
  }

  cuerpo.innerHTML = vuelos.map((vuelo) => `
    <tr class="hover:bg-slate-50">
      <td data-etiqueta="Salida" class="px-5 py-4 font-medium text-slate-900">${escapar(formatearSalida(vuelo.fecha_salida))}</td>
      <td data-etiqueta="Origen" class="px-5 py-4">${escapar(vuelo.origen)}</td>
      <td data-etiqueta="Destino" class="px-5 py-4">${escapar(vuelo.destino)}</td>
      <td data-etiqueta="Duración" class="px-5 py-4">${escapar(textoDuracion(vuelo.duracion_minutos))}</td>
      <td data-etiqueta="Retraso" class="px-5 py-4">${escapar(Number(vuelo.retraso_minutos) > 0 ? textoDuracion(vuelo.retraso_minutos) : 'A tiempo')}</td>
      <td data-etiqueta="Capacidad" class="px-5 py-4">${escapar(vuelo.capacidad_asientos)}</td>
      <td data-etiqueta="Precio base" class="px-5 py-4">${escapar(quetzales(vuelo.precio_base))}</td>
      <td data-etiqueta="Imagen" class="px-5 py-4">${miniatura(vuelo.imagen_url)}</td>
      <td data-etiqueta="ID" class="px-5 py-4">${escapar(vuelo.id)}</td>
      <td data-etiqueta="Acciones" class="px-5 py-4">
        <div class="flex items-center gap-2">
          <button type="button" data-accion="editar" data-vuelo-id="${vuelo.id}" class="rounded-lg px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50">Editar</button>
          <button type="button" data-accion="eliminar" data-vuelo-id="${vuelo.id}" class="rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">Eliminar</button>
        </div>
      </td>
    </tr>
  `).join('');

  cuerpo.querySelectorAll('[data-accion="editar"]').forEach((boton) => {
    boton.addEventListener('click', () => editarVuelo(boton.dataset.vueloId));
  });

  cuerpo.querySelectorAll('[data-accion="eliminar"]').forEach((boton) => {
    boton.addEventListener('click', () => eliminarVuelo(boton.dataset.vueloId));
  });
};

const cargarVuelos = async () => {
  const respuesta = await fetch('/api/vuelos');
  if (!respuesta.ok) {
    throw new Error('No se pudieron cargar los vuelos');
  }
  vuelosCargados = await respuesta.json();
  aplicarBusquedaVuelos();
};

const aplicarBusquedaVuelos = () => {
  const consulta = sinAcentos(document.getElementById('buscar-vuelo').value.trim());
  const visibles = consulta
    ? vuelosCargados.filter((vuelo) => textoBusquedaVuelo(vuelo).includes(consulta))
    : vuelosCargados;
  pintarVuelos(visibles, Boolean(consulta));
};

let vistaTemporal = '';

const reiniciarNombreArchivo = () => {
  document.getElementById('nombre-archivo').textContent = 'Ningún archivo seleccionado';
};

const mostrarVista = (url) => {
  const imagen = document.getElementById('vista-imagen');
  if (vistaTemporal) {
    URL.revokeObjectURL(vistaTemporal);
    vistaTemporal = '';
  }
  if (!url) {
    imagen.removeAttribute('src');
    imagen.classList.add('hidden');
    return;
  }
  imagen.src = url;
  imagen.classList.remove('hidden');
};

const CAPACIDAD_MINIMA = 18;
const CAPACIDAD_MAXIMA = 102;
const CAPACIDAD_PASO = 6;

const llenarCapacidades = () => {
  const select = document.getElementById('capacidad-asientos');
  select.replaceChildren();
  for (let capacidad = CAPACIDAD_MINIMA; capacidad <= CAPACIDAD_MAXIMA; capacidad += CAPACIDAD_PASO) {
    const opcion = document.createElement('option');
    opcion.value = String(capacidad);
    opcion.textContent = `${capacidad} asientos`;
    opcion.selected = capacidad === 30;
    select.appendChild(opcion);
  }
};

const fechaMinimaLocal = () => `${fechaCalendario(new Date())}T00:00`;

const bloquearFechasPasadas = () => {
  const minimo = fechaMinimaLocal();
  document.querySelectorAll('#form-vuelo input[type="date"], #form-vuelo input[type="datetime-local"]').forEach((input) => {
    input.min = minimo;
  });
};

const prepararNuevoVuelo = () => {
  formulario.reset();
  document.getElementById('vuelo-id').value = '';
  document.getElementById('titulo-modal-vuelo').textContent = 'Agregar Nuevo Vuelo';
  mostrarVista('');
  reiniciarNombreArchivo();
  document.getElementById('campo-capacidad').classList.remove('hidden');
  document.getElementById('capacidad-asientos').value = 30;
  document.getElementById('duracion-horas').value = 2;
  document.getElementById('duracion-minutos').value = 0;
  document.getElementById('retraso-horas').value = 0;
  document.getElementById('retraso-minutos').value = 0;
  document.getElementById('campo-retraso').classList.add('hidden');
  buscadorOrigen.limpiar();
  buscadorDestino.limpiar();
  abrirModal();
};

const editarVuelo = (id) => {
  const vuelo = vuelosCargados.find((item) => String(item.id) === String(id));
  if (!vuelo) {
    return;
  }

  document.getElementById('titulo-modal-vuelo').textContent = 'Editar Vuelo';
  document.getElementById('vuelo-id').value = vuelo.id;
  buscadorOrigen.fijar(vuelo.origen);
  buscadorDestino.fijar(vuelo.destino);
  document.getElementById('fecha-salida').value = aDatetimeLocal(vuelo.fecha_programada || vuelo.fecha_salida);
  const minutos = Number(vuelo.duracion_minutos) || 120;
  document.getElementById('duracion-horas').value = Math.floor(minutos / 60);
  document.getElementById('duracion-minutos').value = minutos % 60;
  const retraso = Number(vuelo.retraso_minutos) || 0;
  document.getElementById('retraso-horas').value = Math.floor(retraso / 60);
  document.getElementById('retraso-minutos').value = retraso % 60;
  document.getElementById('precio-base').value = Number(vuelo.precio_base);
  document.getElementById('imagen-archivo').value = '';
  reiniciarNombreArchivo();
  mostrarVista(vuelo.imagen_url || '');
  document.getElementById('campo-capacidad').classList.add('hidden');
  document.getElementById('campo-retraso').classList.remove('hidden');
  abrirModal();
};

const avisarExito = (titulo) => {
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    title: titulo,
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
  });
};

const eliminarVuelo = async (id) => {
  const resultado = await Swal.fire({
    title: '¿Estás seguro?',
    text: 'No podrás revertir esto',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
  });

  if (!resultado.isConfirmed) {
    return;
  }

  try {
    const respuesta = await fetch(`/api/vuelos/${id}`, {
      method: 'DELETE',
      headers: autorizacion(),
    });
    const data = await respuesta.json();

    if (respuesta.status === 401) {
      cerrarSesionInvalida('/administracion', data.motivo);
      return;
    }

    if (!respuesta.ok) {
      Swal.fire({
        icon: respuesta.status === 400 ? 'warning' : 'error',
        title: respuesta.status === 400 ? 'No se puede eliminar' : 'No se pudo eliminar',
        text: data.mensaje || 'No se pudo eliminar el vuelo',
      });
      return;
    }

    avisarExito('Vuelo eliminado');
    await cargarVuelos();
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Oops...', text: error.message });
  }
};

const prepararBuscador = (id) => {
  const input = document.getElementById(id);
  const lista = document.getElementById(`lista-${id}`);
  let opciones = [...window.PAISES];
  let indice = -1;

  const cerrar = () => {
    lista.classList.add('hidden');
    lista.innerHTML = '';
    input.setAttribute('aria-expanded', 'false');
    indice = -1;
  };

  const pintar = (filtro) => {
    const consulta = sinAcentos(filtro.trim());
    const coincidencias = opciones.filter((pais) => sinAcentos(pais).includes(consulta));
    lista.innerHTML = coincidencias.length
      ? coincidencias.map((pais) => `<li role="option" class="cursor-pointer px-3 py-2 text-sm text-slate-700 hover:bg-blue-50" data-valor="${escapar(pais)}">${escapar(pais)}</li>`).join('')
      : '<li class="px-3 py-2 text-sm text-slate-400">Sin resultados</li>';
    lista.classList.remove('hidden');
    input.setAttribute('aria-expanded', 'true');
    indice = -1;
  };

  const elegir = (valor) => {
    input.value = valor;
    cerrar();
  };

  input.addEventListener('focus', () => pintar(input.value));
  input.addEventListener('input', () => pintar(input.value));
  lista.addEventListener('mousedown', (evento) => {
    const opcion = evento.target.closest('[data-valor]');
    if (!opcion) {
      return;
    }
    evento.preventDefault();
    elegir(opcion.dataset.valor);
  });
  input.addEventListener('blur', () => {
    const escrito = input.value.trim();
    const exacto = opciones.find((pais) => sinAcentos(pais) === sinAcentos(escrito));
    input.value = exacto || '';
    cerrar();
  });
  input.addEventListener('keydown', (evento) => {
    const items = [...lista.querySelectorAll('[data-valor]')];
    if (evento.key === 'ArrowDown' && items.length) {
      evento.preventDefault();
      indice = Math.min(indice + 1, items.length - 1);
    } else if (evento.key === 'ArrowUp' && items.length) {
      evento.preventDefault();
      indice = Math.max(indice - 1, 0);
    } else if (evento.key === 'Enter' && !lista.classList.contains('hidden')) {
      evento.preventDefault();
      const elegido = items[indice] || (items.length === 1 ? items[0] : null);
      if (elegido) {
        elegir(elegido.dataset.valor);
      }
      return;
    } else if (evento.key === 'Escape') {
      cerrar();
      return;
    } else {
      return;
    }
    items.forEach((item, posicion) => item.classList.toggle('bg-blue-50', posicion === indice));
    items[indice]?.scrollIntoView({ block: 'nearest' });
  });

  return {
    fijar(valor) {
      const actual = String(valor || '').trim();
      opciones = actual && !window.PAISES.includes(actual)
        ? [...window.PAISES, actual].sort((a, b) => a.localeCompare(b, 'es'))
        : [...window.PAISES];
      input.value = actual;
      cerrar();
    },
    limpiar() {
      opciones = [...window.PAISES];
      input.value = '';
      cerrar();
    },
    valido() {
      return opciones.includes(input.value.trim());
    },
  };
};

const buscadorOrigen = prepararBuscador('origen');
const buscadorDestino = prepararBuscador('destino');

const modal = document.getElementById('modal-vuelo');
const formulario = document.getElementById('form-vuelo');
const botonGuardar = document.getElementById('btn-guardar-vuelo');
const textoGuardar = botonGuardar.textContent;

const marcarGuardando = () => {
  botonGuardar.disabled = true;
  botonGuardar.textContent = 'Guardando...';
};

const restaurarGuardar = () => {
  botonGuardar.disabled = false;
  botonGuardar.textContent = textoGuardar;
};

const abrirModal = () => {
  bloquearFechasPasadas();
  modal.classList.remove('hidden');
  modal.classList.add('flex');
};

const cerrarModal = () => {
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  restaurarGuardar();
  formulario.reset();
  document.getElementById('vuelo-id').value = '';
  document.getElementById('titulo-modal-vuelo').textContent = 'Agregar Nuevo Vuelo';
  mostrarVista('');
  reiniciarNombreArchivo();
  buscadorOrigen.limpiar();
  buscadorDestino.limpiar();
};

document.addEventListener('DOMContentLoaded', () => {
  if (!tokenDeSesion() || rolDeSesion() !== 'admin') {
    return;
  }

  llenarCapacidades();
  bloquearFechasPasadas();

  document.getElementById('buscar-vuelo').addEventListener('input', aplicarBusquedaVuelos);
  document.getElementById('btn-nuevo-vuelo').addEventListener('click', prepararNuevoVuelo);
  document.getElementById('btn-cancelar-vuelo').addEventListener('click', cerrarModal);
  document.getElementById('imagen-archivo').addEventListener('change', () => {
    const archivo = document.getElementById('imagen-archivo').files[0];
    if (!archivo) {
      return;
    }
    if (vistaTemporal) {
      URL.revokeObjectURL(vistaTemporal);
    }
    vistaTemporal = URL.createObjectURL(archivo);
    document.getElementById('nombre-archivo').textContent = archivo.name;
    const imagen = document.getElementById('vista-imagen');
    imagen.src = vistaTemporal;
    imagen.classList.remove('hidden');
  });

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (botonGuardar.disabled) {
      return;
    }

    const id = document.getElementById('vuelo-id').value;
    const origen = document.getElementById('origen').value.trim();
    const destino = document.getElementById('destino').value.trim();
    if (!buscadorOrigen.valido() || !buscadorDestino.valido()) {
      Swal.fire({ icon: 'warning', title: 'Faltan datos', text: 'Elige un país de la lista para el origen y el destino.' });
      return;
    }
    const horas = Number(document.getElementById('duracion-horas').value);
    const minutosDuracion = Number(document.getElementById('duracion-minutos').value);
    const duracionTotal = (horas * 60) + minutosDuracion;
    if (!Number.isInteger(horas) || !Number.isInteger(minutosDuracion) || duracionTotal < 15 || duracionTotal > 1440) {
      Swal.fire({ icon: 'warning', title: 'Revisa la duración', text: 'Usa de 15 minutos a 24 horas.' });
      return;
    }
    let retrasoTotal = 0;
    if (id) {
      const horasRetraso = Number(document.getElementById('retraso-horas').value);
      const minutosRetraso = Number(document.getElementById('retraso-minutos').value);
      retrasoTotal = (horasRetraso * 60) + minutosRetraso;
      if (!Number.isInteger(horasRetraso) || !Number.isInteger(minutosRetraso) || retrasoTotal < 0 || retrasoTotal > 1440) {
        Swal.fire({ icon: 'warning', title: 'Revisa el retraso', text: 'Usa de 0 a 24 horas.' });
        return;
      }
    }

    marcarGuardando();

    const datos = new FormData();
    datos.append('origen', origen);
    datos.append('destino', destino);
    datos.append('fecha_salida', document.getElementById('fecha-salida').value);
    datos.append('duracion_minutos', String(duracionTotal));
    if (id) {
      datos.append('retraso_minutos', String(retrasoTotal));
    }
    datos.append('precio_base', document.getElementById('precio-base').value);
    const archivo = document.getElementById('imagen-archivo').files[0];
    if (archivo) {
      datos.append('imagen', archivo);
    }
    if (!id) {
      datos.append('capacidad_asientos', document.getElementById('capacidad-asientos').value || 30);
    }

    try {
      const respuesta = await fetch(id ? `/api/vuelos/${id}` : '/api/vuelos', {
        method: id ? 'PUT' : 'POST',
        headers: autorizacion(),
        body: datos,
      });
      const data = await respuesta.json();

      if (respuesta.status === 401) {
        cerrarSesionInvalida('/administracion', data.motivo);
        return;
      }

      if (!respuesta.ok) {
        restaurarGuardar();
        Swal.fire({ icon: 'error', title: 'Oops...', text: data.mensaje || 'No se pudo guardar el vuelo' });
        return;
      }

      cerrarModal();
      avisarExito(id ? 'Vuelo actualizado' : 'Vuelo creado');
      await cargarVuelos();
    } catch (error) {
      restaurarGuardar();
      Swal.fire({ icon: 'error', title: 'Oops...', text: error.message });
    }
  });

  cargarVuelos().catch(() => {
    document.getElementById('cuerpo-vuelos').innerHTML = '<tr><td colspan="10" class="px-5 py-8 text-center text-sm text-slate-500">No se pudieron cargar los vuelos.</td></tr>';
  });
});
