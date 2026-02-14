/*
 * External Chaincode Server
 * Runs chaincode as a service (bypasses Docker build issues on Windows)
 */

'use strict';

const { Gateway } = require('fabric-network');
const GovernanceLedger = require('./index');

// For external chaincode, we need to use the ChaincodeServer
// This is a simplified version - Fabric will handle the actual server setup
const { ChaincodeServer } = require('fabric-shim');

const server = ChaincodeServer({
    ccid: process.env.CHAINCODE_ID || 'governance-ledger:1.0',
    address: process.env.CHAINCODE_SERVER_ADDRESS || '0.0.0.0:9999',
    cc: GovernanceLedger
});

server.start();



