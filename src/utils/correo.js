const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const correoValido = (email) => CORREO.test(email) && email.length <= 100;
