import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const carpetaImagenes = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../public/imagenes'
);

const extensiones = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const almacenamiento = multer.diskStorage({
  destination: carpetaImagenes,
  filename: (req, archivo, callback) => {
    const extension = path.extname(archivo.originalname).toLowerCase();
    const nombre = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`;
    callback(null, nombre);
  },
});

const carga = multer({
  storage: almacenamiento,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, archivo, callback) => {
    const extension = path.extname(archivo.originalname).toLowerCase();
    if (!archivo.mimetype.startsWith('image/') || !extensiones.has(extension)) {
      callback(new Error('Solo se permiten imágenes JPG, PNG o WEBP'));
      return;
    }
    callback(null, true);
  },
}).single('imagen');

export const subirImagen = (req, res, next) => {
  carga(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    const mensaje = error.code === 'LIMIT_FILE_SIZE'
      ? 'La imagen no puede superar 2 MB'
      : error.message;
    res.status(400).json({ mensaje });
  });
};
