const { Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const path = require('path');

async function enrollUser() {
  try {
    const walletPath = '/app/fabric-network/wallet';
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    
    // Check if user already exists
    const userExists = await wallet.get('Admin@org1.example.com');
    if (userExists) {
      console.log('User already exists in wallet');
      return;
    }
    
    // Read CA certificate
    const caCertPath = '/app/fabric-network/crypto-config/peerOrganizations/org1.example.com/ca/ca.org1.example.com-cert.pem';
    if (!fs.existsSync(caCertPath)) {
      console.error('CA certificate not found at:', caCertPath);
      return;
    }
    
    const caCert = fs.readFileSync(caCertPath);
    
    // Create CA client
    const caURL = 'http://fabric-ca:7054';
    const ca = new FabricCAServices(caURL, {
      trustedRoots: caCert,
      verify: false
    }, 'ca.org1.example.com');
    
    // Enroll admin user
    const enrollment = await ca.enroll({
      enrollmentID: 'admin',
      enrollmentSecret: 'adminpw'
    });
    
    // Create identity
    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes()
      },
      mspId: 'Org1MSP',
      type: 'X.509'
    };
    
    // Import to wallet
    await wallet.put('Admin@org1.example.com', x509Identity);
    console.log('Successfully enrolled and imported Admin user');
    
    // Verify
    const user = await wallet.get('Admin@org1.example.com');
    console.log('User found after enrollment:', !!user);
    
  } catch (error) {
    console.error('Error enrolling user:', error.message);
    console.error('Stack:', error.stack);
  }
}

enrollUser();



