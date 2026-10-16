import { Router } from 'express';
import { obtenerAsientosDeVuelo } from '../controller/asientos.controller.js';

const router = Router();

router.get('/vuelo/:vuelo_id', obtenerAsientosDeVuelo);

export default router;
