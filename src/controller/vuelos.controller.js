import Vuelo from '../models/vuelo.model.js';
import { generarAsientosParaVuelo } from '../models/asiento.model.js';

export const obtenerVuelos = async (req, res) => {
  try {
    const vuelos = await Vuelo.obtenerTodos();
    res.status(200).json(vuelos);
  } catch (error) {
    res.status(500).json({
      mensaje: 'Error al obtener los vuelos',
      error: error.message,
    });
  }
};

export const crearVuelo = async (req, res) => {
  try {
    const { origen, destino, fecha_salida, estado } = req.body;
    const resultado = await Vuelo.crear({ origen, destino, fecha_salida, estado });
    await generarAsientosParaVuelo(resultado.insertId);
    res.status(201).json({ mensaje: 'Vuelo creado correctamente' });
  } catch (error) {
    res.status(500).json({
      mensaje: 'Error al crear el vuelo',
      error: error.message,
    });
  }
};
