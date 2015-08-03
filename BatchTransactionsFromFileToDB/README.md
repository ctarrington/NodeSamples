# POC of Batch processing - File IO and Database

# Goals
Read transactions from a flat file and alter a MySQL database accordingly.
Determine efficiency of Node in a way that is simple but useful. Then compare performance to a similar implementation in Java.

# Functional Capabilities
Seed / reset a database with bank accounts totalling a set amount
Create a transaction file that specifies from account, to account and amount
Run the file through a batch job with the only business rule being preventing negative balances. Failed transactions should be recorded, due to business logic or database errors.
Verify that all balances are >= 0 and that the total amount across all accounts matches the start amount

# Metrics
Accuracy
Wall time
CPU utilization

# Todo
1. Avoid excessive memory use X
1. Handle all errors X
1. Factor out timer and stats to util package
1. Handle rollbacks by adding to secondary queue and trying again at end.
1. Improve readme with setup and dependencies
1. Add instrumentation. Memory, transactions per time, time per transaction
1. Expose instrumentation via JSON API


# Setup
Local config such as 
{
  "db": {
    "host": "localhost",
    "user": "<name>",
    "password": "<password>"
  },
  "data": {
    "maxAccounts": 1000,
    "initialBalance": 1000
  }
}




