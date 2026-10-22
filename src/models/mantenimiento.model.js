import pool from '../config/db.js';
import { conTransaccion } from '../utils/transaccion.js';

const ESTADOS_EDITABLES = new Set(['Programado', 'Retrasado', 'Abordando']);

const errorMantenimiento = (mensaje, codigo) => {
  const error = new Error(mensaje);
  error.codigo = codigo;
  return error;
};

const idNumerico = (valor, mensaje) => {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) {
    throw errorMantenimiento(mensaje, 404);
  }
  return id;
};

const situacionDe = (asiento) => {
  if (asiento.estado === 'bloqueado_mantenimiento') {
    return 'fuera';
  }
  const retenido = asiento.estado === 'reservado_temporal' && Number(asiento.bloqueo_vigente) === 1;
  if (asiento.estado === 'disponible' || (asiento.estado === 'reservado_temporal' && !retenido)) {
    return 'libre';
  }
  return 'vendido';
};

export const listarVuelosMantenimiento = async () => {
  const [filas] = await pool.query(
    `SELECT
      v.id,
      v.origen,
      v.destino,
      v.fecha_salida,
      v.duracion_minutos,
      v.estado,
      SUM(a.estado = 'bloqueado_mantenimiento') AS fuera_servicio,
      SUM(a.estado = 'disponible' OR (a.estado = 'reservado_temporal' AND (a.bloqueo_hasta IS NULL OR a.bloqueo_hasta <= NOW()))) AS libres
    FROM vuelos v
    LEFT JOIN asientos a ON a.vuelo_id = v.id
    WHERE v.estado IN ('Programado', 'Retrasado', 'Abordando')
      AND v.fecha_salida > NOW()
    GROUP BY v.id, v.origen, v.destino, v.fecha_salida, v.duracion_minutos, v.estado
    ORDER BY v.fecha_salida`
  );
  return filas.map((fila) => ({
    id: fila.id,
    origen: fila.origen,
    destino: fila.destino,
    fecha_salida: fila.fecha_salida,
    duracion_minutos: Number(fila.duracion_minutos) || 0,
    estado: fila.estado,
    fuera_servicio: Number(fila.fuera_servicio) || 0,
    libres: Number(fila.libres) || 0,
  }));
};

const asientosDe = async (executor, vueloId) => {
  const [filas] = await executor.query(
    `SELECT id, numero_asiento, categoria, estado, bloqueo_hasta > NOW() AS bloqueo_vigente
     FROM asientos
     WHERE vuelo_id = ?
     ORDER BY CAST(numero_asiento AS UNSIGNED), numero_asiento`,
    [vueloId]
  );
  return filas.map((asiento) => ({
    id: asiento.id,
    numero_asiento: asiento.numero_asiento,
    categoria: asiento.categoria,
    situacion: situacionDe(asiento),
  }));
};

export const obtenerVueloMantenimiento = async (vueloId) => {
  const id = idNumerico(vueloId, 'Ese vuelo no existe');
  const [filas] = await pool.query(
    `SELECT id, origen, destino, fecha_salida, duracion_minutos, estado
     FROM vuelos
     WHERE id = ?`,
    [id]
  );
  const vuelo = filas[0];
  if (!vuelo || !ESTADOS_EDITABLES.has(vuelo.estado) || new Date(vuelo.fecha_salida).getTime() <= Date.now()) {
    throw errorMantenimiento('Ese vuelo ya no se puede cambiar', 404);
  }
  return {
    id: vuelo.id,
    origen: vuelo.origen,
    destino: vuelo.destino,
    fecha_salida: vuelo.fecha_salida,
    duracion_minutos: Number(vuelo.duracion_minutos) || 0,
    estado: vuelo.estado,
    asientos: await asientosDe(pool, id),
  };
};

const mensajeDeEstado = (estado) => {
  if (estado === 'bloqueado_mantenimiento') {
    return 'Ese asiento ya está fuera de servicio';
  }
  if (estado === 'reservado_temporal') {
    return 'Un pasajero está eligiendo ese asiento';
  }
  return 'Ese asiento ya está vendido';
};

export const cambiarServicioAsiento = async (vueloId, asientoId, dejarFuera) => {
  const vuelo = idNumerico(vueloId, 'Ese vuelo no existe');
  const asiento = idNumerico(asientoId, 'Ese asiento no existe');
  return conTransaccion(async (conexion) => {
    const [vuelos] = await conexion.query(
      'SELECT id, estado, fecha_salida FROM vuelos WHERE id = ? FOR UPDATE',
      [vuelo]
    );
    const filaVuelo = vuelos[0];
    if (!filaVuelo || !ESTADOS_EDITABLES.has(filaVuelo.estado) || new Date(filaVuelo.fecha_salida).getTime() <= Date.now()) {
      throw errorMantenimiento('Ese vuelo ya no se puede cambiar', 404);
    }
    const [asientos] = await conexion.query(
      `SELECT id, estado, bloqueo_hasta > NOW() AS bloqueo_vigente
       FROM asientos
       WHERE id = ? AND vuelo_id = ?
       FOR UPDATE`,
      [asiento, vuelo]
    );
    const fila = asientos[0];
    if (!fila) {
      throw errorMantenimiento('Ese asiento no existe', 404);
    }
    const libre = fila.estado === 'disponible'
      || (fila.estado === 'reservado_temporal' && Number(fila.bloqueo_vigente) !== 1);
    if (dejarFuera) {
      if (fila.estado === 'bloqueado_mantenimiento') {
        return asientosDe(conexion, vuelo);
      }
      if (!libre) {
        throw errorMantenimiento(mensajeDeEstado(fila.estado), 409);
      }
      await conexion.query(
        `UPDATE asientos
         SET estado = 'bloqueado_mantenimiento', bloqueo_hasta = NULL, bloqueo_llave = NULL
         WHERE id = ? AND vuelo_id = ?`,
        [asiento, vuelo]
      );
    } else {
      if (libre) {
        return asientosDe(conexion, vuelo);
      }
      if (fila.estado !== 'bloqueado_mantenimiento') {
        throw errorMantenimiento(mensajeDeEstado(fila.estado), 409);
      }
      await conexion.query(
        `UPDATE asientos
         SET estado = 'disponible', bloqueo_hasta = NULL, bloqueo_llave = NULL
         WHERE id = ? AND vuelo_id = ? AND estado = 'bloqueado_mantenimiento'`,
        [asiento, vuelo]
      );
    }
    return asientosDe(conexion, vuelo);
  });
};
