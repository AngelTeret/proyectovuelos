import bcrypt from 'bcrypt';
import pool from '../config/db.js';

const ROUNDS = 10;

export const crearUsuario = async ({ nombre, email, password, rol = 'cliente', saldo_virtual = 1000 }) => {
  const passwordHash = await bcrypt.hash(password, ROUNDS);
  const [result] = await pool.query(
    'INSERT INTO usuarios (nombre, email, password, rol, saldo_virtual) VALUES (?, ?, ?, ?, ?)',
    [nombre, email, passwordHash, rol, saldo_virtual]
  );

  return {
    id: result.insertId,
    nombre,
    email,
    rol,
    saldo_virtual,
  };
};

export const buscarPorEmail = async (email) => {
  const [rows] = await pool.query(
    'SELECT id, nombre, email, password, rol, saldo_virtual FROM usuarios WHERE email = ?',
    [email]
  );
  return rows[0] || null;
};

export const actualizarSaldo = async (id, saldo) => {
  const [result] = await pool.query(
    'UPDATE usuarios SET saldo_virtual = ? WHERE id = ?',
    [saldo, id]
  );
  return result;
};