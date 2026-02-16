/**
 * Decision Scope Panel (Left Panel)
 * 
 * Purpose: Operational scope selection, not navigation.
 * Filters what work is shown in the center panel.
 * 
 * Rules:
 * - No routing changes
 * - Selection updates center panel state only
 * - Collapsible
 * - No icons unless necessary
 */

'use client';

import { Box, VStack, Text, HStack } from '@chakra-ui/react';
import { DecisionScope, ActionMode, Decision } from './types';
import { useMemo } from 'react';
import { UserCheck, UserX, TrendingUp, AlertTriangle, AlertCircle, Eye, CheckCircle2, ShieldAlert } from 'lucide-react';

interface DecisionScopePanelProps {
  selectedScope: DecisionScope | null;
  selectedActionMode: ActionMode | null;
  onScopeChange: (scope: DecisionScope | null) => void;
  onActionModeChange: (mode: ActionMode | null) => void;
  decisions: Decision[];
}

export default function DecisionScopePanel({
  selectedScope,
  selectedActionMode,
  onScopeChange,
  onActionModeChange,
  decisions,
}: DecisionScopePanelProps) {
  // Calculate counts for each scope option
  const scopeCounts = useMemo(() => {
    return {
      'my-assigned': decisions.filter((d) => d.assignedTo !== null).length,
      'unassigned': decisions.filter((d) => d.assignedTo === null).length,
      'escalated': decisions.filter((d) => d.status === 'escalated').length,
      'high-risk': decisions.filter((d) => d.riskLevel === 'high').length,
      'medium-risk': decisions.filter((d) => d.riskLevel === 'medium').length,
    };
  }, [decisions]);

  const scopeOptions: { value: DecisionScope; label: string; icon: React.ReactNode }[] = [
    { value: 'my-assigned', label: 'My Assigned', icon: <UserCheck size={14} /> },
    { value: 'unassigned', label: 'Unassigned', icon: <UserX size={14} /> },
    { value: 'escalated', label: 'Escalated', icon: <TrendingUp size={14} /> },
    { value: 'high-risk', label: 'High Risk', icon: <AlertTriangle size={14} /> },
    { value: 'medium-risk', label: 'Medium Risk', icon: <AlertCircle size={14} /> },
  ];

  const actionModeOptions: { value: ActionMode; label: string; icon: React.ReactNode }[] = [
    { value: 'review', label: 'Review', icon: <Eye size={14} /> },
    { value: 'approvals', label: 'Approvals', icon: <CheckCircle2 size={14} /> },
    { value: 'overrides', label: 'Overrides', icon: <ShieldAlert size={14} /> },
  ];

  return (
    <Box
      width="12%"
      bg="white"
      borderRight="1px solid"
      borderColor="gray.200"
      height="100%"
      overflowY="auto"
    >
      <Box
        px={5}
        py={5}
        borderBottom="1px solid"
        borderColor="gray.200"
        minH="48px"
        h="48px"
        display="flex"
        alignItems="center"
      >
        <Text fontSize="sm" fontWeight="600" color="gray.900" letterSpacing="0.01em" lineHeight="1.2">
          Decision Scope
        </Text>
      </Box>

      <VStack align="stretch" spacing={0} py={2}>
        {/* Decision Scope Section */}
        <Box px={5} py={4}>
          <Text fontSize="xs" fontWeight="500" color="gray.600" mb={3} textTransform="uppercase" letterSpacing="0.05em">
            List View
          </Text>
          <VStack align="stretch" spacing={1}>
            {scopeOptions.map((option) => (
              <Box
                key={option.value}
                px={3}
                py={2}
                cursor="pointer"
                bg={selectedScope === option.value ? 'gray.100' : 'transparent'}
                borderRadius="4px"
                onClick={() => onScopeChange(selectedScope === option.value ? null : option.value)}
                role="button"
                aria-pressed={selectedScope === option.value}
                _hover={{ bg: selectedScope === option.value ? 'gray.100' : 'gray.50' }}
                transition="background-color 0.1s"
              >
                <HStack spacing={2}>
                  <Box color="gray.600" display="flex" alignItems="center">
                    {option.icon}
                  </Box>
                  <Text fontSize="sm" color="gray.900">
                    {option.label} <Text as="span" fontSize="xs" color="gray.500">({scopeCounts[option.value]})</Text>
                  </Text>
                </HStack>
              </Box>
            ))}
          </VStack>
        </Box>

        {/* Workflows Section */}
        <Box px={5} py={4}>
          <Text fontSize="xs" fontWeight="500" color="gray.600" mb={3} textTransform="uppercase" letterSpacing="0.05em">
            Workflows
          </Text>
          <VStack align="stretch" spacing={1}>
            {actionModeOptions.map((option) => (
              <Box
                key={option.value}
                px={3}
                py={2}
                cursor="pointer"
                bg={selectedActionMode === option.value ? 'gray.100' : 'transparent'}
                borderRadius="4px"
                onClick={() => onActionModeChange(selectedActionMode === option.value ? null : option.value)}
                role="button"
                aria-pressed={selectedActionMode === option.value}
                _hover={{ bg: selectedActionMode === option.value ? 'gray.100' : 'gray.50' }}
                transition="background-color 0.1s"
              >
                <HStack spacing={2}>
                  <Box color="gray.600" display="flex" alignItems="center">
                    {option.icon}
                  </Box>
                  <Text fontSize="sm" color="gray.900">
                    {option.label}
                  </Text>
                </HStack>
              </Box>
            ))}
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
}

