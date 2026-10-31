const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Not Found - ${req.originalUrl}`));
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  let message = err.message;

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors || {})
      .map((e) => e.message)
      .join(', ') || 'Validation failed';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = err.kind === 'ObjectId' ? 'Invalid resource identifier' : `Invalid value for ${err.path || 'field'}`;
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Session expired, please sign in again';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token, please sign in again';
  } else if (err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request body too large';
  } else if (err.code === 11000) {
    statusCode = 400;
    const field = err.keyPattern ? Object.keys(err.keyPattern).filter((k) => k !== 'user').join(', ') : '';
    message = field ? `A record with this ${field} already exists` : 'A record with these details already exists';
  } else if (err.name === 'MulterError') {
    statusCode = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large (maximum 5MB)' : err.message;
  }

  // Never leak internal error text (stack traces, driver messages, file paths)
  // on an unexpected 500 in production.
  if (statusCode >= 500 && process.env.NODE_ENV === 'production') {
    message = 'Internal server error';
  }

  res.status(statusCode);
  res.json({
    message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};

module.exports = { notFound, errorHandler };
