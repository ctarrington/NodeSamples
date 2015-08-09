var mysql = require('mysql'),
    config = require('./config.json');

const POOL_SIZE = 8;
const RETRY_MAX = 4;

var retryCounter = 0;
var lineCounter = 0;
var failureCounter = 0
var updateCounter = 0;
var doneReadingLines = false;
var maxHeapUsed = 0;

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

var retryLines = [];

function doRetry()
{
    if (retryLines.length == 0 || retryCounter > RETRY_MAX) {

        pool.end();
        process.exit(0);
    }

    retryCounter++;
    lineCounter = 0;
    failureCounter = 0;
    updateCounter = 0;
    doneReadingLines = false;

    var lines = retryLines.slice(0);
    lines.reverse();
    retryLines = [];

    lines.forEach(processLine);
    console.log('after retry retryLines ' + retryLines.length);
}

function fatal(err) {
    console.log('Fatal error encountered: '+err);
    process.exit(-1);
};

function processLine(line) {
    if (retryCounter>0) {
        console.log('processLine lineCounter = '+lineCounter+ ' updateCounter = '+updateCounter+ ' failureCounter = '+failureCounter+' maxHeapUsed = '+maxHeapUsed/(1024*1024) + 'MB retryLines.length = '+retryLines.length);
    }

    if (connectionsUsed >= POOL_SIZE && retryCounter==0) {
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
                //console.log('line = '+line+ ' updateCounter = '+updateCounter+ ' failureCounter = '+failureCounter+' maxHeapUsed = '+maxHeapUsed/(1024*1024) + 'MB');

                if (retryCounter == 0) {
                    if (doneReadingLines && (updateCounter+failureCounter) == lineCounter) {
                        doRetry();
                    }
                    lr.resume();
                } else {
                    if ((updateCounter+failureCounter) == lineCounter) {
                        doRetry();
                    }
                }
            };

            var nonrecoverable = function(err, line) {
                console.log('nonrecoverable lineCounter = '+lineCounter+ ' updateCounter = '+updateCounter+ ' failureCounter = '+failureCounter+' maxHeapUsed = '+maxHeapUsed/(1024*1024) + 'MB retryLines.length = '+retryLines.length);
                failureCounter++;
                done();
            };

            var recoverable = function(err, line) {
                console.log('recoverable lineCounter = '+lineCounter+ ' updateCounter = '+updateCounter+ ' failureCounter = '+failureCounter+' maxHeapUsed = '+maxHeapUsed/(1024*1024) + 'MB retryLines.length = '+retryLines.length);
                retryLines.push(line);
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

                if (fromAccount.balance < transferAmount) {
                    return connection.rollback(function() {
                        if (retryCounter>0) { console.log('insufficient funds. line = '+line); }
                        recoverable(err, line);
                    });
                }

                connection.query('SELECT * FROM `account` WHERE `id` = ? FOR UPDATE', [toAccount.id], function (err, results, fields) {
                    if (err) {
                        return connection.rollback(function() {
                            recoverable(err, line);
                        });
                    }

                    toAccount.balance = results[0].balance;

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
    doneReadingLines = true;
});

lr.on('line', processLine);









