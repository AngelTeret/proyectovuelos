import { Router } from 'express';
import {
  crearReserva,
  consultarReserva,
  cancelarReserva,
  descargarBoleto,
  obtenerComprobante,
  obtenerHistorialUsuario,
  obtenerReservas,
  pagarReserva,
} from '../controller/reservas.controller.js';
import { verificarIdempotencia } from '../middlewares/idempotencia.js';

const router = Router();

router.get('/', obtenerReservas);
router.get('/mi-historial', obtenerHistorialUsuario);
router.post('/', verificarIdempotencia, crearReserva);
router.get('/pnr/:pnr', consultarReserva);
router.get('/:id/comprobante', obtenerComprobante);
router.get('/:id/boleto', descargarBoleto);
router.put('/:id/cancelar', cancelarReserva);
router.put('/:id/pago', pagarReserva);

export default router;
