import {
  cerrarAbordaje,
  iniciarAbordaje,
  listarVuelosAbordaje,
  marcarAbordado,
  obtenerAbordaje,
} from '../models/abordaje.model.js';
import { responderErrorInterno } from '../utils/errorInterno.js';

const responder = (res, error) => {
  if (error.codigo === 404 || error.codigo === 400) {
    return res.status(error.codigo).json({ mensaje: error.message });
  }
  return responderErrorInterno(res, error);
};

export const listarAbordaje = async (req, res) => {
  try {
    res.status(200).json(await listarVuelosAbordaje());
  } catch (error) {
    responder(res, error);
  }
};

export const consultarAbordaje = async (req, res) => {
  try {
    res.status(200).json(await obtenerAbordaje(req.params.id));
  } catch (error) {
    responder(res, error);
  }
};

export const abrirAbordaje = async (req, res) => {
  try {
    res.status(200).json(await iniciarAbordaje(req.params.id));
  } catch (error) {
    responder(res, error);
  }
};

export const registrarAbordaje = async (req, res) => {
  try {
    res.status(200).json(await marcarAbordado(req.params.id, req.body?.codigo_boleto));
  } catch (error) {
    responder(res, error);
  }
};

export const finalizarAbordaje = async (req, res) => {
  try {
    res.status(200).json(await cerrarAbordaje(req.params.id));
  } catch (error) {
    responder(res, error);
  }
};
