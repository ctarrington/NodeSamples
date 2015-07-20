var Lazy = require("lazy"),
    fs  = require("fs"),
    mysql = require('mysql'),
    config = require('./config.json');

var connection = mysql.createConnection({
    host     : config.db.host,
    user     : config.db.user,
    password : config.db.password,
    database : 'samples'
});

connection.connect();

new Lazy(fs.createReadStream('./transactions.txt'))
    .lines.forEach(function(line){
        var tokens = (''+line).split(',');
        var fromAccount = {id: tokens[0], balance: 0};
        var toAccount = {id: tokens[1], balance: 0};
        var transferAmount = parseFloat(tokens[2]);

        connection.query('SELECT * FROM `account` WHERE `id` = ?', [fromAccount.id], function (error, results, fields) {
            fromAccount.balance = results[0].balance;
        });

        connection.query('SELECT * FROM `account` WHERE `id` = ?', [toAccount.id], function (error, results, fields) {
            toAccount.balance = results[0].balance;

            if (fromAccount.balance > transferAmount) {
                connection.query('UPDATE `account` SET `balance` = ? WHERE `id` = ?', [fromAccount.balance - transferAmount, fromAccount.id], function (error, results, fields) {
                });

                connection.query('UPDATE `account` SET `balance` = ? WHERE `id` = ?', [toAccount.balance + transferAmount, toAccount.id], function (error, results, fields) {
                });
            }
        });





    });




