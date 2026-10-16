if (!localStorage.getItem('token')) {
  window.location.href = '/login.html';
} else if (localStorage.getItem('rol') !== 'admin') {
  window.location.href = '/index.html';
}

const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const escapar = (texto) => String(texto ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const formatearSalida = (valor) => {
  const coincidencia = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!coincidencia) {
    return '';
  }
  const dia = Number(coincidencia[3]);
  const mes = meses[Number(coincidencia[2]) - 1];
  return `${dia} ${mes} ${coincidencia[1]}, ${coincidencia[4]}:${coincidencia[5]}`;
};

const formatearPrecio = (monto) => `Q ${Number(monto).toFixed(2)}`;

const miniatura = (url) => {
  const ruta = String(url ?? '').trim();
  if (!ruta) {
    return '';
  }
  return `<img src="${escapar(ruta)}" alt="" class="h-12 w-12 rounded object-cover">`;
};

const aDatetimeLocal = (valor) => {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    return '';
  }
  const dosDigitos = (numero) => String(numero).padStart(2, '0');
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}T${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
};

let vuelosCargados = [];

const pintarVuelos = (vuelos) => {
  const cuerpo = document.getElementById('cuerpo-vuelos');
  if (vuelos.length === 0) {
    cuerpo.innerHTML = '<tr><td colspan="8" class="px-5 py-8 text-center text-sm text-slate-500">No hay vuelos registrados.</td></tr>';
    return;
  }

  cuerpo.innerHTML = vuelos.map((vuelo) => `
    <tr class="hover:bg-slate-50">
      <td class="px-5 py-4 font-medium text-slate-900">${escapar(vuelo.id)}</td>
      <td class="px-5 py-4">${miniatura(vuelo.imagen_url)}</td>
      <td class="px-5 py-4">${escapar(vuelo.origen)}</td>
      <td class="px-5 py-4">${escapar(vuelo.destino)}</td>
      <td class="px-5 py-4">${escapar(formatearSalida(vuelo.fecha_salida))}</td>
      <td class="px-5 py-4">${escapar(vuelo.capacidad_asientos)}</td>
      <td class="px-5 py-4">${escapar(formatearPrecio(vuelo.precio_base))}</td>
      <td class="px-5 py-4">
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
  pintarVuelos(vuelosCargados);
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

const prepararNuevoVuelo = () => {
  formulario.reset();
  document.getElementById('vuelo-id').value = '';
  document.getElementById('titulo-modal-vuelo').textContent = 'Agregar Nuevo Vuelo';
  mostrarVista('');
  reiniciarNombreArchivo();
  document.getElementById('campo-capacidad').classList.remove('hidden');
  document.getElementById('capacidad-asientos').value = 30;
  abrirModal();
};

const editarVuelo = (id) => {
  const vuelo = vuelosCargados.find((item) => String(item.id) === String(id));
  if (!vuelo) {
    return;
  }

  document.getElementById('titulo-modal-vuelo').textContent = 'Editar Vuelo';
  document.getElementById('vuelo-id').value = vuelo.id;
  document.getElementById('origen').value = vuelo.origen;
  document.getElementById('destino').value = vuelo.destino;
  document.getElementById('fecha-salida').value = aDatetimeLocal(vuelo.fecha_salida);
  document.getElementById('precio-base').value = Number(vuelo.precio_base);
  document.getElementById('imagen-archivo').value = '';
  reiniciarNombreArchivo();
  mostrarVista(vuelo.imagen_url || '');
  document.getElementById('campo-capacidad').classList.add('hidden');
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
    const respuesta = await fetch(`/api/vuelos/${id}`, { method: 'DELETE' });
    const data = await respuesta.json();

    if (!respuesta.ok) {
      Swal.fire({ icon: 'error', title: 'Oops...', text: data.mensaje || 'No se pudo eliminar el vuelo' });
      return;
    }

    avisarExito('Vuelo eliminado');
    await cargarVuelos();
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Oops...', text: error.message });
  }
};

const modal = document.getElementById('modal-vuelo');
const formulario = document.getElementById('form-vuelo');

const abrirModal = () => {
  modal.classList.remove('hidden');
  modal.classList.add('flex');
};

const cerrarModal = () => {
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  formulario.reset();
  document.getElementById('vuelo-id').value = '';
  document.getElementById('titulo-modal-vuelo').textContent = 'Agregar Nuevo Vuelo';
  mostrarVista('');
  reiniciarNombreArchivo();
};

document.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('token') || localStorage.getItem('rol') !== 'admin') {
    return;
  }

  document.getElementById('btn-cerrar-sesion').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('rol');
    localStorage.removeItem('nombre');
    localStorage.removeItem('usuario_id');
    window.location.href = '/login.html';
  });
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

    const id = document.getElementById('vuelo-id').value;
    const datos = new FormData();
    datos.append('origen', document.getElementById('origen').value.trim());
    datos.append('destino', document.getElementById('destino').value.trim());
    datos.append('fecha_salida', document.getElementById('fecha-salida').value);
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
        body: datos,
      });
      const data = await respuesta.json();

      if (!respuesta.ok) {
        Swal.fire({ icon: 'error', title: 'Oops...', text: data.mensaje || 'No se pudo guardar el vuelo' });
        return;
      }

      cerrarModal();
      avisarExito(id ? 'Vuelo actualizado' : 'Vuelo creado');
      await cargarVuelos();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Oops...', text: error.message });
    }
  });

  cargarVuelos().catch(() => {
    document.getElementById('cuerpo-vuelos').innerHTML = '<tr><td colspan="8" class="px-5 py-8 text-center text-sm text-slate-500">No se pudieron cargar los vuelos.</td></tr>';
  });
});
