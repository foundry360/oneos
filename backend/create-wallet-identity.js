const { Wallets } = require('fabric-network');
const fs = require('fs').promises;
const path = require('path');

async function createWalletIdentity() {
  try {
    const walletPath = '/app/fabric-network/wallet';
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    
    // Read certificate and private key
    const userDir = path.join(walletPath, 'Admin@org1.example.com');
    const certPath = path.join(userDir, 'cert.pem');
    const keyPath = path.join(userDir, 'priv_sk');
    
    const cert = await fs.readFile(certPath, 'utf8');
    const key = await fs.readFile(keyPath, 'utf8');
    
    // Create identity object (fabric-network SDK format)
    const identity = {
      credentials: {
        certificate: cert,
        privateKey: key
      },
      mspId: 'Org1MSP',
      type: 'X.509'
    };
    
    // Import identity
    await wallet.import('Admin@org1.example.com', identity);
    
    console.log('Identity imported successfully');
    
    // Verify it was imported
    const user = await wallet.get('Admin@org1.example.com');
    console.log('User found after import:', !!user);
    if (user) {
      console.log('User type:', user.type);
      console.log('User MSP:', user.mspId);
    }
    
  } catch (error) {
    console.error('Error creating wallet identity:', error.message);
    console.error('Stack:', error.stack);
  }
}

createWalletIdentity();

