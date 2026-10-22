const params = new URLSearchParams(window.location.search);
const pnr = (params.get('pnr') || '').trim().toUpperCase();

const titulosTipo = { adulto: 'Adulto', nino: 'Niño', infante: 'Infante' };
const rangoCategoria = { Básica: 1, Estándar: 2, Premium: 3 };
const franquiciaAsiento = {
  Básica: {
    mano: false,
    bodega: 0,
    manoTexto: 'en Básica no entra',
    bodegaTexto: 'Básica no incluye bodega',
  },
  Estándar: {
    mano: true,
    bodega: 0,
    manoTexto: 'incluida en Estándar, hasta 10 kg',
    bodegaTexto: 'Estándar no incluye bodega',
  },
  Premium: {
    mano: true,
    bodega: 23,
    manoTexto: 'incluida en Premium, hasta 10 kg',
    bodegaTexto: 'Premium incluye una maleta de hasta 23 kg',
  },
};

const franquiciaDe = (categoria) => franquiciaAsiento[categoria] || franquiciaAsiento.Básica;

let reserva = null;
let mapaAsientos = [];
const maletaLocal = new Map();
const asientoElegido = new Map();
const cambiarAsiento = new Map();

const mostrar = (id) => {
  document.getElementById('estado-carga').classList.add('hidden');
  document.getElementById(id).classList.remove('hidden');
};

const mostrarError = (mensaje) => {
  document.getElementById('mensaje-error').textContent = mensaje || 'No se pudo abrir el check-in.';
  document.getElementById('panel-checkin').classList.add('hidden');
  mostrar('error-checkin');
};

const viajeroPorId = (id) => (reserva?.viajeros || []).find((viajero) => viajero.id === id);

const recordarDatos = (datos) => {
  reserva = datos;
  maletaLocal.clear();
  asientoElegido.clear();
  cambiarAsiento.clear();
  (datos.viajeros || []).forEach((viajero) => {
    maletaLocal.set(viajero.id, {
      mano: Number(viajero.maleta_mano) === 0 ? 0 : 1,
      bodega: Number(viajero.maleta_bodega_kg) || 0,
    });
    if (viajero.asiento_id) {
      asientoElegido.set(viajero.id, viajero.asiento_id);
    }
  });
};

const kilosBodega = () => {
  let suma = 0;
  (reserva?.viajeros || []).forEach((viajero) => {
    if (viajero.tipo === 'infante') {
      return;
    }
    suma += Number(maletaLocal.get(viajero.id)?.bodega) || 0;
  });
  return Math.round(suma * 10) / 10;
};

const categoriaDe = (viajero) => asientoActual(viajero)?.categoria || viajero.categoria || 'Básica';

const actualizarEquipaje = () => {
  const nodo = document.getElementById('equipaje');
  if (!reserva) {
    return;
  }
  nodo.textContent = '';
  nodo.classList.add('hidden');
};

const asientoActual = (viajero) => mapaAsientos.find((asiento) => asiento.id === asientoElegido.get(viajero.id))
  || mapaAsientos.find((asiento) => asiento.id === viajero.asiento_id);

const asientosPara = (viajero) => {
  const rango = rangoCategoria[viajero.categoria] || 1;
  const tomados = new Set();
  asientoElegido.forEach((asientoId, id) => {
    if (id !== viajero.id) {
      tomados.add(asientoId);
    }
  });
  return mapaAsientos.filter((asiento) => {
    if (asiento.id === asientoElegido.get(viajero.id)) {
      return true;
    }
    if (tomados.has(asiento.id) || asiento.rango > rango) {
      return false;
    }
    if (asiento.reserva_pasajero_id && asiento.reserva_pasajero_id !== viajero.id) {
      return false;
    }
    return asiento.libre || asiento.reserva_pasajero_id === viajero.id;
  });
};

const kilosEnBodega = (viajero) => {
  const sentados = (reserva?.viajeros || []).filter((item) => item.tipo !== 'infante' && item.asiento_id);
  const indice = sentados.findIndex((item) => item.id === viajero.id);
  const tope = Number(reserva?.equipaje_extra_kg) || 0;
  const parte = indice < 0 || tope <= 0
    ? 0
    : Math.floor(tope / sentados.length) + (indice < (tope % sentados.length) ? 1 : 0);
  const propia = viajero.categoria === 'Premium' ? 23 : 0;
  return propia + parte;
};

