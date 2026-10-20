import pool from '../config/db.js';

export const SALDO_BIENVENIDA = 15000;

export const crearUsuario = async ({ nombre, email, password, rol = 'cliente', saldo_virtual = 0 }) => {
  const [result] = await pool.query(
    'INSERT INTO usuarios (nombre, email, password, rol, saldo_virtual) VALUES (?, ?, ?, ?, ?)',
    [nombre, email, password, rol, saldo_virtual]
  );

  return {
    id: result.insertId,
    nombre,
    email,
    rol,
    saldo_virtual,
  };
};

export const buscarPorId = async (id) => {
  const [rows] = await pool.query(
    'SELECT id, nombre, email, rol, saldo_virtual FROM usuarios WHERE id = ?',
    [id]
  );
  return rows[0] || null;
};

export const buscarPorEmail = async (email) => {
  const [rows] = await pool.query(
    'SELECT id, nombre, email, password, rol, saldo_virtual, email_verificado FROM usuarios WHERE email = ?',
    [email]
  );
  return rows[0] || null;
};

export const crearUsuarioPendiente = async ({ nombre, email, password, tokenHash }) => {
  const [result] = await pool.query(
    `INSERT INTO usuarios
      (nombre, email, password, rol, saldo_virtual, email_verificado, token_verificacion, token_expira)
     VALUES (?, ?, ?, 'cliente', 0, 0, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
    [nombre, email, password, tokenHash]
  );

  return {
    id: result.insertId,
    nombre,
    email,
    rol: 'cliente',
    saldo_virtual: 0,
    email_verificado: 0,
  };
};

export const renovarVerificacion = async ({ id, nombre, password, tokenHash }) => {
  await pool.query(
    `UPDATE usuarios
     SET nombre = ?, password = ?, token_verificacion = ?, token_expira = DATE_ADD(NOW(), INTERVAL 24 HOUR)
     WHERE id = ? AND email_verificado = 0`,
    [nombre, password, tokenHash, id]
  );
};

export const prepararReenvio = async ({ id, tokenHash }) => {
  await pool.query(
    `UPDATE usuarios
     SET token_verificacion = ?, token_expira = DATE_ADD(NOW(), INTERVAL 24 HOUR)
     WHERE id = ? AND email_verificado = 0`,
    [tokenHash, id]
  );
};

export const confirmarCorreo = async (tokenHash) => {
  const [rows] = await pool.query(
    `SELECT id, email_verificado, token_expira > NOW() AS vigente
     FROM usuarios
     WHERE token_verificacion = ?`,
    [tokenHash]
  );
  const usuario = rows[0];
  if (!usuario) {
    return 'invalido';
  }
  if (Number(usuario.vigente) !== 1) {
    return 'expirado';
  }

  await pool.query(
    `UPDATE usuarios
     SET email_verificado = 1,
         saldo_virtual = IF(saldo_virtual = 0, ?, saldo_virtual),
         token_verificacion = NULL,
         token_expira = NULL
     WHERE id = ? AND email_verificado = 0`,
    [SALDO_BIENVENIDA, usuario.id]
  );
  return 'ok';
};

export const actualizarSaldo = async (id, saldo) => {
  const [result] = await pool.query(
    'UPDATE usuarios SET saldo_virtual = ? WHERE id = ?',
    [saldo, id]
  );
  return result;
};