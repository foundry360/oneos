const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

// Lazy load fabric-network to avoid crashing if module is not installed
let Gateway, Wallets;
function loadFabricNetwork() {
  if (!Gateway || !Wallets) {
    try {
      const fabricNetwork = require('fabric-network');
      Gateway = fabricNetwork.Gateway;
      Wallets = fabricNetwork.Wallets;
    } catch (error) {
      logger.warn('fabric-network module not available', { error: error.message });
      return false;
    }
  }
  return true;
}

/**
 * Hyperledger Fabric Service
 * Handles blockchain transactions for immutable audit logs
 */
class FabricService {
  constructor() {
    this.channelName = process.env.FABRIC_CHANNEL_NAME || 'governance-channel';
    this.chaincodeName = process.env.FABRIC_CHAINCODE_NAME || 'governance-ledger';
    this.connectionProfilePath = process.env.FABRIC_CONNECTION_PROFILE || 
      '/app/fabric-network/connection-profile.json';
    this.walletPath = process.env.FABRIC_WALLET_PATH || 
      '/app/fabric-network/wallet';
    this.userId = process.env.FABRIC_USER_ID || 'Admin@org1.example.com';
    this.isEnabled = process.env.FABRIC_ENABLED === 'true';
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fabricService.js:19',message:'FabricService constructor',data:{fabricEnabled:process.env.FABRIC_ENABLED,isEnabled:this.isEnabled,connectionProfilePath:this.connectionProfilePath,walletPath:this.walletPath,userId:this.userId,channelName:this.channelName,chaincodeName:this.chaincodeName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
  }

  /**
   * Check if Fabric is enabled and configured
   */
  async isAvailable() {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fabricService.js:25',message:'isAvailable entry',data:{isEnabled:this.isEnabled},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (!this.isEnabled) {
      logger.debug('Fabric is disabled (FABRIC_ENABLED is not "true")');
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fabricService.js:27',message:'isAvailable disabled',data:{isEnabled:this.isEnabled,fabricEnabledEnv:process.env.FABRIC_ENABLED},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return false;
    }
    
