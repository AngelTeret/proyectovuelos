const MINUTOS_INACTIVIDAD = 60;
const LIMITE_MS = MINUTOS_INACTIVIDAD * 60 * 1000;
const ultima = new Map();

export const tocarActividad = (usuarioId) => {
  ultima.set(Number(usuarioId), Date.now());
};

export const actividadVigente = (usuarioId, emitidoEnSegundos) => {
  const id = Number(usuarioId);
  const ahora = Date.now();
  const previa = ultima.get(id);
  if (previa) {
    if (ahora - previa > LIMITE_MS) {
      ultima.delete(id);
      return false;
    }
    ultima.set(id, ahora);
    return true;
  }

  const emitido = Number(emitidoEnSegundos) * 1000;
  if (!Number.isFinite(emitido) || ahora - emitido > LIMITE_MS) {
    return false;
  }
  ultima.set(id, ahora);
  return true;
};
