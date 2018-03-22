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
var sinon = require("sinon");
var when = require("when");
var request = require('supertest');
var express = require("express");
var http = require('http');
var stoppable = require('stoppable');

var RED;
var redNodes;
var flows;
var credentials;
var comms;
var log;
var context;
var events;

function initRuntime(requirePath) {

    try {
        RED = require(requirePath);
        var prefix = requirePath.substring(0, requirePath.indexOf('/red.js'));
        redNodes = require(prefix+"/runtime/nodes");
        flows = require(prefix+"/runtime/nodes/flows");
        credentials = require(prefix+"/runtime/nodes/credentials");
        comms = require(prefix+"/api/editor/comms");
        log = require(prefix+"/runtime/log");
        context = require(prefix+"/runtime/nodes/context");
        events = require(prefix+"/runtime/events");
    } catch (err) {
        // ignore, assume init will be called again by a test script supplying the runtime path
    }
}

// assume we have node red as a dependency
try {
    var runtimePath = require.resolve('node-red');
} catch (err) {
    // if not, we are running in the core
    runtimePath = process.cwd()+"/red/red.js";
}

initRuntime(runtimePath);

var app = express();

var address = '127.0.0.1';
var listenPort = 0; // use ephemeral port
var port;
var url;
var logSpy;
var server;

function helperNode(n) {
    RED.nodes.createNode(this, n);
}

module.exports = {
    init: initRuntime,
    load: function(testNode, testFlow, testCredentials, cb) {
        var i;

        logSpy = sinon.spy(log,"log");
        logSpy.FATAL = log.FATAL;
        logSpy.ERROR = log.ERROR;
        logSpy.WARN = log.WARN;
        logSpy.INFO = log.INFO;
        logSpy.DEBUG = log.DEBUG;
        logSpy.TRACE = log.TRACE;
        logSpy.METRIC = log.METRIC;

        if (typeof testCredentials === 'function') {
            cb = testCredentials;
            testCredentials = {};
        }

        var storage = {
            getFlows: function() {
                return when.resolve({flows:testFlow,credentials:testCredentials});
            }
        };

        var settings = {
            available: function() { return false; }
        };

        var red = {};
        for (i in RED) {
            if (RED.hasOwnProperty(i) && !/^(init|start|stop)$/.test(i)) {
                var propDescriptor = Object.getOwnPropertyDescriptor(RED,i);
                Object.defineProperty(red,i,propDescriptor);
            }
        }

        red["_"] = function(messageId) {
            return messageId;
        };

        redNodes.init({events:events,settings:settings, storage:storage,log:log,});
        RED.nodes.registerType("helper", helperNode);
        if (Array.isArray(testNode)) {
            for (i = 0; i < testNode.length; i++) {
                testNode[i](red);
            }
        } else {
            testNode(red);
        }
        flows.load().then(function() {
            flows.startFlows();
            should.deepEqual(testFlow, flows.getFlows().flows);
            cb();
        });
    },

    unload: function() {
        // TODO: any other state to remove between tests?
        redNodes.clearRegistry();
        logSpy.restore();
        context.clean({allNodes:[]});
        return flows.stopFlows();
    },

    getNode: function(id) {
        return flows.get(id);
    },

    credentials: credentials,

    clearFlows: function() {
        return flows.stopFlows();
    },

    request: function() {
        return request(RED.httpAdmin);
    },

    startServer: function(done) {
        server = stoppable(http.createServer(function(req,res) { app(req,res); }), 0);

        RED.init(server, {
            SKIP_BUILD_CHECK: true,
            logging:{console:{level:'off'}}
        });
        server.listen(listenPort, address);
        server.on('listening', function() {
            port = server.address().port;
            url = 'http://' + address + ':' + port;
            comms.start();
            done();
        });
    },

    //TODO consider saving TCP handshake/server reinit on start/stop/start sequences
    stopServer: function(done) {
        if (server) {
            try {
                comms.stop();
                server.stop(done);
            } catch(e) {
                done();
            }
        } else {
            done();
        }
    },

    url: function() { return url; },

    log: function() { return logSpy;}
};
