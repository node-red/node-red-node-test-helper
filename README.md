# Node Test Helper

This test-helper module makes the node test framework from the Node-RED core available for node contributors.

Using the test-helper, your tests can start the Node-RED runtime, load a flow and receive messages
to ensure your node code is correct.

## Adding to your node project dependencies

To add unit tests your node project test dependencies, add this test helper, `mocha` and `should` as follows:

    npm install mocha should node-red-node-test-helper --save-dev

This will add the those modules to your `package.json` file as a development dependency.  [Mocha](https://mochajs.org/) is a unit test framework for Javascript.  [Should](https://shouldjs.github.io/) is an assertion library used in our example unit tests.  For more information on these frameworks, see their associated documentation.  Depending on your testing needs, other dev dependencies may be added.

Your project.json file should contain something like the following:

```json
...
  "devDependencies": {
    "mocha": "^3.4.2",
    "node-red-node-test-helper": "^0.1.3",
    "should": "^8.4.0"
  }
...
```

## Adding test script to `package.json`

To run your tests you can add a test script to your `package.json` file in the `scripts` section.  To run all of the files with the `_spec.js` prefix in the test directory:

```json
  ...
  "scripts": {
    "test": "mocha 'test/**/*_spec.js'"
  },
  ...
```

This will allow you to use `npm test` to run your tests.

## Creating unit tests

We recommend putting unit test scripts in the `test/` folder of your project and using the `_spec.js` (for specification) suffix naming convention for your tests.  

## Example Unit Test

Here is an example test for testing the lower-case node in the [Node-RED documentation](https://nodered.org/docs/creating-nodes/first-node).  Lets name our test script `test/lower-case_spec.js`.

### `test/lower-case_spec.js`:

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

In this example, we require `should` for assertions, the helper module, as well as the `lower-case` node we want to test.

We then have a set of mocha unit tests.  These tests check that the node loads correctly, and ensures it makes the payload string lower case as expected.

## Getting nodes in the runtime

The asynchronous `helper.load()` method calls the supplied function once the Node-RED server and runtime is read.  We can then call helper methods to get a reference to nodes in the runtime.  For more information on `helper.load()` see the API section below.

## Receiving messages from nodes

The second test uses a `helper` node in the runtime connected to the output of our `lower-case` node under test.

The Helper node is a mock node with no functionality. By adding "input" event handlers as in the example, the helper node can receive a message from the previous `lower-case` node in the flow and check if its contents are as expected.

## Running your tests

To run your tests:

    npm run

Producing the following output (for example):

    >npm test

    > red-contrib-lower-case@0.1.0 test /Users/mike/dev/work/node-red-contrib-lower-case
    > mocha 'test/**/*_spec.js'

    lower-case Node
      ✓ should be loaded
      ✓ should make payload lower case

    2 passing (50ms)

## Additional Examples

For additional examples, see the `.js` files supplied in the `test/examples` folder and the Node-RED core node test code at `test/nodes` in [the Node-RED repository](https://github.com/node-red/node-red/tree/master/test/nodes).

## API

> *Work in progress.*

### load(testNode, testFlows, testCredentials, cb)

Loads a flow then starts the flow. This function has the following arguments:

* testNode: (object|array of objects) Module object of a node to be tested returned by require function. This node will be registered, and can be used in testFlows.
* testFlows: (array of objects) Flow data to test a node. If you want to use the flow data exported from Node-RED editor, need to covert it to JavaScript object using JSON.parse().
* testCredentials: (object) Optional node credentials. This argument is optional.
* cb: (function) Function to call back when testFlows has been started.

### unload()

Return promise to stop all flows, clean up test runtime.

### getNode(id)

Returns a node instance by id in the testFlow. Any node that is defined in testFlows can be retrieved, including any helper node added to the flow.

### clearFlows()

Stop all flows.

### request()

Create http ([supertest](https://www.npmjs.com/package/supertest)) request to the editor/admin url.

Example:

```javascript
helper.request().post('/inject/invalid').expect(404).end(done);
```

### startServer(done)

Starts a Node-RED server. To start a Node-RED server on each test case:

```javascript
beforeEach(function(done) {
    helper.startServer(done);
});
```

### stopServer(done)

Stop server.  Generally called after unload() complete.  For example, to unload a flow then stop a server after each test:

```javascript
afterEach(function(done) {
    helper.unload().then(function() {
        helper.stopServer(done);
    });
});
```

### url()

Return the URL of the helper server including the ephemeral port used when starting the server.

### log()

Return a spy on the logs to look for events from the node under test.  For example:

```javascript
var logEvents = helper.log().args.filter(function(evt {
    return evt[0].type == "batch";
});
```

## Testing the helper

    npm run test

This runs tests on snaphots of some of the core nodes' Javascript files to ensure the helper is working as expected.