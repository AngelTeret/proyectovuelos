const SEGUNDOS_DIA = 24 * 60 * 60;
const SEGUNDOS_DOS_DIAS = 2 * SEGUNDOS_DIA;

export const calcularReembolso = (monto, segundos) => {
  const total = Math.round(Number(monto) * 100) / 100;
  const restante = Number(segundos);
  if (!Number.isFinite(total) || total < 0 || !Number.isFinite(restante) || restante <= 0) {
    return { permitido: false, motivo: 'salio', parcial: false, reembolso: 0 };
  }
  if (restante < SEGUNDOS_DIA) {
    return { permitido: false, motivo: 'cercano', parcial: false, reembolso: 0 };
  }
  const parcial = restante <= SEGUNDOS_DOS_DIAS;
  const reembolso = parcial ? Math.round((total / 2) * 100) / 100 : total;
  return { permitido: true, motivo: parcial ? 'parcial' : 'total', parcial, reembolso };
};
