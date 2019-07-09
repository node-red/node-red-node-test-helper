var should = require("should");
var NodeTestHelper = require('../index.js').NodeTestHelper;

var helper;
beforeEach(function() {
    // .init() is implicitly called on instantiation so not required
    helper = new NodeTestHelper();
});

describe('add custom settings on init', function () {
  it('should merge custom settings with RED.settings defaults', function () {
    helper._settings.should.not.have.property('functionGlobalContext');
    helper.init(null, {functionGlobalContext: {}});
    helper._settings.should.have.property('functionGlobalContext');
  });
});

describe('helper.settings() usage', function() {
  it('should return a settings Object', function() {
      var settings = helper.settings();
      should.exist(settings);
      settings.should.have.property('get');
  });
  it('should not maintain settings state across multiple invocations', function() {
      helper.settings({ foo: true }).should.have.property('foo');
      helper.settings({ bar: true }).should.not.have.property('foo');
  });
});
