import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';
import vuelosRoutes from './routes/vuelos.routes.js';
import asientosRoutes from './routes/asientos.routes.js';
import reservasRoutes from './routes/reservas.router.js';
import authRoutes from './routes/auth.routes.js';
import pasajerosRoutes from './routes/pasajeros.routes.js';
import checkinRoutes from './routes/checkin.routes.js';
import abordajeRoutes from './routes/abordaje.routes.js';
import personalRoutes from './routes/personal.routes.js';
import mantenimientoRoutes from './routes/mantenimiento.routes.js';
import bitacoraRoutes from './routes/bitacora.routes.js';
import reportesRoutes from './routes/reportes.routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);
export { app };
const PORT = process.env.PORT || 3000;
const origenes = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);
const appUrl = String(process.env.APP_URL || '').trim().replace(/\/$/, '');
if (appUrl) {
  origenes.add(appUrl);
}

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'self' https://cdn.tailwindcss.com; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
  );
  next();
});
app.use(cors({
  origin(origin, callback) {
    if (!origin || origenes.has(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
}));
app.use(express.json({ limit: '100kb' }));

const carpetaPublica = path.resolve(__dirname, '../public');

app.use((req, res, next) => {
  if ((req.method !== 'GET' && req.method !== 'HEAD') || !req.path.endsWith('.html')) {
    next();
    return;
  }
  const archivo = path.resolve(carpetaPublica, req.path.slice(1));
  const dentro = archivo.startsWith(`${carpetaPublica}${path.sep}`);
  if (!dentro || !existsSync(archivo)) {
    next();
    return;
  }
  const consulta = req.originalUrl.slice(req.path.length);
  const destino = req.path === '/index.html' ? '/' : req.path.slice(0, -5);
  res.redirect(301, `${destino}${consulta}`);
});

app.use(express.static(carpetaPublica, {
  extensions: ['html'],
  setHeaders(res, archivo) {
    if (archivo.endsWith('.html') || archivo.endsWith('.js')) {
      res.setHeader('Cache-Control', 'no-store');
    }
  },
}));
app.use('/api/vuelos', vuelosRoutes);
app.use('/api/asientos', asientosRoutes);
app.use('/api/reservas', reservasRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/pasajeros', pasajerosRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/abordaje', abordajeRoutes);
app.use('/api/personal', personalRoutes);
app.use('/api/mantenimiento', mantenimientoRoutes);
app.use('/api/bitacora', bitacoraRoutes);
app.use('/api/reportes', reportesRoutes);

app.get('/api/salud', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ estado: 'ok' });
  } catch (error) {
    res.status(503).json({ estado: 'sin_base' });
  }
});

app.use((error, req, res, next) => {
  if (error?.type === 'entity.too.large') {
    res.status(413).json({ mensaje: 'La solicitud es demasiado grande.' });
    return;
  }
  next(error);
});

const esPrincipal = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (esPrincipal) {
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
  });
}
