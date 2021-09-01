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
'use strict';

const path = require("path");
const sinon = require("sinon");
const should = require('should');
const fs = require('fs');
require('should-sinon');
const request = require('supertest');
var bodyParser = require("body-parser");
const express = require("express");
const http = require('http');
const stoppable = require('stoppable');
const readPkgUp = require('read-pkg-up');
const semver = require('semver');
const EventEmitter = require('events').EventEmitter;

const PROXY_METHODS = ['log', 'status', 'warn', 'error', 'debug', 'trace', 'send'];

/**
 * Finds the NR runtime path by inspecting environment
 */
function findRuntimePath() {
    const upPkg = readPkgUp.sync();
    // case 1: we're in NR itself
    if (upPkg.packageJson.name === 'node-red') {
        if (checkSemver(upPkg.packageJson.version, "<0.20.0")) {
            return path.join(path.dirname(upPkg.path), upPkg.packageJson.main);
        } else {
            return path.join(path.dirname(upPkg.path), "packages", "node_modules", "node-red");
        }
    }
    // case 2: NR is resolvable from here
    try {
        return require.resolve('node-red');
    } catch (ignored) { }
    // case 3: NR is installed alongside node-red-node-test-helper
    if ((upPkg.packageJson.dependencies && upPkg.packageJson.dependencies['node-red']) ||
        (upPkg.packageJson.devDependencies && upPkg.packageJson.devDependencies['node-red'])) {
        const dirpath = path.join(path.dirname(upPkg.path), 'node_modules', 'node-red');
        try {
            const pkg = require(path.join(dirpath, 'package.json'));
            return path.join(dirpath, pkg.main);
        } catch (ignored) { }
    }
    // case 4: NR & NRNTH are git repos sat alongside each other
    try {
        const nrpkg = require("../node-red/package.json");
        return "../node-red/packages/node_modules/node-red"
    } catch (ignored) { }
}


// As we have prerelease tags in development version, they need stripping off
// before semver will do a sensible comparison with a range.
function checkSemver(localVersion, testRange) {
    var parts = localVersion.split("-");
    return semver.satisfies(parts[0], testRange);
}

class NodeTestHelper extends EventEmitter {
    constructor() {
        super();

        this._sandbox = sinon.createSandbox();

        this._address = '127.0.0.1';
        this._listenPort = 0; // ephemeral

        this._cache;
        this._nodeListeners = [];

        this.init();
    }

