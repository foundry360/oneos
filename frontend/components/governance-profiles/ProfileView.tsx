'use client';

import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Divider,
  Code,
  Alert,
  AlertIcon,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Textarea,
} from '@chakra-ui/react';
import { CheckCircle, XCircle, AlertTriangle, Eye, History, Check, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useGovernanceProfiles, GovernanceProfile, AuditEntry } from '@/hooks/useGovernanceProfiles';
import axios from 'axios';

interface ProfileViewProps {
  profile: GovernanceProfile | null;
  onClose: () => void;
  onEdit?: () => void;
  onRefresh?: () => void;
}

export default function ProfileView({ profile, onClose, onEdit, onRefresh }: ProfileViewProps) {
  const { activateProfile, deprecateProfile, fetchAuditHistory } = useGovernanceProfiles();
  const [auditHistory, setAuditHistory] = useState<AuditEntry[]>([]);
  const [versionHistory, setVersionHistory] = useState<GovernanceProfile[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [activating, setActivating] = useState(false);
  const [deprecating, setDeprecating] = useState(false);
  const toast = useToast();
  const { isOpen: isActivateOpen, onOpen: onActivateOpen, onClose: onActivateClose } = useDisclosure();
  const { isOpen: isDeprecateOpen, onOpen: onDeprecateOpen, onClose: onDeprecateClose } = useDisclosure();
  const { isOpen: isAuditOpen, onOpen: onAuditOpen, onClose: onAuditClose } = useDisclosure();
  const [justification, setJustification] = useState('');

  useEffect(() => {
    const loadAuditHistory = async () => {
      if (!profile) return;
      setLoadingAudit(true);
      try {
        const history = await fetchAuditHistory(profile.id);
        setAuditHistory(history);
      } catch (error) {
        console.error('Failed to load audit history:', error);
      } finally {
        setLoadingAudit(false);
      }
    };

    const loadVersionHistory = async () => {
      if (!profile) return;
      setLoadingVersions(true);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const API_URL = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
        const token = localStorage.getItem('auth-token');
        const response = await axios.get(`${API_URL}/governance-profiles?name=${encodeURIComponent(profile.name)}`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        });
        setVersionHistory(response.data.profiles || []);
      } catch (error) {
        console.error('Failed to load version history:', error);
      } finally {
        setLoadingVersions(false);
      }
    };

    if (profile) {
      loadAuditHistory();
      loadVersionHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);


  const handleActivate = async () => {
    if (!profile) return;
    setActivating(true);
    try {
      await activateProfile(profile.id, justification);
      toast({
        title: 'Profile activated',
        description: 'The profile has been activated successfully.',
        status: 'success',
        duration: 3000,
      });
      onActivateClose();
      setJustification('');
      if (onRefresh) onRefresh();
    } catch (error: any) {
      toast({
        title: 'Activation failed',
        description: error.response?.data?.error || 'Failed to activate profile',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setActivating(false);
    }
  };

  const handleDeprecate = async () => {
    if (!profile) return;
    setDeprecating(true);
    try {
      await deprecateProfile(profile.id, justification);
      toast({
        title: 'Profile deprecated',
        description: 'The profile has been deprecated successfully.',
        status: 'success',
        duration: 3000,
      });
      onDeprecateClose();
      setJustification('');
      if (onRefresh) onRefresh();
    } catch (error: any) {
      toast({
        title: 'Deprecation failed',
        description: error.response?.data?.error || 'Failed to deprecate profile',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setDeprecating(false);
    }
  };

  const capitalizeFirst = (str: string) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  return (
    <Box height="100%" display="flex" flexDirection="column">
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
          Profile Details
        </Text>
      </Box>

      {!profile ? (
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
          <Text fontSize="sm" color="gray.500" textAlign="center" maxW="200px">
            Select a profile to view details
          </Text>
        </Box>
      ) : (
        /* Content */
        <Box flex="1" overflowY="auto" px={8} py={8}>
          <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          {profile.status === 'active' && (
            <Button
              leftIcon={<XCircle size={16} />}
              colorScheme="red"
              variant="outline"
              onClick={onDeprecateOpen}
            >
              Deprecate
            </Button>
          )}
          <HStack justify="flex-end">
            {profile.status === 'draft' && (
              <>
                <Button
                  leftIcon={<CheckCircle size={16} />}
                  colorScheme="green"
                  onClick={onActivateOpen}
                >
                  Activate
                </Button>
                {onEdit && (
                  <Button
                    leftIcon={<Eye size={16} />}
                    onClick={onEdit}
                  >
                    Edit
                  </Button>
                )}
              </>
            )}
          </HStack>
        </HStack>

        <Divider />

        <VStack align="stretch" spacing={4}>
          <Box>
            <Text fontWeight="bold" mb={2}>Domain</Text>
            <Badge>{profile.domain}</Badge>
          </Box>

          {profile.description && (
            <Box>
              <Text fontWeight="bold" mb={2}>Description</Text>
              <Text>{profile.description}</Text>
            </Box>
          )}

          <Box>
            <Text fontWeight="bold" mb={2}>Human Review Requirement</Text>
            <Badge textTransform="none">{capitalizeFirst(profile.human_review_requirement)}</Badge>
          </Box>

          <Box>
            <Text fontWeight="bold" mb={2}>Allowed Actions</Text>
            <HStack spacing={2}>
              {profile.allowed_actions.map((action) => (
                <Badge key={action} fontSize="xs" textTransform="none">
                  {capitalizeFirst(action)}
                </Badge>
              ))}
            </HStack>
          </Box>

          <Box>
            <Text fontWeight="bold" mb={2}>Risk Thresholds</Text>
            <Code p={2} borderRadius="md" display="block" whiteSpace="pre-wrap">
              {JSON.stringify(profile.risk_thresholds, null, 2)}
            </Code>
          </Box>

          <Box>
            <Text fontWeight="bold" mb={2}>Assignment Rules</Text>
            <Code p={2} borderRadius="md" display="block" whiteSpace="pre-wrap">
              {JSON.stringify(profile.assignment_rules, null, 2)}
            </Code>
          </Box>

          {profile.rules && profile.rules.length > 0 && (
            <Box>
              <Text fontWeight="bold" mb={2}>Rules ({profile.rules.length})</Text>
              <VStack align="stretch" spacing={2}>
                {profile.rules.map((rule) => (
                  <Box key={rule.id} p={3} bg="gray.50" borderRadius="md">
                    <HStack justify="space-between" mb={1}>
                      <Badge>{rule.rule_type}</Badge>
                      <Text fontSize="sm" color="gray.600">Priority: {rule.priority}</Text>
                    </HStack>
                    <Text fontWeight="medium">{rule.rule_key}</Text>
                    <Code fontSize="xs" mt={1} display="block" whiteSpace="pre-wrap">
                      {JSON.stringify(rule.rule_value, null, 2)}
                    </Code>
                  </Box>
                ))}
              </VStack>
            </Box>
          )}

          {profile.data_controls && profile.data_controls.length > 0 && (
            <Box>
              <Text fontWeight="bold" mb={2}>Data Controls ({profile.data_controls.length})</Text>
              <VStack align="stretch" spacing={2}>
                {profile.data_controls.map((control) => (
                  <Box key={control.id} p={3} bg="gray.50" borderRadius="md">
                    <HStack justify="space-between">
                      <Badge colorScheme={control.is_required ? 'red' : 'gray'}>
                        {control.control_type} {control.is_required && '(Required)'}
                      </Badge>
                    </HStack>
                    <Code fontSize="xs" mt={1} display="block" whiteSpace="pre-wrap">
                      {JSON.stringify(control.control_config, null, 2)}
                    </Code>
                  </Box>
                ))}
              </VStack>
            </Box>
          )}

          {profile.version_hash && (
            <Box>
              <Text fontWeight="bold" mb={2}>Version Hash</Text>
              <Code fontSize="xs" p={2} borderRadius="md" display="block">
                {profile.version_hash}
              </Code>
            </Box>
          )}

          <Box>
            <Text fontWeight="bold" mb={2}>Version History</Text>
            {loadingVersions ? (
              <Text color="gray.500" fontSize="sm">Loading...</Text>
            ) : versionHistory.length > 0 ? (
              <VStack align="stretch" spacing={2}>
                {versionHistory
                  .sort((a, b) => b.version - a.version)
                  .map((version) => {
                    const getStatusIcon = (status: string) => {
                      switch (status) {
                        case 'active':
                          return (
                            <Box
                              w="13px"
                              h="13px"
                              borderRadius="full"
                              bg="green.500"
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                            >
                              <Check size={8} color="white" strokeWidth={3} />
                            </Box>
                          );
                        case 'draft':
                          return (
                            <Box
                              w="13px"
                              h="13px"
                              borderRadius="full"
                              bg="yellow.500"
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                            >
                              <AlertTriangle size={8} color="white" fill="white" />
                            </Box>
                          );
                        case 'deprecated':
                          return (
                            <Box
                              w="13px"
                              h="13px"
                              borderRadius="full"
                              bg="gray.500"
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                            >
                              <X size={8} color="white" strokeWidth={3} />
                            </Box>
                          );
                        default:
                          return null;
                      }
                    };
                    return (
                      <Box key={version.id} p={2} bg="gray.50" borderRadius="md">
                        <HStack justify="space-between" mb={1}>
                          <HStack spacing={2}>
                            <Text fontWeight="medium" fontSize="xs">v {version.version}.0.0</Text>
                            {getStatusIcon(version.status)}
                          </HStack>
                          <Text fontSize="2xs" color="gray.600">
                            {version.activated_at 
                              ? new Date(version.activated_at).toLocaleDateString()
                              : version.created_at 
                              ? new Date(version.created_at).toLocaleDateString()
                              : ''}
                          </Text>
                        </HStack>
                        {version.description && (
                          <Text fontSize="2xs" color="gray.600" noOfLines={1}>
                            {version.description}
                          </Text>
                        )}
                      </Box>
                    );
                  })}
              </VStack>
            ) : (
              <Text color="gray.500" fontSize="sm">No version history available</Text>
            )}
          </Box>
        </VStack>
      </VStack>

      {/* Activate Modal */}
      <Modal isOpen={isActivateOpen} onClose={onActivateClose}>
        <ModalOverlay />
        <ModalContent borderRadius="xl">
          <ModalHeader>Activate Profile</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="warning" mb={4}>
              <AlertIcon />
              Activating this profile will deprecate any other active version with the same name.
            </Alert>
            <Textarea
              placeholder="Justification (optional)"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onActivateClose}>
              Cancel
            </Button>
            <Button colorScheme="green" onClick={handleActivate} isLoading={activating}>
              Activate
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Deprecate Modal */}
      <Modal isOpen={isDeprecateOpen} onClose={onDeprecateClose}>
        <ModalOverlay />
        <ModalContent borderRadius="xl">
          <ModalHeader>Deprecate Profile</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="warning" mb={4}>
              <AlertIcon />
              Deprecating this profile will make it unavailable for new decisions.
            </Alert>
            <Textarea
              placeholder="Justification (optional)"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onDeprecateClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={handleDeprecate} isLoading={deprecating}>
              Deprecate
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Audit History Modal */}
      <Modal isOpen={isAuditOpen} onClose={onAuditClose} size="xl">
        <ModalOverlay />
        <ModalContent borderRadius="xl">
          <ModalHeader>Audit History</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={2} maxH="400px" overflowY="auto">
              {auditHistory.map((entry) => (
                <Box key={entry.id} p={3} bg="gray.50" borderRadius="md">
                  <HStack justify="space-between" mb={1}>
                    <Badge>{entry.action}</Badge>
                    <Text fontSize="xs" color="gray.600">
                      {new Date(entry.performed_at).toLocaleString()}
                    </Text>
                  </HStack>
                  {entry.justification && (
                    <Text fontSize="sm" mb={1}>{entry.justification}</Text>
                  )}
                  {entry.ledger_hash && (
                    <Text fontSize="xs" color="gray.500" fontFamily="mono">
                      Ledger: {entry.ledger_hash.substring(0, 16)}...
                    </Text>
                  )}
                </Box>
              ))}
              {auditHistory.length === 0 && (
                <Text color="gray.500" textAlign="center" py={4}>
                  No audit history available
                </Text>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onAuditClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
        </Box>
      )}
    </Box>
  );
}

