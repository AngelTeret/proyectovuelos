import { Router } from 'express';
import { login, perfil, reenviarVerificacion, registro, verificarCorreo } from '../controller/auth.controller.js';

const router = Router();

router.post('/registro', registro);
router.post('/verificar', verificarCorreo);
router.post('/reenviar', reenviarVerificacion);
router.post('/login', login);
router.get('/perfil', perfil);

export default router;
