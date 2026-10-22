import { createHash, randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {
  aplicarRestablecer,
  buscarPorEmail,
  buscarPorId,
  confirmarCorreo,
  crearUsuarioPendiente,
  guardarRestablecer,
  prepararReenvio,
  renovarVerificacion,
  revisarRestablecer,
} from '../models/usuario.model.js';
import { responderErrorInterno } from '../utils/errorInterno.js';
import { enviarBoleto } from '../services/emailService.js';
import { generarTemplateRestablecer, generarTemplateVerificacion } from '../services/ticketTemplate.js';

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const normalizarCorreo = (valor) => String(valor || '').trim().toLowerCase();

const correoValido = (email) => CORREO.test(email) && email.length <= 100;

const nuevoToken = () => {
  const token = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(token).digest('hex');
  return { token, hash };
};

const baseDe = (req) => {
  const configurada = String(process.env.APP_URL || '').trim().replace(/\/$/, '');
  return configurada || `${req.protocol}://${req.get('host')}`;
};

const enlaceDe = (req, token) => `${baseDe(req)}/verificar.html?token=${token}`;

const enlaceRestablecer = (req, token) => `${baseDe(req)}/restablecer.html?token=${token}`;

const MENSAJE_OLVIDE = 'Si el correo tiene una cuenta confirmada, enviamos un enlace para elegir otra contraseña.';

const tokenHex = (valor) => /^[a-f0-9]{64}$/i.test(String(valor || '').trim());

const mensajeDeEnlace = (estado) => (
  estado === 'expirado'
    ? 'El enlace venció. Pide uno nuevo.'
    : 'El enlace no es válido.'
);

const enviarVerificacion = async (req, { nombre, email, token }) => {
  await enviarBoleto(
    email,
    'Confirma tu cuenta - Quetzal Airlines',
    generarTemplateVerificacion({ nombre, enlace: enlaceDe(req, token) }),
  );
};

export const registro = async (req, res) => {
  try {
    const nombre = String(req.body.nombre || '').trim();
    const email = normalizarCorreo(req.body.email);
    const password = String(req.body.password || '');

    if (!nombre || !email || !password) {
      return res.status(400).json({ mensaje: 'Nombre, email y contraseña son obligatorios' });
    }
    if (!correoValido(email)) {
      return res.status(400).json({ mensaje: 'Ingresa un correo electrónico válido' });
    }
    if (password.length < 8) {
      return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const { token, hash } = nuevoToken();
    const passwordHash = await bcrypt.hash(password, 10);
    const existente = await buscarPorEmail(email);

    if (existente?.email_verificado) {
      return res.status(409).json({ mensaje: 'El email ya está registrado' });
    }

    if (existente) {
      await renovarVerificacion({
        id: existente.id,
        nombre,
        password: passwordHash,
        tokenHash: hash,
      });
    } else {
      await crearUsuarioPendiente({
        nombre,
        email,
        password: passwordHash,
        tokenHash: hash,
      });
    }

    let correoEnviado = true;
    try {
      await enviarVerificacion(req, { nombre, email, token });
    } catch (error) {
      correoEnviado = false;
      console.log(`La cuenta ${email} quedó pendiente, pero el correo de verificación no se envió: ${error.message}`);
    }

    res.status(existente ? 200 : 201).json({
      mensaje: 'Te enviamos un enlace para confirmar tu cuenta',
      correo_enviado: correoEnviado,
    });
  } catch (error) {
    responderErrorInterno(res, error);
  }
};

export const verificarCorreo = async (req, res) => {
  try {
    const token = String(req.body.token || req.query.token || '').trim();
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(400).json({ mensaje: 'El enlace no es válido' });
    }

    const hash = createHash('sha256').update(token).digest('hex');
    const estado = await confirmarCorreo(hash);
    if (estado === 'expirado') {
      return res.status(400).json({ mensaje: 'El enlace venció. Pide uno nuevo desde el inicio de sesión.' });
    }
    if (estado !== 'ok') {
      return res.status(400).json({ mensaje: 'El enlace no es válido' });
    }

    res.status(200).json({
      mensaje: 'Cuenta confirmada. Ya puedes iniciar sesión. El bono de Q15,000 quedó en tu billetera.',
    });
  } catch (error) {
    responderErrorInterno(res, error);
  }
};

export const reenviarVerificacion = async (req, res) => {
  try {
    const email = normalizarCorreo(req.body.email);
    if (!correoValido(email)) {
      return res.status(400).json({ mensaje: 'Ingresa un correo electrónico válido' });
    }

    const usuario = await buscarPorEmail(email);
    if (!usuario) {
      return res.status(200).json({ mensaje: 'Si el correo está pendiente, enviamos un nuevo enlace.' });
    }
    if (usuario.email_verificado) {
      return res.status(200).json({ mensaje: 'Esa cuenta ya está confirmada. Inicia sesión.' });
    }

    const { token, hash } = nuevoToken();
    await prepararReenvio({ id: usuario.id, tokenHash: hash });
    try {
      await enviarVerificacion(req, { nombre: usuario.nombre, email, token });
    } catch (error) {
      console.log(`No se pudo reenviar la verificación a ${email}: ${error.message}`);
      return res.status(502).json({ mensaje: 'No pudimos enviar el correo. Intenta de nuevo.' });
    }

    res.status(200).json({ mensaje: 'Enviamos un nuevo enlace. Revisa tu correo.' });
  } catch (error) {
    responderErrorInterno(res, error);
  }
};

export const olvidarContrasena = async (req, res) => {
  try {
    const email = normalizarCorreo(req.body.email);
    if (!correoValido(email)) {
      return res.status(400).json({ mensaje: 'Ingresa un correo electrónico válido' });
    }

    const usuario = await buscarPorEmail(email);
    if (!usuario || !Number(usuario.email_verificado)) {
      return res.status(200).json({ mensaje: MENSAJE_OLVIDE });
    }

    const { token, hash } = nuevoToken();
    await guardarRestablecer({ id: usuario.id, tokenHash: hash });
    res.status(200).json({ mensaje: MENSAJE_OLVIDE });
    enviarBoleto(
      email,
      'Elige otra contraseña - Quetzal Airlines',
      generarTemplateRestablecer({ nombre: usuario.nombre, enlace: enlaceRestablecer(req, token) }),
    ).catch((error) => {
      console.log(`No se pudo enviar el restablecimiento a ${email}: ${error.message}`);
    });
  } catch (error) {
    responderErrorInterno(res, error);
  }
};

export const revisarEnlaceRestablecer = async (req, res) => {
  try {
    const token = String(req.body.token || '').trim();
    if (!tokenHex(token)) {
      return res.status(400).json({ mensaje: 'El enlace no es válido' });
    }
    const estado = await revisarRestablecer(createHash('sha256').update(token).digest('hex'));
    if (estado !== 'ok') {
      return res.status(400).json({ mensaje: mensajeDeEnlace(estado) });
    }
    res.status(200).json({ mensaje: 'El enlace sigue vigente.' });
  } catch (error) {
    responderErrorInterno(res, error);
  }
};

export const restablecerContrasena = async (req, res) => {
  try {
    const token = String(req.body.token || '').trim();
    const password = String(req.body.password || '');
    if (!tokenHex(token)) {
      return res.status(400).json({ mensaje: 'El enlace no es válido' });
    }
    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({ mensaje: 'La contraseña debe tener de 8 a 72 caracteres' });
    }

    const hash = createHash('sha256').update(token).digest('hex');
    const passwordHash = await bcrypt.hash(password, 10);
    const estado = await aplicarRestablecer({ tokenHash: hash, passwordHash });
    if (estado !== 'ok') {
      return res.status(400).json({ mensaje: mensajeDeEnlace(estado) });
    }
    res.status(200).json({ mensaje: 'La contraseña quedó actualizada. Ya puedes entrar.' });
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
    const email = normalizarCorreo(req.body.email);
    const password = String(req.body.password || '');

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

    if (!usuario.email_verificado) {
      return res.status(403).json({
        mensaje: 'Confirma tu correo antes de iniciar sesión.',
        pendiente: true,
      });
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
