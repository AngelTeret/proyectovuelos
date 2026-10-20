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
  const hora = tomar('hour') === '24' ? '00' : tomar('hour');
  return {
    anio: tomar('year'),
    mes: Number(tomar('month')),
    dia: Number(tomar('day')),
    hora,
    minuto: tomar('minute'),
  };
};

export const partesGuatemala = (valor) => {
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

export const fechaCalendario = (valor) => {
  const partes = partesGuatemala(valor);
  if (!partes) {
    return '';
  }
  const dosDigitos = (numero) => String(numero).padStart(2, '0');
  return `${partes.anio}-${dosDigitos(partes.mes)}-${dosDigitos(partes.dia)}`;
};
