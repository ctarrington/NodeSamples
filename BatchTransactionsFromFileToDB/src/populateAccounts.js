var mysql = require('mysql');
var config = require('./config.json');


var connection = mysql.createConnection({
    host     : config.db.host,
    user     : config.db.user,
    password : config.db.password,
    database : 'samples'
});


connection.connect();

// delete existing rows
connection.query('DELETE FROM account', function (err, result) {
    if (err) { console.log('error on insert: '+err); }

    console.log('deleted ' + result.affectedRows + ' rows');
})


for (var ctr=0; ctr < config.data.maxAccounts; ctr++)
{
    var account  = {id: ctr, balance: config.data.initialBalance};
    var query = connection.query('INSERT INTO account SET ?', account, function(err, result) {
        if (err) { console.log('error on insert: '+err); }
    });
}

connection.end();
