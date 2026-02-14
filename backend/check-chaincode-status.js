const fabricService = require('./src/services/fabricService');

async function checkChaincodeStatus() {
  try {
    console.log('Checking chaincode status...\n');
    
    // Check if Fabric is available
    const isAvailable = await fabricService.isAvailable();
    console.log(`Fabric Available: ${isAvailable ? '✅ YES' : '❌ NO'}`);
    
    if (!isAvailable) {
      console.log('\nFabric is not available. Check:');
      console.log('1. FABRIC_ENABLED=true in environment');
      console.log('2. Connection profile exists');
      console.log('3. Wallet exists with user identity');
      return;
    }
    
    // Get channel info
    console.log('\n--- Channel Info ---');
    try {
      const channelInfo = await fabricService.getChannelInfo();
      console.log(`Channel Name: ${channelInfo.channelName}`);
      console.log(`Block Height: ${channelInfo.height || 'Unknown'}`);
      console.log(`Current Block Hash: ${channelInfo.currentBlockHash || 'N/A'}`);
    } catch (error) {
      console.log(`❌ Error getting channel info: ${error.message}`);
    }
    
    // Get chaincode info
    console.log('\n--- Chaincode Info ---');
    try {
      const chaincodeInfo = await fabricService.getChaincodeInfo();
      console.log(`Chaincode Name: ${chaincodeInfo.name}`);
      console.log(`Version: ${chaincodeInfo.version}`);
      console.log(`Status: ${chaincodeInfo.status}`);
      console.log(`Channel: ${chaincodeInfo.channel}`);
    } catch (error) {
      console.log(`❌ Error getting chaincode info: ${error.message}`);
    }
    
    // Try to query a transaction to verify chaincode is active
    console.log('\n--- Testing Chaincode Query ---');
    try {
      // Try to query an entry (this will fail if chaincode is not active, but won't fail if no entries exist)
      await fabricService.queryLedgerEntry('test', 'test');
      console.log('✅ Chaincode is active and responding');
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        console.log('✅ Chaincode is active (no entries found, which is expected)');
      } else if (error.message.includes('not found') || error.message.includes('chaincode')) {
        console.log('❌ Chaincode may not be deployed or active');
        console.log(`   Error: ${error.message}`);
      } else {
        console.log(`⚠️  Chaincode query returned: ${error.message}`);
      }
    }
    
    // Get transactions
    console.log('\n--- Recent Transactions ---');
    try {
      const transactions = await fabricService.getTransactions(10);
      console.log(`Found ${transactions.length} transactions`);
      
      if (transactions.length === 0) {
        console.log('No transactions found. This could mean:');
        console.log('1. Chaincode is deployed but no transactions have been submitted yet');
        console.log('2. Chaincode is not active');
        console.log('3. Channel has no blocks yet');
      } else {
        console.log('\nRecent transactions:');
        transactions.slice(0, 5).forEach((tx, index) => {
          console.log(`\n${index + 1}. Transaction ${tx.txId.substring(0, 16)}...`);
          console.log(`   Function: ${tx.functionName}`);
          console.log(`   Status: ${tx.status}`);
          console.log(`   Block: ${tx.blockNumber}`);
          console.log(`   Timestamp: ${new Date(tx.timestamp).toLocaleString()}`);
        });
      }
    } catch (error) {
      console.log(`❌ Error getting transactions: ${error.message}`);
      console.log(`   This might indicate chaincode is not active or channel has no blocks`);
    }
    
  } catch (error) {
    console.error('Error checking chaincode status:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

checkChaincodeStatus();


