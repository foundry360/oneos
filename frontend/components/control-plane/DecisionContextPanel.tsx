/**
 * Context & Action Panel (Right Panel)
 * 
 * Purpose: Human judgment, review, and approval.
 * 
 * Behavior:
 * - Hidden by default
 * - Slides in when a decision is selected
 * - Scrolls independently
 * 
 * Rules:
 * - Actions require confirmation
 * - No modals except for destructive actions
 * - Justification is mandatory
 */

'use client';

import {
  Box,
  VStack,
  Text,
  Divider,
  Button,
  Textarea,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  HStack,
} from '@chakra-ui/react';
import { Decision, DecisionAction, RiskLevel } from './types';
import { useState } from 'react';
import { ClipboardCheck, ChevronsUp, ChevronDown } from 'lucide-react';

interface DecisionContextPanelProps {
  decision: Decision | null;
  onClose: () => void;
  onAction: (action: DecisionAction, justification: string) => void;
}

export default function DecisionContextPanel({
  decision,
  onClose,
  onAction,
}: DecisionContextPanelProps) {
  const [justification, setJustification] = useState('');
  const [pendingAction, setPendingAction] = useState<DecisionAction | null>(null);
  const { isOpen, onOpen, onClose: onCloseModal } = useDisclosure();

  const handleActionClick = (action: DecisionAction) => {
    if (!justification.trim()) {
      return; // Justification is mandatory
    }

    // Destructive actions require modal confirmation
    if (action === 'reject' || action === 'escalate') {
      setPendingAction(action);
      onOpen();
    } else {
      onAction(action, justification);
      setJustification('');
    }
  };

  const handleConfirmAction = () => {
    if (pendingAction) {
      onAction(pendingAction, justification);
      setJustification('');
      setPendingAction(null);
      onCloseModal();
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
              width="16px"
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

  const getActionButtonColor = (action: DecisionAction): string => {
    switch (action) {
      case 'approve':
        return 'green';
      case 'reject':
        return 'red';
      case 'escalate':
        return 'orange';
      default:
        return 'gray';
    }
  };

  return (
    <Box
      width="30%"
      bg="white"
      borderLeft="1px solid"
      borderColor="gray.200"
      height="100%"
      display="flex"
      flexDirection="column"
      overflowY="auto"
    >
      {/* Header - Always visible */}
      <Box
        px={8}
        py={5}
        borderBottom="1px solid"
        borderColor="gray.200"
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        position="sticky"
        top={0}
        bg="white"
        zIndex={1}
      >
        <Text fontSize="sm" fontWeight="600" color="gray.900" letterSpacing="0.01em">
          Judgment
        </Text>
      </Box>

      {!decision ? (
        /* Empty State */
        <Box
          flex="1"
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          px={8}
          py={12}
        >
          <Box mb={4} color="gray.400">
            <ClipboardCheck size={48} style={{ color: '#9CA3AF' }} />
          </Box>
          <Text fontSize="sm" color="gray.500" textAlign="center" maxW="200px">
            Select a decision to view details
          </Text>
        </Box>
      ) : (
        /* Content */

        <VStack align="stretch" spacing={0} flex="1" px={8} py={8}>
          {/* Decision ID and Risk */}
          <HStack spacing={3} mb={4} alignItems="center">
            <Text fontSize="lg" fontWeight="600" color="gray.900">
              {decision.id}
            </Text>
            {getRiskIcon(decision.riskLevel)}
          </HStack>

          {/* Title */}
          <Text fontSize="md" fontWeight="500" color="gray.800" mb={6}>
            {decision.title}
          </Text>

          <Divider borderColor="gray.200" mb={6} />

          {/* Decision Context */}
          <Box mb={6}>
            <Text fontSize="xs" fontWeight="600" color="gray.600" mb={2} textTransform="uppercase" letterSpacing="0.05em">
              Judgment
            </Text>
            <Text fontSize="sm" color="gray.700" lineHeight="1.6" mb={3}>
              {decision.summary}
            </Text>
            {decision.sourceRefs.length > 0 && (
              <VStack align="stretch" spacing={1} mt={3}>
                <Text fontSize="xs" fontWeight="500" color="gray.600" mb={1}>
                  Source References:
                </Text>
                {decision.sourceRefs.map((ref, index) => (
                  <Text key={index} fontSize="xs" color="gray.600" fontFamily="mono">
                    • {ref}
                  </Text>
                ))}
              </VStack>
            )}
          </Box>

          <Divider borderColor="gray.200" mb={6} />

          {/* AI Recommendation */}
          <Box mb={6}>
            <Text fontSize="xs" fontWeight="600" color="gray.600" mb={2} textTransform="uppercase" letterSpacing="0.05em">
              AI Recommendation
            </Text>
            <HStack mb={2}>
              <Text
                fontSize="sm"
                fontWeight="600"
                color={
                  decision.aiRecommendation.action === 'approve'
                    ? 'green.600'
                    : decision.aiRecommendation.action === 'reject'
                    ? 'red.600'
                    : 'orange.600'
                }
                textTransform="capitalize"
              >
                {decision.aiRecommendation.action}
              </Text>
              <Text fontSize="xs" color="gray.500">
                ({decision.aiRecommendation.confidence}% confidence)
              </Text>
            </HStack>
            <Text fontSize="sm" color="gray.700" lineHeight="1.6">
              {decision.aiRecommendation.explanation}
            </Text>
          </Box>

          <Divider borderColor="gray.200" mb={6} />

          {/* Risk Classification Rationale */}
          <Box mb={6}>
            <Text fontSize="xs" fontWeight="600" color="gray.600" mb={2} textTransform="uppercase" letterSpacing="0.05em">
              Risk Classification Rationale
            </Text>
            <Text fontSize="sm" color="gray.700" lineHeight="1.6">
              {decision.riskRationale}
            </Text>
          </Box>

          <Divider borderColor="gray.200" mb={6} />

          {/* Human Actions */}
          <Box mb={6}>
            <Text fontSize="xs" fontWeight="600" color="gray.600" mb={3} textTransform="uppercase" letterSpacing="0.05em">
              Human Actions
            </Text>

            <Textarea
              placeholder="Justification is required for all actions..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              size="sm"
              minH="100px"
              mb={4}
              bg="gray.50"
              borderColor="gray.300"
              _focus={{ borderColor: 'gray.400', boxShadow: 'none', bg: 'white' }}
              resize="vertical"
              aria-label="Action justification"
            />

            <HStack spacing={2}>
              <Button
                size="sm"
                colorScheme={getActionButtonColor('approve')}
                onClick={() => handleActionClick('approve')}
                isDisabled={!justification.trim()}
                _disabled={{ opacity: 0.5, cursor: 'not-allowed' }}
                aria-label="Approve decision"
                flex={1}
                fontSize="xs"
              >
                Approve
              </Button>
              <Button
                size="sm"
                colorScheme={getActionButtonColor('reject')}
                onClick={() => handleActionClick('reject')}
                isDisabled={!justification.trim()}
                _disabled={{ opacity: 0.5, cursor: 'not-allowed' }}
                aria-label="Reject decision"
                flex={1}
                fontSize="xs"
              >
                Reject
              </Button>
              <Button
                size="sm"
                colorScheme={getActionButtonColor('escalate')}
                onClick={() => handleActionClick('escalate')}
                isDisabled={!justification.trim()}
                _disabled={{ opacity: 0.5, cursor: 'not-allowed' }}
                aria-label="Escalate decision"
                flex={1}
                fontSize="xs"
              >
                Escalate
              </Button>
            </HStack>
          </Box>

          <Divider borderColor="gray.200" mb={6} />

          {/* Audit Preview */}
          <Box>
            <Text fontSize="xs" fontWeight="600" color="gray.600" mb={2} textTransform="uppercase" letterSpacing="0.05em">
              Audit Preview
            </Text>
            <Box bg="gray.50" p={3} borderRadius="4px" border="1px solid" borderColor="gray.200">
              <VStack align="stretch" spacing={1} fontSize="xs" fontFamily="mono" color="gray.700">
                <Text>
                  <Text as="span" fontWeight="600">Decision:</Text> {decision.id}
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
      )}
      
      {/* Confirmation Modal for Destructive Actions */}
      <Modal isOpen={isOpen} onClose={onCloseModal} size="md">
        <ModalOverlay />
        <ModalContent borderRadius="3xl">
          <ModalHeader>
            Confirm {pendingAction === 'reject' ? 'Rejection' : 'Escalation'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={4}>
              Are you sure you want to {pendingAction} this decision? This action will be logged
              and may require additional approvals.
            </Text>
            <Text fontSize="sm" color="gray.600" fontWeight="500" mb={2}>
              Justification:
            </Text>
            <Text fontSize="sm" color="gray.700" bg="gray.50" p={3} borderRadius="4px">
              {justification}
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCloseModal} h="30px" fontSize="xs">
              Cancel
            </Button>
            <Button
              colorScheme={getActionButtonColor(pendingAction || 'reject')}
              onClick={handleConfirmAction}
              h="30px"
              fontSize="xs"
            >
              Confirm {pendingAction === 'reject' ? 'Rejection' : 'Escalation'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

