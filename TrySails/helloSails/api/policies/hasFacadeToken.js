'use strict';

var jwt = require('jwt-simple');

module.exports = function(req, res, next) {
  var token = req.query.token;
  delete req.query.token;

  var secretKey  = 'supersecretkey';

  var payload = jwt.decode(token, secretKey);
  console.log(payload);

  if (payload.username !== 'fred') {return res.forbidden("I no like") };

  // valid request
  next();

};
