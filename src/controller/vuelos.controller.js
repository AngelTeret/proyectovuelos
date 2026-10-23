import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Vuelo from '../models/vuelo.model.js';
import { actualizarCargosDelVuelo, generarAsientosParaVuelo } from '../models/asiento.model.js';
import { registrarBitacora } from '../models/bitacora.model.js';
import { ipDe } from '../middlewares/cupo.js';
import { responderErrorInterno } from '../utils/errorInterno.js';

const IMAGEN_POR_DEFECTO = '/imagenes/avion-fondo.webp';
const carpetaImagenes = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../public/imagenes'
);

const rutaDeArchivo = (archivo) => (archivo ? `/imagenes/${archivo.filename}` : null);

const ASIENTOS_POR_FILA = 6;
const CAPACIDAD_MINIMA = 18;
const CAPACIDAD_MAXIMA = 102;

const retrasoDe = (valor) => {
  if (valor == null || valor === '') {
    return 0;
  }
  const minutos = Number(valor);
  if (!Number.isInteger(minutos) || minutos < 0 || minutos > 24 * 60) {
    return null;
  }
  return minutos;
};

const duracionDe = (valor) => {
  if (valor == null || valor === '') {
    return 120;
  }
  const minutos = Number(valor);
  if (!Number.isInteger(minutos) || minutos < 15 || minutos > 24 * 60) {
    return null;
  }
  return minutos;
};

const capacidadDeAsientos = (valor) => {
  const numero = Number(valor);
  const esMultiploDeSeis = Number.isInteger(numero) && numero % ASIENTOS_POR_FILA === 0;
  if (!esMultiploDeSeis || numero < CAPACIDAD_MINIMA || numero > CAPACIDAD_MAXIMA) {
    return null;
  }
  return numero;
};

const borrarImagenSiNoSeUsa = async (rutaPublica) => {
  const ruta = String(rutaPublica ?? '');
  if (!ruta.startsWith('/imagenes/') || ruta === IMAGEN_POR_DEFECTO) {
    return;
  }

  const absoluta = path.resolve(carpetaImagenes, path.basename(ruta));
  if (!absoluta.startsWith(`${carpetaImagenes}${path.sep}`)) {
    return;
  }

  const usos = await Vuelo.contarPorImagen(ruta);
  if (usos > 0) {
    return;
  }

  await fs.unlink(absoluta).catch(() => {});
};

export const obtenerVuelos = async (req, res) => {
  try {
    const vuelos = await Vuelo.obtenerTodos();
    res.status(200).json(vuelos);
  } catch (error) {
    responderErrorInterno(res, error);
  }
};

export const crearVuelo = async (req, res) => {
  try {
    const { origen, destino, fecha_salida, fecha_regreso, precio_base, estado, capacidad_asientos, duracion_minutos } = req.body;
    const duracion = duracionDe(duracion_minutos);
    if (duracion === null) {
      return res.status(400).json({ mensaje: 'La duración debe ser de 15 minutos a 24 horas.' });
    }
    const capacidad = capacidadDeAsientos(capacidad_asientos);
    if (capacidad === null) {
      return res.status(400).json({
        mensaje: 'La capacidad debe ser un múltiplo de 6, entre 18 y 102 asientos.',
      });
    }
    const resultado = await Vuelo.crear({
      origen,
      destino,
      fecha_salida,
      fecha_regreso: fecha_regreso || null,
      precio_base,
      estado: estado || 'Programado',
      retraso_minutos: 0,
      imagen_url: rutaDeArchivo(req.file) || IMAGEN_POR_DEFECTO,
      capacidad_asientos: capacidad,
      duracion_minutos: duracion,
    });
    await generarAsientosParaVuelo(resultado.insertId, capacidad, precio_base);
    await registrarBitacora({
      usuarioId: req.usuario.id,
      accion: 'vuelo',
      detalle: `Vuelo ${resultado.insertId} creado`,
      ip: ipDe(req),
    });
    res.status(201).json({ mensaje: 'Vuelo creado correctamente', id: resultado.insertId });
  } catch (error) {
    responderErrorInterno(res, error);
  }
};

export const actualizarVuelo = async (req, res) => {
  try {
    const actual = await Vuelo.obtenerPorId(req.params.id);
    if (!actual) {
      return res.status(404).json({ mensaje: 'El vuelo no existe' });
    }

    const { origen, destino, fecha_salida, fecha_regreso, precio_base, duracion_minutos, retraso_minutos } = req.body;
    const retraso = retrasoDe(retraso_minutos);
    if (retraso === null) {
      return res.status(400).json({ mensaje: 'El retraso debe ser de 0 a 24 horas.' });
    }
    const duracion = duracionDe(duracion_minutos);
    if (duracion === null) {
      return res.status(400).json({ mensaje: 'La duración debe ser de 15 minutos a 24 horas.' });
    }
    const puedeRetrasar = actual.estado === 'Programado' || actual.estado === 'Retrasado';
    if (!puedeRetrasar && retraso !== (Number(actual.retraso_minutos) || 0)) {
      return res.status(400).json({ mensaje: 'Este vuelo ya no se puede retrasar.' });
    }
    const imagenNueva = rutaDeArchivo(req.file);
    const resultado = await Vuelo.actualizar(req.params.id, {
      origen,
      destino,
      fecha_salida,
      fecha_regreso: fecha_regreso || null,
      precio_base,
      imagen_url: imagenNueva || actual.imagen_url || IMAGEN_POR_DEFECTO,
      duracion_minutos: duracion,
      retraso_minutos: retraso,
      estado: puedeRetrasar ? (retraso > 0 ? 'Retrasado' : 'Programado') : actual.estado,
    });

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'El vuelo no existe' });
    }

    if (Number(precio_base) !== Number(actual.precio_base)) {
      await actualizarCargosDelVuelo(req.params.id, precio_base);
    }

    if (imagenNueva && actual.imagen_url !== imagenNueva) {
      await borrarImagenSiNoSeUsa(actual.imagen_url);
    }

    await registrarBitacora({
      usuarioId: req.usuario.id,
      accion: 'vuelo',
      detalle: `Vuelo ${req.params.id} actualizado`,
      ip: ipDe(req),
    });
    res.status(200).json({ mensaje: 'Vuelo actualizado correctamente' });
  } catch (error) {
    responderErrorInterno(res, error);
  }
};

export const eliminarVuelo = async (req, res) => {
  try {
    const actual = await Vuelo.obtenerPorId(req.params.id);
    const resultado = await Vuelo.eliminar(req.params.id);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'El vuelo no existe' });
    }

    if (actual) {
      await borrarImagenSiNoSeUsa(actual.imagen_url);
    }

    await registrarBitacora({
      usuarioId: req.usuario.id,
      accion: 'vuelo',
      detalle: `Vuelo ${req.params.id} eliminado`,
      ip: ipDe(req),
    });
    res.status(200).json({ mensaje: 'Vuelo eliminado correctamente' });
  } catch (error) {
    responderErrorInterno(res, error);
  }
};