    try {
      // Check if connection profile exists
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fabricService.js:33',message:'Checking connection profile',data:{connectionProfilePath:this.connectionProfilePath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      await fs.access(this.connectionProfilePath);
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fabricService.js:34',message:'Connection profile exists',data:{connectionProfilePath:this.connectionProfilePath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      // Check if wallet directory exists
      try {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fabricService.js:37',message:'Checking wallet directory',data:{walletPath:this.walletPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        await fs.access(this.walletPath);
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fabricService.js:38',message:'Wallet directory exists',data:{walletPath:this.walletPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
      } catch (walletError) {
        logger.warn('Fabric wallet not found', { 
          path: this.walletPath,
          error: walletError.message 
        });
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fabricService.js:42',message:'Wallet directory not found',data:{walletPath:this.walletPath,error:walletError.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        return false;
      }
      
      // Check if user exists in wallet
      try {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fabricService.js:48',message:'Checking user in wallet',data:{userId:this.userId,walletPath:this.walletPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        if (!loadFabricNetwork()) {
          return false;
        }
        const wallet = await Wallets.newFileSystemWallet(this.walletPath);
        const userExists = await wallet.get(this.userId);
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fabricService.js:50',message:'User check result',data:{userId:this.userId,userExists:!!userExists},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        if (!userExists) {
          logger.warn('Fabric user not found in wallet', { 
            userId: this.userId,
            walletPath: this.walletPath 
          });
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fabricService.js:55',message:'User not found in wallet',data:{userId:this.userId,walletPath:this.walletPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          return false;
        }
      } catch (walletError) {
        logger.warn('Failed to check wallet', { 
          error: walletError.message,
          walletPath: this.walletPath 
        });
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fabricService.js:62',message:'Wallet check failed',data:{error:walletError.message,walletPath:this.walletPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        return false;
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fabricService.js:65',message:'isAvailable returning true',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      return true;
    } catch (error) {
      logger.warn('Fabric connection profile not found', { 
        path: this.connectionProfilePath,
        error: error.message 
      });
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fabricService.js:71',message:'Connection profile check failed',data:{connectionProfilePath:this.connectionProfilePath,error:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return false;
    }
  }

  /**
   * Submit a transaction to the blockchain
   * @param {string} functionName - Chaincode function name
   * @param {Array} args - Function arguments
   * @returns {Promise<object>} Transaction result
   */
  async submitTransaction(functionName, ...args) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fabricService.js:82',message:'submitTransaction entry',data:{functionName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    if (!await this.isAvailable()) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fabricService.js:83',message:'submitTransaction not available',data:{functionName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      throw new Error('Fabric is not available or not enabled');
    }

    let gateway;
    try {
      if (!loadFabricNetwork()) {
        throw new Error('fabric-network module is not available');
      }
      // Load connection profile
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fabricService.js:90',message:'Loading connection profile',data:{connectionProfilePath:this.connectionProfilePath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      const connectionProfile = JSON.parse(
        await fs.readFile(this.connectionProfilePath, 'utf8')
      );
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fabricService.js:94',message:'Connection profile loaded',data:{hasPeers:!!connectionProfile.peers,hasOrganizations:!!connectionProfile.organizations},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion

      // Create wallet
      const wallet = await Wallets.newFileSystemWallet(this.walletPath);

      // Check if user exists in wallet
      const userExists = await wallet.get(this.userId);
      if (!userExists) {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fabricService.js:100',message:'User not in wallet in submitTransaction',data:{userId:this.userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        throw new Error(`User ${this.userId} does not exist in wallet`);
      }
      // #region agent log
      const identityInfo = {
        mspId: userExists.mspId,
        type: userExists.type,
        certLength: userExists.credentials?.certificate?.length || 0,
        keyLength: userExists.credentials?.privateKey?.length || 0
      };
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fabricService.js:178',message:'Identity from wallet',data:identityInfo,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
      // #endregion

      // Create gateway connection
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fabricService.js:105',message:'Connecting gateway',data:{userId:this.userId,channelName:this.channelName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      gateway = new Gateway();
      // #region agent log
      const connectOptions = {
        wallet,
        identity: this.userId,
        discovery: { enabled: false, asLocalhost: true }
      };
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fabricService.js:185',message:'Connecting gateway with options',data:{userId:this.userId,channelName:this.channelName,hasWallet:!!wallet,identityMspId:userExists?.mspId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
      // #endregion
      await gateway.connect(connectionProfile, connectOptions);
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fabricService.js:192',message:'Gateway connected',data:{channelName:this.channelName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion

      // Get network and contract
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fabricService.js:114',message:'Getting network',data:{channelName:this.channelName,chaincodeName:this.chaincodeName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      const network = await gateway.getNetwork(this.channelName);
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fabricService.js:199',message:'Network obtained',data:{channelName:this.channelName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
      const contract = network.getContract(this.chaincodeName);
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fabricService.js:201',message:'Contract obtained',data:{chaincodeName:this.chaincodeName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
      // #endregion

      // Submit transaction
      logger.info('Submitting Fabric transaction', {
        functionName,
        args: args.map(a => typeof a === 'string' && a.length > 100 ? a.substring(0, 100) + '...' : a)
      });
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fabricService.js:210',message:'Submitting transaction',data:{functionName,chaincodeName:this.chaincodeName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
      // #endregion

      const result = await contract.submitTransaction(functionName, ...args);
      const resultString = result.toString('utf8');
      
      logger.info('Fabric transaction submitted successfully', {
        functionName,
        transactionId: resultString.substring(0, 50)
      });

      return {
        success: true,
        transactionId: resultString,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Fabric transaction failed', {
        error: error.message,
        functionName,
        stack: error.stack
      });
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fabricService.js:139',message:'Fabric transaction error',data:{error:error.message,functionName,errorCode:error.code,errorName:error.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      throw error;
    } finally {
      if (gateway) {
        await gateway.disconnect();
      }
    }
  }

  /**
   * Store a ledger entry on the blockchain
   * @param {string} entityId - Entity ID (profile ID, review task ID, etc.)
   * @param {string} action - Action type (PROFILE_EXPORTED, REVIEW_APPROVED, etc.)
   * @param {string} hashValue - Hash value (version hash, artifact hash, etc.)
   * @param {object} metadata - Additional metadata
   * @returns {Promise<object>} Transaction result
   */
  async storeLedgerEntry(entityId, action, hashValue, metadata = {}) {
    try {
      const entryData = {
        entityId,
        action,
        hashValue,
        timestamp: new Date().toISOString(),
        metadata
      };

      const entryJson = JSON.stringify(entryData);
      
      return await this.submitTransaction(
        'StoreLedgerEntry',
        entityId,
        action,
        hashValue,
        entryJson
      );
    } catch (error) {
      logger.error('Failed to store ledger entry on blockchain', {
        error: error.message,
        entityId,
        action
      });
      throw error;
    }
  }

  /**
   * Query a ledger entry from the blockchain
   * @param {string} entityId - Entity ID
   * @param {string} action - Action type (optional)
   * @returns {Promise<object>} Ledger entry
   */
  async queryLedgerEntry(entityId, action = null) {
    if (!await this.isAvailable()) {
      throw new Error('Fabric is not available or not enabled');
    }

    let gateway;
    try {
      if (!loadFabricNetwork()) {
        throw new Error('fabric-network module is not available');
      }
      const connectionProfile = JSON.parse(
        await fs.readFile(this.connectionProfilePath, 'utf8')
      );

      const wallet = await Wallets.newFileSystemWallet(this.walletPath);
      const userExists = await wallet.get(this.userId);
      if (!userExists) {
        throw new Error(`User ${this.userId} does not exist in wallet`);
      }

      gateway = new Gateway();
      await gateway.connect(connectionProfile, {
        wallet,
        identity: this.userId,
        discovery: { enabled: false, asLocalhost: true }
      });

      const network = await gateway.getNetwork(this.channelName);
      const contract = network.getContract(this.chaincodeName);

      const result = await contract.evaluateTransaction(
        'QueryLedgerEntry',
        entityId,
        action || ''
      );

      return JSON.parse(result.toString('utf8'));
    } catch (error) {
      logger.error('Failed to query ledger entry from blockchain', {
        error: error.message,
        entityId,
        action
      });
      throw error;
    } finally {
      if (gateway) {
        await gateway.disconnect();
      }
    }
  }

  /**
   * Get channel information
   * @returns {Promise<object>} Channel info
   */
  async getChannelInfo() {
    if (!await this.isAvailable()) {
      throw new Error('Fabric is not available or not enabled');
    }

    let gateway;
    try {
      if (!loadFabricNetwork()) {
        throw new Error('fabric-network module is not available');
      }
      const connectionProfile = JSON.parse(
        await fs.readFile(this.connectionProfilePath, 'utf8')
      );

      const wallet = await Wallets.newFileSystemWallet(this.walletPath);
      const userExists = await wallet.get(this.userId);
      if (!userExists) {
        throw new Error(`User ${this.userId} does not exist in wallet`);
      }

      gateway = new Gateway();
      await gateway.connect(connectionProfile, {
        wallet,
        identity: this.userId,
        discovery: { enabled: false, asLocalhost: true }
      });

      const network = await gateway.getNetwork(this.channelName);
      
      // Get channel info (simplified version)
      return {
        channelName: this.channelName,
        height: 0, // Would need to query peer directly for this
        currentBlockHash: null
      };
    } catch (error) {
      logger.error('Failed to get channel info', { error: error.message });
      throw error;
    } finally {
      if (gateway) {
        await gateway.disconnect();
      }
    }
  }

  /**
   * Get chaincode information
   * @returns {Promise<object>} Chaincode info
   */
  async getChaincodeInfo() {
    return {
      name: this.chaincodeName,
      version: '1.0',
      status: 'active',
      channel: this.channelName
    };
  }

  /**
   * Get recent transactions from the blockchain
   * @param {number} limit - Maximum number of transactions to return
   * @returns {Promise<Array>} Array of transaction objects
   */
  async getTransactions(limit = 50) {
    if (!await this.isAvailable()) {
      throw new Error('Fabric is not available or not enabled');
    }

    let gateway;
    try {
      if (!loadFabricNetwork()) {
        throw new Error('fabric-network module is not available');
      }
      const connectionProfile = JSON.parse(
        await fs.readFile(this.connectionProfilePath, 'utf8')
      );

      const wallet = await Wallets.newFileSystemWallet(this.walletPath);
      const userExists = await wallet.get(this.userId);
      if (!userExists) {
        throw new Error(`User ${this.userId} does not exist in wallet`);
      }

      gateway = new Gateway();
      await gateway.connect(connectionProfile, {
        wallet,
        identity: this.userId,
        discovery: { enabled: false, asLocalhost: true }
      });

      const network = await gateway.getNetwork(this.channelName);
      const channel = network.getChannel();
      
      // Get channel info to determine block height
      const channelInfo = await channel.queryInfo();
      const height = channelInfo.height.toNumber();
      
      const transactions = [];
      const blocksToQuery = Math.min(10, height - 1); // Query last 10 blocks or all if less
      
      // Query blocks from newest to oldest
      for (let i = 0; i < blocksToQuery && transactions.length < limit; i++) {
        try {
          const blockNumber = height - 1 - i;
          if (blockNumber < 0) break;
          
          const block = await channel.queryBlock(blockNumber);
          
          if (block && block.data && block.data.data) {
            // Extract transactions from block
            for (const envelope of block.data.data) {
              if (envelope.payload && envelope.payload.data && envelope.payload.data.actions) {
                for (const action of envelope.payload.data.actions) {
                  if (action.payload && action.payload.chaincode_proposal_payload) {
                    const chaincodeProposalPayload = action.payload.chaincode_proposal_payload;
                    const chaincodeInput = chaincodeProposalPayload.input;
                    
                    if (chaincodeInput && chaincodeInput.chaincode_spec) {
                      const chaincodeSpec = chaincodeInput.chaincode_spec;
                      const input = chaincodeSpec.input;
                      
                      const txId = envelope.payload.header.channel_header.tx_id;
                      const timestamp = new Date(envelope.payload.header.channel_header.timestamp.seconds.toNumber() * 1000);
                      const creator = action.header.creator.creator;
                      const chaincodeName = chaincodeSpec.chaincode_id.name;
                      const functionName = input && input.args && input.args.length > 0 
                        ? input.args[0].toString('utf8') 
                        : 'unknown';
                      
                      // Get transaction validation code
                      const validationCode = block.metadata && block.metadata.metadata 
                        ? block.metadata.metadata[2] 
                        : null;
                      const status = validationCode === 0 ? 'VALID' : 'INVALID';
                      
                      transactions.push({
                        txId,
                        timestamp: timestamp.toISOString(),
                        creator: creator ? Buffer.from(creator).toString('base64').substring(0, 20) : 'unknown',
                        chaincodeName,
                        functionName,
                        status,
                        blockNumber: blockNumber
                      });
                      
                      if (transactions.length >= limit) break;
                    }
                  }
                }
              }
            }
          }
        } catch (blockError) {
          logger.warn('Failed to query block', { 
            blockNumber: height - 1 - i, 
            error: blockError.message 
          });
          // Continue with next block
        }
      }
      
      // Sort by timestamp (newest first)
      transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      return transactions.slice(0, limit);
    } catch (error) {
      logger.error('Failed to get transactions', { error: error.message });
      throw error;
    } finally {
      if (gateway) {
        await gateway.disconnect();
      }
    }
  }
}

module.exports = new FabricService();

