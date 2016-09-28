var jwt = require('jwt-simple');

var secretKey  = 'supersecretkey';
var token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6ImZyZWQifQ.ZEq7Kb4Zf8yXFSUBnkTxnTloM2o3cF1YguDtyf-5YyE';


var payload = jwt.decode(token, secretKey)
console.log(payload);