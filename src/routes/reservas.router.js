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
import { exigirAdmin, exigirSesion } from '../middlewares/sesion.js';

const router = Router();

router.get('/', exigirAdmin, obtenerReservas);
router.get('/mi-historial', obtenerHistorialUsuario);
router.post('/', exigirSesion, verificarIdempotencia, crearReserva);
router.get('/pnr/:pnr', exigirSesion, consultarReserva);
router.get('/:id/comprobante', obtenerComprobante);
router.get('/:id/boleto', descargarBoleto);
router.put('/:id/cancelar', cancelarReserva);
router.put('/:id/pago', exigirSesion, pagarReserva);

export default router;
