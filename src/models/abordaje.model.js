import pool from '../config/db.js';
import { conTransaccion } from '../utils/transaccion.js';
import { CIERRA_SEGUNDOS } from '../utils/checkinVentana.js';

const HORAS_LISTA = 48;

const errorAbordaje = (mensaje, codigo) => {
  const error = new Error(mensaje);
  error.codigo = codigo;
  return error;
};

const idVuelo = (valor) => {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) {
    throw errorAbordaje('Ese vuelo no existe', 404);
  }
  return id;
};

const codigoBoleto = (valor) => String(valor || '').trim().toUpperCase();

const segundosParaSalir = (fecha) => {
  const salida = new Date(fecha).getTime();
  if (!Number.isFinite(salida)) {
    return null;
  }
  return Math.floor((salida - Date.now()) / 1000);
};

export const marcarSalidas = async (executor = pool) => {
  await executor.query(
    `UPDATE vuelos
     SET estado = 'En Curso'
     WHERE estado = 'Cerrado' AND fecha_salida <= NOW()`
  );
  await executor.query(
    `UPDATE vuelos
     SET estado = 'Completado'
     WHERE estado = 'En Curso'
       AND DATE_ADD(fecha_salida, INTERVAL duracion_minutos MINUTE) <= NOW()`
  );
};

const presentarVuelo = (vuelo, conteos = {}) => ({
  id: vuelo.id,
  origen: vuelo.origen,
  destino: vuelo.destino,
  fecha_salida: vuelo.fecha_salida,
  duracion_minutos: Number(vuelo.duracion_minutos) || 0,
  estado: vuelo.estado,
  chequeados: Number(conteos.chequeados) || 0,
  abordados: Number(conteos.abordados) || 0,
  no_show: Number(conteos.no_show) || 0,
  sin_checkin: Number(conteos.sin_checkin) || 0,
});

const conteosDe = async (executor, vueloId) => {
  const [filas] = await executor.query(
    `SELECT
      SUM(c.estado = 'chequeado') AS chequeados,
      SUM(c.estado = 'abordado') AS abordados,
      SUM(c.estado = 'no_show') AS no_show,
      SUM(rp.id IS NOT NULL AND c.id IS NULL) AS sin_checkin
    FROM reserva_pasajeros rp
    INNER JOIN reservas r ON r.id = rp.reserva_id AND r.estado_pago = 'aprobado'
    LEFT JOIN checkins c ON c.reserva_pasajero_id = rp.id AND c.estado <> 'anulado'
    WHERE r.vuelo_id = ?`,
    [vueloId]
  );
  return filas[0] || {};
};

const bloquearVuelo = async (connection, vueloId) => {
  const [filas] = await connection.query(
    'SELECT id, origen, destino, fecha_salida, estado FROM vuelos WHERE id = ? FOR UPDATE',
    [vueloId]
  );
  return filas[0] || null;
};

const pasajerosDe = async (executor, vueloId) => {
  const [filas] = await executor.query(
    `SELECT
      c.codigo_boleto,
      CASE WHEN c.id IS NULL THEN 'sin_checkin' ELSE c.estado END AS estado,
      p.nombre,
      p.apellido,
      p.tipo,
      p.documento_identidad,
      a.numero_asiento,
      r.codigo_pnr
    FROM reserva_pasajeros rp
    INNER JOIN pasajeros p ON p.id = rp.pasajero_id
    INNER JOIN reservas r ON r.id = rp.reserva_id
    LEFT JOIN asientos a ON a.id = rp.asiento_id
    LEFT JOIN checkins c ON c.reserva_pasajero_id = rp.id AND c.estado <> 'anulado'
    WHERE r.vuelo_id = ? AND r.estado_pago = 'aprobado'
    ORDER BY a.numero_asiento, rp.orden`,
    [vueloId]
  );
  return filas.map((fila) => ({
    nombre: fila.nombre,
    apellido: fila.apellido,
    tipo: fila.tipo,
    documento_identidad: fila.documento_identidad,
    numero_asiento: fila.numero_asiento,
    codigo_pnr: fila.codigo_pnr,
    codigo_boleto: fila.codigo_boleto,
    estado: fila.estado,
  }));
};

export const listarVuelosAbordaje = async () => {
  await marcarSalidas();
  const [filas] = await pool.query(
    `SELECT
      v.id,
      v.origen,
      v.destino,
      v.fecha_salida,
      v.duracion_minutos,
      v.estado,
      SUM(c.estado = 'chequeado') AS chequeados,
      SUM(c.estado = 'abordado') AS abordados,
      SUM(c.estado = 'no_show') AS no_show,
      SUM(rp.id IS NOT NULL AND c.id IS NULL) AS sin_checkin
    FROM vuelos v
    LEFT JOIN reservas r ON r.vuelo_id = v.id AND r.estado_pago = 'aprobado'
    LEFT JOIN reserva_pasajeros rp ON rp.reserva_id = r.id
    LEFT JOIN checkins c ON c.reserva_pasajero_id = rp.id AND c.estado <> 'anulado'
    WHERE v.estado IN ('Abordando', 'Cerrado')
      OR (v.estado = 'En Curso' AND v.fecha_salida >= NOW() - INTERVAL 1 DAY)
      OR (
        v.estado IN ('Programado', 'Retrasado')
        AND TIMESTAMPDIFF(SECOND, NOW(), v.fecha_salida) BETWEEN 0 AND ?
      )
    GROUP BY v.id, v.origen, v.destino, v.fecha_salida, v.duracion_minutos, v.estado
    ORDER BY v.fecha_salida`,
    [HORAS_LISTA * 60 * 60]
  );
  return filas.map((vuelo) => presentarVuelo(vuelo, vuelo));
};

