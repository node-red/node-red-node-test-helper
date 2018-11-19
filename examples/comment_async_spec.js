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
var helper = require("../index.js");
helper.init(require.resolve('node-red'));

var commentNode = require("./nodes/90-comment.js");

describe('comment Node', function() {

    afterEach(async function() {
        await helper.unload();
    });

    it('should be loaded', async function() {
        var flow = [{id:"n1", type:"comment", name: "comment" }];
        await helper.load(commentNode, flow);
        var n1 = helper.getNode("n1");
        n1.should.have.property('name', 'comment');
    });

});
