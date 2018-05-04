var should = require("should");
var helper = require('../index.js');

describe('_spec.js', function() {
  console.log('todo');

  it('should have credentials', function(done) {
    helper.should.have.property('credentials');
    done();
  });
});