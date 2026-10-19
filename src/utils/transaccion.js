import pool from '../config/db.js';

export const conTransaccion = async (trabajo) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const resultado = await trabajo(connection);
    await connection.commit();
    return resultado;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
