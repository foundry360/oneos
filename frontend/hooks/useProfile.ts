import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create supabase client with auth persistence
const getSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
};

export interface Profile {
  id: string;
  email: string;
  role: string;
  display_name?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !userId) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error fetching profile:', error);
        } else {
          setProfile(data || null);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const updateProfile = async (updates: { display_name?: string; avatar_url?: string }) => {
    const supabase = getSupabaseClient();
    if (!supabase || !userId) {
      throw new Error('Supabase not configured or user not logged in');
    }

    setUpdating(true);
    try {
      // First check if profile exists, if not create it
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      let data, error;
      
      if (existingProfile) {
        // Update existing profile
        const result = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId)
          .select()
          .single();
        data = result.data;
        error = result.error;
      } else {
        // Create new profile with updates
        const result = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: '', // Will be set by trigger or we need to get it
            ...updates,
          })
          .select()
          .single();
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Profile update error:', error);
        throw error;
      }
      
      setProfile(data);
      return data;
    } catch (error: any) {
      console.error('Error updating profile:', error);
      throw new Error(error?.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const uploadAvatar = async (file: File): Promise<string> => {
    const supabase = getSupabaseClient();
    if (!supabase || !userId) {
      throw new Error('Supabase not configured or user not logged in');
    }

    // Generate unique filename
    // Store in a folder structure: {userId}/{filename} for better organization
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    // Delete old avatar if exists
    try {
      const { data: oldProfile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', userId)
        .single();
      
      if (oldProfile?.avatar_url) {
        const oldFileName = oldProfile.avatar_url.split('/').pop();
        if (oldFileName) {
          await supabase.storage
            .from('profile-avatars')
            .remove([oldFileName]);
        }
      }
    } catch (error) {
      // Ignore errors when deleting old avatar
      console.log('Could not delete old avatar:', error);
    }

    // Upload file to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profile-avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true, // Allow overwriting
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(uploadError.message || 'Failed to upload avatar');
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-avatars')
      .getPublicUrl(filePath);

    // Update profile with avatar URL
    await updateProfile({ avatar_url: publicUrl });

    return publicUrl;
  };

  return {
    profile,
    loading,
    updating,
    updateProfile,
    uploadAvatar,
  };
}

