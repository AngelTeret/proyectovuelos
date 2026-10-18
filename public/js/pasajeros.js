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

const valor = (id) => document.getElementById(id).value.trim();

const letras = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '\-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;
const correo = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const reglas = {
  nombre: {
    mensaje: 'El nombre solo puede contener letras',
    valido: (texto) => letras.test(texto),
  },
  apellido: {
    mensaje: 'El apellido solo puede contener letras',
    valido: (texto) => letras.test(texto),
  },
  documento_identidad: {
    mensaje: 'El documento debe tener entre 6 y 15 letras o números',
    valido: (texto) => /^[A-Za-z0-9]{6,15}$/.test(texto),
  },
  email: {
    mensaje: 'Ingresa un correo electrónico válido',
    valido: (texto) => correo.test(texto),
  },
  telefono: {
    mensaje: 'Ingresa un teléfono de 8 a 15 dígitos',
    valido: (texto) => /^\d{8,15}$/.test(texto),
  },
};

const escapar = (texto) => String(texto ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const sinAcentos = (texto) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

const etiquetaCodigo = (item) => `${item.pais} +${item.codigo}`;

let codigoTelefono = '';

const prepararCodigoTelefono = async () => {
  const respuesta = await fetch('/js/codigosTelefono.json');
  const catalogo = await respuesta.json();
  const input = document.getElementById('codigo-telefono');
  const lista = document.getElementById('lista-codigo-telefono');
  let indice = -1;

  const cerrar = () => {
    lista.classList.add('hidden');
    lista.innerHTML = '';
    input.setAttribute('aria-expanded', 'false');
    indice = -1;
  };

  const elegir = (item) => {
    codigoTelefono = item.codigo;
    input.value = etiquetaCodigo(item);
    cerrar();
    if (!document.getElementById('error-telefono').classList.contains('hidden')) {
      validarCampo('telefono');
    }
  };

  const pintar = (filtro) => {
    const consulta = sinAcentos(filtro.trim()).replace('+', '');
    const coincidencias = catalogo.filter((item) => {
      const texto = sinAcentos(`${item.pais} ${item.codigo}`);
      return texto.includes(consulta);
    });
    lista.innerHTML = coincidencias.length
      ? coincidencias.map((item) => `<li role="option" class="cursor-pointer px-3 py-2 text-sm text-slate-700 hover:bg-blue-50" data-codigo="${escapar(item.codigo)}" data-pais="${escapar(item.pais)}">${escapar(etiquetaCodigo(item))}</li>`).join('')
      : '<li class="px-3 py-2 text-sm text-slate-400">Sin resultados</li>';
    lista.classList.remove('hidden');
    input.setAttribute('aria-expanded', 'true');
    indice = -1;
  };

  input.addEventListener('focus', () => pintar(input.value));
  input.addEventListener('input', () => {
    codigoTelefono = '';
    pintar(input.value);
  });
  lista.addEventListener('mousedown', (evento) => {
    const opcion = evento.target.closest('[data-codigo]');
    if (!opcion) {
      return;
    }
    evento.preventDefault();
    elegir({ pais: opcion.dataset.pais, codigo: opcion.dataset.codigo });
  });
  input.addEventListener('blur', () => {
    const escrito = sinAcentos(input.value.trim());
    const exacto = catalogo.find((item) => sinAcentos(etiquetaCodigo(item)) === escrito);
    if (exacto) {
      elegir(exacto);
      return;
    }
    codigoTelefono = '';
    input.value = '';
    cerrar();
  });
  input.addEventListener('keydown', (evento) => {
    const items = [...lista.querySelectorAll('[data-codigo]')];
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
        elegir({ pais: elegido.dataset.pais, codigo: elegido.dataset.codigo });
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

  const guatemala = catalogo.find((item) => item.pais === 'Guatemala');
  if (guatemala) {
    elegir(guatemala);
  }
};

const telefonoCompleto = () => `+${codigoTelefono}${valor('telefono')}`;

const marcarCampo = (id, mensaje) => {
  const input = document.getElementById(id);
  const error = document.getElementById(`error-${id}`);
  input.setCustomValidity(mensaje);
  input.classList.toggle('border-red-400', Boolean(mensaje));
  input.classList.toggle('border-slate-200', !mensaje);
  error.textContent = mensaje;
  error.classList.toggle('hidden', !mensaje);
};

const validarCampo = (id) => {
  if (id === 'telefono' && !codigoTelefono) {
    marcarCampo(id, 'Elige un país para el código telefónico');
    return false;
  }
  const texto = valor(id);
  if (!texto) {
    marcarCampo(id, 'Este campo es obligatorio');
    return false;
  }
  if (!reglas[id].valido(texto)) {
    marcarCampo(id, reglas[id].mensaje);
    return false;
  }
  marcarCampo(id, '');
  return true;
};

const formularioValido = () => Object.keys(reglas).map(validarCampo).every(Boolean);

const limites = {
  nombre: 100,
  apellido: 100,
  documento_identidad: 15,
};

const prepararContador = (id) => {
  const input = document.getElementById(id);
  const contador = document.getElementById(`contador-${id}`);
  const maximo = limites[id];

  const pintarContador = () => {
    contador.textContent = `${input.value.length}/${maximo} caracteres`;
    contador.classList.remove('text-red-600');
    contador.classList.add('text-slate-500');
  };

  const avisarTope = () => {
    contador.textContent = `Máximo ${maximo} caracteres`;
    contador.classList.remove('text-slate-500');
    contador.classList.add('text-red-600');
  };

  input.addEventListener('beforeinput', (evento) => {
    if (!evento.data) {
      return;
    }
    const inicio = input.selectionStart ?? input.value.length;
    const fin = input.selectionEnd ?? inicio;
    const siguiente = input.value.slice(0, inicio) + evento.data + input.value.slice(fin);
    if (siguiente.length > maximo) {
      evento.preventDefault();
      avisarTope();
    }
  });

  input.addEventListener('input', pintarContador);
  pintarContador();
};

Object.keys(limites).forEach(prepararContador);

const rellenarDesdePerfil = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    return;
  }

  try {
    const respuesta = await fetch('/api/auth/perfil', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!respuesta.ok) {
      return;
    }
    const usuario = await respuesta.json();
    document.getElementById('nombre').value = usuario.nombre || '';
    document.getElementById('nombre').dispatchEvent(new Event('input'));
    document.getElementById('email').value = usuario.email || '';
    if (usuario.id) {
      localStorage.setItem('usuario_id', String(usuario.id));
    }
  } catch (error) {
    return;
  }
};

document.getElementById('btnVolver').addEventListener('click', (evento) => {
  evento.preventDefault();
  window.location.href = '/index.html';
});

Object.keys(reglas).forEach((id) => {
  const input = document.getElementById(id);
  input.addEventListener('blur', () => validarCampo(id));
  input.addEventListener('input', () => {
    if (!document.getElementById(`error-${id}`).classList.contains('hidden')) {
      validarCampo(id);
    }
  });
});

document.getElementById('telefono').addEventListener('beforeinput', (evento) => {
  if (!evento.data) {
    return;
  }
  const digitos = evento.data.replace(/\D/g, '');
  const input = evento.target;
  const inicio = input.selectionStart ?? input.value.length;
  const fin = input.selectionEnd ?? inicio;
  const siguiente = input.value.slice(0, inicio) + digitos + input.value.slice(fin);
  if (digitos !== evento.data || siguiente.length > 15) {
    evento.preventDefault();
    const cabe = Math.max(0, 15 - (input.value.length - (fin - inicio)));
    if (cabe > 0 && digitos) {
      const recorte = digitos.slice(0, cabe);
      input.value = input.value.slice(0, inicio) + recorte + input.value.slice(fin);
      const posicion = inicio + recorte.length;
      input.setSelectionRange(posicion, posicion);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (siguiente.length > 15) {
      marcarCampo('telefono', 'Máximo 15 dígitos');
    }
  }
});

document.getElementById('form-pasajero').addEventListener('submit', async (evento) => {
  evento.preventDefault();

  if (!formularioValido()) {
    const hayVacios = Object.keys(reglas).some((id) => !valor(id));
    Swal.fire(hayVacios
      ? { icon: 'warning', title: 'Faltan datos', text: 'Por favor completa todos los campos' }
      : { icon: 'warning', title: 'Revisa los datos', text: 'Corrige los campos marcados antes de continuar' });
    return;
  }

  const pasajero = {
    nombre: valor('nombre'),
    apellido: valor('apellido'),
    documento_identidad: valor('documento_identidad'),
    email: valor('email'),
    telefono: telefonoCompleto(),
  };

  try {
    const respuesta = await fetch('/api/pasajeros', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pasajero),
    });
    const data = await respuesta.json();

    if (!respuesta.ok) {
      Swal.fire({ icon: 'error', title: 'Oops...', text: data.mensaje || 'No se pudo guardar el pasajero' });
      return;
    }

    localStorage.setItem('datosPasajeros', JSON.stringify({
      ...pasajero,
      id: data.id,
      usuario_id: Number(localStorage.getItem('usuario_id')) || null,
    }));
    window.location.href = '/asientos.html';
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Oops...', text: 'No se pudo guardar el pasajero' });
  }
});

prepararCodigoTelefono().catch(() => {
  marcarCampo('telefono', 'No se pudo cargar el catálogo de códigos');
});
rellenarDesdePerfil();
