const valor = (id) => document.getElementById(id).value.trim();

const letras = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '\-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;
const correo = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CLAVE_BORRADOR = 'tempPasajero';
const MAXIMO = 4;
const titulos = { adulto: 'Adulto', nino: 'Niño', infante: 'Infante' };

let codigoTelefono = '';
let borradorActivo = false;
let fechaVuelo = '';
let catalogoPaises = [];
const conteo = { adulto: 1, nino: 0, infante: 0 };

if (!tokenDeSesion()) {
  abandonarReserva();
} else {
  olvidarCopiasDurables();
}

const etiquetaCodigo = (item) => `${item.pais} +${item.codigo}`;

const idDeSesion = () => {
  const token = tokenDeSesion() || '';
  const parte = token.split('.')[1];
  if (parte) {
    try {
      const json = JSON.parse(atob(parte.replace(/-/g, '+').replace(/_/g, '/')));
      if (json?.id) {
        return String(json.id);
      }
    } catch {
      /* El id guardado cubre un token que no se puede leer. */
    }
  }
  return idUsuarioSesion() || '';
};

const borrarBorrador = () => {
  borrarTemporal(CLAVE_BORRADOR);
};

const guardarBorrador = () => {
  if (!borradorActivo) {
    return;
  }
  if (!tokenDeSesion()) {
    borrarBorrador();
    return;
  }
  guardarJsonTemporal(CLAVE_BORRADOR, {
    usuarioId: idDeSesion(),
    conteo,
    email: document.getElementById('email').value,
    telefono: document.getElementById('telefono').value,
    codigo: codigoTelefono,
    etiquetaCodigo: document.getElementById('codigo-telefono').value,
    viajeros: leerTarjetas(),
  });
};

const leerBorrador = () => {
  if (!tokenDeSesion()) {
    borrarBorrador();
    return null;
  }
  const borrador = leerJsonTemporal(CLAVE_BORRADOR, null);
  if (!borrador) {
    return null;
  }
  const dueno = borrador.usuarioId ? String(borrador.usuarioId) : '';
  const actual = idDeSesion();
  const esDeOtraCuenta = (dueno && dueno !== actual) || (!dueno && actual);
  if (esDeOtraCuenta) {
    borrarBorrador();
    return null;
  }
  return borrador;
};

const prepararCodigoTelefono = async () => {
  const respuesta = await fetch('/js/codigosTelefono.json');
  const catalogo = await respuesta.json();
  catalogoPaises = [...new Map(catalogo.map((item) => [item.pais, item])).values()];
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
    guardarBorrador();
    if (!document.getElementById('error-telefono').classList.contains('hidden')) {
      validarContacto('telefono');
    }
  };

  const pintar = (filtro) => {
    const consulta = sinAcentos(filtro.trim()).replace('+', '');
    const coincidencias = catalogo.filter((item) => sinAcentos(`${item.pais} ${item.codigo}`).includes(consulta));
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
    guardarBorrador();
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
    guardarBorrador();
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
  return { catalogo, aplicarCodigo: elegir };
};

const telefonoCompleto = () => `+${codigoTelefono}${valor('telefono')}`;

const marcar = (input, error, mensaje) => {
  input.classList.toggle('border-red-400', Boolean(mensaje));
  input.classList.toggle('border-slate-200', !mensaje);
  if (error) {
    error.textContent = mensaje;
    error.classList.toggle('hidden', !mensaje);
  }
};

const validarContacto = (id) => {
  const input = document.getElementById(id);
  const error = document.getElementById(`error-${id}`);
  if (id === 'telefono' && !codigoTelefono) {
    marcar(input, error, 'Elige un país para el código telefónico');
    return false;
  }
  const texto = valor(id);
  if (!texto) {
    marcar(input, error, 'Este campo es obligatorio');
    return false;
  }
  if (id === 'email' && (!correo.test(texto) || texto.length > 255)) {
    marcar(input, error, 'Ingresa un correo electrónico válido');
    return false;
  }
  if (id === 'telefono' && !/^\d{8,15}$/.test(texto)) {
    marcar(input, error, 'Ingresa un teléfono de 8 a 15 dígitos');
    return false;
  }
  marcar(input, error, '');
  return true;
};

