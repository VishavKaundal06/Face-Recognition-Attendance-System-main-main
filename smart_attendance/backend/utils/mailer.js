const nodemailer = require('nodemailer');

let cachedTransporter = null;
let cachedSignature = null;

function getMailerConfig() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const from = process.env.MAIL_FROM || (user ? `HPTU Attendance <${user}>` : 'HPTU Attendance <no-reply@localhost>');

  if (!host || !user || !pass) {
    return {
      configured: false,
      reason: 'Email service not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.'
    };
  }

  return {
    configured: true,
    from,
    transportOptions: {
      host,
      port,
      secure,
      auth: { user, pass }
    }
  };
}

function getTransporter() {
  const config = getMailerConfig();
  if (!config.configured) {
    return { transporter: null, config };
  }

  const signature = `${config.transportOptions.host}:${config.transportOptions.port}:${config.transportOptions.secure}:${config.transportOptions.auth.user}`;
  if (!cachedTransporter || cachedSignature !== signature) {
    cachedTransporter = nodemailer.createTransport(config.transportOptions);
    cachedSignature = signature;
  }

  return { transporter: cachedTransporter, config };
}

async function sendMail({ to, subject, text, html }) {
  const { transporter, config } = getTransporter();

  if (!transporter) {
    const error = new Error(config.reason || 'Email service not configured.');
    error.code = 'MAILER_NOT_CONFIGURED';
    throw error;
  }

  return transporter.sendMail({
    from: config.from,
    to,
    subject,
    text,
    html
  });
}

module.exports = { sendMail, getMailerConfig };
