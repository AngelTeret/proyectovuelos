import pool from '../config/db.js';
import { conTransaccion } from '../utils/transaccion.js';
import { marcarSalidas } from './abordaje.model.js';

const obtenerTodos = async () => {
  await marcarSalidas();
  const [rows] = await pool.query('SELECT * FROM vuelos');
  return rows;
};

const obtenerPorId = async (id) => {
  const [rows] = await pool.query('SELECT * FROM vuelos WHERE id = ?', [id]);
  return rows[0] || null;
};

const contarPorImagen = async (imagenUrl) => {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS total FROM vuelos WHERE imagen_url = ?',
    [imagenUrl]
  );
  return Number(rows[0].total);
};

const crear = async (datos) => {
  const {
    origen,
    destino,
    fecha_salida,
    fecha_regreso = null,
    precio_base,
    estado = 'Programado',
    imagen_url = '/imagenes/avion-fondo.webp',
    capacidad_asientos = 30,
    duracion_minutos = 120,
  } = datos;
  const [result] = await pool.query(
    'INSERT INTO vuelos (origen, destino, fecha_salida, duracion_minutos, fecha_regreso, precio_base, estado, imagen_url, capacidad_asientos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [origen, destino, fecha_salida, duracion_minutos, fecha_regreso, precio_base, estado, imagen_url, capacidad_asientos]
  );
  return result;
};

const actualizar = async (id, datos) => {
  const {
    origen,
    destino,
    fecha_salida,
    fecha_regreso = null,
    precio_base,
    imagen_url = '/imagenes/avion-fondo.webp',
    duracion_minutos = 120,
  } = datos;
  const [resultado] = await pool.query(
    'UPDATE vuelos SET origen = ?, destino = ?, fecha_salida = ?, duracion_minutos = ?, fecha_regreso = ?, precio_base = ?, imagen_url = ? WHERE id = ?',
    [origen, destino, fecha_salida, duracion_minutos, fecha_regreso, precio_base, imagen_url, id]
  );
  return resultado;
};

const eliminar = async (id) => conTransaccion(async (connection) => {
  const [reservas] = await connection.query(
    'SELECT id FROM reservas WHERE vuelo_id = ?',
    [id]
  );
  const reservaIds = reservas.map((reserva) => reserva.id);

  if (reservaIds.length > 0) {
    await connection.query(
      'DELETE FROM idempotencia_pagos WHERE reserva_id IN (?)',
      [reservaIds]
    );
    await connection.query('DELETE FROM reservas WHERE vuelo_id = ?', [id]);
  }

  await connection.query('DELETE FROM asientos WHERE vuelo_id = ?', [id]);
  const [resultado] = await connection.query('DELETE FROM vuelos WHERE id = ?', [id]);
  return resultado;
});

export default { obtenerTodos, obtenerPorId, contarPorImagen, crear, actualizar, eliminar };
