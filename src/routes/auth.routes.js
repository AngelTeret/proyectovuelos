import { Router } from 'express';
import {
  login,
  olvidarContrasena,
  perfil,
  reenviarVerificacion,
  registro,
  restablecerContrasena,
  revisarEnlaceRestablecer,
  verificarCorreo,
} from '../controller/auth.controller.js';

const router = Router();

router.post('/registro', registro);
router.post('/verificar', verificarCorreo);
router.post('/reenviar', reenviarVerificacion);
router.post('/login', login);
router.post('/olvide', olvidarContrasena);
router.post('/restablecer/revisar', revisarEnlaceRestablecer);
router.post('/restablecer', restablecerContrasena);
router.get('/perfil', perfil);

export default router;
