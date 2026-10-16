import { obtenerPorVuelo } from '../models/asiento.model.js';

export const obtenerAsientosDeVuelo = async (req, res) => {
  try {
    const { vuelo_id } = req.params;
    const asientos = await obtenerPorVuelo(vuelo_id);
    res.status(200).json(asientos);
  } catch (error) {
    res.status(500).json({
      mensaje: 'Error al obtener los asientos del vuelo',
      error: error.message,
    });
  }
};
