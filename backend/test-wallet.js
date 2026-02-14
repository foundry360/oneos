const { Wallets } = require('fabric-network');

async function testWallet() {
  try {
    const wallet = await Wallets.newFileSystemWallet('/app/fabric-network/wallet');
    console.log('Wallet created');
    
    const user = await wallet.get('Admin@org1.example.com');
    console.log('User found:', !!user);
    if (user) {
      console.log('User type:', user.type);
      console.log('User MSP:', user.mspId);
    } else {
      console.log('User not found');
      // List what's in the wallet
      const list = await wallet.list();
      console.log('Wallet contents:', list);
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testWallet();



