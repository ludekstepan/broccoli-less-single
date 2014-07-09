var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var includePathSearcher = require('include-path-searcher');
var quickTemp = require('quick-temp');
var mapSeries = require('promise-map-series');
var less = require('less');
var _ = require('lodash');
var RSVP = require('rsvp');

var Writer = require('broccoli-writer');
var helpers = require('broccoli-kitchen-sink-helpers');

module.exports = LessCompiler;
LessCompiler.prototype = Object.create(Writer.prototype);
LessCompiler.prototype.constructor = LessCompiler;

function LessCompiler (sourceTrees, inputFile, outputFile, options) {
  if (!(this instanceof LessCompiler)) return new LessCompiler(sourceTrees, inputFile, outputFile, options);
  this.sourceTrees = sourceTrees;
  this.inputFile = inputFile;
  this.outputFile = outputFile;
  this.lessOptions = options || {};

  this.cache = {};

  this.cached = undefined;
}

function formatLessError(e) {
  var realFile = e.filename.split('.tmp/')[1];
  var stack = ''
  e.message = e.message + ' in ' + realFile + ' on line ' + e.line + ', column ' + (e.column + 1);
  if (typeof(e.extract[0]) === 'string') {
      stack += (e.line - 1) + ' ' + e.extract[0] + '\n';
  }

  if (typeof(e.extract[1]) === 'string') {
      stack += e.line + ' ' + e.extract[1] + '\n';
      stack += ' '.repeat(e.column + 3) + '^\n';
  }

  if (typeof(e.extract[2]) === 'string') {
      stack += (e.line + 1) + ' ' + e.extract[2] + '\n';
  }
  e.stack = stack;

  return e;
}

LessCompiler.prototype.write = function (readTree, destDir) {
  var self = this;

  var destFile = destDir + '/' + this.outputFile;
  mkdirp.sync(path.dirname(destFile));
  return mapSeries(this.sourceTrees, readTree)
    .then(function (includePaths) {

      var newCache = {};

      // glob off of input tree
      var inputFiles = includePaths.map(function(path) {
        var files = helpers.multiGlob(['**/*.less'], {cwd: path});
        return files.map(function(filepath) { return path + '/' + filepath; });
      });

      var needRecompile = false;

      _.flatten(inputFiles).forEach(function(path) {
        var statsHash = helpers.hashStats(fs.statSync(path));
        if (self.cache[statsHash] === undefined) {
          // cache miss, recompile needed!
          needRecompile = true;
        }
        newCache[statsHash] = true;  // eventually this could store some extra state
      });

      self.cache = newCache;

      if (needRecompile === false) {
        fs.writeFileSync(destFile, self.cached, { encoding: 'utf8' });
        return RSVP.Promise.resolve(self.tmpDestDir);
      }

      var lessOptions = {
        filename: includePathSearcher.findFileSync(self.inputFile, includePaths),
        paths: includePaths,
      };

      _.merge(lessOptions, self.lessOptions);
      lessOptions.paths = [path.dirname(lessOptions.filename)].concat(lessOptions.paths);
      data = fs.readFileSync(lessOptions.filename, 'utf8');

      var parser = new(less.Parser)(lessOptions);

      var promise = new RSVP.Promise(function(resolve, reject) {
        parser.parse(data, function (e, tree) {
          if (e) {
            reject(formatLessError(e));
          } else{
            try {
              var css = tree.toCSS(lessOptions);
              fs.writeFileSync(destFile, css, { encoding: 'utf8' });

              self.cached = css;

              resolve(self.tmpDestDir);
            } catch (e) {
              reject(formatLessError(e));
            }

          }
        });
      });

      return promise;
    });
};
