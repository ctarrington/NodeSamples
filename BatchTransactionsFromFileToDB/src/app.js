var Lazy = require("lazy"),
    fs  = require("fs"),
    mysql = require('mysql'),
    config = require('./config.json');



var lineCounter = 0;
var updateCounter = 0;

var pool  = mysql.createPool({
    host     : config.db.host,
    user     : config.db.user,
    password : config.db.password,
    database : 'samples',
    waitForConnections: true
});

new Lazy(fs.createReadStream('./transactions.txt'))
    .lines.forEach(function(line){

        lineCounter++;
        var tokens = (''+line).split(',');
        var fromAccount = {id: tokens[0], balance: 0};
        var toAccount = {id: tokens[1], balance: 0};
        var transferAmount = parseFloat(tokens[2]);

        pool.getConnection(function(err, connection) {

            connection.beginTransaction(function (err) {
                if (err) {
                    throw err;
                }

                connection.query('SELECT * FROM `account` WHERE `id` = ? FOR UPDATE', [fromAccount.id], function (error, results, fields) {
                    fromAccount.balance = results[0].balance;

                    connection.query('SELECT * FROM `account` WHERE `id` = ? FOR UPDATE', [toAccount.id], function (error, results, fields) {
                        toAccount.balance = results[0].balance;
                        if (fromAccount.balance < transferAmount) {
                            transferAmount = 0;
                        }


                        connection.query('UPDATE `account` SET `balance` = ? WHERE `id` = ?', [fromAccount.balance - transferAmount, fromAccount.id], function (error, results, fields) {

                            console.log('about to update. fromAccount: '+JSON.stringify(fromAccount)+', toAccount: '+JSON.stringify(toAccount)+' transferAmount: '+transferAmount);
                            connection.query('UPDATE `account` SET `balance` = ? WHERE `id` = ?', [toAccount.balance + transferAmount, toAccount.id], function (error, results, fields) {
                                updateCounter++;
                                connection.commit(function(err) {
                                    if (err) {
                                        return connection.rollback(function() {
                                            throw err;
                                        });
                                    }
                                    connection.release();
                                    console.log('success!');
                                });


                                if (lineCounter > 0 && updateCounter == lineCounter) { pool.end(); }
                            });
                        });
                    });
                });
            });
        });
    }).
    on('pipe', function() {
        console.log('lineCounter = '+lineCounter);
    });




