const multer = require('multer');
const AppError = require('../services/appError');

function errorMiddleware(error, _req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof multer.MulterError) {
    const isTooLarge = error.code === 'LIMIT_FILE_SIZE';
    const status = isTooLarge ? 413 : 400;
    const code = isTooLarge ? 'FILE_TOO_LARGE' : 'INVALID_UPLOAD';
    const message = isTooLarge
      ? 'O arquivo excede o limite permitido.'
      : 'Envie somente um arquivo no campo file.';

    return res.status(status).json({ error: { code, message } });
  }

  if (error instanceof AppError) {
    return res.status(error.status).json({
      error: { code: error.code, message: error.message },
    });
  }

  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Ocorreu um erro interno.' },
  });
}

module.exports = errorMiddleware;