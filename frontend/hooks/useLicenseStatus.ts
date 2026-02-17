import { useState, useEffect } from 'react';
import axios from 'axios';

// Ensure API_URL always has /api suffix
const getApiUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  return url.endsWith('/api') ? url : `${url}/api`;
};
const API_URL = getApiUrl();

interface LicenseStatus {
  active: boolean;
  status?: string;
  message?: string;
}

export function useLicenseStatus() {
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLicenseStatus = async () => {
      try {
        const token = localStorage.getItem('auth-token');
        if (!token) {
          setLoading(false);
          return;
        }

        // Try to make an API call - if license is inactive, we'll get 403
        // Use a lightweight endpoint that requires auth
        const response = await axios.get(`${API_URL}/dashboard/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          validateStatus: (status) => status < 500 // Don't throw on 403
        });

        if (response.status === 403 && response.data?.code === 'LICENSE_INACTIVE') {
          setLicenseStatus({
            active: false,
            status: response.data.status,
            message: response.data.message
          });
        } else {
          setLicenseStatus({ active: true });
        }
      } catch (error: any) {
        // If it's a 403 with LICENSE_INACTIVE, license is inactive
        if (error.response?.status === 403 && error.response?.data?.code === 'LICENSE_INACTIVE') {
          setLicenseStatus({
            active: false,
            status: error.response.data.status,
            message: error.response.data.message
          });
        } else {
          // Other errors - assume active for now
          setLicenseStatus({ active: true });
        }
      } finally {
        setLoading(false);
      }
    };

    checkLicenseStatus();
    
    // Check periodically (every 30 seconds)
    const interval = setInterval(checkLicenseStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return { licenseStatus, loading };
}

