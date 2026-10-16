import pool from '../config/db.js';

export const obtenerPorVuelo = async (vuelo_id) => {
  const [rows] = await pool.query(
    'SELECT * FROM asientos WHERE vuelo_id = ?',
    [vuelo_id]
  );
  return rows;
};

export const generarAsientosParaVuelo = async (vuelo_id) => {
  const letras = ['A', 'B', 'C', 'D', 'E', 'F'];

  for (let fila = 1; fila <= 5; fila++) {
    for (const letra of letras) {
      const numeroAsiento = `${fila}${letra}`;
      await pool.query(
        'INSERT INTO asientos (vuelo_id, numero_asiento, estado) VALUES (?, ?, ?)',
        [vuelo_id, numeroAsiento, 'disponible']
      );
    }
  }
};
