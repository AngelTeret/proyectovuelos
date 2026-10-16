import { idsConReserva, obtenerPorVuelo } from '../models/asiento.model.js';

const marcarDisponibilidad = async (vueloId) => {
  const [asientos, reservados] = await Promise.all([
    obtenerPorVuelo(vueloId),
    idsConReserva(vueloId),
  ]);
  const reservadosIds = new Set(reservados);

  return asientos.map((asiento) => ({
    ...asiento,
    ocupado: asiento.estado !== 'disponible' || reservadosIds.has(asiento.id),
  }));
};

export const obtenerAsientosPorVuelo = async (req, res) => {
  try {
    const asientos = await marcarDisponibilidad(req.params.id);
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
    const asientos = await marcarDisponibilidad(req.params.vuelo_id);
    res.status(200).json(asientos);
  } catch (error) {
    res.status(500).json({
      mensaje: 'Error al obtener los asientos del vuelo',
      error: error.message,
    });
  }
};
