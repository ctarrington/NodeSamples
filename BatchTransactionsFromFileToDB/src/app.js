var mysql = require('mysql'),
    config = require('./config.json');

var lineCounter = 0;
var failureCounter = 0
var updateCounter = 0;
var doneReadingLines = false;
var maxHeapUsed = 0;
const POOL_SIZE = 15;
var connectionsUsed = 0;

function clone(avalue) {
    return JSON.parse(JSON.stringify(avalue));
}

var stats = function() {
    var data = {count:0, min: Number.MAX_VALUE, max: 0, average: 0};

    function add(value) {
        data.min = Math.min(data.min, value);
        data.max = Math.max(data.max, value);
        data.average = (data.average*data.count+value)/(++data.count)
    }

    function getCopy() {
        return clone(data);
    }

    return {
        add: add,
        check: getCopy
    };
};

var transactionStats = stats();


var performanceData = {
    wallTime: 0,
    totalTransactions: 0,
    successes: 0,
    failures: 0,
    transactionsPerSecond: 0
};

var pool  = mysql.createPool({
    host     : config.db.host,
    user     : config.db.user,
    password : config.db.password,
    database : 'samples',
    waitForConnections: true,
    connectionLimit: POOL_SIZE
});

// returns a running timer.
// var timer = startTimer(); var elapsedMillis = timer.check();
var startTimer = function() {
    var startTime = new Date().getTime();

    var check = function() {
        return (new Date().getTime() - startTime);
    }

    return {check: check};
};

var wallTimer = startTimer();

var LineByLineReader = require('line-by-line'),
    lr = new LineByLineReader('./transactions.txt');

var retryList = [];

function fatal(err) {
    console.log('Fatal error encountered: '+err);
    process.exit(-1);
};

function processFailures() {
    if (retryList.length > 0) {
        var lines = retryList.slice(0);
        retryList = [];

        console.log('retrying ' + JSON.stringify(lines));
        lines.forEach(processLine);

        console.log('failed on retry for ' + retryList.length);
        console.log(JSON.stringify(retryList));
    }

    pool.end();
    process.exit(0);
}

var processLine = function(line) {
    console.log('processing line '+line);
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

        var transactionTimer = startTimer();
        connectionsUsed++;

        connection.beginTransaction(function (err) {
            if (err) {
                fatal(err);
            }

            var done = function() {
                connection.release();
                connectionsUsed--;

                var elapsedMillis = transactionTimer.check();
                transactionStats.add(elapsedMillis);
                console.log('stats = '+JSON.stringify(transactionStats.check()));
                maxHeapUsed = Math.max(maxHeapUsed, process.memoryUsage().heapUsed);
                var elapsedWallInSeconds = wallTimer.check()/1000;
                console.log('elapsedWallInSeconds = '+elapsedWallInSeconds+ ' transactions per second = '+updateCounter /elapsedWallInSeconds);
                console.log('line = '+line+ ' updateCounter = '+updateCounter+ ' failureCounter = '+failureCounter+ ' time = '+elapsedMillis/1000+' (sec) maxHeapUsed = '+maxHeapUsed/(1024*1024) + 'MB');

                if (doneReadingLines && (updateCounter+failureCounter) == lineCounter) {
                    processFailures();
                }

                lr.resume();
            };

            var recoverable = function(err, line) {
                console.log('Recoverable error encountered: '+err+ ' on line: '+line);
                retryList.push(line);
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
                        return connection.rollback(function() {
                            console.log('insufficient funds. line = '+line);
                            recoverable(err, line);
                        });
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









