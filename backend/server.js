import('chalk').then((chalk) => {
  const express = require('express');
  const session = require('express-session');
  const passport = require('passport');
  const SamlStrategy = require('@node-saml/passport-saml').Strategy;
  const path = require('path');
  const fs = require('fs');
  const cors = require('cors');
  const helmet = require('helmet');
  const winston = require('winston');

  const authConfig = require('../src/auth_config.json');

  const app = express();

  // ✅ Force color support in Node.js
  process.env.FORCE_COLOR = '1';

  // ✅ Define Custom Log Levels with Colors & Icons
  const logLevels = {
    levels: { error: 0, warn: 1, info: 2, debug: 3, success: 4 },
    colors: { error: 'red', warn: 'yellow', info: 'cyan', debug: 'blue', success: 'green' }
  };
  winston.addColors(logLevels.colors);

  // ✅ Setup Winston Logger
  const logger = winston.createLogger({
    levels: logLevels.levels,
    level: 'debug',
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp(),
      winston.format.printf(({ level, message, timestamp }) => {
        const icons = {
          error: chalk.default.red('❌'),
          warn: chalk.default.yellow('⚠️'),
          info: chalk.default.cyan('ℹ️'),
          debug: chalk.default.green('✅'),
          success: chalk.default.green('✅')
        };
        return `${timestamp} ${icons[level] || ''} [${chalk.default.bold(level)}]: ${message}`;
      })
    ),
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({
        filename: path.join(__dirname, 'logs/server.log'),
        format: winston.format.combine(winston.format.timestamp(), winston.format.json())
      })
    ]
  });


  // 🔍 Validate and Load Certificates
  const readCertFile = (filePath, type) => {
    try {
      logger.info(`📄 Reading ${type}: ${chalk.default.yellow(filePath)}`);
      if (!fs.existsSync(filePath)) throw new Error(`${type} file not found`);
      const content = fs.readFileSync(filePath, 'utf8').trim();
      if (!content) throw new Error(`${type} is empty`);
      if (type.includes('Certificate') && !content.includes('-----BEGIN CERTIFICATE-----')) {
        throw new Error(`${type} is not in valid PEM format`);
      }
      if (type.includes('Private Key') && !content.match(/-----BEGIN (RSA )?PRIVATE KEY-----/)) {
        throw new Error(`${type} is not in valid PEM format`);
      }
      logger.log('success', `✅ ${type} loaded successfully`);
      logger.debug(`✅ ${type} content sample: ${chalk.default.magenta(content.substring(0, 100))}...`);
      return content;
    } catch (error) {
      logger.error(`❌ Error loading ${type}: ${error.message}`);
      throw error;
    }
  };

  // ✅ Load Certificates
  let certs;
  try {
    certs = {
      idpCert: readCertFile(path.resolve(__dirname, 'cert/azure/azure-ad-idp-cert.pem'), 'Azure IdP Certificate'),
      privateKey: readCertFile(path.resolve(__dirname, 'cert/azure/azure-key.pem'), 'Azure Private Key'),
      spCert: readCertFile(path.resolve(__dirname, 'cert/azure/azure-sp-cert.pem'), 'Azure SP Certificate'),
    };
    logger.log('success', '✅ All certificates loaded successfully');
  } catch (error) {
    logger.error('❌ Certificate loading failed, exiting...');
    process.exit(1);
  }

  // ✅ Debug Certificate Before SAML Setup
  logger.debug(`✅ Passing IdP Cert to SAML: ${chalk.default.magenta(certs.idpCert.substring(0, 100))}...`);

  // ✅ Start Server
  const PORT = authConfig.port || 3001;
  app.listen(PORT, () => {
    logger.log('success', `🚀 Server running on port ${chalk.default.green(PORT)}`);
  });

}).catch((error) => {
  console.error(`❌ Failed to load chalk:`, error);
  process.exit(1);
});
