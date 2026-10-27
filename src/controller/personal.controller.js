import bcrypt from 'bcrypt';
import {
  crearPersonal,
  guardarEquipo,
  listarClientes,
  listarEquipo,
  quitarEquipo,
} from '../models/usuario.model.js';
import { responderErrorInterno } from '../utils/errorInterno.js';

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PUESTOS = new Set(['despacho', 'mantenimiento']);

const idCuenta = (valor) => {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : 0;
};

const datosCuenta = (body, exigirClave) => {
  const nombre = String(body.nombre || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!nombre || !email || (exigirClave && !password)) {
    return { error: 'Nombre, correo y contraseña son obligatorios' };
  }
  if (nombre.length > 100) {
    return { error: 'El nombre no puede pasar de 100 caracteres' };
  }
  if (!CORREO.test(email) || email.length > 100) {
    return { error: 'Ingresa un correo electrónico válido' };
  }
  if (password && password.length < 8) {
    return { error: 'La contraseña debe tener al menos 8 caracteres' };
  }
  if (password.length > 72) {
    return { error: 'La contraseña no puede pasar de 72 caracteres' };
  }
  return { nombre, email, password };
};

const responderDuplicado = (res, error) => {
  if (error.code === 'ER_DUP_ENTRY') {
    res.status(409).json({ mensaje: 'Ese correo ya tiene cuenta' });
    return true;
  }
  return false;
};

export const obtenerEquipo = async (req, res) => {
  try {
    res.status(200).json(await listarEquipo());
  } catch (error) {
    responderErrorInterno(res, error);
  }
};

export const obtenerClientes = async (req, res) => {
  try {
    res.status(200).json(await listarClientes());
  } catch (error) {
    responderErrorInterno(res, error);
  }
};

export const crearEquipo = async (req, res) => {
  try {
    const datos = datosCuenta(req.body, true);
    const rol = String(req.body.rol || '');
    if (datos.error) {
      return res.status(400).json({ mensaje: datos.error });
    }
    if (!PUESTOS.has(rol)) {
      return res.status(400).json({ mensaje: 'Elige Puerta o Mantenimiento.' });
    }
    const passwordHash = await bcrypt.hash(datos.password, 10);
    const cuenta = await crearPersonal({
      nombre: datos.nombre,
      email: datos.email,
      password: passwordHash,
      rol,
    });
    res.status(201).json(cuenta);
  } catch (error) {
    if (responderDuplicado(res, error)) {
      return;
    }
    responderErrorInterno(res, error);
  }
};

export const editarEquipo = async (req, res) => {
  try {
    const id = idCuenta(req.params.id);
    const datos = datosCuenta(req.body, false);
    const rol = String(req.body.rol || '');
    if (!id) {
      return res.status(404).json({ mensaje: 'Esa cuenta no existe' });
    }
    if (datos.error) {
      return res.status(400).json({ mensaje: datos.error });
    }
    if (!PUESTOS.has(rol)) {
      return res.status(400).json({ mensaje: 'Elige Puerta o Mantenimiento.' });
    }
    const passwordHash = datos.password ? await bcrypt.hash(datos.password, 10) : '';
    const actualizada = await guardarEquipo({
      id,
      nombre: datos.nombre,
      email: datos.email,
      password: passwordHash,
      rol,
    });
    if (!actualizada) {
      return res.status(404).json({ mensaje: 'Esa cuenta no se puede modificar' });
    }
    res.status(200).json({ id, nombre: datos.nombre, email: datos.email, rol });
  } catch (error) {
    if (responderDuplicado(res, error)) {
      return;
    }
    responderErrorInterno(res, error);
  }
};

export const borrarEquipo = async (req, res) => {
  try {
    const id = idCuenta(req.params.id);
    if (!id || !(await quitarEquipo(id))) {
      return res.status(404).json({ mensaje: 'Esa cuenta no se puede eliminar' });
    }
    res.status(200).json({ mensaje: 'Cuenta eliminada' });
  } catch (error) {
    responderErrorInterno(res, error);
  }
};
