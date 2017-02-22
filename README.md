# npg_sentry

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
OR use pm2 to run server as a daemonised cluster

```
$ npm i -g pm2
$ pm2 start app.js -i <number of processes> -- <arguments to pass to server>
$ # stop the server
$ pm2 stop app
$ # reload the server
$ pm2 reload app
$ # view recent logs, and follow new logs
$ pm2 logs
$ # monitor processes
$ pm2 monit
```

##Run tests

```
npm install -g grunt-cli
cd auth
```

Run linter
```
grunt lint
```

Run tests
```
grunt test -v
```

Run tests and get coverage reports for server in `./coverage/`
```
grunt test_coverage
```

###Loadtesting

```
npm install -g artillery
artillery run ./test/load/artillery.yml --target localhost:8000
```

