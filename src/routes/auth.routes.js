import { Router } from 'express';
import { login, perfil, registro } from '../controller/auth.controller.js';

const router = Router();

router.post('/registro', registro);
router.post('/login', login);
router.get('/perfil', perfil);

export default router;