const reglasEquipaje = (viajero) => {
  if (viajero.tipo === 'infante' || !viajero.asiento_id) {
    return '<p class="mt-3 text-sm text-slate-600">Viaja en regazo, sin asiento ni equipaje.</p>';
  }
  const bodega = kilosEnBodega(viajero);
  const mano = viajero.categoria === 'Estándar' || viajero.categoria === 'Premium';
  const lineas = [];
  if (bodega > 0) {
    lineas.push(`Este boleto lleva ${bodega} kg en bodega.`);
  }
  lineas.push(mano
    ? 'Puede llevar maleta de mano de 10 kg.'
    : 'No puede llevar maleta de mano.');
  return `<p class="mt-3 text-sm text-slate-700">${lineas.map((linea) => escapar(linea)).join('<br>')}</p>`;
};

const mapaDeAsientos = (viajero) => {
  const elegido = asientoElegido.get(viajero.id);
  const porCategoria = new Map();
  asientosPara(viajero).forEach((asiento) => {
    const categoria = asiento.categoria || 'Básica';
    if (!porCategoria.has(categoria)) {
      porCategoria.set(categoria, new Map());
    }
    const numero = String(asiento.numero || '');
    const fila = numero.replace(/[A-Za-z]$/, '');
    const filas = porCategoria.get(categoria);
    if (!filas.has(fila)) {
      filas.set(fila, []);
    }
    filas.get(fila).push(asiento);
  });
  const orden = ['Premium', 'Estándar', 'Básica'].filter((categoria) => porCategoria.has(categoria));
  if (orden.length === 0) {
    return '<p class="mt-3 text-sm text-slate-500">No hay otro asiento libre para este boleto.</p>';
  }
  const nota = viajero.categoria === 'Básica'
    ? 'El asiento marcado es el que queda. Los demás están libres y el cambio no tiene costo.'
    : `El asiento marcado es el que queda. Puedes pasar a otro ${viajero.categoria} libre, o a uno de una categoría menor, sin costo.`;
  const bloques = orden.map((categoria) => {
    const filas = [...porCategoria.get(categoria).entries()].map(([fila, asientos]) => {
      const botones = asientos.map((asiento) => {
        const activo = asiento.id === elegido;
        const clase = activo
          ? 'bg-emerald-800 text-white'
          : 'bg-white text-emerald-900 hover:bg-emerald-100';
        return `<button type="button" data-elegir-asiento data-viajero="${viajero.id}" data-asiento="${asiento.id}" class="h-9 min-w-9 rounded-lg border border-emerald-200 px-2 text-sm font-semibold ${clase}">${escapar(asiento.numero)}</button>`;
      }).join('');
      return `<div class="flex flex-wrap items-center gap-1"><span class="w-6 text-xs text-slate-400">${escapar(fila)}</span>${botones}</div>`;
    }).join('');
    return `<div class="mt-3"><p class="text-sm font-semibold text-slate-800">${escapar(categoria)}</p><div class="mt-1 grid gap-1">${filas}</div></div>`;
  }).join('');
  return `<p class="mt-3 text-sm text-slate-600">${nota}</p>${bloques}`;
};

const textoSituacion = (viajero) => {
  const elegido = asientoActual(viajero);
  const distinto = elegido && elegido.id !== viajero.asiento_id;
  if (distinto) {
    return `Pasarías de ${viajero.numero_asiento} (${viajero.categoria}) a ${elegido.numero} (${elegido.categoria}). Al guardar, usas tu único cambio.`;
  }
  return `Tienes el ${viajero.numero_asiento}, categoría ${viajero.categoria}.`;
};

