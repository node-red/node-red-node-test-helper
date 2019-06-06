# Node Test Helper

This test-helper module makes the node unit test framework from the Node-RED core available for node contributors.

Using the test-helper, your tests can start the Node-RED runtime, load a test flow, and receive messages to ensure your node code is correct.

## Adding to your node project dependencies

Node-RED is required by the helper as a peer dependency, meaning it must be installed along with the helper itself.  To create unit tests for your node project, add this test helper and Node-RED as follows:

    npm install node-red-node-test-helper node-red --save-dev

This will add the helper module to your `package.json` file:

```json
...
  "devDependencies": {
    "node-red":"^0.18.4",
    "node-red-node-test-helper": "^0.1.8"
  }
...
```

## Using a local Node-RED install for tests

If you already have Node-RED installed for development, you can create a symbolic link to your local installation.  For example, if Node-RED is cloned in your `~/projects` folder use:

    npm install ~/projects/node-red --no-save

## Adding test script to `package.json`

To run your tests you can add a test script to your `package.json` file in the `scripts` section.  To run all of the files with the `_spec.js` prefix in the test directory for example:

```json
  ...
  "scripts": {
    "test": "mocha \"test/**/*_spec.js\""
  },
  ...
```

This will allow you to use `npm test` on the command line.

## Creating unit tests

We recommend putting unit test scripts in the `test/` folder of your project and using the `*_spec.js` (for specification) suffix naming convention.

## Example unit test

