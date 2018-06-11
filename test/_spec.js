const should = require('should');
const path = require('path');

const helper = require('../index.js');
const lowerNode = require("../examples/nodes/lower-case.js");
const RED = require('node-red');

// NOTE: Node-RED must be installed before running tests

describe('_spec.js', function () {

    const PROXY_METHODS = ['log', 'status', 'warn', 'error', 'debug', 'trace', 'send'];

    it('should add spies to Node methods', done => {
        const prefix = path.dirname(require.resolve('node-red'));
        const NodePrototype = require(path.join(prefix, 'runtime', 'nodes', 'Node')).prototype;
        Object.getOwnPropertyNames(NodePrototype).forEach(name => {
            if (PROXY_METHODS.indexOf(name) != -1) {
                NodePrototype[name].should.have.property('isSinonProxy', true);
            }
        });
        done();
    });

    describe('load', () => {

        afterEach(() => {
            helper.unload();
        });

        it('should load test flow', function (done) {
            var flow = [{ id: "n1", type: "lower-case", name: "lower-case" }];
            helper.load(lowerNode, flow, function () {
                done();
            });
        })

        it('should register the helper node', function (done) {
            var flow = [{ id: "n1", type: "lower-case", name: "lower-case" }];
            helper.load(lowerNode, flow, function () {
                let helperNode = RED.nodes.getType('helper');
                if (helperNode) {
                    return done();
                }
                done(new Error("helper should be registered"));
            });
        });

        it('should get node under test', function (done) {
            var flow = [{ id: "n1", type: "lower-case", name: "lower-case" }];
            helper.load(lowerNode, flow, function () {
                let lowerCaseNode = helper.getNode("n1");
                if (lowerCaseNode) {
                    return done();
                }
                done(new Error("couldn't get test node"));
            });
        });

        it('should emit "call:send" event', done => {
            var flow = [
                { id: "n1", type: "lower-case", name: "test name", wires: [["n2"]] },
                { id: "n2", type: "helper" }
            ];
            helper.load(lowerNode, flow, function () {
                let n1 = helper.getNode("n1");
                n1.on('call:send', call => {
                    let msg = call.args[0];
                    msg.should.have.property('payload', 'lowercase');
                    done()
                });
                n1.receive({
                    payload: 'LowerCase'
                });
            });
        });

        it('should emit "call:log" event', done => {

            var logNode = function (RED) {
                function LogNode(config) {
                    RED.nodes.createNode(this, config);
                    var node = this;
                    node.on('input', function (msg) {
                        node.log(msg.payload);
                    });
                }
                RED.nodes.registerType("log", LogNode);
            }

            var flow = [
                { id: "n1", type: "log", name: "test name", wires: [["n2"]] },
                { id: "n2", type: "helper" }
            ];
            helper.load(logNode, flow, function () {
                let n1 = helper.getNode("n1");
                n1.on('call:log', call => {
                    let log = call.args[0];
                    log.should.eql('test log');
                    done()
                });
                n1.receive({
                    payload: 'test log'
                });
            });
        });
    });
});