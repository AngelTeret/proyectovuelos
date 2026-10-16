import pool from '../config/db.js';

export const crear = async ({ nombre, apellido, documento_identidad, email, telefono }) => {
  const [resultado] = await pool.query(
    'INSERT INTO pasajeros (nombre, apellido, documento_identidad, email, telefono) VALUES (?, ?, ?, ?, ?)',
    [nombre, apellido, documento_identidad, email, telefono]
  );

  return {
    id: resultado.insertId,
    nombre,
    apellido,
    documento_identidad,
    email,
    telefono,
  };
};
