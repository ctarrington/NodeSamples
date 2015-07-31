var mysql = require('mysql'),
    config = require('./config.json');

var lineCounter = 0;
var failureCounter = 0
var updateCounter = 0;
var doneReadingLines = false;
var maxHeapUsed = 0;
const POOL_SIZE = 10;
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

var fatal = function(err) {
    console.log('Fatal error encountered: '+err);
    process.exit(-1);
};

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
            fatal(err);
        }

        connectionsUsed++;

        connection.beginTransaction(function (err) {
            if (err) {
                fatal(err);
            }

            var done = function() {
                connection.release();
                connectionsUsed--;

                maxHeapUsed = Math.max(maxHeapUsed, process.memoryUsage().heapUsed);
                console.log('line = '+line+ ' updateCounter = '+updateCounter+ ' failureCounter = '+failureCounter+ ' maxHeapUsed = '+maxHeapUsed/(1024*1024) + 'MB');

                if (doneReadingLines && (updateCounter+failureCounter) == lineCounter) {
                    pool.end();
                    process.exit(0);
                }

                lr.resume();
            };

            var recoverable = function(err, line) {
                console.log('Recoverable error encountered: '+err+ ' on line: '+line);
                failureCounter++;
                done();
            };

            var success = function() {
                updateCounter++;
                done();
            }

            connection.query('SELECT * FROM `account` WHERE `id` = ? FOR UPDATE', [fromAccount.id], function (err, results, fields) {
                if (err) {
                    return connection.rollback(function() {
                        recoverable(err, line);
                    });
                }
                fromAccount.balance = results[0].balance;

                connection.query('SELECT * FROM `account` WHERE `id` = ? FOR UPDATE', [toAccount.id], function (err, results, fields) {
                    if (err) {
                        return connection.rollback(function() {
                            recoverable(err, line);
                        });
                    }
                    toAccount.balance = results[0].balance;
                    if (fromAccount.balance < transferAmount) {
                        transferAmount = 0;
                    }


                    connection.query('UPDATE `account` SET `balance` = ? WHERE `id` = ?', [fromAccount.balance - transferAmount, fromAccount.id], function (err, results, fields) {
                        if (err) {
                            return connection.rollback(function() {
                                recoverable(err, line);
                            });
                        }

                        //console.log('about to update. fromAccount: '+JSON.stringify(fromAccount)+', toAccount: '+JSON.stringify(toAccount)+' transferAmount: '+transferAmount);
                        connection.query('UPDATE `account` SET `balance` = ? WHERE `id` = ?', [toAccount.balance + transferAmount, toAccount.id], function (err, results, fields) {

                            connection.commit(function(err) {
                                if (err) {
                                    return connection.rollback(function() {
                                        recoverable(err, line);
                                    });
                                }

                                success();
                            });
                        });
                    });
                });
            });
        });
    });
};

lr.on('error', function (err) {
    console.log('error reading file: '+err);
});

lr.on('end', function () {
    console.log('done reading lines');
    doneReadingLines = true;
});

lr.on('line', processLine);









