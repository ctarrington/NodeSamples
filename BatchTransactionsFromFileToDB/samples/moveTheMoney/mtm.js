var mysql = require('mysql'),
    config = require('./config.json');

var batchToDatabase = require('../../src/batchToDatabase.js');

var pool  = mysql.createPool({
    host     : config.db.host,
    user     : config.db.user,
    password : config.db.password,
    database : config.db.name,
    waitForConnections: true,
    connectionLimit: config.db.poolSize
});

var runner = batchToDatabase.apply('./transactions.txt', pool, executeTransactionForLine, 4);


function executeTransactionForLine(line, connection, context)
{
    var tokens = (''+line).split(',');
    var fromAccount = {id: tokens[0], balance: 0};
    var toAccount = {id: tokens[1], balance: 0};
    var transferAmount = parseFloat(tokens[2]);

    connection.query('SELECT * FROM `account` WHERE `id` = ? FOR UPDATE', [fromAccount.id], function (err, results, fields) {
        if (err) {
            return connection.rollback(function() {
                context.recoverable(err, line);
            });
        }
        fromAccount.balance = results[0].balance;

        if (fromAccount.balance < transferAmount) {
            return connection.rollback(function() {
                console.log('insufficient funds. line = '+line);
                context.recoverable(err, line);
            });
        }


        connection.query('SELECT * FROM `account` WHERE `id` = ? FOR UPDATE', [toAccount.id], function (err, results, fields) {
            if (err) {
                return connection.rollback(function() {
                    context.recoverable(err, line);
                });
            }

            toAccount.balance = results[0].balance;

            connection.query('UPDATE `account` SET `balance` = ? WHERE `id` = ?', [fromAccount.balance - transferAmount, fromAccount.id], function (err, results, fields) {
                if (err) {
                    return connection.rollback(function() {
                        context.recoverable(err, line);
                    });
                }

                //console.log('about to update. fromAccount: '+JSON.stringify(fromAccount)+', toAccount: '+JSON.stringify(toAccount)+' transferAmount: '+transferAmount);
                connection.query('UPDATE `account` SET `balance` = ? WHERE `id` = ?', [toAccount.balance + transferAmount, toAccount.id], function (err, results, fields) {

                    connection.commit(function(err) {
                        if (err) {
                            return connection.rollback(function() {
                                context.recoverable(err, line);
                            });
                        }

                        context.success();
                    });
                });
            });
        });
    });
}

