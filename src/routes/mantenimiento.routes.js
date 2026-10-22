import { Router } from 'express';
import { bloquear, consultar, liberar, listar } from '../controller/mantenimiento.controller.js';
import { exigirMantenimiento } from '../middlewares/sesion.js';

const router = Router();

router.get('/vuelos', exigirMantenimiento, listar);
router.get('/vuelos/:id', exigirMantenimiento, consultar);
router.post('/vuelos/:id/asientos/:asientoId/bloquear', exigirMantenimiento, bloquear);
router.post('/vuelos/:id/asientos/:asientoId/liberar', exigirMantenimiento, liberar);

export default router;
