import { readFileSync } from 'node:fs';
import { crear } from '../models/pasajero.model.js';
import { responderErrorInterno } from '../utils/errorInterno.js';

const letras = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '\-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;
const correo = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const codigosTelefono = JSON.parse(readFileSync(new URL('../../public/js/codigosTelefono.json', import.meta.url), 'utf8'));
const prefijos = [...new Set(codigosTelefono.map((item) => item.codigo))]
  .sort((a, b) => b.length - a.length);

const limpiar = (valor) => String(valor ?? '').trim();

const telefonoValido = (telefono) => {
  const limpio = telefono.replace(/[\s()-]/g, '');
  if (limpio.length > 20 || !limpio.startsWith('+')) {
    return false;
  }
  const digitos = limpio.slice(1);
  const prefijo = prefijos.find((codigo) => digitos.startsWith(codigo));
  if (!prefijo) {
    return false;
  }
  return /^\d{8,15}$/.test(digitos.slice(prefijo.length));
};

const validarPasajero = ({ nombre, apellido, documento_identidad, email, telefono }) => {
  if (!letras.test(nombre) || nombre.length > 100) {
    return 'El nombre solo puede contener letras';
  }
  if (!letras.test(apellido) || apellido.length > 100) {
    return 'El apellido solo puede contener letras';
  }
  if (!/^[A-Za-z0-9]{6,15}$/.test(documento_identidad)) {
    return 'El documento debe tener entre 6 y 15 letras o números';
  }
  if (!correo.test(email) || email.length > 255) {
    return 'Ingresa un correo electrónico válido';
  }
  if (!telefonoValido(telefono)) {
    return 'Ingresa un teléfono de 8 a 15 dígitos con un código de país válido';
  }
  return '';
};

export const crearPasajero = async (req, res) => {
  try {
    const pasajeroEntrada = {
      nombre: limpiar(req.body.nombre),
      apellido: limpiar(req.body.apellido),
      documento_identidad: limpiar(req.body.documento_identidad),
      email: limpiar(req.body.email),
      telefono: limpiar(req.body.telefono),
    };
    const mensaje = validarPasajero(pasajeroEntrada);

    if (mensaje) {
      return res.status(400).json({ mensaje });
    }

    const { nombre, apellido, documento_identidad, email, telefono } = pasajeroEntrada;

    const pasajero = await crear({
      nombre,
      apellido,
      documento_identidad,
      email,
      telefono,
    });

    res.status(201).json(pasajero);
  } catch (error) {
    responderErrorInterno(res, error);
  }
};
