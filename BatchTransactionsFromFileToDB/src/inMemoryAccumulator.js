var config = require('./config.json');

var LineByLineReader = require('line-by-line'),
    lr = new LineByLineReader('./transactions.txt');

const RETRY_MAX = 4;

var balances = [];
for (var ctr=0;ctr<config.data.maxAccounts;ctr++)
{
    balances[ctr]=config.data.initialBalance;
}

function showBalances() {
    for (var ctr=0;ctr<config.data.maxAccounts;ctr++)
    {
        console.log('balances['+ctr+'] = '+balances[ctr]);
    }
}

var retryLines = [];



function processLine(line)
{
    var tokens = (''+line).split(',');
    var fromAccountIndex = tokens[0];
    var toAccountIndex = tokens[1];
    var transferAmount = parseFloat(tokens[2]);

    if (balances[fromAccountIndex] >= transferAmount) {
        balances[fromAccountIndex] -= transferAmount;
        balances[toAccountIndex] += transferAmount;
    }
    else {
        retryLines.push(line);
    }
}

function doRetry()
{
    console.log('before retry retryLines:' + retryLines.length);
    var lines = retryLines.slice(0);
    retryLines = [];

    lines.reverse();
    lines.forEach(processLine);
    console.log('after retry retryLines ' + retryLines.length);


}

lr.on('error', function (err) {
    console.log('error reading file: '+err);
});

lr.on('end', function () {
    console.log('done reading lines');

    for (var ctr=0;ctr< RETRY_MAX;ctr++) {
        doRetry();
    }

    showBalances();
});

lr.on('line', processLine);