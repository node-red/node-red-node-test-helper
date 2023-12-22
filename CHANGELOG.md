#### 0.3.3

 - Add plugin stub to runtime (#73) @joepavitt
 - Use compatible versions rather than specific version of dependencies (#70) @Pezmc

#### 0.3.2
 
 - Fix async module loading (#65) @knolleary
 - Update README.md (#61) @andreasmarkussen

#### 0.3.1
 
 - Add support for async node modules (#63) @knolleary

#### 0.3.0

 - Require node.js >=14
 - Add `setFlows` so that node being tested can modify flows (#54) @Steve-Mcl

#### 0.2.7

 - Wait for startFlows to resolve before returning from loadFlow call - required with Node-RED 1.3+
 - README.md: Update example unit test to report assertion failures
 - examples: lower-case_spec.js: Allow proper assertion failure reporting (#45)

#### 0.2.6

 - Optionally preload catch/status/complete nodes in test cases Fixes #48

#### 0.2.5

 - Add proper middleware on httpAdmin express app

#### 0.2.4

 - Update dependencies
 - #43 Helper.load return a Promise

#### 0.2.3

 - Allow runtime settings to be provided in `helper.init(runtimepath, userSettings)`
 - Add `helper.settings(userSettings)`
