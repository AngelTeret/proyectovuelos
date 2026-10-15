import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { buscarPorEmail, crearUsuario } from '../models/usuario.model.js';

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

    const usuario = await crearUsuario({
      nombre,
      email,
      password,
      rol: 'cliente',
      saldo_virtual: 1000,
    });

    res.status(201).json({
      mensaje: 'Usuario registrado correctamente',
      usuario,
    });
  } catch (error) {
    res.status(500).json({
      mensaje: 'Error al registrar el usuario',
      error: error.message,
    });
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
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        saldo_virtual: usuario.saldo_virtual,
      },
    });
  } catch (error) {
    res.status(500).json({
      mensaje: 'Error al iniciar sesión',
      error: error.message,
    });
  }
};