const zonaAsiento = (viajero) => {
  if (Number(viajero.cambios_asiento) >= 1) {
    return '<p class="mt-2 text-sm text-slate-600">Ya usaste tu cambio de asiento.</p>';
  }
  if (!reserva.abierto) {
    return '';
  }
  if (cambiarAsiento.get(viajero.id)) {
    return `<button type="button" data-cambiar="0" data-viajero="${viajero.id}" class="mt-3 h-9 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700">Cancelar</button>${mapaDeAsientos(viajero)}`;
  }
  return `<button type="button" data-cambiar="1" data-viajero="${viajero.id}" class="mt-3 h-9 rounded-lg border border-slate-900 bg-white px-4 text-sm font-semibold text-slate-900">Cambiar asiento</button>
    <p class="mt-2 text-sm text-slate-600">Puedes hacerlo una sola vez, sin costo, a un asiento libre de la misma categoría o de una menor.</p>`;
};

const preguntaAsiento = (viajero) => `
  <div class="mt-4 border-t border-emerald-100 pt-4">
    <p class="text-sm font-semibold text-slate-900">Asiento</p>
    <p data-situacion class="mt-1 text-sm text-slate-700">${escapar(textoSituacion(viajero))}</p>
    <div data-zona-asiento>${zonaAsiento(viajero)}</div>
  </div>`;

const marcarAsiento = (id) => {
  const viajero = viajeroPorId(id);
  const tarjeta = document.querySelector(`[data-tarjeta="${id}"]`);
  if (!viajero || !tarjeta) {
    return;
  }
  const elegido = asientoActual(viajero);
  const numero = tarjeta.querySelector('[data-numero-asiento]');
  if (numero) {
    numero.textContent = elegido?.numero || viajero.numero_asiento || 'Regazo';
  }
  const situacion = tarjeta.querySelector('[data-situacion]');
  if (situacion) {
    situacion.textContent = textoSituacion(viajero);
  }
  tarjeta.querySelectorAll('[data-elegir-asiento]').forEach((boton) => {
    const activo = Number(boton.dataset.asiento) === asientoElegido.get(id);
    boton.classList.toggle('bg-emerald-800', activo);
    boton.classList.toggle('text-white', activo);
    boton.classList.toggle('bg-white', !activo);
    boton.classList.toggle('text-emerald-900', !activo);
    boton.classList.toggle('hover:bg-emerald-100', !activo);
  });
  actualizarAcciones();
};

const controlesViaje = (viajero) => {
  if (viajero.tipo === 'infante' || !viajero.asiento_id) {
    return '';
  }
  if (viajero.codigo_boleto) {
    return '';
  }
  return preguntaAsiento(viajero);
};

const etiquetaViajero = (viajero) => String(viajero.nombre || '').trim() || String(viajero.apellido || '').trim() || 'Un pasajero';

const fraseNombres = (lista) => {
  const nombres = lista.map(etiquetaViajero);
  if (nombres.length === 1) {
    return nombres[0];
  }
  if (nombres.length === 2) {
    return `${nombres[0]} y ${nombres[1]}`;
  }
  return `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`;
};

const resumenAbordaje = () => {
  const viajeros = reserva?.viajeros || [];
  const entraron = viajeros.filter((viajero) => viajero.estado_checkin === 'abordado');
  const faltaron = viajeros.filter((viajero) => viajero.estado_checkin === 'no_show');
  const vuelo = String(reserva?.estado_vuelo || '').toLowerCase();
  const puerta = vuelo === 'abordando' || vuelo === 'cerrado' || vuelo === 'en curso' || vuelo === 'completado';
  const esperan = puerta
    ? viajeros.filter((viajero) => viajero.estado_checkin === 'chequeado')
    : [];
  const partes = [];
  if (entraron.length === 1) {
    partes.push(`${fraseNombres(entraron)} ya entró al avión.`);
  } else if (entraron.length > 1) {
    partes.push(`${fraseNombres(entraron)} ya entraron al avión.`);
  }
  if (faltaron.length === 1) {
    partes.push(`${fraseNombres(faltaron)} no se presentó.`);
  } else if (faltaron.length > 1) {
    partes.push(`${fraseNombres(faltaron)} no se presentaron.`);
  }
  if (esperan.length === 1) {
    partes.push(`${fraseNombres(esperan)} todavía no entra.`);
  } else if (esperan.length > 1) {
    partes.push(`${fraseNombres(esperan)} todavía no entran.`);
  }
  return partes.join(' ');
};

