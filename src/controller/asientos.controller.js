import {
  consultarBloqueo,
  idsConReserva,
  liberarBloqueosVencidos,
  obtenerPorVuelo,
  reservarTemporal,
} from '../models/asiento.model.js';

const llaveDe = (req) => {
  const llave = req.get('x-bloqueo-llave') || req.body?.llave || '';
  return /^[A-Za-z0-9-]{16,64}$/.test(llave) ? llave : '';
};

const marcarDisponibilidad = async (vueloId, llave) => {
  await liberarBloqueosVencidos(undefined, vueloId);
  const [asientos, reservados] = await Promise.all([
    obtenerPorVuelo(vueloId),
    idsConReserva(vueloId),
  ]);
  const reservadosIds = new Set(reservados);

  return asientos.map((asiento) => {
    const propio = Boolean(llave) && asiento.estado === 'reservado_temporal' && asiento.bloqueo_llave === llave;
    return {
      id: asiento.id,
      vuelo_id: asiento.vuelo_id,
      numero_asiento: asiento.numero_asiento,
      estado: propio ? 'disponible' : asiento.estado,
      categoria: asiento.categoria,
      precio_adicional: asiento.precio_adicional,
      ocupado: (asiento.estado !== 'disponible' && !propio) || reservadosIds.has(asiento.id),
      propio,
    };
  });
};

export const obtenerAsientosPorVuelo = async (req, res) => {
  try {
    const asientos = await marcarDisponibilidad(req.params.id, llaveDe(req));
    res.status(200).json(asientos);
  } catch (error) {
    res.status(500).json({
      mensaje: 'Error al obtener los asientos del vuelo',
      error: error.message,
    });
  }
};

export const obtenerAsientosDeVuelo = async (req, res) => {
  try {
    const asientos = await marcarDisponibilidad(req.params.vuelo_id, llaveDe(req));
    res.status(200).json(asientos);
  } catch (error) {
    res.status(500).json({
      mensaje: 'Error al obtener los asientos del vuelo',
      error: error.message,
    });
  }
};

export const bloquearAsiento = async (req, res) => {
  try {
    const asientoId = Number(req.body.asiento_id);
    const vueloId = Number(req.body.vuelo_id);
    const llave = llaveDe(req);

    if (!asientoId || !vueloId || !llave) {
      return res.status(400).json({ mensaje: 'No se pudo reservar el asiento' });
    }

    const bloqueo = await reservarTemporal({ asientoId, vueloId, llave });
    res.status(200).json(bloqueo);
  } catch (error) {
    if (error.message === 'El asiento ya no está disponible o no existe') {
      return res.status(409).json({ mensaje: 'Ese asiento acaba de ser reservado. Elige otro.' });
    }
    res.status(500).json({
      mensaje: 'No se pudo reservar el asiento',
      error: error.message,
    });
  }
};

export const verBloqueo = async (req, res) => {
  try {
    const bloqueo = await consultarBloqueo({
      asientoId: Number(req.params.id),
      llave: llaveDe(req),
    });

    if (!bloqueo) {
      return res.status(409).json({
        mensaje: 'El tiempo para completar el pago terminó. Vuelve a elegir un asiento.',
      });
    }

    res.status(200).json(bloqueo);
  } catch (error) {
    res.status(500).json({
      mensaje: 'No se pudo consultar la reserva del asiento',
      error: error.message,
    });
  }
};
