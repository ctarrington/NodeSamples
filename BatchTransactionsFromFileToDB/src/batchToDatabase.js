'use strict';

var mysql = require('mysql');
var LineByLineReader = require('line-by-line');


exports.apply = function(filePath, pool, executeForLine, retryMax) {
    console.log('hi from apply');

    var retryCounter = 0;
    var lineCounter = 0;
    var failureCounter = 0
    var updateCounter = 0;
    var doneReadingLines = false;
    var maxHeapUsed = 0;
    var connectionsUsed = 0;

    var lr = new LineByLineReader('./transactions.txt');

    var retryLines = [];

    function doRetry()
    {
        if (retryLines.length == 0 || retryCounter > retryMax) {

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

        if (connectionsUsed >= pool.config.connectionLimit && retryCounter==0) {
            lr.pause();
        }

        lineCounter++;

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

                var context = {
                    nonrecoverable: nonrecoverable,
                    recoverable: recoverable,
                    success: success
                };

                executeForLine(line, connection, context)
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
};