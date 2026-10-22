import { Router } from 'express';
import { consultarCheckin, crearCheckin, descargarBoletos } from '../controller/checkin.controller.js';
import { exigirSesion } from '../middlewares/sesion.js';

const router = Router();

router.get('/elegibilidad/:pnr', exigirSesion, consultarCheckin);
router.get('/pnr/:pnr/pdf', exigirSesion, descargarBoletos);
router.post('/', exigirSesion, crearCheckin);

export default router;
