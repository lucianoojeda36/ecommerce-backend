import winston from 'winston';

const { combine, timestamp, label, printf, errors, json } = winston.format;

const myFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`;
});

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: combine(
    label({ label: 'ecommerce-backend' }),
    timestamp(),
    errors({ stack: true }),
    myFormat
  ),
  transports: [
    new winston.transports.Console({
      stderrLevels: ['error'],
      format: combine(
        winston.format.colorize({ all: true }),
        myFormat
      ),
    }),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

export const loggerStream = {
  write: (message: string) => {
    const timestamp = new Date().toISOString();
    logger.info(message.trim(), { timestamp });
  },
};

let currentSessionId = 0;

export function getSessionId() {
  return (++currentSessionId).toString();
}

export function setSessionId(id: string) {
  currentSessionId = parseInt(id, 10);
}

export function generateRequestId() {
  return require('crypto').randomBytes(16).toString('hex');
}
