import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { buscarPorEmail, buscarPorId, crearUsuario } from '../models/usuario.model.js';
import { responderErrorInterno } from '../utils/errorInterno.js';

export const registro = async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ mensaje: 'Nombre, email y contraseña son obligatorios' });
    }

    const existente = await buscarPorEmail(email);
    if (existente) {
      return res.status(409).json({ mensaje: 'El email ya está registrado' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const usuario = await crearUsuario({
      nombre,
      email,
      password: passwordHash,
      rol: 'cliente',
      saldo_virtual: 15000,
    });

    res.status(201).json({
      mensaje: 'Usuario registrado correctamente',
      usuario,
    });
  } catch (error) {
    responderErrorInterno(res, error);
  }
};

export const perfil = async (req, res) => {
  const encabezado = req.headers.authorization || '';
  const token = encabezado.startsWith('Bearer ') ? encabezado.slice(7) : '';
  if (!token) {
    return res.status(401).json({ mensaje: 'No autorizado' });
  }

  try {
    const datos = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await buscarPorId(datos.id);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    res.status(200).json({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      saldo_virtual: usuario.saldo_virtual,
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ mensaje: 'Sesión no válida' });
    }
    responderErrorInterno(res, error);
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ mensaje: 'Email y contraseña son obligatorios' });
    }

    const usuario = await buscarPorEmail(email);
    if (!usuario) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    }

    const coincide = await bcrypt.compare(password, usuario.password);
    if (!coincide) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol, nombre: usuario.nombre },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(200).json({
      token,
      rol: usuario.rol,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        saldo_virtual: usuario.saldo_virtual,
      },
    });
  } catch (error) {
    responderErrorInterno(res, error);
  }
};
