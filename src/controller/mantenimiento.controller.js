import {
  cambiarServicioAsiento,
  listarVuelosMantenimiento,
  obtenerVueloMantenimiento,
} from '../models/mantenimiento.model.js';
import { responderErrorInterno } from '../utils/errorInterno.js';

const responder = (res, error) => {
  if (error.codigo) {
    return res.status(error.codigo).json({ mensaje: error.message });
  }
  return responderErrorInterno(res, error);
};

export const listar = async (req, res) => {
  try {
    res.status(200).json(await listarVuelosMantenimiento());
  } catch (error) {
    responder(res, error);
  }
};

export const consultar = async (req, res) => {
  try {
    res.status(200).json(await obtenerVueloMantenimiento(req.params.id));
  } catch (error) {
    responder(res, error);
  }
};

export const bloquear = async (req, res) => {
  try {
    const asientos = await cambiarServicioAsiento(req.params.id, req.params.asientoId, true);
    res.status(200).json({ asientos });
  } catch (error) {
    responder(res, error);
  }
};

export const liberar = async (req, res) => {
  try {
    const asientos = await cambiarServicioAsiento(req.params.id, req.params.asientoId, false);
    res.status(200).json({ asientos });
  } catch (error) {
    responder(res, error);
  }
};
