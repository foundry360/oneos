/**
 * Frontend RBAC Examples using Supabase Client
 * 
 * This file demonstrates how to use Supabase client with Row Level Security
 * to perform role-based operations in the frontend.
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================================================
// EXAMPLE 1: Get Current User Profile with Role
// ============================================================================
export async function getCurrentUserProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // RLS policy ensures users can only read their own profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    throw error;
  }

  return profile;
}

// ============================================================================
// EXAMPLE 2: Get User Role from JWT
// ============================================================================
export async function getUserRole(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return null;
  }

  // Role is included in JWT claims (configured in Supabase Dashboard)
  // Access via user_metadata or app_metadata
  const role = session.user.user_metadata?.role || 
               session.user.app_metadata?.role ||
               null;

  // Fallback: Query profile if not in JWT
  if (!role) {
    const profile = await getCurrentUserProfile();
    return profile?.role || null;
  }

  return role;
}

// ============================================================================
// EXAMPLE 3: Check if User Has Specific Role
// ============================================================================
export async function hasRole(requiredRole: string): Promise<boolean> {
  const role = await getUserRole();
  return role === requiredRole;
}

// ============================================================================
// EXAMPLE 4: User Creates a Review Task (Own Task)
// ============================================================================
export async function createReviewTask(taskData: {
  owner_id: string;
  assigned_reviewer: string;
  status?: 'pending' | 'approved' | 'rejected';
}) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // RLS policy ensures users can only insert tasks they own
  const { data, error } = await supabase
    .from('review_tasks')
    .insert({
      owner_id: user.id, // Must match authenticated user
      assigned_reviewer: taskData.assigned_reviewer,
      status: taskData.status || 'pending',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// ============================================================================
// EXAMPLE 5: User Views Their Own Tasks
// ============================================================================
export async function getMyReviewTasks() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // RLS policy allows users to read their own tasks
  const { data, error } = await supabase
    .from('review_tasks')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

// ============================================================================
// EXAMPLE 6: Reviewer Views Assigned Tasks
// ============================================================================
export async function getAssignedReviewTasks() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // RLS policy allows reviewers to read tasks assigned to them
  const { data, error } = await supabase
    .from('review_tasks')
    .select('*')
    .eq('assigned_reviewer', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

// ============================================================================
// EXAMPLE 7: Reviewer Updates Task Status
// ============================================================================
export async function updateReviewTaskStatus(
  taskId: string,
  status: 'approved' | 'rejected',
  reviewNotes?: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // RLS policy ensures only assigned reviewer or admin/governance can update
  const { data, error } = await supabase
    .from('review_tasks')
    .update({
      status,
      review_notes: reviewNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// ============================================================================
// EXAMPLE 8: Governance/Admin Views All Tasks
// ============================================================================
export async function getAllReviewTasks() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const role = await getUserRole();
  
  if (role !== 'governance' && role !== 'admin') {
    throw new Error('Insufficient permissions');
  }

  // RLS policy allows governance and admin to read all tasks
  const { data, error } = await supabase
    .from('review_tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

// ============================================================================
// EXAMPLE 9: Admin Views All Profiles
// ============================================================================
export async function getAllProfiles() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const role = await getUserRole();
  
  if (role !== 'admin') {
    throw new Error('Only admin can view all profiles');
  }

  // RLS policy allows admin to read all profiles
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

// ============================================================================
// EXAMPLE 10: Admin Updates User Role
// ============================================================================
export async function updateUserRole(
  userId: string,
  newRole: 'admin' | 'governance' | 'reviewer' | 'user' | 'system'
) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const role = await getUserRole();
  
  if (role !== 'admin') {
    throw new Error('Only admin can update user roles');
  }

  // RLS policy ensures only admin can update profiles
  const { data, error } = await supabase
    .from('profiles')
    .update({
      role: newRole,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// ============================================================================
// EXAMPLE 11: Governance/Admin Views Audit Logs
// ============================================================================
export async function getAuditLogs(limit: number = 100) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const role = await getUserRole();
  
  if (role !== 'governance' && role !== 'admin') {
    throw new Error('Only governance and admin can view audit logs');
  }

  // RLS policy allows governance and admin to read audit logs
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data;
}

// ============================================================================
// EXAMPLE 12: React Hook for Role-Based Access Control
// ============================================================================
import { useState, useEffect } from 'react';

export function useUserRole() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      try {
        const userRole = await getUserRole();
        setRole(userRole);
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, []);

  return { role, loading };
}

// ============================================================================
// EXAMPLE 13: React Component with Role-Based Rendering
// ============================================================================
export function RoleBasedComponent() {
  const { role, loading } = useUserRole();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (role === 'admin') {
    return <div>Admin Dashboard</div>;
  }

  if (role === 'governance') {
    return <div>Governance Dashboard</div>;
  }

  if (role === 'reviewer') {
    return <div>Reviewer Dashboard</div>;
  }

  return <div>User Dashboard</div>;
}

