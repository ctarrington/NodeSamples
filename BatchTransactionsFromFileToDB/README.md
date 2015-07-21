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
1. Improve readme with setup and dependencies
1. error handling
1. timing and instrumentation - json on GET


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