const situacionBoleto = (viajero) => {
  if (viajero.estado_checkin === 'abordado') {
    return { texto: 'Ya entró al avión', clase: 'text-emerald-800' };
  }
  if (viajero.estado_checkin === 'no_show') {
    return { texto: 'No se presentó', clase: 'text-slate-600' };
  }
  if (!viajero.codigo_boleto) {
    return null;
  }
  const vuelo = String(reserva?.estado_vuelo || '').toLowerCase();
  if (vuelo === 'abordando' || vuelo === 'cerrado' || vuelo === 'en curso' || vuelo === 'completado') {
    return { texto: 'Todavía no entra', clase: 'text-amber-800' };
  }
  return { texto: 'Tiene boleto. Lo muestra al entrar al avión.', clase: 'text-emerald-800' };
};

const pintarViajero = (viajero) => {
  const nombre = `${viajero.nombre || ''} ${viajero.apellido || ''}`.trim();
  const elegido = asientoActual(viajero);
  const asiento = elegido?.numero || viajero.numero_asiento || 'Regazo';
  const tipo = titulosTipo[viajero.tipo] || 'Pasajero';
  const listo = Boolean(viajero.codigo_boleto);
  const situacion = situacionBoleto(viajero);
  const infante = viajero.tipo === 'infante';
  const regazo = Array.isArray(viajero.infantes_en_regazo) && viajero.infantes_en_regazo.length
    ? `Infante en regazo: ${viajero.infantes_en_regazo.join(', ')}`
    : '';
  const incluido = infante || !reserva.abierto || listo;
  const casilla = incluido
    ? ''
    : `<input data-viajero data-tipo="${escapar(viajero.tipo)}" value="${Number(viajero.id)}" type="checkbox" class="mt-1 h-4 w-4" checked>`;
  return `
    <article data-tarjeta="${Number(viajero.id)}" class="overflow-hidden rounded-2xl border border-emerald-200">
      <div class="flex items-start justify-between gap-3 bg-emerald-950 px-4 py-3 text-white">
        <div class="flex min-w-0 items-start gap-3">
          ${casilla}
          <span class="min-w-0">
            <span class="block text-xs uppercase tracking-widest text-emerald-200">${escapar(tipo)}</span>
            <span class="block text-lg font-bold">${escapar(nombre)}</span>
            ${regazo ? `<span class="mt-1 block text-sm text-emerald-100">${escapar(regazo)}</span>` : ''}
          </span>
        </div>
        <span class="text-right">
          <span class="block text-xs uppercase tracking-widest text-emerald-200">Asiento</span>
          <span data-numero-asiento class="block text-3xl font-bold leading-none">${escapar(asiento)}</span>
        </span>
      </div>
      <div class="h-1.5 bg-[#8B2026]"></div>
      <div class="bg-emerald-50 px-4 py-3">
        ${situacion ? `<p class="text-sm font-semibold ${situacion.clase}">${escapar(situacion.texto)}</p>` : ''}
        ${listo ? `<p class="mt-1 text-sm font-semibold tracking-wide text-emerald-950">Boleto ${escapar(viajero.codigo_boleto)}</p>` : '<p class="text-sm text-emerald-800">El boleto se crea al confirmar el check-in.</p>'}
        ${reglasEquipaje(viajero)}
        ${controlesViaje(viajero)}
      </div>
    </article>`;
};

const pintar = (aviso) => {
  document.getElementById('pnr').textContent = reserva.codigo_pnr || pnr;
  document.getElementById('mensaje-checkin').textContent = resumenAbordaje() || reserva.mensaje || '';
  document.getElementById('ruta').textContent = `${reserva.origen || ''} → ${reserva.destino || ''}`;
  document.getElementById('salida').textContent = [formatearSalida(reserva.fecha_salida), retrasoVisible(reserva.retraso_minutos), duracionVisible(reserva.duracion_minutos)].filter(Boolean).join(' · ');
  document.getElementById('lista-viajeros').innerHTML = (reserva.viajeros || []).map(pintarViajero).join('');
  actualizarEquipaje();

  actualizarAcciones();

  const avisoCorreo = document.getElementById('aviso-correo');
  if (aviso) {
    avisoCorreo.textContent = aviso;
    avisoCorreo.classList.remove('hidden');
  }
  mostrar('panel-checkin');
};

