/**
 * Copyright JS Foundation and other contributors, http://js.foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

var should = require("should");
var helper = require("../index.js");

var functionNode = require("./examples/80-function.js");

describe('function node', function() {

    before(function(done) {
        helper.startServer(done);
    });

    afterEach(function() {
        helper.unload();
    });

    after(function(done) {
        helper.stopServer(done);
    });

    it('should be loaded', function(done) {
        var flow = [{id:"n1", type:"function", name: "function" }];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            n1.should.have.property('name', 'function');
            done();
        });
    });

    it('should send returned message', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"return msg;"},
                    {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'foo');
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should send returned message using send()', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"node.send(msg);"},
                    {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'foo');
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should pass through _topic', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"return msg;"},
                    {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'foo');
                msg.should.have.property('_topic', 'baz');
                done();
            });
            n1.receive({payload:"foo",topic: "bar", _topic: "baz"});
        });
    });

    it('should send to multiple outputs', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"],["n3"]],
                     func:"return [{payload: '1'},{payload: '2'}];"},
                    {id:"n2", type:"helper"}, {id:"n3", type:"helper"} ];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var n3 = helper.getNode("n3");
            var count = 0;
            n2.on("input", function(msg) {
                should(msg).have.property('payload', '1');
                count++;
                if (count == 2) {
                    done();
                }
            });
            n3.on("input", function(msg) {
                should(msg).have.property('payload', '2');
                count++;
                if (count == 2) {
                    done();
                }
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should send to multiple messages', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],
                     func:"return [[{payload: 1},{payload: 2}]];"},
                    {id:"n2", type:"helper"} ];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var count = 0;
            n2.on("input", function(msg) {
                count++;
                try {
                    should(msg).have.property('payload', count);
                    should(msg).have.property('_msgid', 1234);
                    if (count == 2) {
                        done();
                    }
                } catch(err) {
                    done(err);
                }
            });
            n1.receive({payload:"foo", topic: "bar",_msgid:1234});
        });
    });

    it('should allow input to be discarded by returning null', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"return null"},
                    {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            setTimeout(function() {
                done();
            }, 20);
            n2.on("input", function(msg) {
                should.fail(null,null,"unexpected message");
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should handle null amongst valid messages', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"return [[msg,null,msg],null]"},
                {id:"n2", type:"helper"},
                {id:"n3", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var n3 = helper.getNode("n3");
            var n2MsgCount = 0;
            var n3MsgCount = 0;
            n2.on("input", function(msg) {
                n2MsgCount++;
            });
            n3.on("input", function(msg) {
                n3MsgCount++;
            });
            n1.receive({payload:"foo",topic: "bar"});
            setTimeout(function() {
                n2MsgCount.should.equal(2);
                n3MsgCount.should.equal(0);
                done();
            },20);
        });
    });

    it('should get keys in global context', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"msg.payload=global.keys();return msg;"},
                    {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n1.context().global.set("count","0");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', ['count']);
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    function testNonObjectMessage(functionText,done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:functionText},
                {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var n2MsgCount = 0;
            n2.on("input", function(msg) {
                n2MsgCount++;
            });
            n1.receive({});
            setTimeout(function() {
                try {
                    n2MsgCount.should.equal(0);
                    var logEvents = helper.log().args.filter(function(evt) {
                        return evt[0].type == "function";
                    });
                    logEvents.should.have.length(1);
                    var msg = logEvents[0][0];
                    msg.should.have.property('level', helper.log().ERROR);
                    msg.should.have.property('id', 'n1');
                    msg.should.have.property('type', 'function');
                    msg.should.have.property('msg', 'function.error.non-message-returned');
                    done();
                } catch(err) {
                    done(err);
                }
            },20);
        });
    }
    it('should drop and log non-object message types - string', function(done) {
        testNonObjectMessage('return "foo"', done)
    });
    it('should drop and log non-object message types - buffer', function(done) {
        testNonObjectMessage('return new Buffer("hello")', done)
    });
    it('should drop and log non-object message types - array', function(done) {
        testNonObjectMessage('return [[[1,2,3]]]', done)
    });
    it('should drop and log non-object message types - boolean', function(done) {
        testNonObjectMessage('return true', done)
    });
    it('should drop and log non-object message types - number', function(done) {
        testNonObjectMessage('return 123', done)
    });

    it('should handle and log script error', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"retunr"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            n1.receive({payload:"foo",topic: "bar"});
            try {
                helper.log().called.should.be.true();
                var logEvents = helper.log().args.filter(function(evt) {
                    return evt[0].type == "function";
                });
                logEvents.should.have.length(1);
                var msg = logEvents[0][0];
                msg.should.have.property('level', helper.log().ERROR);
                msg.should.have.property('id', 'n1');
                msg.should.have.property('type', 'function');
                msg.should.have.property('msg', 'ReferenceError: retunr is not defined (line 1, col 1)');
                done();
            } catch(err) {
                done(err);
            }
        });
    });

    it('should handle node.on()', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"node.on('close',function(){node.log('closed')});"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            n1.receive({payload:"foo",topic: "bar"});
            helper.getNode("n1").close();
            try {
                helper.log().called.should.be.true();
                var logEvents = helper.log().args.filter(function(evt) {
                    return evt[0].type == "function";
                });
                logEvents.should.have.length(1);
                var msg = logEvents[0][0];
                msg.should.have.property('level', helper.log().INFO);
                msg.should.have.property('id', 'n1');
                msg.should.have.property('type', 'function');
                msg.should.have.property('msg', 'closed');
                done();
            } catch(err) {
                done(err);
            }
        });
    });

    it('should set node context', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"context.set('count','0');return msg;"},
                    {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'foo');
                n1.context().get("count").should.equal("0");
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should get node context', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"msg.payload=context.get('count');return msg;"},
                    {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n1.context().set("count","0");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', '0');
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should get keys in node context', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"msg.payload=context.keys();return msg;"},
                    {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n1.context().set("count","0");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', ['count']);
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should set flow context', function(done) {
        var flow = [{id:"n1",type:"function",z:"flowA",wires:[["n2"]],func:"flow.set('count','0');return msg;"},
                    {id:"n2", type:"helper",z:"flowA"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'foo');
                n2.context().flow.get("count").should.equal("0");
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should get flow context', function(done) {
        var flow = [{id:"n1",type:"function",z:"flowA",wires:[["n2"]],func:"msg.payload=flow.get('count');return msg;"},
                    {id:"n2", type:"helper",z:"flowA"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n1.context().flow.set("count","0");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', '0');
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should get flow context', function(done) {
        var flow = [{id:"n1",type:"function",z:"flowA",wires:[["n2"]],func:"msg.payload=context.flow.get('count');return msg;"},
                    {id:"n2", type:"helper",z:"flowA"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n1.context().flow.set("count","0");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', '0');
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should get keys in flow context', function(done) {
        var flow = [{id:"n1",type:"function",z:"flowA",wires:[["n2"]],func:"msg.payload=flow.keys();return msg;"},
                    {id:"n2", type:"helper",z:"flowA"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n1.context().flow.set("count","0");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', ['count']);
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should set global context', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"global.set('count','0');return msg;"},
                    {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'foo');
                n2.context().global.get("count").should.equal("0");
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should get global context', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"msg.payload=global.get('count');return msg;"},
                    {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n1.context().global.set("count","0");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', '0');
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should get global context', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"msg.payload=context.global.get('count');return msg;"},
                    {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n1.context().global.set("count","0");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', '0');
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should handle setTimeout()', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"setTimeout(function(){node.send(msg);},1000);"},
                    {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                var endTime = process.hrtime(startTime);
                var nanoTime = endTime[0] * 1000000000 + endTime[1];
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'foo');
                if (900000000 < nanoTime && nanoTime < 1100000000) {
                    done();
                } else {
                    try {
                        should.fail(null, null, "Delayed time was not between 900 and 1100 ms");
                    } catch (err) {
                        done(err);
                    }
                }
            });
            var startTime = process.hrtime();
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should handle setInterval()', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"setInterval(function(){node.send(msg);},100);"},
                    {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var count = 0;
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'foo');
                count++;
                if (count > 2) {
                    done();
                }
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should handle clearInterval()', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"var id=setInterval(null,100);setTimeout(function(){clearInterval(id);node.send(msg);},1000);"},
                    {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'foo');
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    describe('Logger', function () {
        it('should log an Info Message', function (done) {
            var flow = [{id: "n1", type: "function", wires: [["n2"]], func: "node.log('test');"}];
            helper.load(functionNode, flow, function () {
                var n1 = helper.getNode("n1");
                n1.receive({payload: "foo", topic: "bar"});
                try {
                    helper.log().called.should.be.true();
                    var logEvents = helper.log().args.filter(function (evt) {
                        return evt[0].type == "function";
                    });
                    logEvents.should.have.length(1);
                    var msg = logEvents[0][0];
                    msg.should.have.property('level', helper.log().INFO);
                    msg.should.have.property('id', 'n1');
                    msg.should.have.property('type', 'function');
                    msg.should.have.property('msg', 'test');
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should log a Warning Message', function (done) {
            var flow = [{id: "n1", type: "function", wires: [["n2"]], func: "node.warn('test');"}];
            helper.load(functionNode, flow, function () {
                var n1 = helper.getNode("n1");
                n1.receive({payload: "foo", topic: "bar"});
                try {
                    helper.log().called.should.be.true();
                    var logEvents = helper.log().args.filter(function (evt) {
                        return evt[0].type == "function";
                    });
                    logEvents.should.have.length(1);
                    var msg = logEvents[0][0];
                    msg.should.have.property('level', helper.log().WARN);
                    msg.should.have.property('id', 'n1');
                    msg.should.have.property('type', 'function');
                    msg.should.have.property('msg', 'test');
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should log an Error Message', function (done) {
            var flow = [{id: "n1", type: "function", wires: [["n2"]], func: "node.error('test');"}];
            helper.load(functionNode, flow, function () {
                var n1 = helper.getNode("n1");
                n1.receive({payload: "foo", topic: "bar"});
                try {
                    helper.log().called.should.be.true();
                    var logEvents = helper.log().args.filter(function (evt) {
                        return evt[0].type == "function";
                    });
                    logEvents.should.have.length(1);
                    var msg = logEvents[0][0];
                    msg.should.have.property('level', helper.log().ERROR);
                    msg.should.have.property('id', 'n1');
                    msg.should.have.property('type', 'function');
                    msg.should.have.property('msg', 'test');
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
    });

});