    _initRuntime(requirePath) {
        try {
            const RED = this._RED = require(requirePath);
            // public runtime API
            this._log = RED.log;
            // access internal Node-RED runtime methods
            let prefix = path.dirname(requirePath);
            if (checkSemver(RED.version(), "<0.20.0")) {
                this._settings = RED.settings;
                this._events = RED.events;
                this._redNodes = RED.nodes;
                this._context = require(path.join(prefix, 'runtime', 'nodes', 'context'));
                this._comms = require(path.join(prefix, 'api', 'editor', 'comms'));
                this.credentials = require(path.join(prefix, 'runtime', 'nodes', 'credentials'));
                // proxy the methods on Node.prototype to both be Sinon spies and asynchronously emit
                // information about the latest call
                this._NodePrototype = require(path.join(prefix, 'runtime', 'nodes', 'Node')).prototype;
            } else {
                if (!fs.existsSync(path.join(prefix, '@node-red/runtime/lib/nodes'))) {
                    // Not in the NR source tree, need to go hunting for the modules....
                    if (fs.existsSync(path.join(prefix, '..', 'node_modules', '@node-red/runtime/lib/nodes'))) {
                        // path/to/node_modules/node-red/lib
                        // path/to/node_modules/node-red/node_modules/@node-red
                        prefix = path.resolve(path.join(prefix, "..", "node_modules"));
                    } else if (fs.existsSync(path.join(prefix, '..', '..', '@node-red/runtime/lib/nodes'))) {
                        // path/to/node_modules/node-red/lib
                        // path/to/node_modules/@node-red
                        prefix = path.resolve(path.join(prefix, "..", ".."));
                    } else {
                        throw new Error("Cannot find the NR source tree. Path: '" + prefix + "'. Please raise an issue against node-red/node-red-node-test-helper with full details.");
                    }
                }

                this._redNodes = require(path.join(prefix, '@node-red/runtime/lib/nodes'));
                this._context = require(path.join(prefix, '@node-red/runtime/lib/nodes/context'));
                this._comms = require(path.join(prefix, '@node-red/editor-api/lib/editor/comms'));
                this._registryUtil = require(path.join(prefix, '@node-red/registry/lib/util'));
                this.credentials = require(path.join(prefix, '@node-red/runtime/lib/nodes/credentials'));
                // proxy the methods on Node.prototype to both be Sinon spies and asynchronously emit
                // information about the latest call
                this._NodePrototype = require(path.join(prefix, '@node-red/runtime/lib/nodes/Node')).prototype;
                this._settings = RED.settings;
                this._events = RED.runtime.events;

                this._nodeModules = [
                    require(path.join(prefix, '@node-red/nodes/core/common/25-catch.js')),
                    require(path.join(prefix, '@node-red/nodes/core/common/25-status.js')),
                    require(path.join(prefix, '@node-red/nodes/core/common/24-complete.js'))
                ];


            }
        } catch (ignored) {
            console.log(ignored);
            // ignore, assume init will be called again by a test script supplying the runtime path
        }
    }

    init(runtimePath, userSettings) {
        runtimePath = runtimePath || findRuntimePath();
        if (runtimePath) {
            this._initRuntime(runtimePath);
            if (userSettings) {
                this.settings(userSettings);
            }
        }
    }

    /**
     * Merges any userSettings with the defaults returned by `RED.settings`. Each
     * invocation of this method will overwrite the previous userSettings to prevent
     * unexpected problems in your tests.
     *
     * This will enable you to replicate your production environment within your tests,
     * for example where you're using the `functionGlobalContext` to enable extra node
     * modules within your functions.
     * @example
     * helper.settings({ functionGlobalContext: { os:require('os') } });
     * @param {Object} userSettings - an object containing the runtime settings
     * @return {Object} custom userSettings merged with default RED.settings
     */
    settings(userSettings) {
        if (userSettings) {
            // to prevent unexpected problems, always merge with the default RED.settings
            this._settings = Object.assign({}, this._RED.settings, userSettings);
        }
        return this._settings;
    }

    load(testNode, testFlow, testCredentials, cb) {
        const initLoad = () => {
            const log = this._log;
            const logSpy = this._logSpy = this._sandbox.spy(log, 'log');
            logSpy.FATAL = log.FATAL;
            logSpy.ERROR = log.ERROR;
            logSpy.WARN = log.WARN;
            logSpy.INFO = log.INFO;
            logSpy.DEBUG = log.DEBUG;
            logSpy.TRACE = log.TRACE;
            logSpy.METRIC = log.METRIC;

            const self = this;
            PROXY_METHODS.forEach(methodName => {
                const spy = this._sandbox.spy(self._NodePrototype, methodName);
                self._NodePrototype[methodName] = new Proxy(spy, {
                    apply: (target, thisArg, args) => {
                        const retval = Reflect.apply(target, thisArg, args);
                        process.nextTick(function (call) {
                            return () => {
                                self._NodePrototype.emit.call(thisArg, `call:${methodName}`, call);
                            }
                        }(spy.lastCall));
                        return retval;
                    }
                });
            });

            var storage = {
                getFlows: function () {
                    return Promise.resolve({ flows: testFlow, credentials: testCredentials });
                }
            };
            // this._settings.logging = {console:{level:'off'}};
            this._settings.available = function () { return false; }

            const redNodes = this._redNodes;
            this._httpAdmin = express();
            this._httpAdmin.use(bodyParser.json({ limit: '5mb' }));
            this._httpAdmin.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));

