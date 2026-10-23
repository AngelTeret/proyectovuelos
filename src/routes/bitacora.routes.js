import { Router } from 'express';
import { obtenerBitacora } from '../controller/bitacora.controller.js';
import { exigirAdmin } from '../middlewares/sesion.js';

const router = Router();

router.get('/', exigirAdmin, obtenerBitacora);

export default router;
