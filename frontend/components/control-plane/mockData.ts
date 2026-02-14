/**
 * Mock data for the Control Plane
 * In production, this would be fetched from an API
 */

import { Decision } from './types';

export const mockDecisions: Decision[] = [
  {
    id: 'DEC-2024-001',
    riskLevel: 'high',
    type: 'data-access',
    status: 'pending',
    assignedTo: 'john.doe@example.com',
    title: 'Access Request: Customer PII Dataset',
    summary: 'Request to access customer personal identifiable information for model training purposes. Dataset contains 2.3M records with names, emails, and addresses.',
    sourceRefs: ['REQ-12345', 'DATASET-CUST-PII-2024'],
    aiRecommendation: {
      action: 'reject',
      explanation: 'High risk due to PII exposure without proper anonymization. Recommend implementing differential privacy or synthetic data generation.',
      confidence: 87,
    },
    riskRationale: 'Direct access to PII violates GDPR Article 5(1)(b) principle of purpose limitation. Current anonymization measures are insufficient.',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T14:22:00Z',
  },
  {
    id: 'DEC-2024-002',
    riskLevel: 'medium',
    type: 'model-deployment',
    status: 'pending',
    assignedTo: null,
    title: 'Model Deployment: Credit Scoring v2.1',
    summary: 'Deploy updated credit scoring model to production. Model accuracy improved by 3.2% but shows slight bias in age group 25-35.',
    sourceRefs: ['MODEL-CS-V2.1', 'AUDIT-2024-012'],
    aiRecommendation: {
      action: 'approve',
      explanation: 'Bias is within acceptable thresholds. Model includes fairness constraints and monitoring hooks. Recommend staged rollout.',
      confidence: 72,
    },
    riskRationale: 'Medium risk due to potential bias. Mitigation: monitoring dashboard active, rollback plan in place, staged deployment to 10% traffic initially.',
    createdAt: '2024-01-15T09:15:00Z',
    updatedAt: '2024-01-15T11:45:00Z',
  },
  {
    id: 'DEC-2024-003',
    riskLevel: 'high',
    type: 'policy-exception',
    status: 'escalated',
    assignedTo: 'jane.smith@example.com',
    title: 'Policy Exception: Extended Data Retention',
    summary: 'Exception request to retain transaction logs beyond standard 90-day policy. Required for regulatory compliance investigation.',
    sourceRefs: ['POL-EXC-2024-08', 'REG-COMP-AUDIT-2024'],
    aiRecommendation: {
      action: 'escalate',
      explanation: 'Requires legal and compliance review. Exception may be valid but needs formal approval and documented justification.',
      confidence: 91,
    },
    riskRationale: 'High risk due to extended retention of sensitive financial data. Requires explicit legal basis and documented retention schedule.',
    createdAt: '2024-01-14T16:20:00Z',
    updatedAt: '2024-01-15T08:10:00Z',
  },
  {
    id: 'DEC-2024-004',
    riskLevel: 'medium',
    type: 'user-permission',
    status: 'pending',
    assignedTo: null,
    title: 'Permission Grant: Admin Access to ML Pipeline',
    summary: 'Request to grant admin-level access to ML pipeline infrastructure for new data science team member.',
    sourceRefs: ['PERM-REQ-456', 'USER-DS-TEAM-2024'],
    aiRecommendation: {
      action: 'approve',
      explanation: 'User has completed required training and background check. Role-based access is appropriate for position.',
      confidence: 78,
    },
    riskRationale: 'Medium risk due to admin privileges. Mitigation: access is time-bound, requires MFA, and is logged for audit.',
    createdAt: '2024-01-15T12:00:00Z',
    updatedAt: '2024-01-15T12:00:00Z',
  },
  {
    id: 'DEC-2024-005',
    riskLevel: 'high',
    type: 'data-retention',
    status: 'pending',
    assignedTo: 'john.doe@example.com',
    title: 'Data Deletion Request: EU User Data',
    summary: 'GDPR Article 17 request to delete all personal data for user ID 789234. Includes data in training sets and model artifacts.',
    sourceRefs: ['GDPR-REQ-2024-156', 'USER-789234'],
    aiRecommendation: {
      action: 'approve',
      explanation: 'Valid GDPR request. User has confirmed identity. Deletion process is automated and auditable.',
      confidence: 95,
    },
    riskRationale: 'High risk due to legal requirement and potential impact on model performance if user data is significant in training set.',
    createdAt: '2024-01-15T13:30:00Z',
    updatedAt: '2024-01-15T13:30:00Z',
  },
  {
    id: 'DEC-2024-006',
    riskLevel: 'medium',
    type: 'model-deployment',
    status: 'in-review',
    assignedTo: 'jane.smith@example.com',
    title: 'Model Deployment: Sentiment Analysis v3.0',
    summary: 'Deploy new sentiment analysis model with improved multilingual support. Model tested on 15 languages with 89% accuracy.',
    sourceRefs: ['MODEL-SA-V3.0', 'TEST-REPORT-2024-089'],
    aiRecommendation: {
      action: 'approve',
      explanation: 'Model meets all quality gates. Multilingual support is robust. Recommend monitoring for edge cases in low-resource languages.',
      confidence: 81,
    },
    riskRationale: 'Medium risk due to complexity of multilingual models. Mitigation: comprehensive testing, fallback mechanisms, and monitoring.',
    createdAt: '2024-01-14T14:00:00Z',
    updatedAt: '2024-01-15T10:15:00Z',
  },
];




