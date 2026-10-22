import jwt from 'jsonwebtoken';
import { buscarPorId } from '../models/usuario.model.js';
import { responderErrorInterno } from '../utils/errorInterno.js';

const usuarioDeEncabezado = async (req) => {
  const encabezado = req.headers.authorization || '';
  const token = encabezado.startsWith('Bearer ') ? encabezado.slice(7) : '';
  if (!token) {
    return null;
  }
  const datos = jwt.verify(token, process.env.JWT_SECRET);
  return buscarPorId(datos.id);
};

const rechazarToken = (res, error) => {
  if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') {
    res.status(401).json({ mensaje: 'Sesión no válida' });
    return true;
  }
  return false;
};

export const exigirSesion = async (req, res, next) => {
  try {
    const usuario = await usuarioDeEncabezado(req);
    if (!usuario) {
      return res.status(401).json({ mensaje: 'No autorizado' });
    }
    req.usuario = usuario;
    next();
  } catch (error) {
    if (rechazarToken(res, error)) {
      return;
    }
    responderErrorInterno(res, error);
  }
};

export const exigirAdmin = async (req, res, next) => {
  try {
    const usuario = await usuarioDeEncabezado(req);
    if (!usuario) {
      return res.status(401).json({ mensaje: 'No autorizado' });
    }
    if (usuario.rol !== 'admin') {
      return res.status(403).json({ mensaje: 'No tienes permiso para esta acción' });
    }
    req.usuario = usuario;
    next();
  } catch (error) {
    if (rechazarToken(res, error)) {
      return;
    }
    responderErrorInterno(res, error);
  }
};
