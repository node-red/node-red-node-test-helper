var helper = require("../index.js");
var lowerNode = require("./nodes/lower-case.js");

helper.init(require.resolve('node-red'));

describe('lower-case Node', function () {

  afterEach(function () {
    helper.unload();
  });

  it('should be loaded', function (done) {
    var flow = [{ id: "n1", type: "lower-case", name: "lower-case" }];
    helper.load(lowerNode, flow, function () {
      var n1 = helper.getNode("n1");
      try {
        n1.should.have.property('name', 'lower-case');
        done();
      } catch(err) {
        done(err);
      }
    });
  });

  it('should be loaded in exported flow', function (done) {
    var flow = [{"id":"3912a37a.c3818c","type":"lower-case","z":"e316ac4b.c85a2","name":"lower-case","x":240,"y":320,"wires":[[]]}];
    helper.load(lowerNode, flow, function () {
      var n1 = helper.getNode("3912a37a.c3818c");
      try {
        n1.should.have.property('name', 'lower-case');
        done();
      } catch(err) {
        done(err);
      }
    });
  });

  it('should make payload lower case', function (done) {
    var flow = [
      { id: "n1", type: "lower-case", name: "test name",wires:[["n2"]] },
      { id: "n2", type: "helper" }
    ];
    helper.load(lowerNode, flow, function () {
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");
      n2.on("input", function (msg) {
        try {
          msg.should.have.property('payload', 'uppercase');
          done();
        } catch(err) {
          done(err);
        }
      });
      n1.receive({ payload: "UpperCase" });
    });
  });
  it('should modify the flow then lower case of payload', async function () {
      const flow = [
            { id: "n2", type: "helper" }
      ]
      await helper.load(lowerNode, flow)
      
      const newFlow = [...flow]
      newFlow.push( { id: "n1", type: "lower-case", name: "lower-case", wires:[['n2']] },)
      await helper.setFlows(newFlow)
      const n1 = helper.getNode('n1')
      n1.should.have.a.property('name', 'lower-case')
      await new Promise((resolve, reject) => {
        const n2 = helper.getNode('n2')
        n2.on('input', function (msg) {
            try {
                msg.should.have.property('payload', 'hello');
                resolve()
            } catch (err) {
                reject(err);
            }
        });
        n1.receive({ payload: 'HELLO' });
      });
  });
});
