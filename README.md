# Node Test Helper

This project pulls out the node helper module from the Node-RED core so that it can used for node nodeutors.

For examples on how to use this helper, see the Node-RED core node test code and some node .js files supplied in the `test/examples` folder.

## Adding to node project

To add to your node project test dependencies:

    npm install node-red-node-test-helper --save-dev

Inside your node test code:

```javascript
var helper = require('node-red-node-test-helper');
```

## Testing the helper

    npm run test

This runs tests on a snapshot of some of the core nodes' Javascript files to ensure the helper works.

## Example test

This is an example test for testing the lower-case node in the [Node-RED documentation](https://nodered.org/docs/creating-nodes/first-node).

```javascript
var should = require("should");
var helper = require("node-red-node-test-helper");
var lowerNode = require("../lower-case.js");

describe('lower-case Node', function () {

  afterEach(function () {
    helper.unload();
  });

  it('should be loaded', function (done) {
    var flow = [{ id: "n1", type: "lower-case", name: "lower-case" }];
    helper.load(lowerNode, flow, function () {
      var n1 = helper.getNode("n1");
      n1.should.have.property('name', 'lower-case');
      done();
    });
  });

  it('should make payload lower case', function (done) {
    var flow = [
      { id: "n1", type: "lower-case", name: "lower-case",wires:[["n2"]] },
      { id: "n2", type: "helper" }
    ];
    helper.load(lowerNode, flow, function () {
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");
      n2.on("input", function (msg) {
        msg.should.have.property('payload', 'uppercase');
        done();
      });
      n1.receive({ payload: "UpperCase" });
    });
  });
});
```

## API

### load(testNode, testFlows, testCredentials, cb)

Load the test node, flows and credentials, creates a 'helper' node.

### unload()

Return promise to stop all flows, clean up test runtime and log spy.

### getNode(id)

Get the node from the runtime.

### credentials

TODO

### clearFlows()

Calls RED.flows.stopFlows() to stop all flows.

### request()

Create http (supertest) request to the editor/admin url.

Example:

```javascript
    helper.request().post('/inject/invalid').expect(404).end(done);
```

### startServer(done)

Start a Node-RED test server; `done()` when complete.

### stopServer(done)

Stop server.  Generally called after unload() complete

### url()

Return the URL of the helper server.

### log()

Return a spy on the logs to look for events from the node under test.  For example:

```javascript
var logEvents = helper.log().args.filter(function(evt {
    return evt[0].type == "batch";
});
```