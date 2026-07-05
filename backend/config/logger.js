const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Log file streams
const appLogStream = fs.createWriteStream(path.join(logDir, 'app.log'), { flags: 'a' });
const errorLogStream = fs.createWriteStream(path.join(logDir, 'error.log'), { flags: 'a' });

function formatLog(level, message, meta) {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` - Meta: ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}]: ${message}${metaStr}\n`;
}

const logger = {
  info: (message, meta = null) => {
    const formatted = formatLog('info', message, meta);
    console.log(`\x1b[32m%s\x1b[0m`, formatted.trim()); // Green terminal output
    appLogStream.write(formatted);
  },
  warn: (message, meta = null) => {
    const formatted = formatLog('warn', message, meta);
    console.warn(`\x1b[33m%s\x1b[0m`, formatted.trim()); // Yellow terminal output
    appLogStream.write(formatted);
  },
  error: (message, errorObj = null) => {
    let meta = null;
    if (errorObj) {
      meta = {
        message: errorObj.message,
        stack: errorObj.stack,
      };
    }
    const formatted = formatLog('error', message, meta);
    console.error(`\x1b[31m%s\x1b[0m`, formatted.trim()); // Red terminal output
    errorLogStream.write(formatted);
    appLogStream.write(formatted); // Errors are also captured in app.log
  },
  logDir,
};

module.exports = logger;
