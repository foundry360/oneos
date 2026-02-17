import { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface InstallationStatus {
  installed: boolean;
  hasApiKey: boolean;
  customer: {
    id: string;
    customerName: string;
    customerCode: string;
    status: string;
    installationId: string;
  } | null;
  license?: {
    activatedAt: string | null;
    expiresAt: string | null;
    isExpired?: boolean;
    daysRemaining?: number | null;
    licenseType?: string;
  } | null;
}

interface ValidateKeyResponse {
  valid: boolean;
  customerId: string;
  customerCode: string;
  customerName: string;
  installationId: string;
  activatedAt?: string;
  expiresAt?: string;
  alreadyExists?: boolean;
  message: string;
}

export function useInstallation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async (): Promise<InstallationStatus> => {
    try {
      const response = await axios.get(`${API_URL}/api/installation/status`);
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to check installation status');
    }
  };

  const validateLicenseKey = async (
    licenseKey: string,
    customerName?: string,
    customerCode: string, // Now required
    contactEmail?: string
  ): Promise<ValidateKeyResponse> => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_URL}/api/installation/validate-key`,
        {
          apiKey: licenseKey,
          customerName,
          customerCode,
          contactEmail,
        }
      );

      if (!response.data.valid) {
        throw new Error(response.data.reason || 'Invalid license key');
      }

      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          err.message || 
                          'Failed to validate license key';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    checkStatus,
    validateLicenseKey,
    loading,
    error,
  };
}

