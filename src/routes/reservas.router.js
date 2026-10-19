import { Router } from 'express';
import {
  crearReserva,
  consultarReserva,
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
router.put('/:id/pago', pagarReserva);

export default router;
