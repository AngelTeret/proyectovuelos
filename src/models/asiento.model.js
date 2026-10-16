import pool from '../config/db.js';

export const obtenerPorVuelo = async (vuelo_id) => {
  const [rows] = await pool.query(
    'SELECT * FROM asientos WHERE vuelo_id = ? ORDER BY numero_asiento',
    [vuelo_id]
  );
  return rows;
};

export const idsConReserva = async (vuelo_id) => {
  const [rows] = await pool.query(
    'SELECT asiento_id FROM reservas WHERE vuelo_id = ?',
    [vuelo_id]
  );
  return rows.map((fila) => fila.asiento_id);
};

export const generarAsientosParaVuelo = async (vuelo_id, capacidad = 30) => {
  const letras = ['A', 'B', 'C', 'D', 'E', 'F'];
  const filas = Math.ceil(Number(capacidad) / letras.length);

  for (let fila = 1; fila <= filas; fila++) {
    for (const letra of letras) {
      const numeroAsiento = `${fila}${letra}`;
      await pool.query(
        'INSERT INTO asientos (vuelo_id, numero_asiento, estado) VALUES (?, ?, ?)',
        [vuelo_id, numeroAsiento, 'disponible']
      );
    }
  }
};
