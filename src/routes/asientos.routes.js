import { Router } from 'express';
import { obtenerAsientosDeVuelo } from '../controllers/asientos.controller.js';

const router = Router();

router.get('/vuelo/:vuelo_id', obtenerAsientosDeVuelo);

export default router;