Here is an example test for testing the lower-case node in the [Node-RED documentation](https://nodered.org/docs/creating-nodes/first-node).  Here we name our test script `test/lower-case_spec.js`.

### `test/lower-case_spec.js`:

```javascript
var should = require("should");
var helper = require("node-red-node-test-helper");
var lowerNode = require("../lower-case.js");

helper.init(require.resolve('node-red'));

describe('lower-case Node', function () {

  beforeEach(function (done) {
      helper.startServer(done);
  });

  afterEach(function (done) {
      helper.unload();
      helper.stopServer(done);
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

## Initializing Helper

To get started, we need to tell the helper where to find the node-red runtime.  this is done by calling `helper.init(require.resolve('node-red'))` as shown.

The helper takes an optional `userSettings` parameter which is merged with the runtime defaults.

```javascript
helper.init(require.resolve('node-red'), { 
    functionGlobalContext: { os:require('os') }
});
```

## Getting nodes in the runtime

The asynchronous `helper.load()` method calls the supplied callback function once the Node-RED server and runtime is ready.  We can then call the `helper.getNode(id)` method to get a reference to nodes in the runtime.  For more information on these methods see the API section below.

## Receiving messages from nodes

The second test uses a `helper` node in the runtime connected to the output of our `lower-case` node under test.  The `helper` node is a mock node with no functionality. By adding "input" event handlers as in the example, we can check the messages received by the `helper`.

To send a message into the `lower-case` node `n1` under test we call `n1.receive({ payload: "UpperCase" })` on that node.  We can then check that the payload is indeed lower case in the `helper` node input event handler.

## Working with Spies

A Spy ([docs](http://sinonjs.org/releases/v5.0.6/spies/)) helps you collect information about how many times a function was called, with what, what it returned, etc.

This helper library automatically creates spies for the following functions on `Node.prototype` (these are the same functions as mentioned in the ["Creating Nodes" guide](https://nodered.org/docs/creating-nodes/node-js)):

- `trace()`
- `debug()`
- `warn()`
- `log()`
- `status()`
- `send()`

> **Warning:** Don't try to spy on these functions yourself with `sinon.spy()`; since they are already spies, Sinon will throw an exception!

### Synchronous Example: Initialization

The `FooNode` `Node` will call `warn()` when it's initialized/constructed if `somethingGood` isn't present in the config, like so:

```js
// /path/to/foo-node.js
module.exports = function FooNode (config) {
  RED.nodes.createNode(this, config);

  if (!config.somethingGood) {
    this.warn('badness');
  }
}
```

You can then assert:

```js
// /path/to/test/foo-node_spec.js
const FooNode = require('/path/to/foo-node');

it('should warn if the `somethingGood` prop is falsy', function (done) {
  const flow = {
    name: 'n1',
    somethingGood: false,
    /* ..etc.. */
  };
  helper.load(FooNode, flow, function () {
    n1.warn.should.be.calledWithExactly('badness');
    done();
  });
});
```

### Synchronous Example: Input

When it receives input, `FooNode` will immediately call `error()` if `msg.omg` is `true`:

```js
// somewhere in FooNode constructor
this.on('input', msg => {
  if (msg.omg) {
    this.error('lolwtf');
  }
  // ..etc..
});
```

Here's an example of how to make that assertion:

```js
describe('if `omg` in input message', function () {
  it('should call `error` with "lolwtf" ', function (done) {
    const flow = {
      name: 'n1',
      /* ..etc.. */
    };
    helper.load(FooNode, flow, function () {
      const n1 = helper.getNode('n1')
      n1.receive({omg: true});
      n1.on('input', () => {
        n1.warn.should.be.calledWithExactly('lolwtf');
        done();
      });
    });
  });
});
```

### Asynchronous Example

Later in `FooNode`'s `input` listener, `warn()` may *asynchronously* be called, like so:

```js
// somewhere in FooNode constructor function
this.on('input', msg => {
  if (msg.omg) {
    this.error('lolwtf');
  }
  // ..etc..

  Promise.resolve()
    .then(() => {
      if (msg.somethingBadAndWeird) {
        this.warn('bad weirdness');
      }
    });
});
```

The strategy in the previous example used for testing behavior of `msg.omg` will *not* work!  `n1.warn.should.be.calledWithExactly('bad weirdness')` will throw an `AssertionError`, because `warn()` hasn't been called yet; `EventEmitter`s are synchronous, and the test's `input` listener is called directly after the `input` listener in `FooNode`'s function finished--but *before* the `Promise` is resolved!

Since we don't know *when* exactly `warn()` will get called (short of the slow, race-condition-prone solution of using a `setTimeout` and waiting *n* milliseconds, *then* checking), we need a different way to inspect the call.  Miraculously, this helper module provides a solution.

The helper will cause the `FooNode` to asynchronously emit an event when `warn` is called (as well as the other methods in the above list).  The event name will be of the format `call:<methodName>`; in this case, `methodName` is `warn`, so the event name is `call:warn`.  The event Will pass a single argument: a Spy Call object ([docs](http://sinonjs.org/releases/v5.0.6/spy-call/)) corresponding to the latest method call.  You can then make an assertion against this Spy Call argument, like so:

```js
describe('if `somethingBadAndWeird` in input msg', function () {
  it('should call "warn" with "bad weirdness" ', function (done) {
    const flow = {
      name: 'n1',
      /* ..etc.. */
    };
    helper.load(FooNode, flow, function () {
      const n1 = helper.getNode('n1')
      n1.receive({somethingBadAndWeird: true});
      // because the emit happens asynchronously, this listener
      // will be registered before `call:warn` is emitted.
      n1.on('call:warn', call => {
        call.should.be.calledWithExactly('bad weirdness');
        done();
      });
    });
  });
});
```

As you can see, looks very similar to the synchronous solution; the only differences are the event name and assertion target.

> **Note**: The "asynchronous" strategy will also work *if and only if* a synchronous call to the spy is *still the most recent* when we attempt to make the assertion.  This can lead to subtle bugs when refactoring, so exercise care when choosing which strategy to use.

## Running your tests

To run your tests:

    npm test

Producing the following output (for this example):

    > red-contrib-lower-case@0.1.0 test /dev/work/node-red-contrib-lower-case
    > mocha "test/**/*_spec.js"

    lower-case Node
      ✓ should be loaded
      ✓ should make payload lower case

    2 passing (50ms)

## Creating test flows with the editor

To create a test flow with the Node-RED editor, export the test flow to the clipboard, and then paste the flow into your unit test code.  One helpful technique to include `helper` nodes in this way is to use a `debug` node as a placeholder for a `helper` node, and then search and replace `"type":"debug"` with  `"type":"helper"` where needed.

## Using `catch` and `status` nodes in test flows

To use `catch` and `status` or other nodes that depend on special handling in the runtime in your test flows, you will often need to add a `tab` to identify the flow, and associated `z` properties to your nodes to associate the nodes with the flow.  For example:

```javascript
var flow = [{id:"f1", type:"tab", label:"Test flow"},
  { id: "n1", z:"f1", type: "lower-case", name: "test name",wires:[["n2"]] },
  { id: "n2", z:"f1", type: "helper" }
```

## Additional examples

For additional test examples taken from the Node-RED core, see the `.js` files supplied in the `test/examples` folder and the associated test code at `test/nodes` in [the Node-RED repository](https://github.com/node-red/node-red/tree/master/test/nodes).

## API

> *Work in progress.*

### load(testNode, testFlows, testCredentials, cb)

Loads a flow then starts the flow. This function has the following arguments:

* testNode: (object|array of objects) Module object of a node to be tested returned by require function. This node will be registered, and can be used in testFlows.
* testFlow: (array of objects) Flow data to test a node. If you want to use flow data exported from Node-RED editor, export the flow to the clipboard and paste the content into your test scripts.
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

### settings(userSettings)

Merges any userSettings with the defaults returned by `RED.settings`. Each invocation of this method will overwrite the previous userSettings to prevent unexpected problems in your tests.

This will enable you to replicate your production environment within your tests, for example where you're using the `functionGlobalContext` to enable extra node modules within your functions.

```javascript
// functions can now access os via global.get('os')
helper.settings({ functionGlobalContext: { os:require('os') } });

// reset back to defaults
helper.settings({ });
```

### startServer(done)

Starts a Node-RED server for testing nodes that depend on http or web sockets endpoints like the debug node.
To start a Node-RED server before all test cases:

```javascript
before(function(done) {
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

## Running helper examples

    npm run examples

This runs tests on an included lower-case node (as above) as well as snaphots of some of the core nodes' Javascript files to ensure the helper is working as expected.
