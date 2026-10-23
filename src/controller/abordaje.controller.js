import {
  cerrarAbordaje,
  iniciarAbordaje,
  listarVuelosAbordaje,
  marcarAbordado,
  obtenerAbordaje,
} from '../models/abordaje.model.js';
import { registrarBitacora } from '../models/bitacora.model.js';
import { ipDe } from '../middlewares/cupo.js';
import { responderErrorInterno } from '../utils/errorInterno.js';

const anotarAbordaje = (req, detalle) => registrarBitacora({
  usuarioId: req.usuario.id,
  accion: 'abordaje',
  detalle,
  ip: ipDe(req),
});

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
    const resultado = await iniciarAbordaje(req.params.id);
    await anotarAbordaje(req, `Abordaje iniciado en el vuelo ${req.params.id}`);
    res.status(200).json(resultado);
  } catch (error) {
    responder(res, error);
  }
};

export const registrarAbordaje = async (req, res) => {
  try {
    const resultado = await marcarAbordado(req.params.id, req.body?.codigo_boleto);
    await anotarAbordaje(req, `Ya entró en el vuelo ${req.params.id}`);
    res.status(200).json(resultado);
  } catch (error) {
    responder(res, error);
  }
};

export const finalizarAbordaje = async (req, res) => {
  try {
    const resultado = await cerrarAbordaje(req.params.id);
    await anotarAbordaje(req, `Puerta cerrada en el vuelo ${req.params.id}`);
    res.status(200).json(resultado);
  } catch (error) {
    responder(res, error);
  }
};
