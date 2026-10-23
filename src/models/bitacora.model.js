import pool from '../config/db.js';

export const registrarBitacora = async ({ usuarioId = null, accion, detalle, ip = null }) => {
  try {
    await pool.query(
      'INSERT INTO bitacora (usuario_id, accion, detalle, ip) VALUES (?, ?, ?, ?)',
      [
        usuarioId || null,
        String(accion || '').slice(0, 40),
        String(detalle || '').slice(0, 255),
        ip ? String(ip).slice(0, 45) : null,
      ]
    );
  } catch (error) {
    console.error('No se pudo guardar la bitácora');
  }
};
