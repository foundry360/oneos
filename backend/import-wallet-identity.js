const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const walletPath = process.env.FABRIC_WALLET_PATH || '/app/fabric-network/wallet';
    const userId = process.env.FABRIC_USER_ID || 'Admin@org1.example.com';
    
    console.log('Importing identity into wallet...');
    console.log('Wallet path:', walletPath);
    console.log('User ID:', userId);
    
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    
    // Read certificate and key from crypto-config
    const certPath = '/app/fabric-network/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem';
    const keyPath = '/app/fabric-network/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore';
    
    // Find the key file
    const keyFiles = fs.readdirSync(keyPath).filter(f => f.endsWith('_sk'));
    if (keyFiles.length === 0) {
      throw new Error('No private key file found');
    }
    const actualKeyPath = path.join(keyPath, keyFiles[0]);
    
    const cert = fs.readFileSync(certPath, 'utf8').trim();
    const key = fs.readFileSync(actualKeyPath, 'utf8').trim();
    
    console.log('Certificate read, length:', cert.length);
    console.log('Private key read, length:', key.length);
    
    // Create identity object directly
    const identity = {
      credentials: {
        certificate: cert,
        privateKey: key
      },
      mspId: 'Org1MSP',
      type: 'X.509'
    };
    
    // Put identity into wallet
    await wallet.put(userId, identity);
    
    console.log('✅ Identity imported successfully');
    
    // Verify
    const imported = await wallet.get(userId);
    if (imported) {
      console.log('✅ Verification successful - Identity found in wallet');
      console.log('MSP ID:', imported.mspId);
      console.log('Type:', imported.type);
    } else {
      console.log('❌ Verification failed - Identity not found');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
})();

