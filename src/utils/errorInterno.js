const MENSAJE_INTERNO = 'Error interno del servidor al procesar la solicitud. Por favor, intente más tarde.';

export const responderErrorInterno = (res, error) => {
  console.error(error);
  res.status(500).json({
    error: MENSAJE_INTERNO,
    mensaje: MENSAJE_INTERNO,
  });
};
