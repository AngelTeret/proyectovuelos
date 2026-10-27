import { Router } from 'express';
import { obtenerReporte } from '../controller/reportes.controller.js';
import { exigirAdmin } from '../middlewares/sesion.js';

const router = Router();

router.get('/:tipo', exigirAdmin, obtenerReporte);

export default router;