            const mockRuntime = {
                nodes: redNodes,
                events: this._events,
                util: this._RED.util,
                settings: this._settings,
                storage: storage,
                log: this._log,
                nodeApp: express(),
                adminApp: this._httpAdmin,
                library: { register: function () { } },
                get server() { return self._server }
            }

            redNodes.init(mockRuntime);
            redNodes.registerType("helper", function (n) {
                redNodes.createNode(this, n);
            });

            var red;
            if (this._registryUtil) {
                this._registryUtil.init(mockRuntime);
                red = this._registryUtil.createNodeApi({});
                red._ = v => v;
                red.settings = this._settings;
            } else {
                red = {
                    _: v => v
                };
                Object.keys(this._RED).filter(prop => !/^(init|start|stop)$/.test(prop))
                    .forEach(prop => {
                        const propDescriptor = Object.getOwnPropertyDescriptor(this._RED, prop);
                        Object.defineProperty(red, prop, propDescriptor);
                    });
            }

            if (!Array.isArray(testNode)) {
                testNode = [testNode];
            }
            let uniqueNodes = [...new Set(this._nodeModules.concat(testNode))];
            uniqueNodes.forEach(fn => fn(red));

            this._cache = redNodes.loadFlows()
                .then(redNodes.startFlows)
                .then(() => {
                    should.deepEqual(testFlow, redNodes.getFlows().flows);
                });
        }

        if (typeof testCredentials === 'function') {
            cb = testCredentials;
            testCredentials = {};
        }

        if (!this._cache) {
            initLoad();
        }

        return this._cache.then(() => {
            if (cb) cb();
        });
    }

    unload() {
        if (!this._cache) {
            return Promise.resolve();
        }
        this._cache = undefined;
        // TODO: any other state to remove between tests?
        this._redNodes.clearRegistry();
        this._logSpy.restore();
        this._sandbox.restore();

        // internal API
        this._context.clean({ allNodes: [] });
        return this._redNodes.stopFlows();
    }

    /**
     * Returns a Node by id.
     * @param {string} id - Node ID
     * @returns {Node}
     */
    getNode(id) {
        return this._redNodes.getNode(id);
    }

    clearFlows() {
        return this._redNodes.stopFlows();
    }

    request() {
        return request(this._httpAdmin);
    }

    startServer(done) {
        this._app = express();
        const server = stoppable(http.createServer((req, res) => {
            this._app(req, res);
        }), 0);

        this._RED.init(server, {
            logging: { console: { level: 'off' } }
        });
        server.listen(this._listenPort, this._address);
        server.on('listening', () => {
            this._port = server.address().port;
            // internal API
            this._comms.start();
            done();
        });
        this._server = server;
    }

    //TODO consider saving TCP handshake/server reinit on start/stop/start sequences
    stopServer(done) {
        if (this._server) {
            try {
                // internal API
                this._comms.stop();
                this._server.stop(done);
            } catch (e) {
                done();
            }
        } else {
            done();
        }
    }

    url() {
        return `http://${this._address}:${this._port}`;
    }

    log() {
        return this._logSpy;
    }

    addListener(id, cb) {
        const node = this.getNode(id);
        node.on("input", cb);
        this._nodeListeners.push({
            node,
            listener: cb,
        });
    }
    removeAllListeners() {
        this._nodeListeners.forEach((element) => {
            element.node.removeListener("input", element.listener);
        });
        this._nodeListeners = [];
    }

    restart(settings) {
        return this.unload()
            .then(() => {
                return new Promise(done => this.stopServer(done));
            })
            .then(() => {
                if (settings) {
                    this.settings(settings);
                }
                return new Promise(done => this.startServer(done));
            });
    }
}

module.exports = new NodeTestHelper();
module.exports.NodeTestHelper = NodeTestHelper;
