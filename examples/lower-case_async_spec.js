var helper = require("../index.js");
var lowerNode = require("./nodes/lower-case.js");

helper.init(require.resolve('node-red'));

describe('lower-case Node', function () {

  afterEach(async function () {
    await helper.unload();
  });

  it('should be loaded', async function () {
    var flow = [{id: "n1", type: "lower-case", name: "lower-case"}];
    await helper.load(lowerNode, flow);
    var n1 = helper.getNode("n1");
    n1.should.have.property('name', 'lower-case');
  });

  it('should be loaded in exported flow', async function () {
    var flow = [{"id":"3912a37a.c3818c","type":"lower-case","z":"e316ac4b.c85a2","name":"lower-case","x":240,"y":320,"wires":[[]]}];
    await helper.load(lowerNode, flow);
    var n1 = helper.getNode("3912a37a.c3818c");
    n1.should.have.property('name', 'lower-case');
  });

  it('should make payload lower case', async function () {
    var flow = [
      { id: "n1", type: "lower-case", name: "test name",wires:[["n2"]] },
      { id: "n2", type: "helper" }
    ];
    await helper.load(lowerNode, flow);
    var n2 = helper.getNode("n2");
    var n1 = helper.getNode("n1");
    n1.receive({ payload: "UpperCase" });
    let msg = await n2.next("input");
    msg.should.have.property('payload', 'uppercase');
  });
});
