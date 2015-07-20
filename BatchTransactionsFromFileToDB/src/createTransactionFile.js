var fs = require('fs');
var config = require('./config.json');



var MAX_TRANSACTIONS = config.data.maxAccounts*5;

for (var ctr = 0;ctr < MAX_TRANSACTIONS; ctr++)
{
    var account1 = Math.floor(Math.random()*config.data.maxAccounts);
    var account2 = Math.floor(Math.random()*config.data.maxAccounts);
    var amount = Math.floor(Math.random()*config.data.initialBalance*100)/100;

    var line = ''+account1+','+account2+','+amount+'\n';
    fs.appendFileSync('./transactions.txt', line);
}