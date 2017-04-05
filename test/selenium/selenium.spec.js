'use strict';

const child     = require('child_process');
const path      = require('path');

const phantomjs = require('phantomjs-prebuilt');
const webdriver = require('selenium-webdriver');
const tmp       = require('tmp');


const By        = webdriver.By;
const until     = webdriver.until;

const BASE_PORT = 14000;
const PORT_RANGE = 1000;
const PORT      = Math.floor(Math.random() * PORT_RANGE) + BASE_PORT;
const DB_PORT   = PORT + 1;

describe('selenium tests', () => {
  let tmpdir;
  let db;
  let server;
  let driver;
  let user = 'user@example.com';

  beforeAll(done => {
    let projectRoot = path.resolve(__dirname, '../../');
    let tmpobj = tmp.dirSync({prefix: 'npg_sentry_wd_test_'});
    tmpdir = tmpobj.name;
    db = child.spawn('mongod',
      ['--port', DB_PORT,
       '--dbpath', tmpdir,
       '--logpath', tmpdir + '/test_db.log',
       '--fork'
      ], { cwd: projectRoot, stdio: 'inherit' });

    child.execSync(
      `./test/scripts/wait-for-it.sh -q -h 127.0.0.1 -p ${DB_PORT}`,
      { cwd: projectRoot });

    server = child.spawn('./npg_sentry.js',
        ['--no-ssl',
         '--port', PORT,
         '--mongourl', `mongodb://localhost:${DB_PORT}/test`,
        ], { cwd: projectRoot });
    child.execSync(
      `./test/scripts/wait-for-it.sh -q -h 127.0.0.1 -p ${PORT}`,
      { cwd: projectRoot });
    let capabilities = {
      'phantomjs.binary.path': phantomjs.path,
      'phantomjs.page.customHeaders.X-Remote-User': user,
    };
    driver = new webdriver.Builder()
      .withCapabilities(capabilities)
      .forBrowser(webdriver.Browser.PHANTOM_JS)
      .build();
    driver.get(`http://localhost:${PORT}/`);
    driver.sleep(2000); // sleep 2 secs for jquery to setup page
                        // TODO: use driver.wait() rather than wait 2 secs
    done();
  });

  afterAll(() => {
    child.execSync(
      `mongo admin --port ${DB_PORT} --eval 'db.shutdownServer();'`);
    server.kill();
    db.kill();
    driver.quit();
  });


  it('show-token-form-button', done => {
    driver.findElement(By.id('show-token-form-button')).then(found => {
      found.isDisplayed().then(isVisible => {
        expect(isVisible).toBe(true);
        done();
      });
    });
  });

  // Pending until I can find a way to set different headers for different
  // requests.....
  xit('error msg shown', done => {
    driver.wait(until.elementLocated(By.className('error-msg')))
      .getText().then(text => {
        expect(text).toMatch(
          'Error when getting token list: 500: Internal Server Error');
        done();
      });
  });

  it('no tokens on initial load', done => {
    driver.findElement(By.css('tbody')).then(found => {
      found.findElements(By.xpath('tr')).then(founds => {
        expect(founds.length).toBe(1); // only table headings
        done();
      });
    });
  });

  describe('floating-div', () => {
    it('invisible on initial load', done => {
      driver.findElement(By.id('floating-div')).then(found => {
        found.isDisplayed().then(isVisible => {
          expect(isVisible).toBe(false);
          done();
        }, done.fail);
      }, done.fail);
    });

    it('visible after clicking on show-token-form-button', done => {
      driver.findElement(By.id('show-token-form-button')).click();
      driver.wait(
        until.elementIsVisible(driver.findElement(By.id('floating-div'))), 2000
      ).then(ele => {
        ele.isDisplayed().then(isVisible => {
          expect(isVisible).toBe(true);
          done();
        }, done.fail);
      }, done.fail);
    });

    it('invisible after clicking on create-token-button', done => {
      let createTokenButton = driver.findElement(By.id('create-token-button'));
      driver.wait(until.elementIsVisible(createTokenButton), 2000).then(() => {
        createTokenButton.click();
        let floatingDiv = driver.findElement(By.id('floating-div'));
        driver.wait(until.elementIsNotVisible(floatingDiv), 2000).catch(done.fail);
        floatingDiv.then(found => {
          found.isDisplayed().then(isVisible => {
            expect(isVisible).toBe(false);
            done();
          }, done.fail);
        }, done.fail);
      }, done.fail);
    });
  });

  it('token is created after clicking on create-token-button', done => {
    driver.wait(until.elementLocated(
        By.js(`return $('td:contains(${user})')[0];`)), 2000);
    driver.findElement(By.css('tbody')).then(tbody => {
      expect(tbody).toBeDefined();
      tbody.findElements(By.xpath('tr')).then(trs => {
        expect(trs.length).toBe(2);
        let tokenRow = trs[1]; // First will be table headers
        expect(tokenRow).toBeDefined();
        tokenRow.findElements(By.xpath('td')).then(cols => {
          expect(cols.length).toBe(5);
          let ps = [];
          ps.push(cols[0].getText().then(
            text => expect(text).toBe(user)
          , done.fail));
          ps.push(cols[1].getText().then(
            text => expect(text).toMatch(/^[\w-]{32}$/)
          , done.fail));
          ps.push(cols[3].getText().then(
            text => expect(text).toMatch('valid')
          , done.fail));
          ps.push(cols[4].getText().then(
            text => expect(text).toMatch('Revoke')
          , done.fail));
          ps.push(cols[4].getAttribute('class').then(
            className => expect(className).toMatch('revoke-link')
          , done.fail));
          Promise.all(ps).then(done);
        }, done.fail);
      }, done.fail);
    }, done.fail);
  });

  it('token is revoked after clicking on revoke-link', done => {
    driver.findElement(By.className('revoke-link')).click();
    driver.wait(until.elementLocated(By.className('disabled-btn')), 2000);
    driver.findElement(By.css('tbody')).then(tbody => {
      expect(tbody).toBeDefined();
      tbody.findElements(By.xpath('tr')).then(trs => {
        expect(trs.length).toBe(2);
        let tokenRow = trs[1]; // First will be table headers
        expect(tokenRow).toBeDefined();
        tokenRow.findElements(By.xpath('td')).then(cols => {
          expect(cols.length).toBe(5);
          let ps = [];
          ps.push(cols[0].getText().then(
            text => expect(text).toBe(user)
          , done.fail));
          ps.push(cols[1].getText().then(
            text => expect(text).toMatch(/^[\w-]{32}$/)
          , done.fail));
          ps.push(cols[3].getText().then(
            text => expect(text).toBe('revoked')
          , done.fail));
          ps.push(cols[4].getText().then(
            text => expect(text).toBe('Revoke')
          , done.fail));
          ps.push(cols[4].getAttribute('class').then(
            className => expect(className).toBeUndefined
          , done.fail));
          Promise.all(ps).then(done);
        });
      });
    });
  });
});
