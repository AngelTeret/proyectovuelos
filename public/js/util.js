const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const escapar = (texto) => String(texto ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const quetzales = (monto) => `Q ${Number(monto || 0).toFixed(2)}`;

const sinAcentos = (texto) => String(texto ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

const leerJson = (clave, vacio = {}) => {
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

const autorizacion = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const descargarBoleto = async (reservaId, boton) => {
  const texto = boton ? boton.textContent : '';
  if (boton) {
    boton.disabled = true;
    boton.textContent = 'Descargando...';
  }
  try {
    const respuesta = await fetch(`/api/reservas/${reservaId}/boleto`, {
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
    enlace.download = coincidencia ? coincidencia[1] : 'confirmacion.pdf';
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
  partesGuatemala,
  fechaCalendario,
  formatearDia,
  formatearSalida,
  formatearFecha,
  autorizacion,
  descargarBoleto,
});
