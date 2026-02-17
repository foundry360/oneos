import { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface LicenseKeyHash {
  id: string;
  hash: string;
  hashPrefix: string;
  description: string | null;
  createdAt: string;
}

interface LicenseKeysResponse {
  success: boolean;
  licenseKeys: LicenseKeyHash[];
  count: number;
}

export function useLicenseKeys() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getLicenseKeys = async (): Promise<LicenseKeyHash[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<LicenseKeysResponse>(
        `${API_URL}/api/license-keys`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data.licenseKeys;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          err.message || 
                          'Failed to get license keys';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const addLicenseKey = async (
    payload: { hash: string; licenseKey: string; description?: string; customerCode: string }
  ): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await axios.post(
        `${API_URL}/api/license-keys`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          err.message || 
                          'Failed to add license key';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const removeLicenseKey = async (hash: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await axios.delete(
        `${API_URL}/api/license-keys/${hash}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          err.message || 
                          'Failed to remove license key';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    getLicenseKeys,
    addLicenseKey,
    removeLicenseKey,
    loading,
    error,
  };
}