const edadAlVuelo = (nacimiento) => {
  if (!fechaVuelo || !nacimiento) {
    return -1;
  }
  const nace = new Date(`${nacimiento}T00:00:00Z`);
  const vuelo = new Date(`${fechaCalendario(fechaVuelo)}T00:00:00Z`);
  if (Number.isNaN(nace.getTime()) || Number.isNaN(vuelo.getTime())) {
    return -1;
  }
  let edad = vuelo.getUTCFullYear() - nace.getUTCFullYear();
  const mes = vuelo.getUTCMonth() - nace.getUTCMonth();
  if (mes < 0 || (mes === 0 && vuelo.getUTCDate() < nace.getUTCDate())) {
    edad -= 1;
  }
  return edad;
};

const mensajeEdad = (tipo) => {
  if (tipo === 'adulto') {
    return 'Un adulto debe tener 12 años o más.';
  }
  if (tipo === 'nino') {
    return 'Un niño debe tener entre 2 y 11 años.';
  }
  return 'Un infante debe tener menos de 2 años.';
};

const MAYORIA_EDAD = 18;

const edadCorrecta = (tipo, edad) => {
  if (tipo === 'adulto') {
    return edad >= 12;
  }
  if (tipo === 'nino') {
    return edad >= 2 && edad < 12;
  }
  return edad >= 0 && edad < 2;
};

const fechaDelVuelo = () => fechaCalendario(fechaVuelo);

const desplazarAnios = (iso, anios) => {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return new Date(Date.UTC(anio + anios, mes - 1, dia)).toISOString().slice(0, 10);
};

const nacionalidadOficial = (texto) => {
  const consulta = sinAcentos(String(texto || '').trim());
  const item = catalogoPaises.find((pais) => sinAcentos(pais.nacionalidad) === consulta || sinAcentos(pais.pais) === consulta);
  return item?.nacionalidad || '';
};

