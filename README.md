# npg_sentry

Basic expressjs server adding and removing tokens from database.
**Very WIP**.

## Requisites
Requires a running mongodb instance on localhost port 27017.

Start mongo with:
```
$ mkdir -p ./data/db
$ mongod --fork --logpath ./data/db.log --dbpath ./data/db
```

## Starting service
Using npm:
```
$ npm start
```
You can also run it using npm while passing values through arguments or through a configuration file.
```
$ npm start -- --port 8000 --mongourl "mongodb://localhost:27017/acl" --loglevel "warn" --no-ssl "true"
$ # Alternatively:
$ npm start -- --configfile=./config_file.json
```

OR use pm2 to run server as a daemonised cluster:

```
$ npm i -g pm2
$ pm2 start npg_sentry.js -i <number of processes> -- <arguments to pass to server>
$ # stop the server
$ pm2 stop app
$ # reload the server
$ pm2 reload app
$ # view recent logs, and follow new logs
$ pm2 logs
$ # monitor processes
$ pm2 monit
```

Consider making an [ecosystem file](http://pm2.keymetrics.io/docs/usage/application-declaration/) for pm2, for easier configuration.

```
$ pm2 start ecosystem.config.js
```

## Configuration

Configuration options can be passed on the command line, or in a configuration json file.

Available configuration options:

option       | .
-------------|------------
 port        | port to listen on
 mongourl    | URI to connect to mongodb
 loglevel    | logging output level
 configfile  | configuration json file
 no-ssl      | run server on http (see below)

An example configuration json file would be structured as follows:

```json
{
  "port":"8000",
  "mongourl":"mongodb://lochalhost:27017/acl",
  "loglevel":"debug",
  "no-ssl":"true"
}
```

#### Adding to the mongoDB using the given script

Users, their roles, and their permissions can all be added using the given script in `scripts/create-admin.js`.
If you do not define a role, it defaults to `administrator`.
```
$ ./scripts/create-admin.js --mongourl=mongodb://localhost:27017/acl --type "role" --permission "post"
$ ./scripts/create-admin.js --mongourl=mongodb://localhost:27017/acl --type "role" --permission "view"
$ ./scripts/create-admin.js --mongourl=mongodb://localhost:27017/acl --type "user" --username "email@address.co.uk"
```

#### SSL

Sentry will, by default, run on https. This requires the following options to be set:

- --sslca=cafile
- --sslcert=certfile
- --sslkey=keyfile
- (If the key is protected by a passphrase, then sslpassphrase must also be set in the config file)

These can be set on command line (except sslpassphrase), in the pm2 ecosystem file (except sslpassphrase), or in a separate configuration file which is read by --config.

To disable https, run with the option --no-ssl.

## Run tests

```
npm install -g grunt-cli
cd auth
```

Run linter:
```
grunt lint
```

Run tests:
```
grunt test -v
```

Run tests and get coverage reports for server in `./coverage/`:
```
grunt test_coverage
```

### Loadtesting

```
npm install -g artillery
artillery run ./test/load/artillery.yml --target localhost:8000
```
