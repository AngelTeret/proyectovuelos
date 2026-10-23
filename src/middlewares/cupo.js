const golpes = new Map();

const vigentes = (lista, ahora, ventanaMs) => lista.filter((marca) => ahora - marca < ventanaMs);

export const ipDe = (req) => req.ip || req.socket?.remoteAddress || 'desconocida';

export const cupoLleno = ({ nombre, clave, maximo, ventanaMs }) => {
  const id = `${nombre}:${clave}`;
  const ahora = Date.now();
  const lista = vigentes(golpes.get(id) || [], ahora, ventanaMs);
  golpes.set(id, lista);
  return lista.length >= maximo;
};

export const anotarIntento = ({ nombre, clave, ventanaMs }) => {
  const id = `${nombre}:${clave}`;
  const ahora = Date.now();
  const lista = vigentes(golpes.get(id) || [], ahora, ventanaMs);
  lista.push(ahora);
  golpes.set(id, lista);
};

export const olvidarIntentos = ({ nombre, clave }) => {
  golpes.delete(`${nombre}:${clave}`);
};

export const MENSAJE_CUPO = 'Demasiados intentos. Espera un momento y vuelve a intentar.';
