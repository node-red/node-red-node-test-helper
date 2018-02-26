# Node Test Helper

This test-helper module makes the node test framework from the Node-RED core available for node contributors.

Using the test-helper, your tests can start the Node-RED runtime, load a flow and receive messages to ensure your node code is correct.

## Adding to your node project dependencies

To add unit tests to your node project test dependencies, add this test helper as follows:

    npm install node-red-node-test-helper --save-dev

This will add the helper module to your `package.json` file as a development dependency:

```json
...
  "devDependencies": {
    "node-red-node-test-helper": "^0.1.4"
  }
...
```

Both [Mocha](https://mochajs.org/) and [Should](https://shouldjs.github.io/) will be pulled in with the test helper.  Mocha is a unit test framework for Javascript; Should is an assertion library.  For more information on these frameworks, see their associated documentation.

## Alternate linking of node project dependencies

Instead of installing the unit test node project test dependencies, which can pull in a very large number of packages, you can install the unit test packages globally and link them to your node project.  This is a better option if you plan on developing more than one node project.

Install the unit test packages globally as follows:

    npm install -g node-red
    npm install -g node-red-node-test-helper
    npm install -g should
    npm install -g mocha
    npm install -g sinon
    npm install -g supertest
    npm install -g express

In your node project development directory, link the unit test packages as follows:

    npm link node-red
    npm link node-red-node-test-helper
    npm link should
    npm link mocha
    npm link sinon
    npm link supertest
    npm link express

Depending on the nodes in your test flow, you may also need to link in other packages as required.  If a test indicates that a package cannot be found, install the package globally and then link it to your node project the same way as the packages above.

## Adding test script to `package.json`

To run your tests you can add a test script to your `package.json` file in the `scripts` section.  To run all of the files with the `_spec.js` prefix in the test directory for example:

```json
  ...
  "scripts": {
    "test": "mocha 'test/**/*_spec.js'"
  },
  ...
```

This will allow you to use `npm test` on the command line.

## Creating unit tests

We recommend putting unit test scripts in the `test/` folder of your project and using the `*_spec.js` (for specification) suffix naming convention.

## Example Unit Test

Here is an example test for testing the lower-case node in the [Node-RED documentation](https://nodered.org/docs/creating-nodes/first-node).  Here we name our test script `test/lower-case_spec.js`.

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

In this example, we require `should` for assertions, this helper module, as well as the `lower-case` node we want to test, located in the parent directory.

We then have a set of mocha unit tests.  These tests check that the node loads correctly, and ensures it makes the payload string lower case as expected.

## Creating test flows in the Node Red editor

The Node Red editor can be used to generate test flow configurations.  Create a flow in the editor with the node you wish to test and configure them using the node configuration editor. Add `debug` nodes to receive output messages from your test node. `catch` and `status` nodes can also be used to catch errors and status changes from your test node.  It is not necessary to include `inject` nodes as this helper module will allow you to inject test messages.

Highlight the nodes in the test flow and select `Export` then `Clipboard` to copy your test flow configuration, and then paste the JSON string into the test script.  Repeat this process to create different variations of your test flow if required.

When the flow is run in this helper module, `debug` nodes are converted to `helper` nodes.

## Getting nodes in the runtime

The asynchronous `helper.load()` method calls the supplied callback function once the Node-RED server and runtime is ready.  We can then call the `helper.getNode(id)` method to get a reference to nodes in the runtime.  For more information on these methods see the API section below.

## Receiving messages from nodes

The second test uses a `helper` node in the runtime connected to the output of our `lower-case` node under test.  The `helper` node is a mock node with no functionality. By adding "input" event handlers as in the example, we can check the messages received by the `helper`.

To send a message into the `lower-case` node `n1` under test we call `n1.receive({ payload: "UpperCase" })` on that node.  We can then check that the payload is indeed lower case in the `helper` node input event handler.

## Running your tests

To run your tests:

    npm test

Producing the following output (for this example):

    > red-contrib-lower-case@0.1.0 test /dev/work/node-red-contrib-lower-case
    > mocha 'test/**/*_spec.js'

    lower-case Node
      ✓ should be loaded
      ✓ should make payload lower case

    2 passing (50ms)

## Additional Examples

For additional test examples, see the `.js` files supplied in the `test/examples` folder and the Node-RED core node test code at `test/nodes` in [the Node-RED repository](https://github.com/node-red/node-red/tree/master/test/nodes).

## API

> *Work in progress.*

### load(testNode, testFlows, testCredentials, cb)

Loads a flow then starts the flow. This function has the following arguments:

* testNode: (object|array of objects) Module object of a node to be tested returned by require function. This node will be registered, and can be used in testFlows.
* testFlows: (array of objects|JSON string)) Flow configuration to test a node. The flow configuration can be exported from Node-RED editor and pasted as a JSON string.
* testCredentials: (object) Optional node credentials.
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