export const obtenerAbordaje = async (vueloId) => {
  const id = idVuelo(vueloId);
  await marcarSalidas();
  const [filas] = await pool.query(
    'SELECT id, origen, destino, fecha_salida, duracion_minutos, estado FROM vuelos WHERE id = ?',
    [id]
  );
  const vuelo = filas[0];
  if (!vuelo) {
    throw errorAbordaje('Vuelo no encontrado', 404);
  }
  const conteos = await conteosDe(pool, id);
  return {
    ...presentarVuelo(vuelo, conteos),
    pasajeros: await pasajerosDe(pool, id),
  };
};

export const iniciarAbordaje = async (vueloId) => {
  const id = idVuelo(vueloId);
  return conTransaccion(async (connection) => {
    const vuelo = await bloquearVuelo(connection, id);
    if (!vuelo) {
      throw errorAbordaje('Vuelo no encontrado', 404);
    }
    if (vuelo.estado !== 'Abordando') {
      if (vuelo.estado !== 'Programado' && vuelo.estado !== 'Retrasado') {
        throw errorAbordaje('Este vuelo no puede iniciar el abordaje', 400);
      }
      await connection.query('UPDATE vuelos SET estado = ? WHERE id = ?', ['Abordando', id]);
      vuelo.estado = 'Abordando';
    }
    const conteos = await conteosDe(connection, id);
    return {
      ...presentarVuelo(vuelo, conteos),
      pasajeros: await pasajerosDe(connection, id),
    };
  });
};

export const marcarAbordado = async (vueloId, codigo) => {
  const id = idVuelo(vueloId);
  const boleto = codigoBoleto(codigo);
  if (!boleto) {
    throw errorAbordaje('Escribe el código del boleto', 400);
  }
  return conTransaccion(async (connection) => {
    const vuelo = await bloquearVuelo(connection, id);
    if (!vuelo) {
      throw errorAbordaje('Vuelo no encontrado', 404);
    }
    if (vuelo.estado !== 'Abordando') {
      throw errorAbordaje('Inicia el abordaje de este vuelo', 400);
    }
    const [filas] = await connection.query(
      `SELECT c.id, c.estado, r.vuelo_id
       FROM checkins c
       INNER JOIN reserva_pasajeros rp ON rp.id = c.reserva_pasajero_id
       INNER JOIN reservas r ON r.id = rp.reserva_id
       WHERE c.codigo_boleto = ?
       FOR UPDATE`,
      [boleto]
    );
    const checkin = filas[0];
    if (!checkin) {
      throw errorAbordaje('No encontramos ese boleto', 404);
    }
    if (Number(checkin.vuelo_id) !== id) {
      throw errorAbordaje('Ese código no está en este vuelo', 400);
    }
    if (checkin.estado === 'anulado') {
      throw errorAbordaje('Ese boleto está anulado', 400);
    }
    if (checkin.estado === 'no_show') {
      throw errorAbordaje('Ese boleto ya quedó como no se presentó', 400);
    }
    if (checkin.estado === 'chequeado') {
      await connection.query('UPDATE checkins SET estado = ? WHERE id = ?', ['abordado', checkin.id]);
    }
    const conteos = await conteosDe(connection, id);
    return {
      ...presentarVuelo(vuelo, conteos),
      pasajeros: await pasajerosDe(connection, id),
    };
  });
};

export const cerrarAbordaje = async (vueloId) => {
  const id = idVuelo(vueloId);
  return conTransaccion(async (connection) => {
    const vuelo = await bloquearVuelo(connection, id);
    if (!vuelo) {
      throw errorAbordaje('Vuelo no encontrado', 404);
    }
    if (vuelo.estado !== 'Abordando') {
      throw errorAbordaje('El abordaje de este vuelo no está abierto', 400);
    }
    const falta = segundosParaSalir(vuelo.fecha_salida);
    if (falta == null) {
      throw errorAbordaje('No se pudo leer la hora de salida', 400);
    }
    if (falta > CIERRA_SEGUNDOS) {
      throw errorAbordaje('Puedes cerrar la puerta cuando falte una hora o menos para la salida', 400);
    }
    const [ausentes] = await connection.query(
      `UPDATE checkins c
       INNER JOIN reserva_pasajeros rp ON rp.id = c.reserva_pasajero_id
       INNER JOIN reservas r ON r.id = rp.reserva_id
       SET c.estado = 'no_show'
       WHERE r.vuelo_id = ? AND c.estado = 'chequeado'`,
      [id]
    );
    const estado = falta <= 0 ? 'En Curso' : 'Cerrado';
    await connection.query('UPDATE vuelos SET estado = ? WHERE id = ?', [estado, id]);
    vuelo.estado = estado;
    const conteos = await conteosDe(connection, id);
    return {
      ...presentarVuelo(vuelo, conteos),
      pasajeros: await pasajerosDe(connection, id),
      ausentes: ausentes.affectedRows,
    };
  });
};
