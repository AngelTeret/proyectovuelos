import pool from '../config/db.js';

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
    monto_total,
    usuario_id,
  } = datos;

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const [asientos] = await connection.query(
      "SELECT * FROM asientos WHERE id = ? AND estado = 'disponible' FOR UPDATE",
      [asiento_id]
    );

    if (asientos.length === 0) {
      throw new Error('El asiento ya no está disponible o no existe');
    }

    await connection.query(
      "UPDATE asientos SET estado = 'confirmado' WHERE id = ?",
      [asiento_id]
    );

    const [pasajero] = await connection.query(
      'INSERT INTO pasajeros (nombre, apellido, documento_identidad, email, telefono) VALUES (?, ?, ?, ?, ?)',
      [nombre, apellido, documento_identidad, email, telefono]
    );

    const codigoPnr = generarCodigoPnr();

    const [reserva] = await connection.query(
      "INSERT INTO reservas (codigo_pnr, pasajero_id, vuelo_id, asiento_id, estado_pago, monto_total, usuario_id) VALUES (?, ?, ?, ?, 'pendiente', ?, ?)",
      [codigoPnr, pasajero.insertId, vuelo_id, asiento_id, monto_total, usuario_id]
    );

    await connection.commit();

    return {
      codigo_pnr: codigoPnr,
      id: reserva.insertId,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
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
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
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

    await connection.commit();

    return { saldo_virtual: usuarios[0].saldo_virtual };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
