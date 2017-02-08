# auth

Basic expressjs server adding and removing tokens from database.
**Very WIP**.

## Requisites
Requires a running mongodb instance on localhost port 27017.

Start mongo with
```
$ mkdir -p ./data/db
$ mongod --fork --logpath ./data/db.log --dbpath ./data/db
```

##Starting service
Using npm:
```
$ npm start
```
