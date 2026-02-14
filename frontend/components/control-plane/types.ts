/**
 * Type definitions for the AI Governance Control Plane
 */

export type DecisionScope = 
  | 'my-assigned'
  | 'unassigned'
  | 'escalated'
  | 'high-risk'
  | 'medium-risk';

export type ActionMode = 
  | 'review'
  | 'approvals'
  | 'overrides';

export type RiskLevel = 
  | 'high'
  | 'medium'
  | 'low';

export type DecisionStatus = 
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'escalated'
  | 'in-review';

export type DecisionType = 
  | 'data-access'
  | 'model-deployment'
  | 'policy-exception'
  | 'data-retention'
  | 'user-permission';

export type DecisionAction = 
  | 'approve'
  | 'reject'
  | 'escalate';

export interface Decision {
  id: string;
  riskLevel: RiskLevel;
  type: DecisionType;
  status: DecisionStatus;
  assignedTo: string | null;
  title: string;
  summary: string;
  sourceRefs: string[];
  aiRecommendation: {
    action: DecisionAction;
    explanation: string;
    confidence: number; // 0-100
  };
  riskRationale: string;
  createdAt: string;
  updatedAt: string;
}

export interface ControlPlaneState {
  selectedScope: DecisionScope | null;
  selectedActionMode: ActionMode | null;
  selectedDecision: Decision | null;
  searchFilter: string;
  statusFilter: DecisionStatus | null;
  riskFilter: RiskLevel | null;
}




