import { Router } from 'express';
import {
  borrarEquipo,
  crearEquipo,
  editarEquipo,
  obtenerClientes,
  obtenerEquipo,
} from '../controller/personal.controller.js';
import { exigirAdmin } from '../middlewares/sesion.js';

const router = Router();

router.get('/equipo', exigirAdmin, obtenerEquipo);
router.get('/clientes', exigirAdmin, obtenerClientes);
router.post('/equipo', exigirAdmin, crearEquipo);
router.put('/equipo/:id', exigirAdmin, editarEquipo);
router.delete('/equipo/:id', exigirAdmin, borrarEquipo);

export default router;
