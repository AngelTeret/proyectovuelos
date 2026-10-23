import pool from '../config/db.js';

const LIMITE = 200;

export const listarBitacora = async () => {
  const [filas] = await pool.query(
    `SELECT b.id, b.accion, b.detalle, b.ip, b.creado_en,
            u.nombre AS nombre_usuario, u.email AS email_usuario
     FROM bitacora b
     LEFT JOIN usuarios u ON u.id = b.usuario_id
     ORDER BY b.id DESC
     LIMIT ${LIMITE}`
  );
  return filas;
};

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
