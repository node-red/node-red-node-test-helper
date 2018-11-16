const should = require("should");
const helper = require('../index.js');

describe('_spec.js', function() {
    console.log('todo');

    it('should have credentials', function(done) {
        helper.should.have.property('credentials');
        done();
    });
});


describe('load', function() {

    afterEach(async () => {
        await helper.unload();
    });

    const flow = [{id: "n1", type: "helper", name: "helper"}];

    it('should not throw exception', function() {
        helper.load([], flow);
    });

    it('should call callback', function(done) {
        should.not.exist(helper.getNode("n1"));
        helper.load([], flow, () => {
            should.exist(helper.getNode("n1"));
            done();
        });
        should.not.exist(helper.getNode("n1"));
    });

    it('should resolve promise', function() {
        should.not.exist(helper.getNode("n1"));
        helper.load([], flow).then(() => {
            should.exist(helper.getNode("n1"));
        });
        should.not.exist(helper.getNode("n1"));
    });
});
