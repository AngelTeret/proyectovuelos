import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const remitente = (correo) => `"Quetzal Airlines" <${correo}>`;

const transportadorGmail = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASS,
  },
});

const transportadorBrevo = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_SMTP_KEY,
  },
});

export async function enviarBoleto(correoDestino, asunto, contenidoHTML) {
  const mensaje = {
    to: correoDestino,
    subject: asunto,
    html: contenidoHTML,
  };

  try {
    console.log(`Intentando enviar el boleto a ${correoDestino} por Gmail...`);
    await transportadorGmail.sendMail({
      ...mensaje,
      from: remitente(process.env.GMAIL_USER),
    });
    console.log(`Correo enviado por Gmail a ${correoDestino}.`);
  } catch (errorGmail) {
    console.log(`Falló el envío por Gmail: ${errorGmail.message}. Intentando respaldo con Brevo...`);

    try {
      await transportadorBrevo.sendMail({
        ...mensaje,
        from: remitente(process.env.BREVO_USER),
      });
      console.log(`Correo enviado por Brevo a ${correoDestino}.`);
    } catch (errorBrevo) {
      console.log(
        `Error fatal: no se pudo enviar el correo ni por Gmail ni por Brevo. Gmail: ${errorGmail.message}. Brevo: ${errorBrevo.message}.`
      );
      throw errorBrevo;
    }
  }
}
