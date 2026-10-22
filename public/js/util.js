const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const escapar = (texto) => String(texto ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const quetzales = (monto) => `Q ${Number(monto || 0).toFixed(2)}`;

const sinAcentos = (texto) => String(texto ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

const CLAVES_DE_RESERVA = ['tempPasajero', 'datosPasajeros', 'datosAsientos', 'datosAsiento', 'bloqueoLlave'];

const liberarLlave = (llave) => {
  if (!llave) {
    return;
  }
  let vueloId = 0;
  try {
    vueloId = Number(JSON.parse(localStorage.getItem('busquedaVuelo') || '{}').vuelo_id) || 0;
  } catch {
    vueloId = 0;
  }
  if (!vueloId) {
    return;
  }
  fetch('/api/asientos/liberar', {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json', 'x-bloqueo-llave': llave },
    body: JSON.stringify({ vuelo_id: vueloId, llave, todos: true }),
  }).catch(() => {});
};

const borrarTemporal = (clave) => {
  localStorage.removeItem(clave);
  sessionStorage.removeItem(clave);
};

const guardarJsonTemporal = (clave, valor) => {
  sessionStorage.setItem(clave, JSON.stringify(valor));
  localStorage.removeItem(clave);
};

const leerJsonTemporal = (clave, vacio = {}) => {
  localStorage.removeItem(clave);
  try {
    const crudo = sessionStorage.getItem(clave);
    if (!crudo) {
      return vacio;
    }
    return JSON.parse(crudo) ?? vacio;
  } catch {
    sessionStorage.removeItem(clave);
    return vacio;
  }
};

const guardarTextoTemporal = (clave, valor) => {
  sessionStorage.setItem(clave, String(valor ?? ''));
  localStorage.removeItem(clave);
};

const leerTextoTemporal = (clave) => {
  localStorage.removeItem(clave);
  return sessionStorage.getItem(clave) || '';
};

const olvidarCopiasDurables = () => {
  const llaveLocal = localStorage.getItem('bloqueoLlave') || '';
  const llaveSesion = sessionStorage.getItem('bloqueoLlave') || '';
  if (llaveLocal && llaveLocal !== llaveSesion) {
    liberarLlave(llaveLocal);
  }
  CLAVES_DE_RESERVA.forEach((clave) => localStorage.removeItem(clave));
};

const abandonarReserva = () => {
  liberarLlave(sessionStorage.getItem('bloqueoLlave') || localStorage.getItem('bloqueoLlave') || '');
  CLAVES_DE_RESERVA.forEach(borrarTemporal);
};

const leerJson = (clave, vacio = {}) => {
  if (clave === 'tempPasajero' || clave === 'datosPasajeros' || clave === 'datosAsientos' || clave === 'datosAsiento') {
    return leerJsonTemporal(clave, vacio);
  }
  try {
    return JSON.parse(localStorage.getItem(clave)) || vacio;
  } catch {
    return vacio;
  }
};

const ZONA = 'America/Guatemala';

const partesDeInstante = (fecha) => {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(fecha);
  const tomar = (tipo) => partes.find((parte) => parte.type === tipo)?.value ?? '';
  return {
    anio: tomar('year'),
    mes: Number(tomar('month')),
    dia: Number(tomar('day')),
    hora: tomar('hour') === '24' ? '00' : tomar('hour'),
    minuto: tomar('minute'),
  };
};

const partesGuatemala = (valor) => {
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : partesDeInstante(valor);
  }

  const texto = String(valor ?? '').trim();
  const soloDia = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (soloDia) {
    return { anio: soloDia[1], mes: Number(soloDia[2]), dia: Number(soloDia[3]), hora: '', minuto: '' };
  }

  const fecha = new Date(texto);
  if (Number.isNaN(fecha.getTime())) {
    return null;
  }
  return partesDeInstante(fecha);
};

const fechaCalendario = (valor) => {
  const partes = partesGuatemala(valor);
  if (!partes) {
    return '';
  }
  const dosDigitos = (numero) => String(numero).padStart(2, '0');
  return `${partes.anio}-${dosDigitos(partes.mes)}-${dosDigitos(partes.dia)}`;
};

const textoDia = (partes) => `${partes.dia} ${meses[partes.mes - 1]} ${partes.anio}`;

const formatearDia = (valor) => {
  const partes = partesGuatemala(valor);
  return partes ? textoDia(partes) : '';
};

const formatearSalida = (valor) => {
  const partes = partesGuatemala(valor);
  if (!partes) {
    return '';
  }
  if (!partes.hora) {
    return textoDia(partes);
  }
  return `${textoDia(partes)}, ${partes.hora}:${partes.minuto}`;
};

const formatearFecha = (valor) => formatearSalida(valor);

const limpiarDatosPersonales = () => {
  abandonarReserva();
  ['redirectAfterLogin', 'reservaConfirmada', 'correoEnviado'].forEach((clave) => {
    localStorage.removeItem(clave);
    sessionStorage.removeItem(clave);
  });
};

const CLAVES_SESION = ['token', 'rol', 'nombre', 'usuario_id'];
const MINUTOS_INACTIVIDAD = 15;

const olvidarSesionDurable = () => {
  CLAVES_SESION.forEach((clave) => localStorage.removeItem(clave));
};

const leerDatoSesion = (clave) => {
  olvidarSesionDurable();
  return sessionStorage.getItem(clave) || '';
};

const tokenDeSesion = () => leerDatoSesion('token');

const rolDeSesion = () => leerDatoSesion('rol');

const nombreGuardado = () => leerDatoSesion('nombre');

const idUsuarioSesion = () => leerDatoSesion('usuario_id');

const guardarIdUsuario = (id) => {
  sessionStorage.setItem('usuario_id', String(id));
  localStorage.removeItem('usuario_id');
};

const guardarDatosSesion = ({ token, rol, nombre, usuarioId }) => {
  sessionStorage.setItem('token', token || '');
  sessionStorage.setItem('rol', rol || '');
  sessionStorage.setItem('nombre', nombre || '');
  if (usuarioId) {
    sessionStorage.setItem('usuario_id', String(usuarioId));
  } else {
    sessionStorage.removeItem('usuario_id');
  }
  olvidarSesionDurable();
  sessionStorage.setItem('sesionActiva', String(Date.now()));
};

const cerrarDatosSesion = () => {
  CLAVES_SESION.forEach((clave) => {
    localStorage.removeItem(clave);
    sessionStorage.removeItem(clave);
  });
  sessionStorage.removeItem('sesionActiva');
};

const autorizacion = () => {
  const token = tokenDeSesion();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const descargarBoleto = async (reservaId, boton) => {
  const texto = boton ? boton.textContent : '';
  if (boton) {
    boton.disabled = true;
    boton.textContent = 'Descargando...';
  }
  try {
    const respuesta = await fetch(`/api/reservas/${reservaId}/factura/pdf`, {
      headers: autorizacion(),
    });
    if (respuesta.status === 401) {
      localStorage.setItem('redirectAfterLogin', window.location.pathname);
      window.location.replace('/login.html');
      return;
    }
    if (!respuesta.ok) {
      const data = await respuesta.json().catch(() => ({}));
      Swal.fire({
        icon: 'error',
        title: 'No se pudo descargar',
        text: data.mensaje || 'Intenta de nuevo.',
      });
      return;
    }
    const archivo = await respuesta.blob();
    const disposicion = respuesta.headers.get('Content-Disposition') || '';
    const coincidencia = disposicion.match(/filename="([^"]+)"/);
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = coincidencia ? coincidencia[1] : 'factura.pdf';
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'No se pudo descargar', text: 'Intenta de nuevo.' });
  } finally {
    if (boton) {
      boton.disabled = false;
      boton.textContent = texto;
    }
  }
};

