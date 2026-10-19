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
    const cargoAsiento = parseFloat(asiento.precio_adicional ?? 0);
    const montoTotal = Math.round((precioBase + cargoAsiento) * 100) / 100;

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

    const estadoPago = 'aprobado';
    const metodo = metodo_pago === 'saldo' ? 'saldo' : 'tarjeta';
    const [resultadoReserva] = await connection.query(
      'INSERT INTO reservas (codigo_pnr, pasajero_id, vuelo_id, asiento_id, estado_pago, metodo_pago, monto_total, usuario_id, equipaje_extra_kg, costo_servicios_extra) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [codigoPnr, idPasajero, vuelo_id, asiento_id, estadoPago, metodo, montoTotal, usuario_id, equipaje_extra_kg, metodo === 'saldo' ? 0 : costo_servicios_extra]
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
      r.monto_total - r.monto_reembolsado AS total_pagado,
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
      r.id,
      r.codigo_pnr,
      v.origen,
      v.destino,
      v.fecha_salida,
      v.estado AS estado_vuelo,
      a.numero_asiento,
      r.estado_pago,
      r.metodo_pago,
      r.monto_total,
      r.monto_reembolsado,
      TIMESTAMPDIFF(SECOND, NOW(), v.fecha_salida) AS segundos_para_salida,
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

export const obtenerComprobantePorUsuario = async (reservaId, usuarioId) => {
  const [rows] = await pool.query(
    `SELECT
      r.id,
      r.codigo_pnr,
      r.estado_pago,
      r.metodo_pago,
      r.monto_total,
      r.fecha_creacion,
      p.nombre,
      p.apellido,
      p.documento_identidad,
      v.origen,
      v.destino,
      v.fecha_salida,
      v.estado AS estado_vuelo,
      a.numero_asiento
    FROM reservas r
    INNER JOIN pasajeros p ON r.pasajero_id = p.id
    INNER JOIN vuelos v ON r.vuelo_id = v.id
    INNER JOIN asientos a ON r.asiento_id = a.id
    WHERE r.id = ? AND r.usuario_id = ?`,
    [reservaId, usuarioId]
  );

  return rows[0] || null;
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

const SEGUNDOS_DIA = 24 * 60 * 60;
const SEGUNDOS_DOS_DIAS = 2 * SEGUNDOS_DIA;

const errorDeReserva = (mensaje, codigo) => {
  const error = new Error(mensaje);
  error.codigo = codigo;
  return error;
};

export const calcularReembolso = (monto, segundos) => {
  const total = Math.round(Number(monto) * 100) / 100;
  const restante = Number(segundos);
  if (!Number.isFinite(total) || total < 0 || !Number.isFinite(restante) || restante <= 0) {
    return { permitido: false, motivo: 'salio', parcial: false, reembolso: 0 };
  }
  if (restante < SEGUNDOS_DIA) {
    return { permitido: false, motivo: 'cercano', parcial: false, reembolso: 0 };
  }
  const parcial = restante <= SEGUNDOS_DOS_DIAS;
  const reembolso = parcial ? Math.round((total / 2) * 100) / 100 : total;
  return { permitido: true, motivo: parcial ? 'parcial' : 'total', parcial, reembolso };
};

export const cancelarReservaUsuario = async ({ reservaId, usuarioId }) => {
  return conTransaccion(async (connection) => {
    const [filas] = await connection.query(
      `SELECT
        r.id,
        r.usuario_id,
        r.estado_pago,
        r.metodo_pago,
        r.monto_total,
        r.asiento_id,
        TIMESTAMPDIFF(SECOND, NOW(), v.fecha_salida) AS segundos
      FROM reservas r
      INNER JOIN vuelos v ON v.id = r.vuelo_id
      WHERE r.id = ?
      FOR UPDATE`,
      [reservaId]
    );

    const reserva = filas[0];
    if (!reserva || Number(reserva.usuario_id) !== Number(usuarioId)) {
      throw errorDeReserva('Reserva no encontrada', 404);
    }
    if (reserva.estado_pago === 'reembolsado') {
      throw errorDeReserva('Esta reserva ya fue cancelada', 400);
    }
    if (reserva.estado_pago !== 'aprobado' || reserva.metodo_pago !== 'saldo') {
      throw errorDeReserva('Solo se puede cancelar una reserva pagada con billetera', 400);
    }

    const calculo = calcularReembolso(reserva.monto_total, reserva.segundos);
    if (!calculo.permitido) {
      const mensaje = calculo.motivo === 'cercano'
        ? 'Por el poco tiempo que queda para el vuelo no se puede devolver el dinero.'
        : 'El vuelo ya salió y no se puede cancelar';
      throw errorDeReserva(mensaje, 400);
    }

    await connection.query(
      `UPDATE asientos
       SET estado = 'disponible', bloqueo_hasta = NULL, bloqueo_llave = NULL
       WHERE id = ? AND estado = 'confirmado'`,
      [reserva.asiento_id]
    );
    await connection.query(
      'UPDATE usuarios SET saldo_virtual = saldo_virtual + ? WHERE id = ?',
      [calculo.reembolso, usuarioId]
    );
    await connection.query(
      `UPDATE reservas
       SET estado_pago = 'reembolsado', monto_reembolsado = ?
       WHERE id = ?`,
      [calculo.reembolso, reserva.id]
    );

    const [usuarios] = await connection.query(
      'SELECT saldo_virtual FROM usuarios WHERE id = ?',
      [usuarioId]
    );

    return {
      reembolso: calculo.reembolso,
      parcial: calculo.parcial,
      saldo_virtual: usuarios[0]?.saldo_virtual ?? null,
    };
  });
};
