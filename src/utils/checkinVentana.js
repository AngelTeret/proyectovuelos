export const HORAS_APERTURA = 48;
export const MINUTOS_CIERRE = 60;
export const ABRE_SEGUNDOS = HORAS_APERTURA * 60 * 60;
export const CIERRA_SEGUNDOS = MINUTOS_CIERRE * 60;

const ESTADOS_ABIERTOS = new Set(['programado', 'retrasado']);

export const evaluarCheckin = ({ estadoPago, estadoVuelo, segundosParaSalida }) => {
  if (estadoPago === 'reembolsado') {
    return { abierto: false, motivo: 'cancelada', mensaje: 'La reserva fue cancelada.' };
  }
  if (estadoPago !== 'aprobado') {
    return { abierto: false, motivo: 'sin_pago', mensaje: 'El check-in está disponible cuando el pago queda aprobado.' };
  }

  const estado = String(estadoVuelo || '').toLowerCase();
  if (estado === 'cancelado') {
    return { abierto: false, motivo: 'vuelo_cancelado', mensaje: 'El vuelo fue cancelado.' };
  }
  if (!ESTADOS_ABIERTOS.has(estado)) {
    return { abierto: false, motivo: 'vuelo_cerrado', mensaje: 'El check-in de este vuelo ya cerró.' };
  }

  const segundos = Number(segundosParaSalida);
  if (!Number.isFinite(segundos)) {
    return { abierto: false, motivo: 'sin_horario', mensaje: 'No se pudo leer la hora de salida.' };
  }
  if (segundos <= CIERRA_SEGUNDOS) {
    return { abierto: false, motivo: 'cerrado', mensaje: 'El check-in ya cerró.' };
  }
  if (segundos > ABRE_SEGUNDOS) {
    return { abierto: false, motivo: 'pronto', mensaje: 'El check-in abre 48 horas antes de la salida.' };
  }
  return { abierto: true, motivo: 'abierto', mensaje: 'Puedes hacer el check-in.' };
};

export const emparejarInfantes = (viajeros) => {
  const adultos = viajeros.filter((viajero) => viajero.tipo === 'adulto');
  const infantes = viajeros.filter((viajero) => viajero.tipo === 'infante');
  const porAdulto = new Map();
  infantes.forEach((infante, indice) => {
    const adulto = adultos[Math.min(indice, adultos.length - 1)];
    if (!adulto) {
      return;
    }
    const clave = adulto.reserva_pasajero_id;
    const lista = porAdulto.get(clave) || [];
    lista.push(infante);
    porAdulto.set(clave, lista);
  });
  return porAdulto;
};
