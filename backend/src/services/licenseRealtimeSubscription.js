const { createClient } = require('@supabase/supabase-js');
const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Realtime subscription service for license status updates from Supabase
 * Listens to vendor_api_keys table changes and syncs to local PostgreSQL
 */
class LicenseRealtimeSubscription {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_VENDOR_URL || process.env.SUPABASE_URL;
    // Use service key for Realtime subscriptions (anon key may not have permissions)
    this.supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    this.supabase = null;
    this.channel = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 5000; // 5 seconds
  }

  /**
   * Initialize Supabase client
   */
  initialize() {
    logger.info('Initializing Realtime subscription', {
      hasUrl: !!this.supabaseUrl,
      hasKey: !!this.supabaseKey,
      url: this.supabaseUrl ? this.supabaseUrl.substring(0, 30) + '...' : 'missing'
    });
    
    if (!this.supabaseUrl || !this.supabaseKey) {
      logger.warn('Supabase credentials not configured. Realtime subscription disabled.', {
        hasUrl: !!this.supabaseUrl,
        hasKey: !!this.supabaseKey,
        envVars: {
          SUPABASE_VENDOR_URL: !!process.env.SUPABASE_VENDOR_URL,
          SUPABASE_URL: !!process.env.SUPABASE_URL,
          SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
          SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY
        }
      });
      return false;
    }

    try {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'licenseRealtimeSubscription.js:45',message:'Creating Supabase client',data:{url:this.supabaseUrl?.substring(0,30)+'...',keyPrefix:this.supabaseKey?.substring(0,10)+'...',keyLength:this.supabaseKey?.length},timestamp:Date.now(),runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      this.supabase = createClient(this.supabaseUrl, this.supabaseKey, {
        realtime: {
          params: {
            eventsPerSecond: 10
          },
          logLevel: 'info',
          logger: (kind, msg, data) => {
            // Extract error details from ErrorEvent or Error objects
            let errorDetails = data;
            if (data instanceof Error) {
              errorDetails = {
                message: data.message,
                name: data.name,
                stack: data.stack,
                code: data.code
              };
            } else if (data && typeof data === 'object' && data.type === 'error') {
              // ErrorEvent object
              errorDetails = {
                type: data.type,
                message: data.message || msg,
                error: data.error ? {
                  message: data.error.message,
                  name: data.error.name,
                  stack: data.error.stack
                } : null,
                target: data.target ? String(data.target) : null
              };
            }
            
            // #region agent log
            fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'licenseRealtimeSubscription.js:56',message:'Realtime logger',data:{kind,msg,errorDetails:JSON.stringify(errorDetails),dataType:typeof data,isError:data instanceof Error,isErrorEvent:data && data.type === 'error'},timestamp:Date.now(),runId:'run4',hypothesisId:'F'})}).catch(()=>{});
            // #endregion
            
            logger.info(`[Realtime ${kind}] ${msg}`, { errorDetails, originalData: data });
            if (kind === 'error' || kind === 'transport') {
              logger.error(`Realtime ${kind} error: ${msg}`, { errorDetails, originalData: data });
            }
          }
        }
      });
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'licenseRealtimeSubscription.js:52',message:'Supabase client created',data:{hasRealtime:!!this.supabase.realtime},timestamp:Date.now(),runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      logger.info('Supabase client initialized for Realtime subscription', {
        url: this.supabaseUrl.substring(0, 30) + '...'
      });
      return true;
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'licenseRealtimeSubscription.js:60',message:'Failed to create Supabase client',data:{error:error.message,errorName:error.name,errorStack:error.stack},timestamp:Date.now(),runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      logger.error('Failed to initialize Supabase client', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Map Supabase status to control plane status
   */
  mapStatus(supabaseStatus) {
    if (supabaseStatus === 'active') {
      return { status: 'active', isActive: true };
    }
    // inactive, revoked, expired all map to inactive
    return { status: 'inactive', isActive: false };
  }

  /**
   * Update local database when license status changes
   */
  async updateLicenseStatus(apiKeyHash, supabaseStatus) {
    try {
      const { status, isActive } = this.mapStatus(supabaseStatus);

      logger.info('Processing license status update', {
        apiKeyHash: apiKeyHash?.substring(0, 16) + '...',
        supabaseStatus,
        newStatus: status,
        isActive
      });

      // Find customer account by license key hash
      const customerResult = await db.query(
        `SELECT ca.id, ca.customer_code, ca.status as current_status
         FROM customer_accounts ca
         JOIN customer_api_keys cak ON ca.id = cak.customer_account_id
         WHERE cak.api_key_hash = $1`,
        [apiKeyHash]
      );

      if (customerResult.rows.length === 0) {
        logger.warn('Customer not found for license key hash', {
          apiKeyHash: apiKeyHash?.substring(0, 16) + '...'
        });
        return { success: false, reason: 'Customer not found' };
      }

      const customer = customerResult.rows[0];

      // Only update if status actually changed
      if (customer.current_status === status) {
        logger.debug('Status unchanged, skipping update', {
          customerId: customer.id,
          currentStatus: customer.current_status,
          newStatus: status
        });
        return { success: true, reason: 'No change needed' };
      }

      // Update customer account status
      const updateCustomerResult = await db.query(
        `UPDATE customer_accounts 
         SET status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING status`,
        [status, customer.id]
      );

      // Update customer_api_keys is_active flag
      const updateApiKeyResult = await db.query(
        `UPDATE customer_api_keys 
         SET is_active = $1
         WHERE customer_account_id = $2
         RETURNING is_active`,
        [isActive, customer.id]
      );

      logger.info('License status updated via Realtime subscription', {
        customerId: customer.id,
        customerCode: customer.customer_code,
        oldStatus: customer.current_status,
        newStatus: status,
        supabaseStatus,
        updatedCustomerStatus: updateCustomerResult.rows[0]?.status,
        updatedApiKeyActive: updateApiKeyResult.rows[0]?.is_active,
        rowsUpdated: updateCustomerResult.rowCount + updateApiKeyResult.rowCount
      });

      return {
        success: true,
        customerId: customer.id,
        oldStatus: customer.current_status,
        newStatus: status
      };
    } catch (error) {
      logger.error('Failed to update license status', {
        error: error.message,
        stack: error.stack,
        apiKeyHash: apiKeyHash?.substring(0, 16) + '...'
      });
      return { success: false, reason: error.message };
    }
  }

  /**
   * Start Realtime subscription
   */
  async start() {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'licenseRealtimeSubscription.js:166',message:'start() called',data:{reconnectAttempts:this.reconnectAttempts,hasSupabase:!!this.supabase,hasChannel:!!this.channel},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    logger.info('Realtime subscription start() called');
    const initialized = this.initialize();
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'licenseRealtimeSubscription.js:170',message:'initialize() result',data:{initialized,hasUrl:!!this.supabaseUrl,hasKey:!!this.supabaseKey,urlPrefix:this.supabaseUrl?.substring(0,30)},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (!initialized) {
      logger.warn('Realtime subscription not started - Supabase not configured', {
        supabaseUrl: this.supabaseUrl ? 'set' : 'missing',
        supabaseKey: this.supabaseKey ? 'set' : 'missing'
      });
      return false;
    }

    try {
      logger.info('Starting Realtime subscription for vendor_api_keys...');
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'licenseRealtimeSubscription.js:180',message:'Creating channel',data:{channelName:'vendor-api-keys-changes',table:'vendor_api_keys',event:'UPDATE',usingServiceKey:!!process.env.SUPABASE_SERVICE_KEY},timestamp:Date.now(),runId:'run2',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      // Removed filter - Supabase Realtime filters can cause CHANNEL_ERROR if syntax is wrong
      // We'll filter in the callback instead
      this.channel = this.supabase
        .channel('vendor-api-keys-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'vendor_api_keys'
            // Filter removed - will filter in callback
          },
          async (payload) => {
            try {
              logger.info('Received Realtime update', {
                eventType: payload.eventType,
                table: payload.table,
                newStatus: payload.new?.status,
                oldStatus: payload.old?.status,
                hasApiKeyHash: !!payload.new?.api_key_hash,
                fullPayload: JSON.stringify(payload)
              });

              // Filter: Only process updates where status is not null and actually changed
              if (!payload.new?.status) {
                logger.debug('Update missing status field, ignoring', {
                  payload: JSON.stringify(payload)
                });
                return;
              }

              // Only process if status actually changed
              if (payload.new?.status === payload.old?.status) {
                logger.debug('Status unchanged, ignoring update', {
                  status: payload.new?.status
                });
                return;
              }

              const apiKeyHash = payload.new?.api_key_hash;
              const newStatus = payload.new?.status;

              if (!apiKeyHash) {
                logger.warn('Realtime update missing api_key_hash', {
                  payload: JSON.stringify(payload)
                });
                return;
              }

              if (!newStatus) {
                logger.warn('Realtime update missing status', {
                  apiKeyHash: apiKeyHash.substring(0, 16) + '...'
                });
                return;
              }

              // Update local database
              await this.updateLicenseStatus(apiKeyHash, newStatus);
            } catch (error) {
              logger.error('Error processing Realtime update', {
                error: error.message,
                stack: error.stack
              });
              // Don't throw - continue processing other updates
            }
          }
        )
        .subscribe((status, err) => {
          // #region agent log
          const errorDetails = err ? {
            message: err.message,
            name: err.name,
            code: err.code,
            status: err.status,
            statusText: err.statusText,
            toString: err.toString(),
            stack: err.stack
          } : null;
          fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'licenseRealtimeSubscription.js:237',message:'subscribe callback',data:{status,hasError:!!err,errorMessage:err?.message,errorName:err?.name,errorCode:err?.code,errorStatus:err?.status,errorStatusText:err?.statusText,errorToString:err?.toString(),isConnected:this.isConnected},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          
          logger.info('Realtime subscription status changed', {
            status,
            hasError: !!err,
            error: err?.message,
            errorDetails: errorDetails,
            isConnected: this.isConnected
          });
          
          if (status === 'SUBSCRIBED') {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            logger.info('✅ Realtime subscription active - listening for license status changes');
          } else if (status === 'CHANNEL_ERROR') {
            // #region agent log
            fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'licenseRealtimeSubscription.js:260',message:'CHANNEL_ERROR detected',data:{errorMessage:err?.message,errorName:err?.name,errorCode:err?.code,errorStatus:err?.status,errorStatusText:err?.statusText,errorToString:err?.toString(),errorStack:err?.stack,reconnectAttempts:this.reconnectAttempts,fullError:JSON.stringify(err)},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
            this.isConnected = false;
            logger.error('❌ Realtime subscription channel error', {
              error: err?.message,
              errorDetails: errorDetails,
              fullError: err
            });
            // Don't reconnect immediately on error - might be a configuration issue
            if (this.reconnectAttempts === 0) {
              logger.error('First connection attempt failed. Check:', {
                suggestions: [
                  '1. Verify Realtime is enabled on vendor_api_keys table in Supabase',
                  '2. Check SUPABASE_URL and SUPABASE_ANON_KEY are correct',
                  '3. Verify the API key has Realtime permissions',
                  '4. Check Supabase project settings for Realtime availability'
                ]
              });
            }
            this.attemptReconnect();
          } else if (status === 'TIMED_OUT') {
            this.isConnected = false;
            logger.warn('⚠️  Realtime subscription timed out', {
              errorDetails: errorDetails
            });
            this.attemptReconnect();
          } else if (status === 'CLOSED') {
            this.isConnected = false;
            logger.warn('⚠️  Realtime subscription closed', {
              errorDetails: errorDetails
            });
            this.attemptReconnect();
          } else {
            logger.info('Realtime subscription status', { 
              status, 
              error: err?.message,
              errorDetails: errorDetails
            });
          }
        });

      return true;
    } catch (error) {
      logger.error('Failed to start Realtime subscription', {
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }

  /**
   * Attempt to reconnect to Realtime subscription
   */
  async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached. Realtime subscription stopped.', {
        attempts: this.reconnectAttempts
      });
      logger.warn('Realtime subscription disabled. License status updates will not be received automatically.', {
        suggestion: 'Check Supabase Realtime configuration and network connectivity'
      });
      // Don't keep trying - allow backend to continue without Realtime
      return;
    }

    this.reconnectAttempts++;
    logger.info(`Attempting to reconnect Realtime subscription (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(async () => {
      try {
        if (this.channel) {
          await this.channel.unsubscribe();
        }
        await this.start();
      } catch (error) {
        logger.error('Reconnection attempt failed', {
          error: error.message,
          attempt: this.reconnectAttempts
        });
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
        }
      }
    }, this.reconnectDelay);
  }

  /**
   * Stop Realtime subscription
   */
  async stop() {
    try {
      if (this.channel) {
        await this.channel.unsubscribe();
        logger.info('Realtime subscription stopped');
      }
      this.isConnected = false;
    } catch (error) {
      logger.error('Error stopping Realtime subscription', {
        error: error.message
      });
    }
  }

  /**
   * Get subscription status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      hasSupabaseClient: !!this.supabase,
      hasChannel: !!this.channel
    };
  }
}

// Create singleton instance
const licenseRealtimeSubscription = new LicenseRealtimeSubscription();

module.exports = licenseRealtimeSubscription;

