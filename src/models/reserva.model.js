import pool from '../config/db.js';
import { conTransaccion } from '../utils/transaccion.js';

const generarCodigoPnr = () => {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let codigo = '';

  for (let i = 0; i < 6; i++) {
    const indice = Math.floor(Math.random() * caracteres.length);
    codigo += caracteres[indice];
  }

  return codigo;
};

export const crearReservaTransaccion = async (datos) => {
  const {
    nombre,
    apellido,
    documento_identidad,
    email,
    telefono,
    vuelo_id,
    asiento_id,
    usuario_id,
    pasajero_id,
    equipaje_extra_kg = 0,
    costo_servicios_extra = 0.00,
    metodo_pago = 'tarjeta',
    llave_idempotencia,
    bloqueo_llave,
  } = datos;

  return conTransaccion(async (connection) => {
    await connection.query(
      `UPDATE asientos
       SET estado = 'disponible', bloqueo_hasta = NULL, bloqueo_llave = NULL
       WHERE estado = 'reservado_temporal' AND bloqueo_hasta <= NOW() AND id <> ?`,
      [asiento_id]
    );

    const [asientos] = await connection.query(
      `SELECT *, bloqueo_hasta > NOW() AS vigente
       FROM asientos
       WHERE id = ? AND vuelo_id = ?
       FOR UPDATE`,
      [asiento_id, vuelo_id]
    );

    if (asientos.length === 0) {
      throw new Error('El asiento ya no está disponible o no existe');
    }

    const asiento = asientos[0];
    const propio = asiento.estado === 'reservado_temporal' && asiento.bloqueo_llave === String(bloqueo_llave || '');

    if (propio && Number(asiento.vigente) !== 1) {
      await connection.query(
        `UPDATE asientos
         SET estado = 'disponible', bloqueo_hasta = NULL, bloqueo_llave = NULL
         WHERE id = ?`,
        [asiento_id]
      );
      throw new Error('El tiempo para completar el pago terminó. Vuelve a elegir un asiento.');
    }

    if (!propio) {
      throw new Error('El asiento ya no está disponible o no existe');
    }

    const [filasVuelo] = await connection.query(
      'SELECT precio_base FROM vuelos WHERE id = ?',
      [vuelo_id]
    );
    if (filasVuelo.length === 0) {
      throw new Error('El vuelo no existe');
    }
    const precioBase = parseFloat(filasVuelo[0].precio_base ?? 0);
    const montoTotal = precioBase;

    if (metodo_pago === 'saldo') {
      if (!usuario_id) {
        throw new Error('Debes iniciar sesión para pagar con saldo');
      }

      const [usuarios] = await connection.query(
        'SELECT saldo_virtual FROM usuarios WHERE id = ? FOR UPDATE',
        [usuario_id]
      );

      if (usuarios.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      const saldo = parseFloat(usuarios[0].saldo_virtual);
      if (saldo < montoTotal) {
        throw new Error('Saldo insuficiente');
      }

      await connection.query(
        'UPDATE usuarios SET saldo_virtual = saldo_virtual - ? WHERE id = ?',
        [montoTotal, usuario_id]
      );
    }

    await connection.query(
      "UPDATE asientos SET estado = 'confirmado', bloqueo_hasta = NULL, bloqueo_llave = NULL WHERE id = ?",
      [asiento_id]
    );

    let idPasajero = pasajero_id;
    if (!idPasajero) {
      const [pasajero] = await connection.query(
        'INSERT INTO pasajeros (nombre, apellido, documento_identidad, email, telefono) VALUES (?, ?, ?, ?, ?)',
        [nombre, apellido, documento_identidad, email, telefono]
      );
      idPasajero = pasajero.insertId;
    }

    const codigoPnr = generarCodigoPnr();

    const estadoPago = metodo_pago === 'saldo' ? 'aprobado' : 'pendiente';
    const [resultadoReserva] = await connection.query(
      'INSERT INTO reservas (codigo_pnr, pasajero_id, vuelo_id, asiento_id, estado_pago, monto_total, usuario_id, equipaje_extra_kg, costo_servicios_extra) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [codigoPnr, idPasajero, vuelo_id, asiento_id, estadoPago, montoTotal, usuario_id, equipaje_extra_kg, metodo_pago === 'saldo' ? 0 : costo_servicios_extra]
    );

    await connection.query(
      "INSERT INTO idempotencia_pagos (llave_idempotencia, reserva_id, estado_respuesta, codigo_http, cuerpo_respuesta) VALUES (?, ?, 'COMPLETADO', 201, ?)",
      [
        llave_idempotencia,
        resultadoReserva.insertId,
        JSON.stringify({
          mensaje: 'Reserva confirmada',
          reservaId: resultadoReserva.insertId,
          pnr: codigoPnr,
          total: montoTotal,
        }),
      ]
    );

    return {
      codigo_pnr: codigoPnr,
      id: resultadoReserva.insertId,
    };
  });
};

export const obtenerTodas = async () => {
  const [rows] = await pool.query(
    `SELECT
      r.codigo_pnr,
      CONCAT(p.nombre, ' ', p.apellido) AS nombre_cliente,
      v.origen,
      v.destino,
      a.numero_asiento,
      r.monto_total AS total_pagado,
      r.fecha_creacion
    FROM reservas r
    INNER JOIN pasajeros p ON r.pasajero_id = p.id
    INNER JOIN vuelos v ON r.vuelo_id = v.id
    INNER JOIN asientos a ON r.asiento_id = a.id
    ORDER BY r.fecha_creacion DESC`
  );

  return rows;
};

export const obtenerHistorialPorUsuario = async (usuarioId) => {
  const [rows] = await pool.query(
    `SELECT
      r.codigo_pnr,
      v.origen,
      v.destino,
      v.fecha_salida,
      a.numero_asiento,
      r.estado_pago,
      r.monto_total,
      r.fecha_creacion
    FROM reservas r
    INNER JOIN vuelos v ON r.vuelo_id = v.id
    INNER JOIN asientos a ON r.asiento_id = a.id
    WHERE r.usuario_id = ?
    ORDER BY r.fecha_creacion DESC`,
    [usuarioId]
  );

  return rows;
};

export const obtenerPorPNR = async (codigo_pnr) => {
  const [rows] = await pool.query(
    `SELECT
      r.id,
      r.codigo_pnr,
      p.nombre,
      p.apellido,
      p.documento_identidad,
      p.email,
      p.telefono,
      v.origen,
      v.destino,
      a.numero_asiento,
      r.estado_pago
    FROM reservas r
    INNER JOIN pasajeros p ON r.pasajero_id = p.id
    INNER JOIN vuelos v ON r.vuelo_id = v.id
    INNER JOIN asientos a ON r.asiento_id = a.id
    WHERE r.codigo_pnr = ?`,
    [codigo_pnr]
  );

  return rows[0] || null;
};

export const actualizarPago = async (id) => {
  return conTransaccion(async (connection) => {
    const [reservas] = await connection.query(
      'SELECT monto_total, usuario_id FROM reservas WHERE id = ? FOR UPDATE',
      [id]
    );

    if (reservas.length === 0) {
      throw new Error('La reserva no existe');
    }

    const { monto_total, usuario_id } = reservas[0];
    if (!usuario_id) {
      throw new Error('La reserva no está asociada a un usuario');
    }

    await connection.query(
      "UPDATE reservas SET estado_pago = 'aprobado' WHERE id = ?",
      [id]
    );

    await connection.query(
      'UPDATE usuarios SET saldo_virtual = saldo_virtual - ? WHERE id = ?',
      [monto_total, usuario_id]
    );

    const [usuarios] = await connection.query(
      'SELECT saldo_virtual FROM usuarios WHERE id = ?',
      [usuario_id]
    );

    return { saldo_virtual: usuarios[0].saldo_virtual };
  });
};
