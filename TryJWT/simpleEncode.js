var jwt = require('jwt-simple');

var secretKey  = 'supersecretkey';
var payload = {username: 'fred'};

var token = jwt.encode(payload, secretKey);
console.log(token);