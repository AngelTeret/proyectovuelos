import pool from '../config/db.js';

export const verificarIdempotencia = async (req, res, next) => {
  const llave = req.get('idempotency-key');

  if (!llave) {
    return res.status(400).json({
      mensaje: 'El header idempotency-key es obligatorio',
    });
  }

  try {
    const [filas] = await pool.query(
      'SELECT codigo_http, cuerpo_respuesta FROM idempotencia_pagos WHERE llave_idempotencia = ?',
      [llave]
    );

    if (filas.length > 0) {
      const { codigo_http, cuerpo_respuesta } = filas[0];
      const cuerpo = typeof cuerpo_respuesta === 'string'
        ? JSON.parse(cuerpo_respuesta)
        : cuerpo_respuesta;

      return res.status(codigo_http).json(cuerpo);
    }

    next();
  } catch (error) {
    res.status(500).json({
      mensaje: 'Error al verificar la idempotencia',
      error: error.message,
    });
  }
};