Object.assign(window, {
  escapar,
  quetzales,
  sinAcentos,
  leerJson,
  guardarJsonTemporal,
  leerJsonTemporal,
  guardarTextoTemporal,
  leerTextoTemporal,
  borrarTemporal,
  olvidarCopiasDurables,
  abandonarReserva,
  partesGuatemala,
  fechaCalendario,
  formatearDia,
  formatearSalida,
  formatearFecha,
  limpiarDatosPersonales,
  autorizacion,
  tokenDeSesion,
  rolDeSesion,
  nombreGuardado,
  idUsuarioSesion,
  guardarIdUsuario,
  guardarDatosSesion,
  cerrarDatosSesion,
  descargarBoleto,
});

const cerrarPorInactividad = () => {
  limpiarDatosPersonales();
  cerrarDatosSesion();
  sessionStorage.setItem('avisoSesion', 'inactiva');
  if (!location.pathname.endsWith('/login.html')) {
    location.replace('/login.html');
  }
};

const vencerSesionSiInactiva = () => {
  if (!sessionStorage.getItem('token')) {
    return;
  }
  const marca = Number(sessionStorage.getItem('sesionActiva') || 0);
  if (!marca) {
    sessionStorage.setItem('sesionActiva', String(Date.now()));
    return;
  }
  if (Date.now() - marca > MINUTOS_INACTIVIDAD * 60 * 1000) {
    cerrarPorInactividad();
  }
};

let ultimaActividad = 0;
const tocarActividad = () => {
  if (!sessionStorage.getItem('token')) {
    return;
  }
  const ahora = Date.now();
  if (ahora - ultimaActividad < 15000) {
    return;
  }
  ultimaActividad = ahora;
  sessionStorage.setItem('sesionActiva', String(ahora));
};

vencerSesionSiInactiva();
['pointerdown', 'keydown', 'input'].forEach((evento) => {
  window.addEventListener(evento, tocarActividad, { passive: true });
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    vencerSesionSiInactiva();
  }
});
window.setInterval(vencerSesionSiInactiva, 30000);
