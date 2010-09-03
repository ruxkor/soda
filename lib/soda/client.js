
/*!
 * Soda - Client
 * Copyright(c) 2010 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var http = require('http');

/**
 * Initialize a `Client` with the given `options`.
 * 
 * Options:
 *   
 *   - `host`     Hostname defaulting to localhost
 *   - `port`     Port number defaulting to 4444
 *   - `browser`  Browser name
 *   - `url`      URL string
 * 
 * @params {Object} options
 * @api public
 */

var Client = exports = module.exports = function Client(options) {
  this.host = options.host || 'localhost';
  this.port = options.port || 4444;
  this.browser = options.browser;
  this.url = options.url;
  if (this.browser[0] !== '*') this.browser = '*' + this.browser; 
};

/**
 * Initialize a new session, then callback `fn(err, sid)`
 *
 * @param {Type} name
 * @return {Type}
 * @api public
 */

Client.prototype.session = function(fn){
  var self = this;
  if (!this.browser) throw new Error('browser required');
  if (!this.url) throw new Error('browser url required');
  this.command('getNewBrowserSession', [this.browser, this.url], function(err, res){
    if (err) return fn(err);
    fn(null, self.sid = res.body);
  });
};

/**
 * Execute the given `cmd` / `args`, then callback `fn(err, res)`.
 *
 * @param {String} cmd
 * @param {Array} args
 * @param {Function} fn
 * @api private
 */

Client.prototype.command = function(cmd, args, fn){
  // HTTP client
  var client = http.createClient(this.port, this.host);

  // Path construction
  var path = this.commandPath(cmd, args);
  if (this.sid && cmd !== 'getNewBrowserSession') {
    path += '&sessionId=' + this.sid;
  }

  // Request
  var req = client.request('GET'
    , path
    , { Host: this.host + (this.port ? ':' + this.port : '') });
    
  req.on('response', function(res){
    res.body = '';
    res.setEncoding('utf8');
    res.on('data', function(chunk){ res.body += chunk; });
    res.on('end', function(){
      if (res.body.indexOf('ERROR') === 0) {
        var err = res.body.replace(/^ERROR: */, '');
        err = cmd + '(' + args.join(', ') + '): ' + err; 
        fn(new Error(err), res);
      } else {
        if (res.body.indexOf('OK') === 0) {
          res.body = res.body.replace('OK,', '');
        }
        fn(null, res);
      }
    });
  });
  req.end();
};

/**
 * Construct a `cmd` path with the given `args`.
 *
 * @param {String} name
 * @param {Array} args
 * @return {String}
 * @api private
 */

Client.prototype.commandPath = function(cmd, args){
  args = args.map(function(arg, i){
    return i + 1 + '=' + encodeURIComponent(arg);
  }).join('&');
  return '/selenium-server/driver/?cmd=' + cmd + '&' + args;
};

/**
 * Shortcut for `new selenium.Client()`.
 *
 * @param {Object} options
 * @return {Client}
 * @api public
 */

exports.createClient = function(options){
  return new Client(options);
};