var mysql = require('mysql'),
    config = require('./config.json');

var lineCounter = 0;
var updateCounter = 0;
var done = false;
var maxHeapUsed = 0;
const POOL_SIZE = 5;
var connectionsUsed = 0;

var pool  = mysql.createPool({
    host     : config.db.host,
    user     : config.db.user,
    password : config.db.password,
    database : 'samples',
    waitForConnections: true,
    connectionLimit: POOL_SIZE
});

var LineByLineReader = require('line-by-line'),
    lr = new LineByLineReader('./transactions.txt');

var processLine = function(line) {
    if (connectionsUsed >= POOL_SIZE) {
        lr.pause();
    }

    lineCounter++;
    var tokens = (''+line).split(',');
    var fromAccount = {id: tokens[0], balance: 0};
    var toAccount = {id: tokens[1], balance: 0};
    var transferAmount = parseFloat(tokens[2]);

    pool.getConnection(function(err, connection) {

        if (err) {
            throw err;
        }

        connectionsUsed++;

        connection.beginTransaction(function (err) {
            if (err) {
                throw err;
            }

            connection.query('SELECT * FROM `account` WHERE `id` = ? FOR UPDATE', [fromAccount.id], function (err, results, fields) {
                if (err) {
                    return connection.rollback(function() {
                        throw err;
                    });
                }
                fromAccount.balance = results[0].balance;

                connection.query('SELECT * FROM `account` WHERE `id` = ? FOR UPDATE', [toAccount.id], function (err, results, fields) {
                    if (err) {
                        return connection.rollback(function() {
                            throw err;
                        });
                    }
                    toAccount.balance = results[0].balance;
                    if (fromAccount.balance < transferAmount) {
                        transferAmount = 0;
                    }


                    connection.query('UPDATE `account` SET `balance` = ? WHERE `id` = ?', [fromAccount.balance - transferAmount, fromAccount.id], function (err, results, fields) {
                        if (err) {
                            return connection.rollback(function() {
                                throw err;
                            });
                        }

                        //console.log('about to update. fromAccount: '+JSON.stringify(fromAccount)+', toAccount: '+JSON.stringify(toAccount)+' transferAmount: '+transferAmount);
                        connection.query('UPDATE `account` SET `balance` = ? WHERE `id` = ?', [toAccount.balance + transferAmount, toAccount.id], function (err, results, fields) {

                            connection.commit(function(err) {
                                if (err) {
                                    return connection.rollback(function() {
                                        throw err;
                                    });
                                }
                                connection.release();
                                connectionsUsed--;
                                lr.resume();
                                updateCounter++;

                                console.log('success! lineCounter = '+lineCounter+ ' updateCounter = '+updateCounter);
                                maxHeapUsed = Math.max(maxHeapUsed, process.memoryUsage().heapUsed);
                                console.log('maxHeapUsed = '+maxHeapUsed/(1024*1024) + 'MB');

                                if (done && lineCounter == updateCounter) {
                                    pool.end();
                                    process.exit(0);
                                }
                            });



                        });
                    });
                });
            });
        });
    });
}

lr.on('error', function (err) {
    console.log('error reading file: '+err);
});

lr.on('end', function () {
    console.log('done reading lines');
    done = true;
});

lr.on('line', processLine);









