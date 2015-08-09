var mysql = require('mysql');
var config = require('./config.json');


var connection = mysql.createConnection({
    host     : config.db.host,
    user     : config.db.user,
    password : config.db.password,
    database : 'samples'
});


connection.connect();

connection.query('SELECT * FROM `account`', function (err, results) {
    if (err) {
        return connection.rollback(function() {
            recoverable(err, line);
        });
    }

    for (var ctr=0;ctr<results.length;ctr++)
    {
        console.log(results[ctr].id+', '+results[ctr].balance);
    }
});

connection.end();