const cambioPendiente = () => (reserva?.viajeros || []).some((viajero) => {
  if (viajero.tipo === 'infante' || !viajero.asiento_id || viajero.codigo_boleto || Number(viajero.cambios_asiento) >= 1) {
    return false;
  }
  const elegido = asientoElegido.get(viajero.id);
  return Number.isInteger(elegido) && elegido !== viajero.asiento_id;
});

const actualizarAcciones = () => {
  const viajeros = reserva?.viajeros || [];
  const hayBoletos = viajeros.some((viajero) => viajero.codigo_boleto);
  const faltaAlguien = viajeros.some((viajero) => !viajero.codigo_boleto);
  document.getElementById('btn-confirmar').classList.toggle('hidden', !(reserva?.abierto && faltaAlguien));
  document.getElementById('btn-guardar').classList.toggle('hidden', !(reserva?.abierto && hayBoletos && !faltaAlguien && cambioPendiente()));
  document.getElementById('btn-descargar').classList.toggle('hidden', !hayBoletos);
};

const idsElegidos = () => [...document.querySelectorAll('[data-viajero]:checked')]
  .filter((campo) => campo.dataset.tipo !== 'infante')
  .map((campo) => Number(campo.value))
  .filter((id) => Number.isInteger(id) && id > 0);

const leerMaletas = () => (reserva.viajeros || [])
  .filter((viajero) => viajero.tipo !== 'infante' && viajero.asiento_id)
  .map((viajero) => {
    const maleta = maletaLocal.get(viajero.id) || { bodega: 0 };
    return {
      id: viajero.id,
      maleta_mano: franquiciaDe(categoriaDe(viajero)).mano ? 1 : 0,
      maleta_bodega_kg: maleta.bodega,
    };
  });

const leerAsientos = () => (reserva.viajeros || [])
  .filter((viajero) => viajero.tipo !== 'infante' && viajero.asiento_id)
  .map((viajero) => ({
    id: viajero.id,
    asiento_id: asientoElegido.get(viajero.id) || viajero.asiento_id,
  }))
  .filter((cambio) => {
    const viajero = viajeroPorId(cambio.id);
    return viajero && cambio.asiento_id !== viajero.asiento_id;
  });

const validarMaletas = () => {
  const tope = Number(reserva.equipaje_extra_kg) || 0;
  if (kilosBodega() > tope) {
    Swal.fire({
      icon: 'warning',
      title: 'Revisa el equipaje',
      text: `Los kilos de bodega no pueden pasar de ${tope} kg.`,
    });
    return false;
  }
  return true;
};

const pedir = async (metodo, cuerpo) => {
  const respuesta = await fetch('/api/checkin', {
    method: metodo,
    headers: { ...autorizacion(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ codigo_pnr: pnr, ...cuerpo }),
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

const confirmar = async () => {
  const boton = document.getElementById('btn-confirmar');
  const viajeros = idsElegidos().filter((id) => !viajeroPorId(id)?.codigo_boleto);
  if (viajeros.length === 0) {
    Swal.fire({ icon: 'warning', title: 'Elige un viajero', text: 'Selecciona a quién vas a incluir en el check-in.' });
    return;
  }
  if (!validarMaletas()) {
    return;
  }
  const confirmacion = await Swal.fire({
    icon: 'question',
    title: '¿Confirmas el check-in?',
    text: 'Se crean los boletos de este viaje.',
    showCancelButton: true,
    confirmButtonText: 'Sí, confirmar',
    cancelButtonText: 'No',
    confirmButtonColor: '#065f46',
  });
  if (!confirmacion.isConfirmed) {
    return;
  }
  const textoBoton = boton.textContent;
  boton.disabled = true;
  boton.textContent = 'Confirmando…';
  try {
    const data = await pedir('POST', {
      viajeros,
      maletas: leerMaletas(),
      asientos: leerAsientos(),
    });
    if (!data) {
      return;
    }
    recordarDatos(data);
    await cargarAsientos();
    pintar();
    if (data.creados > 0) {
      Swal.fire({
        icon: 'success',
        title: 'Check-in listo',
        text: data.correo_enviado
          ? 'Los boletos se envían a tu correo y también puedes descargarlos aquí.'
          : 'Puedes descargar los boletos.',
        confirmButtonText: 'Listo',
      });
    }
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'No se pudo hacer el check-in', text: error.message || 'Intenta de nuevo.' });
  } finally {
    boton.textContent = textoBoton;
    boton.disabled = false;
  }
};

const guardar = async () => {
  const boton = document.getElementById('btn-guardar');
  if (!validarMaletas()) {
    return;
  }
  const textoBoton = boton.textContent;
  boton.disabled = true;
  boton.textContent = 'Guardando…';
  try {
    const data = await pedir('PUT', {
      maletas: leerMaletas(),
      asientos: leerAsientos(),
    });
    if (!data) {
      return;
    }
    recordarDatos(data);
    await cargarAsientos();
    pintar('Guardamos el asiento y el equipaje. El código del boleto no cambia.');
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'No se pudieron guardar los cambios', text: error.message || 'Intenta de nuevo.' });
  } finally {
    boton.textContent = textoBoton;
    boton.disabled = false;
  }
};

