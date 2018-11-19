const should = require("should");
const helper = require('../index.js');

afterEach(async () => {
    await helper.unload();
    await helper.stopServer();
});

const flow = [{id: "n1", type: "helper", name: "helper"}];

const flow2 = [
    {id: 'n3', type: 'to', name: 'test name', wires: [['n1'], ['n2']]},
    {id: 'n1', type: 'helper'},
    {id: 'n2', type: 'helper'},
];

const twoOutputOneMessageNode = function(RED) {
    function to(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        node.on('input', function(msg) {
            node.warn("this is a warning");
            msg.payload = "output1";
            node.send([msg, null]);
            msg.payload = "output2";
            node.send([null, msg]);
        });
    }

    RED.nodes.registerType("to", to);
};

const twoOutputTwoMessagesNode = function(RED) {
    function to(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        node.on('input', function(msg) {
            node.send([{payload: "output1"}, {payload: "output2"}]);
        });
    }

    RED.nodes.registerType("to", to);
};

describe('_spec.js', function() {
    console.log('todo');

    it('should have credentials', async function() {
        await helper.load([], []);
        helper.should.have.property('credentials');
    });
});


describe('start', function() {

    it('should start and call callback', function(done) {
        delete helper._server;
        helper.startServer(function() {
            should.exist(helper._server);
            done();
        });
    });

    it('should start and resolve promise', async function() {
        delete helper._server;
        await helper.startServer();
        should.exist(helper._server);
    });
});


describe('load', function() {

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

describe('on-input', function() {
    it('should work with one message', function(done) {
        helper.load([], flow, function() {
            const n1 = helper.getNode("n1");
            n1.on('input', msg => {
                msg.payload.should.equal("works");
                done();
            });
            n1.receive({payload: "works"});
        });
    });

    it('should work with two outputs, two messages', function(done) {
        helper.load([twoOutputTwoMessagesNode], flow2, function() {
            try {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                const to = helper.getNode("n3");
                let output1 = false;
                let output2 = false;
                n1.on('input', msg => {
                    msg.payload.should.equal("output1");
                    output1 = true;
                    if (output1 && output2) {
                        done();
                    }
                });
                n2.on('input', msg => {
                    msg.payload.should.equal("output2");
                    output2 = true;
                    if (output1 && output2) {
                        done();
                    }
                });
                to.receive({payload: "testing"});
            } catch (e) {
                done(e);
            }
        });
    });

    it('should work with two outputs, modified message', function(done) {
        helper.load([twoOutputOneMessageNode], flow2, function() {
            try {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                const to = helper.getNode("n3");
                let output1 = false;
                let output2 = false;
                n1.on('input', msg => {
                    msg.payload.should.equal("output1");
                    output1 = true;
                    if (output1 && output2) {
                        done();
                    }
                });
                n2.on('input', msg => {
                    msg.payload.should.equal("output2");
                    output2 = true;
                    if (output1 && output2) {
                        done();
                    }
                });
                to.receive({payload: "testing"});
            } catch (e) {
                done(e);
            }
        });
    });
});

describe('next input', function() {

    it('should work with one output', async function() {
        await helper.load([], flow);
        const n1 = helper.getNode("n1");
        n1.receive({payload: "works"});
        const msg = await n1.next('input');
        msg.payload.should.equal("works");
    });

    it('should work with two outputs, two messages', async function() {
        await helper.load([twoOutputTwoMessagesNode], flow2);
        const n1 = helper.getNode("n1");
        const n2 = helper.getNode("n2");
        const to = helper.getNode("n3");

        to.receive({payload: "testing"});

        let msg = await n1.next('input');
        msg.payload.should.equal("output1");
        msg = await n2.next('input');
        msg.payload.should.equal("output2");
    });

    it('should work with two outputs, modified message', async function() {
        await helper.load([twoOutputOneMessageNode], flow2);
        const n1 = helper.getNode("n1");
        const n2 = helper.getNode("n2");
        const to = helper.getNode("n3");

        to.receive({payload: "testing"});

        let msg = await n1.next('input');
        msg.payload.should.equal("output1");
        msg = await n2.next('input');
        msg.payload.should.equal("output2");
    });
});

describe('get log events', function() {

    it('should work with event subscription', function(done) {
        helper.load(twoOutputOneMessageNode, flow2, function() {
            try {
                const n3 = helper.getNode("n3");
                n3.on('call:warn', call => {
                    call.should.be.calledWithExactly('this is a warning');
                    done();
                });
                n3.receive({payload: "testing"});
            } catch (e) {
                done(e);
            }
        });
    });

    it('should work with next', async function() {
        await helper.load(twoOutputOneMessageNode, flow2);
        const n3 = helper.getNode("n3");
        n3.receive({payload: "testing"});
        let call = await n3.next('call:warn');
        call.should.be.calledWithExactly('this is a warning');
    });

    it('should work when in opposite order', async function() {
        await helper.load(twoOutputOneMessageNode, flow2);
        const n3 = helper.getNode("n3");
        process.nextTick(()=>{n3.receive({payload: "testing"})});
        let call = await n3.next('call:warn');
        call.should.be.calledWithExactly('this is a warning');
    });
});
