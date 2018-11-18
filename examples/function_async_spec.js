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
helper.init(require.resolve('node-red'));

var functionNode = require("./nodes/80-function.js");

const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));

describe('function node', function() {

    before(async function() {
        await helper.startServer();
    });

    after(async function() {
        await helper.stopServer();
    });

    afterEach(async function() {
        await helper.unload();
    });

    it('should be loaded', async function() {
        var flow = [{id:"n1", type:"function", name: "function" }];
        await helper.load(functionNode,flow);
        var n1 = helper.getNode("n1");
        n1.should.have.property('name', 'function');
    });

    it('should send returned message', async function() {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"return msg;"},
            {id:"n2",type:"helper"}];
        await helper.load(functionNode, flow);
        var n1 = helper.getNode("n1");
        var n2 = helper.getNode("n2");

        n1.receive({payload:"foo",topic:"bar"});
        let msg = await n2.next("input");
        msg.should.have.property('topic', 'bar');
        msg.should.have.property('payload', 'foo');
    });

    it('should send returned message using send()', async function() {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"node.send(msg);"},
            {id:"n2", type:"helper"}];
        await helper.load(functionNode, flow);
        var n1 = helper.getNode("n1");
        var n2 = helper.getNode("n2");

        n1.receive({payload:"foo",topic:"bar"});
        let msg = await n2.next("input");
        msg.should.have.property('topic', 'bar');
        msg.should.have.property('payload', 'foo');
    });

    it('should pass through _topic', async function() {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"return msg;"},
            {id:"n2", type:"helper"}];
        await helper.load(functionNode, flow);
        var n1 = helper.getNode("n1");
        var n2 = helper.getNode("n2");

        n1.receive({payload:"foo",topic:"bar", _topic:"baz"});
        let msg = await n2.next("input");
        msg.should.have.property('topic', 'bar');
        msg.should.have.property('payload', 'foo');
        msg.should.have.property('_topic', 'baz');
    });

    it('should send to multiple outputs', async function() {
        var flow = [{id:"n1",type:"function",wires:[["n2"],["n3"]],
            func:"return [{payload: '1'},{payload: '2'}];"},
            {id:"n2", type:"helper"}, {id:"n3", type:"helper"} ];
        await helper.load(functionNode, flow);
        var n1 = helper.getNode("n1");
        var n2 = helper.getNode("n2");
        var n3 = helper.getNode("n3");

        n1.receive({payload:"foo",topic:"bar"});
        let msg = await n2.next("input");
        should(msg).have.property('payload', '1');
        msg = await n3.next("input");
        should(msg).have.property('payload', '2');
    });

    it('should send to multiple messages', async function() {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],
            func:"return [[{payload: 1},{payload: 2}]];"},
            {id:"n2", type:"helper"} ];
        await helper.load(functionNode, flow);
        var n1 = helper.getNode("n1");
        var n2 = helper.getNode("n2");

        n1.receive({payload:"foo", topic: "bar",_msgid:1234});
        let msg = await n2.next("input");
        should(msg).have.property('payload', 1);
        should(msg).have.property('_msgid', 1234);
        msg = await n2.next("input");
        should(msg).have.property('payload', 2);
        should(msg).have.property('_msgid', 1234);
    });

    it('should allow input to be discarded by returning null', async function() {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"return null"},
            {id:"n2", type:"helper"}];
        await helper.load(functionNode, flow);
        var n1 = helper.getNode("n1");
        var n2 = helper.getNode("n2");

        n1.receive({payload:"foo",topic: "bar"});
        await Promise.race([
            n2.next("input").then(() => should.fail(null,null,"unexpected message")),
            sleep(20)
        ]);
    });

    it('should handle null amongst valid messages', async function() {
        var flow = [{id:"n1",type:"function",wires:[["n2"],["n3"]],func:"return [[msg,null,msg],null]"},
            {id:"n2", type:"helper"},
            {id:"n3", type:"helper"}];
        await helper.load(functionNode, flow);
        var n1 = helper.getNode("n1");
        var n2 = helper.getNode("n2");
        var n3 = helper.getNode("n3");
        var n2MsgCount = 0;
        var n3MsgCount = 0;

        n1.receive({payload:"foo",topic:"bar"});
        await n2.next("input");
        await n2.next("input");
        await Promise.race([
            n2.next("input").then(() => {should.fail(null,null,"unexpected message")}),
            n3.next("input").then(() => {should.fail(null,null,"unexpected message")}),
            sleep(20)
        ]);
    });

    it('should get keys in global context', async function() {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"msg.payload=global.keys();return msg;"},
            {id:"n2", type:"helper"}];
        await helper.load(functionNode, flow);
        var n1 = helper.getNode("n1");
        var n2 = helper.getNode("n2");
        n1.context().global.set("count","0");
        n1.receive({payload:"foo",topic: "bar"});
        let msg = await n2.next("input");
        msg.should.have.property('topic', 'bar');
        msg.should.have.property('payload', ['count']);
    });

    async function testNonObjectMessage(functionText) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:functionText},
            {id:"n2", type:"helper"}];
        await helper.load(functionNode, flow);
        var n1 = helper.getNode("n1");
        var n2 = helper.getNode("n2");

        n1.receive({});
        await sleep(20);

        var logEvents = helper.log().args.filter(evt => evt[0].type == "function");
        logEvents.should.have.length(1);
        let msg = logEvents[0][0];
        msg.should.have.property('level', helper.log().ERROR);
        msg.should.have.property('id', 'n1');
        msg.should.have.property('type', 'function');
        msg.should.have.property('msg', 'function.error.non-message-returned');

        await Promise.race([
            n2.next("input").then(() => {should.fail(null,null,"unexpected message")}),
            sleep(20)
        ]);
    }

    it('should drop and log non-object message types - string', async function() {
        await testNonObjectMessage('return "foo"')
    });
    it('should drop and log non-object message types - buffer', async function() {
        await testNonObjectMessage('return new Buffer("hello")')
    });
    it('should drop and log non-object message types - array', async function() {
        await testNonObjectMessage('return [[[1,2,3]]]')
    });
    it('should drop and log non-object message types - boolean', async function() {
        await testNonObjectMessage('return true')
    });
    it('should drop and log non-object message types - number', async function() {
        await testNonObjectMessage('return 123')
    });

    it('should handle and log script error', async function() {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"retunr"}];
        await helper.load(functionNode, flow);
        var n1 = helper.getNode("n1");

        n1.receive({payload:"foo",topic: "bar"});
        helper.log().called.should.be.true();
        var logEvents = helper.log().args.filter(evt => evt[0].type == "function");
        logEvents.should.have.length(1);
        var msg = logEvents[0][0];
        msg.should.have.property('level', helper.log().ERROR);
        msg.should.have.property('id', 'n1');
        msg.should.have.property('type', 'function');
        msg.should.have.property('msg', 'ReferenceError: retunr is not defined (line 1, col 1)');
    });

    it('should handle node.on()', async function() {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"node.on('close',function(){node.log('closed')});"}];
        await helper.load(functionNode, flow);
        var n1 = helper.getNode("n1");

        n1.receive({payload:"foo",topic: "bar"});
        helper.getNode("n1").close();
        helper.log().called.should.be.true();
        var logEvents = helper.log().args.filter(evt => evt[0].type == "function");
        logEvents.should.have.length(1);
        var msg = logEvents[0][0];
        msg.should.have.property('level', helper.log().INFO);
        msg.should.have.property('id', 'n1');
        msg.should.have.property('type', 'function');
        msg.should.have.property('msg', 'closed');
    });

    it('should set node context', async function() {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"context.set('count','0');return msg;"},
            {id:"n2", type:"helper"}];
        await helper.load(functionNode, flow);
        var n1 = helper.getNode("n1");
        var n2 = helper.getNode("n2");

        n1.receive({payload:"foo",topic: "bar"});
        let msg = await n2.next("input");
        msg.should.have.property('topic', 'bar');
        msg.should.have.property('payload', 'foo');
        n1.context().get("count").should.equal("0");
    });

    it('should get node context', async function() {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"msg.payload=context.get('count');return msg;"},
            {id:"n2", type:"helper"}];
        await helper.load(functionNode, flow);
        var n1 = helper.getNode("n1");
        var n2 = helper.getNode("n2");
        n1.context().set("count","0");

        n1.receive({payload:"foo",topic: "bar"});
        let msg = await n2.next("input");
        msg.should.have.property('topic', 'bar');
        msg.should.have.property('payload', '0');
    });

    it('should get keys in node context', async function() {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"msg.payload=context.keys();return msg;"},
            {id:"n2", type:"helper"}];
        await helper.load(functionNode, flow);
        var n1 = helper.getNode("n1");
        var n2 = helper.getNode("n2");
        n1.context().set("count","0");

        n1.receive({payload:"foo",topic: "bar"});
        let msg = await n2.next("input");
        msg.should.have.property('topic', 'bar');
        msg.should.have.property('payload', ['count']);
    });

    it('should set flow context', async function() {
        var flow = [{id:"n1",type:"function",z:"flowA",wires:[["n2"]],func:"flow.set('count','0');return msg;"},
            {id:"n2", type:"helper",z:"flowA"}];
        await helper.load(functionNode, flow);
        var n1 = helper.getNode("n1");
        var n2 = helper.getNode("n2");

        n1.receive({payload:"foo",topic: "bar"});
        let msg = await n2.next("input");
        msg.should.have.property('topic', 'bar');
        msg.should.have.property('payload', 'foo');
        n2.context().flow.get("count").should.equal("0");
    });

    it('should get flow context', async function() {
        var flow = [{id:"n1",type:"function",z:"flowA",wires:[["n2"]],func:"msg.payload=flow.get('count');return msg;"},
            {id:"n2", type:"helper",z:"flowA"}];
        await helper.load(functionNode, flow);
        var n1 = helper.getNode("n1");
        var n2 = helper.getNode("n2");

        n1.context().flow.set("count","0");
        n1.receive({payload:"foo",topic: "bar"});
        let msg = await n2.next("input");
        msg.should.have.property('topic', 'bar');
        msg.should.have.property('payload', '0');
    });

    it('should get flow context', async function() {
        var flow = [{id:"n1",type:"function",z:"flowA",wires:[["n2"]],func:"msg.payload=context.flow.get('count');return msg;"},
            {id:"n2", type:"helper",z:"flowA"}];
        await helper.load(functionNode, flow);
        var n1 = helper.getNode("n1");
        var n2 = helper.getNode("n2");
        n1.context().flow.set("count","0");

        n1.receive({payload:"foo",topic: "bar"});
        let msg = await n2.next("input");
        msg.should.have.property('topic', 'bar');
        msg.should.have.property('payload', '0');
    });

    it('should get keys in flow context', async function() {
        var flow = [{id:"n1",type:"function",z:"flowA",wires:[["n2"]],func:"msg.payload=flow.keys();return msg;"},
            {id:"n2", type:"helper",z:"flowA"}];
        await helper.load(functionNode, flow);
        var n1 = helper.getNode("n1");
        var n2 = helper.getNode("n2");
        n1.context().flow.set("count","0");

        n1.receive({payload:"foo",topic: "bar"});
        let msg = await n2.next("input");
        msg.should.have.property('topic', 'bar');
        msg.should.have.property('payload', ['count']);
    });

    it('should set global context', async function() {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"global.set('count','0');return msg;"},
            {id:"n2", type:"helper"}];
        await helper.load(functionNode, flow);
        var n1 = helper.getNode("n1");
        var n2 = helper.getNode("n2");

        n1.receive({payload:"foo",topic: "bar"});
        let msg = await n2.next("input");
        msg.should.have.property('topic', 'bar');
        msg.should.have.property('payload', 'foo');
        n2.context().global.get("count").should.equal("0");
    });

    it('should get global context', async function() {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"msg.payload=global.get('count');return msg;"},
            {id:"n2", type:"helper"}];
        await helper.load(functionNode, flow);
        var n1 = helper.getNode("n1");
        var n2 = helper.getNode("n2");
        n1.context().global.set("count","0");

        n1.receive({payload:"foo",topic: "bar"});
        let msg = await n2.next("input");
        msg.should.have.property('topic', 'bar');
        msg.should.have.property('payload', '0');
    });

    it('should get global context', async function() {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"msg.payload=context.global.get('count');return msg;"},
            {id:"n2", type:"helper"}];
        await helper.load(functionNode, flow);
        var n1 = helper.getNode("n1");
        var n2 = helper.getNode("n2");
        n1.context().global.set("count","0");

        n1.receive({payload:"foo",topic: "bar"});
        let msg = await n2.next("input");
        msg.should.have.property('topic', 'bar');
        msg.should.have.property('payload', '0');
    });

    it('should handle setTimeout()', async function() {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"setTimeout(function(){node.send(msg);},1000);"},
            {id:"n2", type:"helper"}];
        await helper.load(functionNode, flow);
        var n1 = helper.getNode("n1");
        var n2 = helper.getNode("n2");

        var startTime = process.hrtime();
        n1.receive({payload:"foo",topic: "bar"});
        let msg = await n2.next("input");
        var endTime = process.hrtime(startTime);
        var nanoTime = endTime[0] * 1000000000 + endTime[1];

        msg.should.have.property('topic', 'bar');
        msg.should.have.property('payload', 'foo');
        if (900000000 > nanoTime || nanoTime > 1100000000) {
            should.fail(null, null, "Delayed time was not between 900 and 1100 ms");
        }
    });

    it('should handle setInterval()', async function() {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"setInterval(function(){node.send(msg);},100);"},
            {id:"n2", type:"helper"}];
        await helper.load(functionNode, flow);
        var n1 = helper.getNode("n1");
        var n2 = helper.getNode("n2");

        n1.receive({payload:"foo",topic: "bar"});
        let msg = await n2.next("input");
        msg.should.have.property('topic', 'bar');
        msg.should.have.property('payload', 'foo');
        msg = await n2.next("input");
        msg.should.have.property('topic', 'bar');
        msg.should.have.property('payload', 'foo');
        msg = await n2.next("input");
        msg.should.have.property('topic', 'bar');
        msg.should.have.property('payload', 'foo');
    });

    it('should handle clearInterval()', async function() {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"var id=setInterval(null,100);setTimeout(function(){clearInterval(id);node.send(msg);},1000);"},
            {id:"n2", type:"helper"}];
        await helper.load(functionNode, flow);
        var n1 = helper.getNode("n1");
        var n2 = helper.getNode("n2");

        n1.receive({payload:"foo",topic: "bar"});
        let msg = await n2.next("input");
        msg.should.have.property('topic', 'bar');
        msg.should.have.property('payload', 'foo');
    });

    describe('Logger',function() {
        it('should log an Info Message', async function() {
            var flow = [{id: "n1", type: "function", wires: [["n2"]], func: "node.log('test');"}];
            await helper.load(functionNode, flow);
            var n1 = helper.getNode("n1");

            n1.receive({payload: "foo", topic: "bar"});
            helper.log().called.should.be.true();
            var logEvents = helper.log().args.filter(evt => evt[0].type == "function");
            logEvents.should.have.length(1);
            var msg = logEvents[0][0];
            msg.should.have.property('level', helper.log().INFO);
            msg.should.have.property('id', 'n1');
            msg.should.have.property('type', 'function');
            msg.should.have.property('msg', 'test');
        });

        it('should log a Warning Message', async function() {
            var flow = [{id: "n1", type: "function", wires: [["n2"]], func: "node.warn('test');"}];
            await helper.load(functionNode, flow);
            var n1 = helper.getNode("n1");

            n1.receive({payload: "foo", topic: "bar"});
            helper.log().called.should.be.true();
            var logEvents = helper.log().args.filter(evt => evt[0].type == "function");
            logEvents.should.have.length(1);
            var msg = logEvents[0][0];
            msg.should.have.property('level', helper.log().WARN);
            msg.should.have.property('id', 'n1');
            msg.should.have.property('type', 'function');
            msg.should.have.property('msg', 'test');
        });

        it('should log an Error Message', async function() {
            var flow = [{id: "n1", type: "function", wires: [["n2"]], func: "node.error('test');"}];
            await helper.load(functionNode, flow);
            var n1 = helper.getNode("n1");

            n1.receive({payload: "foo", topic: "bar"});
            helper.log().called.should.be.true();
            var logEvents = helper.log().args.filter(evt => evt[0].type == "function");
            logEvents.should.have.length(1);
            var msg = logEvents[0][0];
            msg.should.have.property('level', helper.log().ERROR);
            msg.should.have.property('id', 'n1');
            msg.should.have.property('type', 'function');
            msg.should.have.property('msg', 'test');
        });
    });

});