const cargarAsientos = async () => {
  mapaAsientos = [];
  if (!reserva?.abierto) {
    return;
  }
  const respuesta = await fetch(`/api/checkin/pnr/${pnr}/asientos`, { headers: autorizacion() });
  if (!respuesta.ok) {
    return;
  }
  const data = await respuesta.json().catch(() => ({}));
  mapaAsientos = Array.isArray(data.asientos) ? data.asientos : [];
};

const cargar = async () => {
  if (!/^[A-Z0-9]{6}$/.test(pnr)) {
    mostrarError('El código de reserva no es válido.');
    return;
  }
  try {
    const respuesta = await fetch(`/api/checkin/elegibilidad/${pnr}`, { headers: autorizacion() });
    if (respuesta.status === 401) {
      cerrarSesionInvalida(`${window.location.pathname}${window.location.search}`);
      return;
    }
    const data = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      mostrarError(data.mensaje);
      return;
    }
    recordarDatos(data);
    await cargarAsientos();
    pintar();
  } catch (error) {
    mostrarError('No se pudo abrir el check-in.');
  }
};

document.getElementById('lista-viajeros').addEventListener('input', (evento) => {
  const campo = evento.target.closest('[data-bodega]');
  if (!campo) {
    return;
  }
  const id = Number(campo.dataset.viajero);
  const actual = maletaLocal.get(id) || { mano: 1, bodega: 0 };
  const bodega = Math.round(Number(campo.value) * 10) / 10;
  maletaLocal.set(id, { ...actual, bodega: Number.isFinite(bodega) && bodega > 0 ? bodega : 0 });
  actualizarEquipaje();
});

document.getElementById('lista-viajeros').addEventListener('click', (evento) => {
  const cambiar = evento.target.closest('[data-cambiar]');
  if (cambiar) {
    const id = Number(cambiar.dataset.viajero);
    const si = cambiar.dataset.cambiar === '1';
    const viajero = viajeroPorId(id);
    cambiarAsiento.set(id, si);
    if (!si && viajero?.asiento_id) {
      asientoElegido.set(id, viajero.asiento_id);
    }
    const zona = document.querySelector(`[data-tarjeta="${id}"] [data-zona-asiento]`);
    if (!viajero || !zona) {
      pintar();
      return;
    }
    zona.innerHTML = zonaAsiento(viajero);
    marcarAsiento(id);
    return;
  }
  const boton = evento.target.closest('[data-elegir-asiento]');
  if (!boton) {
    return;
  }
  const id = Number(boton.dataset.viajero);
  const asientoId = Number(boton.dataset.asiento);
  if (!viajeroPorId(id) || !Number.isInteger(asientoId)) {
    return;
  }
  asientoElegido.set(id, asientoId);
  marcarAsiento(id);
});

document.getElementById('btn-confirmar').addEventListener('click', confirmar);
document.getElementById('btn-guardar').addEventListener('click', guardar);
document.getElementById('btn-descargar').addEventListener('click', (evento) => {
  descargarArchivo(`/api/checkin/pnr/${pnr}/pdf`, evento.currentTarget, 'boletos.pdf');
});

cargar();
