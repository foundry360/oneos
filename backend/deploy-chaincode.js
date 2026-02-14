const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs').promises;
const path = require('path');

async function deployChaincode() {
  let gateway;
  try {
    // Load connection profile
    const connectionProfilePath = '/app/fabric-network/connection-profile.json';
    const connectionProfile = JSON.parse(await fs.readFile(connectionProfilePath, 'utf8'));
    
    // Create wallet
    const wallet = await Wallets.newFileSystemWallet('/app/fabric-network/wallet');
    const userExists = await wallet.get('Admin@org1.example.com');
    
    if (!userExists) {
      console.error('Admin user not found in wallet');
      return;
    }
    
    console.log('Connecting to gateway...');
    gateway = new Gateway();
    await gateway.connect(connectionProfile, {
      wallet,
      identity: 'Admin@org1.example.com',
      discovery: { enabled: true, asLocalhost: true }
    });
    
    const network = await gateway.getNetwork('governance-channel');
    console.log('Connected to network');
    
    // Check if chaincode is already deployed
    const contract = network.getContract('governance-ledger');
    try {
      await contract.evaluateTransaction('QueryLedgerEntry', 'test', '');
      console.log('Chaincode is already deployed and working');
      return;
    } catch (e) {
      console.log('Chaincode not yet deployed or not accessible');
    }
    
    console.log('Note: Chaincode deployment requires peer CLI commands.');
    console.log('The chaincode needs to be installed and approved using peer commands.');
    console.log('This script can only verify connectivity.');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (gateway) {
      await gateway.disconnect();
    }
  }
}

deployChaincode();



