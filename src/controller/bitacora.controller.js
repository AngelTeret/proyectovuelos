import { listarBitacora } from '../models/bitacora.model.js';
import { responderErrorInterno } from '../utils/errorInterno.js';

export const obtenerBitacora = async (req, res) => {
  try {
    const filas = await listarBitacora();
    res.status(200).json(filas);
  } catch (error) {
    responderErrorInterno(res, error);
  }
};