const prepararNacionalidad = (tarjeta, indice) => {
  const input = tarjeta.querySelector('[data-campo="nacionalidad"]');
  const lista = tarjeta.querySelector('[data-lista="nacionalidad"]');
  let indiceActivo = -1;

  const cerrar = () => {
    lista.classList.add('hidden');
    lista.innerHTML = '';
    input.setAttribute('aria-expanded', 'false');
    indiceActivo = -1;
  };

  const pintar = (filtro) => {
    const consulta = sinAcentos(filtro.trim());
    const coincidencias = catalogoPaises
      .filter((item) => !consulta || sinAcentos(`${item.nacionalidad} ${item.pais}`).includes(consulta))
      .sort((a, b) => a.nacionalidad.localeCompare(b.nacionalidad, 'es'));
    lista.innerHTML = coincidencias.length
      ? coincidencias.map((item) => `<li role="option" class="cursor-pointer px-3 py-2 text-sm text-slate-700 hover:bg-blue-50" data-valor="${escapar(item.nacionalidad)}">${escapar(item.nacionalidad)}</li>`).join('')
      : '<li class="px-3 py-2 text-sm text-slate-400">Sin resultados</li>';
    lista.classList.remove('hidden');
    input.setAttribute('aria-expanded', 'true');
    indiceActivo = -1;
  };

  const elegir = (nacionalidad) => {
    input.value = nacionalidad;
    cerrar();
    validarCampo(tarjeta, 'nacionalidad');
    guardarBorrador();
  };

  input.addEventListener('focus', () => pintar(input.value));
  input.addEventListener('input', () => {
    pintar(input.value);
    guardarBorrador();
    const error = tarjeta.querySelector('[data-error="nacionalidad"]');
    if (error && !error.classList.contains('hidden')) {
      validarCampo(tarjeta, 'nacionalidad');
    }
  });
  lista.addEventListener('mousedown', (evento) => {
    const opcion = evento.target.closest('[data-valor]');
    if (!opcion) {
      return;
    }
    evento.preventDefault();
    elegir(opcion.dataset.valor);
  });
  input.addEventListener('blur', () => {
    const oficial = nacionalidadOficial(input.value);
    input.value = oficial;
    cerrar();
    validarCampo(tarjeta, 'nacionalidad');
    guardarBorrador();
  });
  input.addEventListener('keydown', (evento) => {
    const items = [...lista.querySelectorAll('[data-valor]')];
    if (evento.key === 'ArrowDown' && items.length) {
      evento.preventDefault();
      indiceActivo = Math.min(indiceActivo + 1, items.length - 1);
    } else if (evento.key === 'ArrowUp' && items.length) {
      evento.preventDefault();
      indiceActivo = Math.max(indiceActivo - 1, 0);
    } else if (evento.key === 'Enter' && !lista.classList.contains('hidden')) {
      evento.preventDefault();
      const elegido = items[indiceActivo] || (items.length === 1 ? items[0] : null);
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
    items.forEach((item, posicion) => item.classList.toggle('bg-blue-50', posicion === indiceActivo));
    items[indiceActivo]?.scrollIntoView({ block: 'nearest' });
  });
  input.setAttribute('aria-controls', `lista-nacionalidad-${indice}`);
};

const leerTarjetas = () => [...document.querySelectorAll('[data-viajero]')].map((tarjeta) => ({
  tipo: tarjeta.dataset.tipo,
  nombre: tarjeta.querySelector('[data-campo="nombre"]').value,
  apellido: tarjeta.querySelector('[data-campo="apellido"]').value,
  documento_identidad: tarjeta.querySelector('[data-campo="documento"]').value,
  fecha_nacimiento: tarjeta.querySelector('[data-campo="nacimiento"]').value,
  nacionalidad: tarjeta.querySelector('[data-campo="nacionalidad"]').value,
}));

const pintarConteo = () => {
  Object.keys(conteo).forEach((tipo) => {
    document.getElementById(`cuenta-${tipo}`).textContent = String(conteo[tipo]);
  });
};

const totalViajeros = () => conteo.adulto + conteo.nino + conteo.infante;

const limitesFecha = () => {
  const maximo = fechaDelVuelo();
  return {
    min: maximo ? desplazarAnios(maximo, -120) : '',
    max: maximo,
  };
};

const mensajeNacimiento = (tipo, nacimiento) => {
  if (!nacimiento) {
    return 'Ingresa la fecha de nacimiento';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nacimiento)) {
    return 'Ingresa una fecha de nacimiento válida';
  }
  const limite = fechaDelVuelo();
  if (!limite) {
    return 'No se pudo leer la fecha del vuelo';
  }
  if (nacimiento > limite) {
    return 'La fecha no puede ser posterior al día del vuelo';
  }
  if (nacimiento < desplazarAnios(limite, -120)) {
    return 'Ingresa una fecha de nacimiento válida';
  }
  if (!edadCorrecta(tipo, edadAlVuelo(nacimiento))) {
    return mensajeEdad(tipo);
  }
  return '';
};

const mensajeCampo = (tarjeta, campo) => {
  const input = tarjeta.querySelector(`[data-campo="${campo}"]`);
  const texto = input.value.trim();
  if (campo === 'nombre') {
    if (!texto) return 'Este campo es obligatorio';
    return letras.test(texto) ? '' : 'El nombre solo puede contener letras';
  }
  if (campo === 'apellido') {
    if (!texto) return 'Este campo es obligatorio';
    return letras.test(texto) ? '' : 'El apellido solo puede contener letras';
  }
  if (campo === 'documento') {
    if (!texto) return 'Este campo es obligatorio';
    if (!/^[A-Za-z0-9]{6,15}$/.test(texto)) return 'El documento debe tener entre 6 y 15 letras o números';
    const repetido = [...document.querySelectorAll('[data-campo="documento"]')].some((otro) => (
      otro !== input && otro.value.trim().toUpperCase() === texto.toUpperCase()
    ));
    return repetido ? 'Este documento ya está en otro viajero' : '';
  }
  if (campo === 'nacionalidad') {
    if (!texto) return 'Elige una nacionalidad';
    return nacionalidadOficial(texto) ? '' : 'Elige una nacionalidad de la lista';
  }
  if (campo === 'nacimiento') {
    return mensajeNacimiento(tarjeta.dataset.tipo, input.value);
  }
  return '';
};

