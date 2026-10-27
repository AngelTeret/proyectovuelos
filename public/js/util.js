const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const escapar = (texto) => String(texto ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const quetzales = (monto) => `Q ${Number(monto || 0).toFixed(2)}`;

const textoDuracion = (minutos) => {
  const total = Number(minutos);
  if (!Number.isInteger(total) || total <= 0) {
    return '';
  }
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  const horasTexto = horas === 1 ? '1 hora' : `${horas} horas`;
  const minutosTexto = resto === 1 ? '1 minuto' : `${resto} minutos`;
  if (horas === 0) {
    return minutosTexto;
  }
  if (resto === 0) {
    return horasTexto;
  }
  return `${horasTexto} ${minutosTexto}`;
};

const duracionVisible = (minutos) => {
  const texto = textoDuracion(minutos);
  return texto ? `Duración: ${texto}` : '';
};

const retrasoVisible = (minutos) => {
  const texto = textoDuracion(minutos);
  return texto ? `Retraso: ${texto}` : '';
};

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

const MINUTOS_CIERRE_VENTA = 60;
const ESTADOS_EN_VENTA = new Set(['programado', 'retrasado', 'abordando']);

const vueloEnVenta = (vuelo) => {
  const estado = String(vuelo?.estado || '').toLowerCase();
  const salida = new Date(vuelo?.fecha_salida).getTime();
  if (!ESTADOS_EN_VENTA.has(estado) || Number.isNaN(salida)) {
    return false;
  }
  return salida - Date.now() > MINUTOS_CIERRE_VENTA * 60 * 1000;
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
const MINUTOS_INACTIVIDAD = 60;
const MINUTOS_AVISO = 5;
let temporizadorCierre = 0;
let temporizadorAviso = 0;
let avisoVisible = false;

const limpiarTemporizadores = () => {
  window.clearTimeout(temporizadorCierre);
  window.clearTimeout(temporizadorAviso);
};

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
  limpiarTemporizadores();
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

const cerrarSesionInvalida = (destino, motivo) => {
  const pagina = destino || `${window.location.pathname}${window.location.search}`;
  cerrarDatosSesion();
  if (pagina.startsWith('/') && !pagina.startsWith('//') && !pagina.startsWith('/login')) {
    localStorage.setItem('redirectAfterLogin', pagina);
  }
  sessionStorage.setItem('avisoSesion', motivo === 'inactiva' ? 'inactiva' : 'invalida');
  if (!location.pathname.endsWith('/login')) {
    window.location.replace('/login');
  }
};

const cerrarSiSesionRechazada = async (respuesta, destino) => {
  if (respuesta?.status !== 401) {
    return false;
  }
  let motivo = '';
  try {
    const data = await respuesta.clone().json();
    motivo = data?.motivo || '';
  } catch (error) {
    motivo = '';
  }
  cerrarSesionInvalida(destino, motivo);
  return true;
};

const descargarArchivo = async (url, boton, nombreReserva) => {
  const texto = boton ? boton.textContent : '';
  if (boton) {
    boton.disabled = true;
    boton.textContent = 'Descargando...';
  }
  try {
    const respuesta = await fetch(url, {
      headers: autorizacion(),
    });
    if (await cerrarSiSesionRechazada(respuesta)) {
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
    const archivoUrl = URL.createObjectURL(archivo);
    const enlace = document.createElement('a');
    enlace.href = archivoUrl;
    enlace.download = coincidencia ? coincidencia[1] : nombreReserva;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(archivoUrl);
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'No se pudo descargar', text: 'Intenta de nuevo.' });
  } finally {
    if (boton) {
      boton.disabled = false;
      boton.textContent = texto;
    }
  }
};

const mostrarExito = (titulo) => {
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

const descargarBoleto = (reservaId, boton) => descargarArchivo(
  `/api/reservas/${reservaId}/factura/pdf`,
  boton,
  'factura.pdf',
);

Object.assign(window, {
  escapar,
  quetzales,
  textoDuracion,
  duracionVisible,
  retrasoVisible,
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
  vueloEnVenta,
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
  cerrarSesionInvalida,
  cerrarSiSesionRechazada,
  descargarBoleto,
  descargarArchivo,
  mostrarExito,
});

const cerrarPorInactividad = () => {
  limpiarDatosPersonales();
  cerrarDatosSesion();
  sessionStorage.setItem('avisoSesion', 'inactiva');
  if (!location.pathname.endsWith('/login')) {
    location.replace('/login');
  }
};

const milisegundos = (minutos) => minutos * 60 * 1000;
const marcaSesion = () => Number(sessionStorage.getItem('sesionActiva') || 0);
const enLogin = () => location.pathname.endsWith('/login');

const renovarMarca = () => {
  sessionStorage.setItem('sesionActiva', String(Date.now()));
  avisoVisible = false;
  programarAvisos();
};

const mostrarAvisoInactividad = () => {
  if (avisoVisible || !sessionStorage.getItem('token') || enLogin() || typeof Swal === 'undefined') {
    return;
  }
  const restante = marcaSesion() + milisegundos(MINUTOS_INACTIVIDAD) - Date.now();
  if (restante <= 0) {
    cerrarPorInactividad();
    return;
  }
  if (restante > milisegundos(MINUTOS_AVISO)) {
    return;
  }
  avisoVisible = true;
  Swal.fire({
    icon: 'info',
    title: 'Tu sesión está por cerrarse',
    text: 'Si no usas la página, se cierra en 5 minutos.',
    confirmButtonText: 'Seguir conectado',
    allowOutsideClick: false,
  }).then((resultado) => {
    avisoVisible = false;
    if (resultado.isConfirmed && sessionStorage.getItem('token')) {
      renovarMarca();
    }
  });
};

const programarAvisos = () => {
  limpiarTemporizadores();
  if (!sessionStorage.getItem('token') || enLogin()) {
    return;
  }
  const marca = marcaSesion();
  if (!marca) {
    renovarMarca();
    return;
  }
  const ahora = Date.now();
  const vence = marca + milisegundos(MINUTOS_INACTIVIDAD);
  const avisa = vence - milisegundos(MINUTOS_AVISO);
  if (ahora >= vence) {
    cerrarPorInactividad();
    return;
  }
  temporizadorCierre = window.setTimeout(revisarSesion, vence - ahora);
  if (ahora >= avisa) {
    mostrarAvisoInactividad();
  } else {
    temporizadorAviso = window.setTimeout(mostrarAvisoInactividad, avisa - ahora);
  }
};

const revisarSesion = () => {
  if (!sessionStorage.getItem('token')) {
    return;
  }
  const marca = marcaSesion();
  if (!marca) {
    if (!enLogin()) {
      renovarMarca();
    }
    return;
  }
  if (Date.now() - marca >= milisegundos(MINUTOS_INACTIVIDAD)) {
    cerrarPorInactividad();
    return;
  }
  programarAvisos();
};

let ultimaActividad = 0;
const tocarActividad = (evento) => {
  if (!sessionStorage.getItem('token') || evento?.target?.closest?.('.swal2-container')) {
    return;
  }
  const ahora = Date.now();
  if (ahora - ultimaActividad < 15000) {
    return;
  }
  ultimaActividad = ahora;
  renovarMarca();
};

revisarSesion();
['pointerdown', 'keydown', 'input'].forEach((evento) => {
  window.addEventListener(evento, tocarActividad, { passive: true });
});
window.addEventListener('focus', revisarSesion);
window.addEventListener('pageshow', revisarSesion);
document.addEventListener('resume', revisarSesion);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    revisarSesion();
  }
});
window.setInterval(() => {
  if (document.visibilityState === 'visible') {
    revisarSesion();
  }
}, 15000);
