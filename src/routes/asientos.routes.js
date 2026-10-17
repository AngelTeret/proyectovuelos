import { Router } from 'express';
import {
  bloquearAsiento,
  obtenerAsientosDeVuelo,
  verBloqueo,
} from '../controller/asientos.controller.js';

const router = Router();

router.get('/vuelo/:vuelo_id', obtenerAsientosDeVuelo);
router.post('/bloquear', bloquearAsiento);
router.get('/:id/bloqueo', verBloqueo);

export default router;
