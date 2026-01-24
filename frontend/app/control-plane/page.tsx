/**
 * Control Plane Page
 * 
 * Three-panel layout for AI governance decision oversight:
 * - Left: Decision Scope Panel (filters)
 * - Center: Decision Workspace (table/list)
 * - Right: Context & Action Panel (slides in on selection)
 * 
 * Design Principles:
 * - Minimalist (no visual noise)
 * - Action-oriented (every element supports a decision)
 * - No dashboards, cards, or metric tiles
 * - White/light-gray background, restrained accent color
 * - Strong typography hierarchy
 * - Panels change state, not routes
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import { Box, Heading, Divider, Text, HStack, IconButton, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, useDisclosure, VStack, Textarea, Button } from '@chakra-ui/react';
import { Share2, Download, Maximize2 } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import DecisionScopePanel from '@/components/control-plane/DecisionScopePanel';
import DecisionWorkspace from '@/components/control-plane/DecisionWorkspace';
import DecisionContextPanel from '@/components/control-plane/DecisionContextPanel';
import { Decision, DecisionScope, ActionMode, DecisionStatus, RiskLevel, DecisionAction } from '@/components/control-plane/types';
import { mockDecisions } from '@/components/control-plane/mockData';
import { ChevronsUp, ChevronDown } from 'lucide-react';

export default function ControlPlanePage() {
  const [selectedScope, setSelectedScope] = useState<DecisionScope | null>(null);
  const [selectedActionMode, setSelectedActionMode] = useState<ActionMode | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<DecisionStatus | null>(null);
  const [riskFilter, setRiskFilter] = useState<RiskLevel | null>(null);
  const { isOpen: isJudgmentModalOpen, onOpen: onJudgmentModalOpen, onClose: onJudgmentModalClose } = useDisclosure();

  // Filter decisions based on scope and action mode
  const filteredDecisions = useMemo(() => {
    let filtered = [...mockDecisions];

    // Apply scope filters
    if (selectedScope) {
      switch (selectedScope) {
        case 'my-assigned':
          filtered = filtered.filter((d) => d.assignedTo !== null);
          break;
        case 'unassigned':
          filtered = filtered.filter((d) => d.assignedTo === null);
          break;
        case 'escalated':
          filtered = filtered.filter((d) => d.status === 'escalated');
          break;
        case 'high-risk':
          filtered = filtered.filter((d) => d.riskLevel === 'high');
          break;
        case 'medium-risk':
          filtered = filtered.filter((d) => d.riskLevel === 'medium');
          break;
      }
    }

    // Apply action mode filters
    if (selectedActionMode) {
      switch (selectedActionMode) {
        case 'review':
          filtered = filtered.filter((d) => d.status === 'pending' || d.status === 'in-review');
          break;
        case 'approvals':
          filtered = filtered.filter((d) => d.status === 'pending' && d.aiRecommendation.action === 'approve');
          break;
        case 'overrides':
          filtered = filtered.filter((d) => {
            // Overrides are decisions where human action differs from AI recommendation
            // For now, show all pending decisions
            return d.status === 'pending';
          });
          break;
      }
    }

    return filtered;
  }, [selectedScope, selectedActionMode]);

  // Note: Auto-selection is handled in DecisionWorkspace component
  // which has the final filtered list after all filters are applied

  const handleAction = (action: DecisionAction, justification: string) => {
    // In production, this would make an API call
    console.log('Action taken:', {
      decisionId: selectedDecision?.id,
      action,
      justification,
      timestamp: new Date().toISOString(),
    });

    // Update the decision status (in production, this would come from the API response)
    if (selectedDecision) {
      const updatedDecision: Decision = {
        ...selectedDecision,
        status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'escalated',
        updatedAt: new Date().toISOString(),
      };
      // In a real app, you'd update the state/API here
    }

    // Clear selection after action
    setSelectedDecision(null);
  };

  const handleShare = () => {
    if (selectedDecision) {
      // In production, this would open a share dialog or copy link to clipboard
      console.log('Share decision:', selectedDecision.id);
      // Example: navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleDownload = () => {
    if (selectedDecision) {
      // In production, this would generate and download a PDF/CSV/JSON file
      console.log('Download decision:', selectedDecision.id);
      // Example: Generate PDF or export decision data
    }
  };

  const getRiskIcon = (risk: RiskLevel) => {
    let color: string;
    switch (risk) {
      case 'high':
        color = '#DC2626'; // red.600 - darker red
        break;
      case 'medium':
        color = '#F97316'; // orange.500 - brighter orange
        break;
      case 'low':
        color = '#CA8A04'; // yellow.600
        break;
      default:
        color = '#6B7280'; // gray.600
    }
    
    if (risk === 'medium') {
      // Medium risk: 2 horizontal bars
      return (
        <VStack spacing={0.5} alignItems="center" justifyContent="center">
          {Array.from({ length: 2 }).map((_, index) => (
            <Box
              key={index}
              width="14px"
              height="2px"
              bg={color}
              borderRadius="1px"
            />
          ))}
        </VStack>
      );
    } else if (risk === 'high') {
      // High risk: chevrons-up in red
      return (
        <Box display="flex" alignItems="center" justifyContent="center">
          <ChevronsUp
            size={20}
            style={{ color }}
          />
        </Box>
      );
    } else {
      // Low risk: chevron-down in yellow
      return (
        <Box display="flex" alignItems="center" justifyContent="center">
          <ChevronDown
            size={20}
            style={{ color }}
          />
        </Box>
      );
    }
  };

  return (
    <DashboardLayout>
      {/* Page Heading with Divider - extends full width */}
      <Box 
        position="relative"
        margin="-48px -48px 0 -48px"
        width="calc(100% + 96px)"
        bg="white"
      >
        <Box px={8} py={2}>
          <HStack justify="space-between" alignItems="center" mb={2}>
            <Text 
              fontSize="xl" 
              color="gray.900" 
              fontWeight="600" 
              letterSpacing="-0.01em"
              flex={1}
            >
              Control Plane
            </Text>
            <Text 
              fontSize="lg" 
              color="gray.900" 
              fontWeight="600" 
              letterSpacing="-0.01em"
              flex={1}
              textAlign="center"
            >
              {selectedDecision ? `Decision ID: ${selectedDecision.id}` : '—'}
            </Text>
            <HStack spacing={2} flex={1} justify="flex-end">
              <IconButton
                aria-label="Share decision"
                icon={<Share2 size={18} />}
                size="sm"
                variant="ghost"
                color="gray.600"
                _hover={{ bg: 'gray.100', color: 'gray.900' }}
                _focus={{ boxShadow: 'none', outline: 'none' }}
                onClick={handleShare}
                isDisabled={!selectedDecision}
                opacity={selectedDecision ? 1 : 0.5}
              />
              <IconButton
                aria-label="Download decision"
                icon={<Download size={18} />}
                size="sm"
                variant="ghost"
                color="gray.600"
                _hover={{ bg: 'gray.100', color: 'gray.900' }}
                _focus={{ boxShadow: 'none', outline: 'none' }}
                onClick={handleDownload}
                isDisabled={!selectedDecision}
                opacity={selectedDecision ? 1 : 0.5}
              />
              <IconButton
                aria-label="Expand judgment"
                icon={<Maximize2 size={18} />}
                size="sm"
                variant="ghost"
                color="gray.600"
                _hover={{ bg: 'gray.100', color: 'gray.900' }}
                _focus={{ boxShadow: 'none', outline: 'none' }}
                onClick={onJudgmentModalOpen}
                isDisabled={!selectedDecision}
                opacity={selectedDecision ? 1 : 0.5}
              />
            </HStack>
          </HStack>
        </Box>
        <Divider borderColor="gray.300" />
      </Box>

      {/* Three Panels Container */}
      <Box 
        position="relative" 
        height="calc(100vh - 140px)" 
        display="flex"
        margin="0 -48px -48px -48px"
        width="calc(100% + 96px)"
        overflow="hidden"
      >
        {/* Panel 1: Decision Scope Panel (Left) */}
        <DecisionScopePanel
          selectedScope={selectedScope}
          selectedActionMode={selectedActionMode}
          onScopeChange={setSelectedScope}
          onActionModeChange={setSelectedActionMode}
          decisions={mockDecisions}
        />

        {/* Panel 2: Decision Workspace (Center) */}
        <DecisionWorkspace
          decisions={filteredDecisions}
          selectedDecision={selectedDecision}
          onSelectDecision={setSelectedDecision}
          searchFilter={searchFilter}
          onSearchChange={setSearchFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          riskFilter={riskFilter}
          onRiskFilterChange={setRiskFilter}
        />

        {/* Panel 3: Context & Action Panel (Right) */}
        <DecisionContextPanel
          decision={selectedDecision}
          onClose={() => setSelectedDecision(null)}
          onAction={handleAction}
        />
      </Box>

      {/* Judgment Modal */}
      <Modal isOpen={isJudgmentModalOpen} onClose={onJudgmentModalClose} size="xl">
        <ModalOverlay />
        <ModalContent 
          maxW="70vw" 
          maxH="85vh" 
          m="auto"
          borderRadius="lg"
          boxShadow="xl"
        >
          <ModalHeader>
            Judgment - {selectedDecision?.id}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody overflowY="auto" pb={6}>
            {selectedDecision ? (
              <VStack align="stretch" spacing={6}>
                {/* Decision ID and Risk */}
                <HStack spacing={3} alignItems="center">
                  <Text fontSize="lg" fontWeight="600" color="gray.900">
                    {selectedDecision.id}
                  </Text>
                  {getRiskIcon(selectedDecision.riskLevel)}
                </HStack>

                {/* Title */}
                <Text fontSize="md" fontWeight="500" color="gray.800">
                  {selectedDecision.title}
                </Text>

                <Divider borderColor="gray.200" />

                {/* Decision Context */}
                <Box>
                  <Text fontSize="xs" fontWeight="600" color="gray.600" mb={2} textTransform="uppercase" letterSpacing="0.05em">
                    Judgment
                  </Text>
                  <Text fontSize="sm" color="gray.700" lineHeight="1.6" mb={3}>
                    {selectedDecision.summary}
                  </Text>
                  {selectedDecision.sourceRefs.length > 0 && (
                    <VStack align="stretch" spacing={1} mt={3}>
                      <Text fontSize="xs" fontWeight="500" color="gray.600" mb={1}>
                        Source References:
                      </Text>
                      {selectedDecision.sourceRefs.map((ref, index) => (
                        <Text key={index} fontSize="xs" color="gray.600" fontFamily="mono">
                          • {ref}
                        </Text>
                      ))}
                    </VStack>
                  )}
                </Box>

                <Divider borderColor="gray.200" />

                {/* AI Recommendation */}
                <Box>
                  <Text fontSize="xs" fontWeight="600" color="gray.600" mb={2} textTransform="uppercase" letterSpacing="0.05em">
                    AI Recommendation
                  </Text>
                  <HStack mb={2}>
                    <Text
                      fontSize="sm"
                      fontWeight="600"
                      color={
                        selectedDecision.aiRecommendation.action === 'approve'
                          ? 'green.600'
                          : selectedDecision.aiRecommendation.action === 'reject'
                          ? 'red.600'
                          : 'orange.600'
                      }
                      textTransform="capitalize"
                    >
                      {selectedDecision.aiRecommendation.action}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      ({selectedDecision.aiRecommendation.confidence}% confidence)
                    </Text>
                  </HStack>
                  <Text fontSize="sm" color="gray.700" lineHeight="1.6">
                    {selectedDecision.aiRecommendation.explanation}
                  </Text>
                </Box>

                <Divider borderColor="gray.200" />

                {/* Risk Classification Rationale */}
                <Box>
                  <Text fontSize="xs" fontWeight="600" color="gray.600" mb={2} textTransform="uppercase" letterSpacing="0.05em">
                    Risk Classification Rationale
                  </Text>
                  <Text fontSize="sm" color="gray.700" lineHeight="1.6">
                    {selectedDecision.riskRationale}
                  </Text>
                </Box>

                <Divider borderColor="gray.200" />

                {/* Human Actions */}
                <Box>
                  <Text fontSize="xs" fontWeight="600" color="gray.600" mb={3} textTransform="uppercase" letterSpacing="0.05em">
                    Human Actions
                  </Text>
                  <Textarea
                    placeholder="Justification is required for all actions..."
                    size="sm"
                    minH="100px"
                    mb={4}
                    bg="gray.50"
                    borderColor="gray.300"
                    _focus={{ borderColor: 'gray.400', boxShadow: 'none', bg: 'white' }}
                    resize="vertical"
                    aria-label="Action justification"
                    isReadOnly
                  />
                  <HStack spacing={2}>
                    <Button
                      size="sm"
                      colorScheme="green"
                      isDisabled
                      _disabled={{ opacity: 0.5, cursor: 'not-allowed' }}
                      flex={1}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="red"
                      isDisabled
                      _disabled={{ opacity: 0.5, cursor: 'not-allowed' }}
                      flex={1}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="orange"
                      isDisabled
                      _disabled={{ opacity: 0.5, cursor: 'not-allowed' }}
                      flex={1}
                    >
                      Escalate
                    </Button>
                  </HStack>
                </Box>

                <Divider borderColor="gray.200" />

                {/* Audit Preview */}
                <Box>
                  <Text fontSize="xs" fontWeight="600" color="gray.600" mb={2} textTransform="uppercase" letterSpacing="0.05em">
                    Audit Preview
                  </Text>
                  <Box bg="gray.50" p={3} borderRadius="4px" border="1px solid" borderColor="gray.200">
                    <VStack align="stretch" spacing={1} fontSize="xs" fontFamily="mono" color="gray.700">
                      <Text>
                        <Text as="span" fontWeight="600">Decision:</Text> {selectedDecision.id}
                      </Text>
                      <Text>
                        <Text as="span" fontWeight="600">Action:</Text> [Pending selection]
                      </Text>
                      <Text>
                        <Text as="span" fontWeight="600">Justification:</Text> [Pending entry]
                      </Text>
                      <Text>
                        <Text as="span" fontWeight="600">Timestamp:</Text> {new Date().toISOString()}
                      </Text>
                      <Text>
                        <Text as="span" fontWeight="600">Reviewer:</Text> [Current user]
                      </Text>
                    </VStack>
                  </Box>
                </Box>
              </VStack>
            ) : null}
          </ModalBody>
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
}
