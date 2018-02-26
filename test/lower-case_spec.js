var should = require("should");
var helper = require("../index.js");
var lowerNode = require("./examples/lower-case.js");

describe('lower-case Node', function () {

  afterEach(function () {
    helper.unload();
  });

  it('should be loaded', function (done) {

    // Exported flow pasted as JSON string
    var flow = '[{"id":"3912a37a.c3818c","type":"lower-case","z":"e316ac4b.c85a2","name":"lower-case","x":240,"y":320,"wires":[[]]}]';

    helper.load(lowerNode, flow, function () {
      var n1 = helper.getNode("3912a37a.c3818c");
      n1.should.have.property('name', 'lower-case');
      done();
    });
  });

  it('should make payload lower case', function (done) {

    // Exported flow pasted as Javascript
    var flow = [{"id":"3912a37a.c3818c","type":"lower-case","z":"e316ac4b.c85a2",
                    "name":"lower-case","x":240,"y":320,"wires":[["7b57d83e.378fd8"]]},
                {"id":"7b57d83e.378fd8","type":"debug","z":"e316ac4b.c85a2","name":"",
                    "active":true,"tosidebar":true,"console":false,"tostatus":false,
                    "complete":"true","x":400,"y":340,"wires":[]}];

    helper.load(lowerNode, flow, function () {
      var n2 = helper.getNode("7b57d83e.378fd8");
      var n1 = helper.getNode("3912a37a.c3818c");
      n2.on("input", function (msg) {
        msg.should.have.property('payload', 'uppercase');
        done();
      });
      n1.receive({ payload: "UpperCase" });
    });
  });
});
