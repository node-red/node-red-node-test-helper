const path = require("path");
const helper = require("../index.js");
helper.init(require.resolve('node-red'));

describe("flow test", () => {
    let flow;
    let inputNodeIds = [];
    let outputNodeIds = [];

    before(() => {
        flow = require("./flows/flows.json");
        flow.forEach((node) => {
            if (node.type === "inject") {
                inputNodeIds.push(node.id);
                node.type = "helper";
            }
            if (node.type === "debug") {
                outputNodeIds.push(node.id);
                node.type = "helper";
            }
        });
        console.log(inputNodeIds.length)
        console.log(outputNodeIds.length)
    });

    const requiredNodes = [
        require("../node_modules/@node-red/nodes/core/common/20-inject.js"),
        require("../node_modules/@node-red/nodes/core/common/21-debug.js"),
        require("../node_modules/@node-red/nodes/core/function/10-function.js"),
        require("../node_modules/@node-red/nodes/core/function/rbe.js"),
    ];

    describe(("Without cache"), () => {
        beforeEach((done) => {
            helper.startServer(done);
        });

        afterEach((done) => {
            helper.unload()
                .then(() => helper.stopServer(done));
        });

        for (let i = 0; i < 100; i++) {
            it(`should succeed ${i}`, (done) => {
                helper.load(requiredNodes, flow, () => {
                    const listener = (msg) => {
                        try {
                            should(msg.payload).be.exactly(12345);
                            done();
                        } catch (e) {
                            done(e);
                        }
                    };
                    helper.addListener(outputNodeIds[i], listener);

                    const inputNode = helper.getNode(inputNodeIds[i]);
                    inputNode.send({ payload: 12345 });
                });
            });
        }
    });

    describe(("With cache"), () => {
        before((done) => {
            helper.startServer(done);
        });

        afterEach(() => {
            helper.removeAllListeners();
        });

        after((done) => {
            helper.unload()
                .then(() => helper.stopServer(done));
        });

        for (let i = 0; i < 160; i++) {
            it(`should succeed ${i}`, (done) => {
                helper.load(requiredNodes, flow, () => {
                    const listener = (msg) => {
                        try {
                            should(msg.payload).be.exactly(12345);
                            done();
                        } catch (e) {
                            done(e);
                        }
                    };
                    helper.addListener(outputNodeIds[i], listener);

                    const inputNode = helper.getNode(inputNodeIds[i]);
                    inputNode.send({ payload: 12345 });
                });
            });
        }

        it(`should block the same value (rbe node)`, (done) => {
            helper.restart().then(() => {
                helper.load(requiredNodes, flow, () => {
                    let count = 0;
                    const listener = (msg) => {
                        try {
                            count++;
                            if (count === 1 && count === 3) {
                                should(msg.payload).be.exactly(12345);
                            } else if (count === 2) {
                                should(msg.payload).be.exactly(123456);
                            }
                            if (count === 3) {
                                done();
                            }
                        } catch (e) {
                            done(e);
                        }
                    };
                    const outputNodeId = "1002a90a.f17117";
                    helper.addListener(outputNodeId, listener);

                    const inputNodeId = "f8321156.33691";
                    const inputNode = helper.getNode(inputNodeId);
                    inputNode.send({ payload: 12345 });
                    inputNode.send({ payload: 12345 });
                    inputNode.send({ payload: 123456 });
                    inputNode.send({ payload: 123456 });
                    inputNode.send({ payload: 12345 });
                });
            });
        });
    });
});