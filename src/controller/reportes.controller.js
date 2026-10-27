import { exportarReporteExcel, generarReporte } from '../services/reportesService.js';
import { responderErrorInterno } from '../utils/errorInterno.js';

const TIPOS = new Set(['vuelos', 'ingresos', 'pasajeros', 'checkin', 'bitacora']);

export const obtenerReporte = async (req, res) => {
  try {
    if (!TIPOS.has(req.params.tipo)) {
      res.status(404).json({ mensaje: 'Ese reporte no existe.' });
      return;
    }
    const consulta = {
      desde: req.query.desde,
      hasta: req.query.hasta,
      pagina: req.query.pagina,
    };
    if (req.query.formato === 'xlsx' || req.query.formato === 'csv') {
      const archivo = await exportarReporteExcel(req.params.tipo, consulta);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${archivo.nombre}"`);
      res.status(200).send(archivo.contenido);
      return;
    }
    const reporte = await generarReporte(req.params.tipo, consulta);
    res.status(200).json(reporte);
  } catch (error) {
    if (error?.codigo === 400) {
      res.status(400).json({ mensaje: error.message });
      return;
    }
    responderErrorInterno(res, error);
  }
};