const validarCampo = (tarjeta, campo) => {
  const input = tarjeta.querySelector(`[data-campo="${campo}"]`);
  const mensaje = mensajeCampo(tarjeta, campo);
  marcar(input, tarjeta.querySelector(`[data-error="${campo}"]`), mensaje);
  return !mensaje;
};

const limitesCampo = {
  nombre: 100,
  apellido: 100,
  documento: 15,
};

const prepararContador = (tarjeta, campo) => {
  const input = tarjeta.querySelector(`[data-campo="${campo}"]`);
  const contador = tarjeta.querySelector(`[data-contador="${campo}"]`);
  const maximo = limitesCampo[campo];

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

const pintarViajeros = (previos = []) => {
  const lista = document.getElementById('lista-viajeros');
  const limites = limitesFecha();
  const orden = ['adulto', 'nino', 'infante'];
  const tarjetas = [];
  orden.forEach((tipo) => {
    for (let numero = 0; numero < conteo[tipo]; numero += 1) {
      const previo = previos.find((item) => item.tipo === tipo && !item.usado);
      if (previo) {
        previo.usado = true;
      }
      tarjetas.push({ tipo, datos: previo || {} });
    }
  });
  lista.innerHTML = tarjetas.map((tarjeta, indice) => `
    <article data-viajero data-tipo="${tarjeta.tipo}" class="rounded-xl border border-slate-200 px-4 py-5 sm:px-5">
      <h3 class="text-sm font-semibold text-slate-900">${titulos[tarjeta.tipo]} ${indice + 1}</h3>
      <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label>
          <span class="mb-1.5 block text-xs font-medium text-slate-600">Nombre <span class="text-red-500">*</span></span>
          <input data-campo="nombre" maxlength="100" value="${escapar(tarjeta.datos.nombre || '')}" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400">
          <p data-contador="nombre" class="mt-1 text-xs text-slate-500" aria-live="polite">0/100 caracteres</p>
          <p data-error="nombre" class="mt-1 hidden text-xs text-red-600"></p>
        </label>
        <label>
          <span class="mb-1.5 block text-xs font-medium text-slate-600">Apellido <span class="text-red-500">*</span></span>
          <input data-campo="apellido" maxlength="100" value="${escapar(tarjeta.datos.apellido || '')}" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400">
          <p data-contador="apellido" class="mt-1 text-xs text-slate-500" aria-live="polite">0/100 caracteres</p>
          <p data-error="apellido" class="mt-1 hidden text-xs text-red-600"></p>
        </label>
        <label>
          <span class="mb-1.5 block text-xs font-medium text-slate-600">Fecha de nacimiento <span class="text-red-500">*</span></span>
          <input data-campo="nacimiento" type="date" min="${limites.min}" max="${limites.max}" value="${escapar(tarjeta.datos.fecha_nacimiento || '')}" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400">
          <p data-error="nacimiento" class="mt-1 hidden text-xs text-red-600"></p>
        </label>
        <label>
          <span class="mb-1.5 block text-xs font-medium text-slate-600">Nacionalidad <span class="text-red-500">*</span></span>
          <div class="relative">
            <input data-campo="nacionalidad" type="text" autocomplete="off" placeholder="Busca una nacionalidad" role="combobox" aria-expanded="false" aria-controls="lista-nacionalidad-${indice}" value="${escapar(nacionalidadOficial(tarjeta.datos.nacionalidad) || tarjeta.datos.nacionalidad || '')}" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400">
            <ul id="lista-nacionalidad-${indice}" data-lista="nacionalidad" role="listbox" class="absolute z-20 mt-1 hidden max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"></ul>
          </div>
          <p data-error="nacionalidad" class="mt-1 hidden text-xs text-red-600"></p>
        </label>
        <label class="sm:col-span-2">
          <span class="mb-1.5 block text-xs font-medium text-slate-600">Documento de identidad <span class="text-red-500">*</span></span>
          <input data-campo="documento" maxlength="15" value="${escapar(tarjeta.datos.documento_identidad || '')}" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400">
          <p data-contador="documento" class="mt-1 text-xs text-slate-500" aria-live="polite">0/15 caracteres</p>
          <p data-error="documento" class="mt-1 hidden text-xs text-red-600"></p>
        </label>
      </div>
    </article>
  `).join('');
  lista.querySelectorAll('[data-viajero]').forEach((tarjeta, indice) => {
    prepararNacionalidad(tarjeta, indice);
    Object.keys(limitesCampo).forEach((campo) => prepararContador(tarjeta, campo));
    tarjeta.querySelectorAll('[data-campo]').forEach((campo) => {
      if (campo.dataset.campo === 'nacionalidad') {
        return;
      }
      campo.addEventListener('input', () => {
        guardarBorrador();
        const error = tarjeta.querySelector(`[data-error="${campo.dataset.campo}"]`);
        if (campo.dataset.campo === 'nacimiento' || (error && !error.classList.contains('hidden'))) {
          validarCampo(tarjeta, campo.dataset.campo);
        }
      });
      campo.addEventListener('change', () => {
        if (campo.dataset.campo === 'nacimiento') {
          validarCampo(tarjeta, 'nacimiento');
          guardarBorrador();
          const aviso = mensajeResponsable();
          if (aviso) {
            Swal.fire({ icon: 'warning', title: 'Infante sin mayor de edad', text: aviso });
          }
        }
      });
      campo.addEventListener('blur', () => {
        validarCampo(tarjeta, campo.dataset.campo);
        guardarBorrador();
      });
    });
  });
};

const validarTarjeta = (tarjeta) => ['nombre', 'apellido', 'documento', 'nacimiento', 'nacionalidad'].every((campo) => validarCampo(tarjeta, campo));

const responsablesDeInfante = () => [...document.querySelectorAll('[data-viajero]')].filter((tarjeta) => (
  tarjeta.dataset.tipo === 'adulto' && edadAlVuelo(tarjeta.querySelector('[data-campo="nacimiento"]').value) >= MAYORIA_EDAD
)).length;

const mensajeResponsable = () => {
  if (conteo.infante < 1) {
    return '';
  }
  const adultos = [...document.querySelectorAll('[data-viajero]')].filter((tarjeta) => tarjeta.dataset.tipo === 'adulto');
  const faltanFechas = adultos.some((tarjeta) => !tarjeta.querySelector('[data-campo="nacimiento"]').value);
  if (faltanFechas || responsablesDeInfante() >= conteo.infante) {
    return '';
  }
  return 'Un infante solo puede ir con una persona que tenga 18 años o más.';
};

document.querySelectorAll('[data-delta]').forEach((boton) => {
  boton.addEventListener('click', () => {
    const tipo = boton.dataset.tipo;
    const delta = Number(boton.dataset.delta);
    const siguiente = conteo[tipo] + delta;
    if (siguiente < 0) {
      return;
    }
    if (tipo === 'adulto' && siguiente < 1) {
      Swal.fire({ icon: 'warning', title: 'Falta un adulto', text: 'Debe viajar al menos un adulto.' });
      return;
    }
    if (delta > 0 && totalViajeros() >= MAXIMO) {
      Swal.fire({ icon: 'warning', title: 'Máximo 4 viajeros', text: 'Una reserva puede incluir hasta 4 personas.' });
      return;
    }
    if (tipo === 'infante' && delta > 0 && siguiente > conteo.adulto) {
      Swal.fire({ icon: 'warning', title: 'Infante sin adulto', text: 'Cada adulto puede viajar con un solo infante.' });
      return;
    }
    if (tipo === 'infante' && delta > 0 && responsablesDeInfante() < siguiente && ![...document.querySelectorAll('[data-viajero]')].some((tarjeta) => tarjeta.dataset.tipo === 'adulto' && !tarjeta.querySelector('[data-campo="nacimiento"]').value)) {
      Swal.fire({ icon: 'warning', title: 'Infante sin mayor de edad', text: 'Un infante solo puede ir con una persona que tenga 18 años o más.' });
      return;
    }
    if (tipo === 'adulto' && delta < 0 && conteo.infante > siguiente) {
      Swal.fire({ icon: 'warning', title: 'Infante sin adulto', text: 'Quita un infante antes de quitar a este adulto.' });
      return;
    }
    const previos = leerTarjetas().map((item) => ({ ...item, usado: false }));
    conteo[tipo] = siguiente;
    pintarConteo();
    pintarViajeros(previos);
    guardarBorrador();
  });
});

document.getElementById('btnVolver').addEventListener('click', (evento) => {
  evento.preventDefault();
  window.location.href = '/index.html';
});

['email', 'telefono'].forEach((id) => {
  const input = document.getElementById(id);
  input.addEventListener('blur', () => {
    validarContacto(id);
    guardarBorrador();
  });
  input.addEventListener('input', () => {
    guardarBorrador();
    if (!document.getElementById(`error-${id}`).classList.contains('hidden')) {
      validarContacto(id);
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
      marcar(input, document.getElementById('error-telefono'), 'Máximo 15 dígitos');
    }
  }
});

document.getElementById('form-pasajero').addEventListener('submit', (evento) => {
  evento.preventDefault();
  const contactoValido = ['email', 'telefono'].every(validarContacto);
  const tarjetas = [...document.querySelectorAll('[data-viajero]')];
  const viajerosValidos = tarjetas.map(validarTarjeta).every(Boolean);
  const viajeros = leerTarjetas().map((viajero) => ({
    ...viajero,
    nombre: viajero.nombre.trim(),
    apellido: viajero.apellido.trim(),
    documento_identidad: viajero.documento_identidad.trim(),
  }));
  const documentos = viajeros.map((viajero) => viajero.documento_identidad.toUpperCase());
  const repetido = documentos.some((documento, indice) => documento && documentos.indexOf(documento) !== indice);
  if (!contactoValido || !viajerosValidos || repetido) {
    Swal.fire({
      icon: 'warning',
      title: repetido ? 'Documento repetido' : 'Revisa los datos',
      text: repetido ? 'Cada viajero debe tener un documento distinto.' : 'Corrige los campos marcados antes de continuar',
    });
    return;
  }
  if (conteo.infante > conteo.adulto) {
    Swal.fire({ icon: 'warning', title: 'Infante sin adulto', text: 'Cada adulto puede viajar con un solo infante.' });
    return;
  }
  const avisoResponsable = mensajeResponsable();
  if (avisoResponsable) {
    Swal.fire({ icon: 'warning', title: 'Infante sin mayor de edad', text: avisoResponsable });
    return;
  }

  guardarJsonTemporal('datosPasajeros', {
    email: valor('email'),
    telefono: telefonoCompleto(),
    viajeros,
    usuario_id: Number(idUsuarioSesion()) || null,
  });
  borrarTemporal('datosAsiento');
  borrarTemporal('datosAsientos');
  window.location.href = '/asientos.html';
});

const cargarFechaVuelo = async () => {
  const busqueda = leerJson('busquedaVuelo');
  const respuesta = await fetch('/api/vuelos');
  if (!respuesta.ok) {
    return;
  }
  const vuelos = await respuesta.json();
  const vuelo = vuelos.find((item) => Number(item.id) === Number(busqueda.vuelo_id));
  if (busqueda.vuelo_id && (!vuelo || !vueloEnVenta(vuelo))) {
    abandonarReserva();
    localStorage.removeItem('busquedaVuelo');
    await Swal.fire({
      icon: 'warning',
      title: 'Este vuelo ya no se puede comprar',
      text: 'El check-in cierra una hora antes de la salida.',
    });
    window.location.replace('/index.html');
    return;
  }
  fechaVuelo = vuelo?.fecha_salida || '';
};

const rellenarContacto = async () => {
  const token = tokenDeSesion();
  if (!token) {
    return;
  }
  try {
    const respuesta = await fetch('/api/auth/perfil', { headers: autorizacion() });
    if (await cerrarSiSesionRechazada(respuesta, '/pasajeros.html')) {
      return;
    }
    if (!respuesta.ok) {
      return;
    }
    const usuario = await respuesta.json();
    if (!document.getElementById('email').value) {
      document.getElementById('email').value = usuario.email || '';
    }
    if (usuario.id) {
      guardarIdUsuario(usuario.id);
    }
  } catch (error) {
    return;
  }
};

const vaciarFormularioInvitado = () => {
  if (tokenDeSesion()) {
    return;
  }
  conteo.adulto = 1;
  conteo.nino = 0;
  conteo.infante = 0;
  pintarConteo();
  const email = document.getElementById('email');
  const telefono = document.getElementById('telefono');
  const codigo = document.getElementById('codigo-telefono');
  if (email) {
    email.value = '';
    marcar(email, document.getElementById('error-email'), '');
  }
  if (telefono) {
    telefono.value = '';
    marcar(telefono, document.getElementById('error-telefono'), '');
  }
  if (codigo) {
    codigo.value = '';
    marcar(codigo, null, '');
  }
  codigoTelefono = '';
  document.getElementById('lista-codigo-telefono')?.classList.add('hidden');
  pintarViajeros([]);
  borradorActivo = true;
};

const iniciarFormulario = async () => {
  const codigo = await prepararCodigoTelefono();
  await cargarFechaVuelo();
  const borrador = leerBorrador();
  if (borrador && !Array.isArray(borrador.viajeros) && borrador.nombre) {
    borrador.viajeros = [{
      tipo: 'adulto',
      nombre: borrador.nombre,
      apellido: borrador.apellido || '',
      documento_identidad: borrador.documento_identidad || '',
      fecha_nacimiento: '',
      nacionalidad: '',
    }];
  }
  if (borrador?.conteo) {
    conteo.adulto = Math.max(1, Number(borrador.conteo.adulto) || 1);
    conteo.nino = Math.max(0, Number(borrador.conteo.nino) || 0);
    conteo.infante = Math.max(0, Number(borrador.conteo.infante) || 0);
  }
  pintarConteo();
  pintarViajeros((borrador?.viajeros || []).map((item) => ({ ...item, usado: false })));
  if (borrador?.email) {
    document.getElementById('email').value = borrador.email;
  }
  if (borrador?.telefono) {
    document.getElementById('telefono').value = borrador.telefono;
  }
  const item = codigo.catalogo.find((pais) => etiquetaCodigo(pais) === borrador?.etiquetaCodigo)
    || codigo.catalogo.find((pais) => pais.codigo === borrador?.codigo);
  if (item) {
    codigo.aplicarCodigo(item);
  }
  await rellenarContacto();
  borradorActivo = true;
};

window.addEventListener('pageshow', (evento) => {
  if (!evento.persisted || tokenDeSesion()) {
    return;
  }
  abandonarReserva();
  vaciarFormularioInvitado();
});

iniciarFormulario().catch(() => {
  marcar(document.getElementById('telefono'), document.getElementById('error-telefono'), 'No se pudo cargar el catálogo de códigos');
});
