import { Router } from 'express';
import { obtenerVuelos, crearVuelo, actualizarVuelo, eliminarVuelo } from '../controller/vuelos.controller.js';
import { obtenerAsientosPorVuelo } from '../controller/asientos.controller.js';
import { subirImagen } from '../middlewares/subirImagen.js';
import { exigirAdmin } from '../middlewares/sesion.js';

const router = Router();

router.get('/', obtenerVuelos);
router.get('/:id/asientos', obtenerAsientosPorVuelo);
router.post('/', exigirAdmin, subirImagen, crearVuelo);
router.put('/:id', exigirAdmin, subirImagen, actualizarVuelo);
router.delete('/:id', exigirAdmin, eliminarVuelo);

export default router;
