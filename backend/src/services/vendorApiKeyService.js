const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Service to validate vendor API keys
 * Can validate against Supabase or vendor API endpoint
 */
class VendorApiKeyService {
  constructor() {
    // Vendor API configuration
    this.vendorApiUrl = process.env.VENDOR_API_URL || process.env.SUPABASE_VENDOR_URL;
    this.vendorApiKey = process.env.VENDOR_API_KEY || process.env.SUPABASE_ANON_KEY;
    this.useSupabase = !!process.env.SUPABASE_VENDOR_URL;
  }

  /**
   * Validate vendor API key
   * @param {string} apiKey - The vendor-generated API key
   * @returns {Promise<Object>} Validation result with customer info
   */
  async validateApiKey(apiKey) {
    if (!apiKey) {
      throw new Error('API key is required');
    }

    try {
      if (this.useSupabase) {
        return await this.validateViaSupabase(apiKey);
      } else {
        return await this.validateViaVendorApi(apiKey);
      }
    } catch (error) {
      logger.error('Vendor API key validation failed', {
        error: error.message,
        hasResponse: !!error.response,
        status: error.response?.status
      });
      throw error;
    }
  }

  /**
   * Validate via Supabase
   */
  async validateViaSupabase(apiKey) {
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Supabase REST API: Filters in URL query string
    const response = await axios.get(
      `${this.vendorApiUrl}/rest/v1/vendor_api_keys?api_key_hash=eq.${apiKeyHash}&select=*`,
      {
        headers: {
          'apikey': this.vendorApiKey,
          'Authorization': `Bearer ${this.vendorApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.data || response.data.length === 0) {
      return {
        valid: false,
        reason: 'API key not found'
      };
    }

    const key = response.data[0];

    // Check status - only allow pending or active keys
    if (key.status === 'revoked') {
      return {
        valid: false,
        reason: 'API key has been revoked'
      };
    }

    if (key.status === 'expired' || (key.expires_at && new Date(key.expires_at) < new Date())) {
      return {
        valid: false,
        reason: 'API key has expired'
      };
    }

    // Only allow pending or active status
    if (key.status !== 'pending' && key.status !== 'active') {
      return {
        valid: false,
        reason: `API key status is invalid: ${key.status}`
      };
    }

    return {
      valid: true,
      apiKeyId: key.id,
      customerName: key.customer_name,
      customerCode: key.customer_code,
      contactEmail: key.contact_email,
      subscriptionTier: key.subscription_tier,
      licenseType: key.license_type,
      expiresAt: key.expires_at,
      status: key.status
    };
  }

  /**
   * Validate via vendor API endpoint
   */
  async validateViaVendorApi(apiKey) {
    const response = await axios.post(
      `${this.vendorApiUrl}/api/vendor/validate-key`,
      { apiKey },
      {
        headers: {
          'Authorization': `Bearer ${this.vendorApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    if (!response.data.valid) {
      return {
        valid: false,
        reason: response.data.reason || 'Invalid API key'
      };
    }

    return {
      valid: true,
      apiKeyId: response.data.apiKeyId,
      customerName: response.data.customerName,
      customerCode: response.data.customerCode,
      contactEmail: response.data.contactEmail,
      subscriptionTier: response.data.subscriptionTier,
      licenseType: response.data.licenseType,
      expiresAt: response.data.expiresAt,
      status: response.data.status
    };
  }

  /**
   * Notify vendor that API key was activated
   */
  async notifyActivation(apiKey, installationInfo) {
    try {
      if (this.useSupabase) {
        await this.notifyActivationViaSupabase(apiKey, installationInfo);
      } else {
        await this.notifyActivationViaVendorApi(apiKey, installationInfo);
      }
    } catch (error) {
      logger.error('Failed to notify vendor of activation', {
        error: error.message
      });
      // Don't throw - activation still succeeds even if notification fails
    }
  }

  /**
   * Notify activation via Supabase
   */
  async notifyActivationViaSupabase(apiKey, installationInfo) {
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Supabase REST API: Use PATCH with filter in URL
    try {
      await axios.patch(
        `${this.vendorApiUrl}/rest/v1/vendor_api_keys?api_key_hash=eq.${apiKeyHash}`,
        {
          status: 'active',
          activated_at: new Date().toISOString(),
          installation_id: installationInfo.installationId,
          installation_url: installationInfo.installationUrl,
          metadata: JSON.stringify({
            installationId: installationInfo.installationId,
            installationUrl: installationInfo.installationUrl,
            activatedAt: new Date().toISOString()
          })
        },
        {
          headers: {
            'apikey': this.vendorApiKey,
            'Authorization': `Bearer ${this.vendorApiKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          }
        }
      );
    } catch (error) {
      // If PATCH fails, log for manual update
      logger.warn('Failed to update vendor API key status automatically', {
        apiKeyHash: apiKeyHash.substring(0, 8) + '...',
        installationId: installationInfo.installationId,
        error: error.message,
        hint: 'Vendor may need to update key status manually in Supabase'
      });
      // Don't throw - installation still succeeds
    }
  }

  /**
   * Notify activation via vendor API
   */
  async notifyActivationViaVendorApi(apiKey, installationInfo) {
    await axios.post(
      `${this.vendorApiUrl}/api/vendor/activate-key`,
      {
        apiKey,
        installationId: installationInfo.installationId,
        installationUrl: installationInfo.installationUrl
      },
      {
        headers: {
          'Authorization': `Bearer ${this.vendorApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

module.exports = new VendorApiKeyService();

