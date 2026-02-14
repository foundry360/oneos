/**
 * Full-Page Governance Profile View
 * 
 * Comprehensive view of a governance profile with all sections:
 * - Sticky header with actions
 * - Policy Statement
 * - Scope & Applicability
 * - Risk Thresholds
 * - Assignment Rules
 * - Workflow Behavior
 * - Version History & Integrity
 * - Audit Metadata
 * - Advanced Configuration
 */

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
  Input,
  FormControl,
  FormLabel,
  FormHelperText,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  IconButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tooltip,
  Checkbox,
} from '@chakra-ui/react';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Archive, 
  CopyCheck, 
  FolderOutput, 
  Copy, 
  Download,
  Check,
  SquarePen,
  ChevronsUp,
  ChevronDown,
  ArrowLeft,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useGovernanceProfiles, GovernanceProfile, AuditEntry } from '@/hooks/useGovernanceProfiles';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import axios from 'axios';

interface FullProfileViewProps {
  profileId: string;
  onBack?: () => void;
}

export default function FullProfileView({ profileId, onBack }: FullProfileViewProps) {
  const { fetchProfile, activateProfile, archiveProfile, fetchAuditHistory, exportProfile, createNewVersion, updateProfile } = useGovernanceProfiles();
  const { user } = useAuth();
  const { profile: userProfile } = useProfile(user?.id);
  const isAdmin = userProfile?.role === 'admin';
  
  const [profile, setProfile] = useState<GovernanceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditHistory, setAuditHistory] = useState<AuditEntry[]>([]);
  const [versionHistory, setVersionHistory] = useState<GovernanceProfile[]>([]);
  const [activating, setActivating] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [updatingPolicy, setUpdatingPolicy] = useState(false);
  
  // Modal states
  const { isOpen: isActivateOpen, onOpen: onActivateOpen, onClose: onActivateClose } = useDisclosure();
  const { isOpen: isArchiveOpen, onOpen: onArchiveOpen, onClose: onArchiveClose } = useDisclosure();
  const { isOpen: isExportOpen, onOpen: onExportOpen, onClose: onExportClose } = useDisclosure();
  const { isOpen: isCreateVersionOpen, onOpen: onCreateVersionOpen, onClose: onCreateVersionClose } = useDisclosure();
  
  // Form states
  const [justification, setJustification] = useState('');
  const [activateConfirmation, setActivateConfirmation] = useState('');
  const [archiveConfirmation, setArchiveConfirmation] = useState('');
  const [policyStatement, setPolicyStatement] = useState('');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'json'>('pdf');
  const [exportConfirmed, setExportConfirmed] = useState(false);
  const [exportResult, setExportResult] = useState<{ artifactHash: string; timestamp: string; downloadUrl?: string } | null>(null);
  
  const toast = useToast();

  useEffect(() => {
    loadProfile();
  }, [profileId]);

  useEffect(() => {
    if (profile) {
      setPolicyStatement(profile.description || '');
      loadAuditHistory();
      loadVersionHistory();
    }
  }, [profile]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const fetchedProfile = await fetchProfile(profileId);
      setProfile(fetchedProfile);
    } catch (error: any) {
      toast({
        title: 'Failed to load profile',
        description: error.message || 'Could not load governance profile',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAuditHistory = async () => {
    if (!profile) return;
    try {
      const history = await fetchAuditHistory(profile.id);
      setAuditHistory(history);
    } catch (error) {
      console.error('Failed to load audit history:', error);
    }
  };

  const loadVersionHistory = async () => {
    if (!profile) return;
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
    }
  };

  const handleActivate = async () => {
    if (!profile || activateConfirmation !== 'Activate') return;
    setActivating(true);
    try {
      const updatedProfile = await activateProfile(profile.id, justification);
      setProfile(updatedProfile);
      toast({
        title: 'Profile activated',
        description: 'The profile has been activated successfully.',
        status: 'success',
        duration: 3000,
      });
      onActivateClose();
      setJustification('');
      setActivateConfirmation('');
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

  const handleArchive = async () => {
    if (!profile || archiveConfirmation !== 'Archive') return;
    setArchiving(true);
    try {
      const updatedProfile = await archiveProfile(profile.id, justification);
      setProfile(updatedProfile);
      toast({
        title: 'Profile archived',
        description: 'The profile has been archived successfully.',
        status: 'success',
        duration: 3000,
      });
      onArchiveClose();
      setJustification('');
      setArchiveConfirmation('');
    } catch (error: any) {
      toast({
        title: 'Archive failed',
        description: error.response?.data?.error || 'Failed to archive profile',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setArchiving(false);
    }
  };

  const handleCreateNewVersion = async () => {
    if (!profile) return;
    setCreatingVersion(true);
    try {
      const newProfile = await createNewVersion(profile.id);
      toast({
        title: 'New version created',
        description: `Version ${newProfile.version} has been created as a draft.`,
        status: 'success',
        duration: 3000,
      });
      onCreateVersionClose();
      // Optionally navigate to the new version
      if (onBack) {
        // In a real app, you might navigate to the new profile
        // For now, just refresh the list
        loadVersionHistory();
      }
    } catch (error: any) {
      toast({
        title: 'Failed to create new version',
        description: error.response?.data?.error || 'Failed to create new version',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setCreatingVersion(false);
    }
  };

  const handleExport = async () => {
    if (!profile || !exportConfirmed) return;
    
    // Validate justification
    if (!justification.trim()) {
      toast({
        title: 'Justification required',
        description: 'Please provide a justification for the export.',
        status: 'error',
        duration: 3000,
      });
      return;
    }
    
    setExporting(true);
    try {
      const result = await exportProfile(profile.id, {
        format: exportFormat,
        scope: 'this_version',
        justification: justification.trim(),
      });
      setExportResult({
        artifactHash: result.artifact_hash,
        timestamp: result.timestamp,
        downloadUrl: result.download_url,
      });
      toast({
        title: 'Profile exported',
        description: 'The profile has been exported successfully.',
        status: 'success',
        duration: 3000,
      });
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.response?.data?.error || 'Failed to export profile',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setExporting(false);
    }
  };

  const handleUpdatePolicyStatement = async () => {
    if (!profile || profile.status !== 'draft') return;
    setUpdatingPolicy(true);
    try {
      const updatedProfile = await updateProfile(profile.id, {
        description: policyStatement,
      });
      setProfile(updatedProfile);
      toast({
        title: 'Policy statement updated',
        description: 'The policy statement has been updated successfully.',
        status: 'success',
        duration: 3000,
      });
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.response?.data?.error || 'Failed to update policy statement',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setUpdatingPolicy(false);
    }
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast({
      title: 'Hash copied',
      description: 'Hash copied to clipboard',
      status: 'success',
      duration: 2000,
    });
  };

  const capitalizeFirst = (str: string) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge
            bg="green.100"
            color="green.800"
            display="inline-flex"
            alignItems="center"
            gap={1.5}
            px={2}
            py={1}
            borderRadius="md"
            fontSize="xs"
            fontWeight="500"
          >
            <Check size={12} />
            Active
          </Badge>
        );
      case 'draft':
        return (
          <Badge
            bg="yellow.100"
            color="yellow.800"
            display="inline-flex"
            alignItems="center"
            gap={1.5}
            px={2}
            py={1}
            borderRadius="md"
            fontSize="xs"
            fontWeight="500"
          >
            <AlertTriangle size={12} />
            Draft
          </Badge>
        );
      case 'archived':
        return (
          <Badge
            bg="gray.100"
            color="gray.800"
            display="inline-flex"
            alignItems="center"
            gap={1.5}
            px={2}
            py={1}
            borderRadius="md"
            fontSize="xs"
            fontWeight="500"
          >
            <Archive size={12} />
            Archived
          </Badge>
        );
      default:
        return null;
    }
  };

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'low':
        return { bg: 'green.50', color: 'green.700', border: 'green.200' };
      case 'medium':
        return { bg: 'yellow.50', color: 'yellow.700', border: 'yellow.200' };
      case 'high':
        return { bg: 'red.50', color: 'red.700', border: 'red.200' };
      default:
        return { bg: 'gray.50', color: 'gray.700', border: 'gray.200' };
    }
  };

  // Derive workflow behavior summaries
  const deriveWorkflowBehavior = () => {
    if (!profile) return null;
    
    const thresholds = profile.risk_thresholds || {};
    const hasHumanReview = Object.values(thresholds).some((t: any) => t?.requires_review === true);
    const hasAutoApproval = Object.values(thresholds).some((t: any) => t?.auto_approve === true);
    const hasEscalation = profile.assignment_rules?.escalation_hours != null;
    
    return {
      humanReviewRequired: hasHumanReview || profile.human_review_requirement === 'required',
      autoApprovalAllowed: hasAutoApproval,
      escalationEnabled: hasEscalation,
    };
  };

  const workflowBehavior = deriveWorkflowBehavior();

  // Get use cases from metadata
  const useCases = profile?.metadata?.use_case 
    ? (Array.isArray(profile.metadata.use_case) ? profile.metadata.use_case : [profile.metadata.use_case])
    : [];
  const systems = profile?.metadata?.systems || [];
  const dataSensitivity = profile?.metadata?.data_sensitivity || [];

  if (loading) {
    return (
      <Box p={8} textAlign="center">
        <Text color="gray.500">Loading profile...</Text>
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box p={8} textAlign="center">
        <Text color="gray.500">Profile not found</Text>
        {onBack && (
          <Button mt={4} onClick={onBack} size="sm">
            Back to Profiles
          </Button>
        )}
      </Box>
    );
  }

  const isDraft = profile.status === 'draft';
  const isActive = profile.status === 'active';
  const isArchived = profile.status === 'archived';

  return (
    <Box bg="white" minH="100vh" margin="-56px -56px 0 -56px" width="calc(100% + 112px)">
      {/* Sticky Header - positioned to sit flush below dashboard header */}
      {/* The scroll container starts below the 64px dashboard header */}
      {/* Using top="0" makes it stick at scroll container top, transform pulls it up to be flush */}
      <Box
        position="sticky"
        top="0"
        zIndex={99}
        bg="white"
        borderBottom="1px solid"
        borderColor="gray.200"
        py={4}
        boxShadow="0 1px 0 0 rgba(0,0,0,0.05)"
        transform="translateY(-56px)"
        paddingTop="56px"
      >
        <Box px={8} ml="56px" mr="56px">
          <VStack align="stretch" spacing={3}>
          <VStack align="stretch" spacing={3}>
            <HStack spacing={3} align="center" position="relative">
              {onBack && (
                <IconButton
                  aria-label="Back to Profiles"
                  icon={<ArrowLeft size={20} />}
                  size="sm"
                  variant="outline"
                  onClick={onBack}
                  h="32px"
                  minW="32px"
                  position="absolute"
                  left="-56px"
                  color="gray.600"
                  borderColor="gray.300"
                  _hover={{ bg: 'gray.100', borderColor: 'gray.400' }}
                />
              )}
              <Text fontSize="2xl" fontWeight="600" color="gray.900">
                {profile.name}
              </Text>
              {getStatusBadge(profile.status)}
              <Text fontSize="sm" color="gray.600">
                v{profile.version}.0.0
              </Text>
            </HStack>
            <HStack justify="space-between" align="center">
              <HStack spacing={2} flexWrap="wrap">
                <Badge bg="blue.50" color="blue.800" fontSize="xs" px={2} py={0.5} textTransform="uppercase">
                  {profile.domain}
                </Badge>
                {useCases.length > 0 && (
                  <Badge bg="blue.50" color="blue.800" fontSize="xs" px={2} py={0.5}>
                    {useCases[0]}
                  </Badge>
                )}
              </HStack>
              
              <HStack spacing={2}>
                {isDraft && (
                  <Button
                    leftIcon={<CheckCircle size={16} />}
                    size="sm"
                    colorScheme="blue"
                    onClick={onActivateOpen}
                    h="32px"
                    fontSize="xs"
                  >
                    Activate
                  </Button>
                )}
                {(isActive || isArchived) && (
                  <Tooltip label="Create New Version" fontSize="xs">
                    <Box
                      as="button"
                      onClick={onCreateVersionOpen}
                      p={1.5}
                      borderRadius="md"
                      border="1px solid"
                      borderColor="gray.200"
                      _hover={{ bg: 'gray.100' }}
                      transition="all 0.2s"
                      cursor="pointer"
                      aria-label="Create New Version"
                      disabled={creatingVersion}
                      opacity={creatingVersion ? 0.6 : 1}
                    >
                      <CopyCheck size={18} color="#6B7280" />
                    </Box>
                  </Tooltip>
                )}
                {isActive && (
                  <Tooltip label="Archive Profile" fontSize="xs">
                    <Box
                      as="button"
                      onClick={onArchiveOpen}
                      p={1.5}
                      borderRadius="md"
                      border="1px solid"
                      borderColor="gray.200"
                      _hover={{ bg: 'gray.100' }}
                      transition="all 0.2s"
                      cursor="pointer"
                      aria-label="Archive Profile"
                    >
                      <Archive size={18} color="#6B7280" />
                    </Box>
                  </Tooltip>
                )}
                {isAdmin && (
                  <Tooltip label="Export Profile" fontSize="xs">
                    <Box
                      as="button"
                      onClick={onExportOpen}
                      p={1.5}
                      borderRadius="md"
                      border="1px solid"
                      borderColor="gray.200"
                      _hover={{ bg: 'gray.100' }}
                      transition="all 0.2s"
                      cursor="pointer"
                      aria-label="Export Profile"
                    >
                      <FolderOutput size={18} color="#6B7280" />
                    </Box>
                  </Tooltip>
                )}
              </HStack>
            </HStack>
          </VStack>
          </VStack>
        </Box>
      </Box>

      {/* Main Content - Two Column Layout */}
      <Box px={8} py={6} ml="56px" mr="56px">
        <Box display="flex" gap={12} width="100%">
          {/* Left Column - 50% */}
          <Box width="50%" minW="0">
            <VStack align="stretch" spacing={8}>
          {/* Policy Statement Section */}
          <Box
            p={6}
            bg="white"
            borderRadius="md"
            boxShadow="sm"
            border="1px solid"
            borderColor="gray.200"
          >
            <Text fontSize="lg" fontWeight="600" mb={3}>
              Policy Statement
            </Text>
            {isActive ? (
              <Box
                p={4}
                bg="gray.50"
                borderRadius="md"
                border="1px solid"
                borderColor="gray.200"
              >
                <Text fontSize="sm" color="gray.700" whiteSpace="pre-wrap">
                  {profile.description || 'No policy statement provided.'}
                </Text>
              </Box>
            ) : (
              <VStack align="stretch" spacing={3}>
                <FormControl>
                  <Textarea
                    value={policyStatement}
                    onChange={(e) => setPolicyStatement(e.target.value)}
                    placeholder="Enter the governance policy statement..."
                    minH="120px"
                    fontSize="sm"
                    border="1px solid"
                    borderColor="gray.300"
                    _focus={{
                      borderColor: 'gray.400',
                      boxShadow: 'none',
                    }}
                  />
                  <FormHelperText fontSize="xs" color="gray.600">
                    This statement defines the governance intent and scope for this profile. It will become read-only once the profile is activated.
                  </FormHelperText>
                </FormControl>
                <HStack justify="flex-end">
                  <Button
                    size="sm"
                    colorScheme="blue"
                    onClick={handleUpdatePolicyStatement}
                    isLoading={updatingPolicy}
                    h="32px"
                    fontSize="xs"
                    isDisabled={policyStatement === (profile.description || '')}
                  >
                    Save Changes
                  </Button>
                </HStack>
              </VStack>
            )}
          </Box>

          {/* Scope & Applicability */}
          <Box
            p={6}
            bg="white"
            borderRadius="md"
            boxShadow="sm"
            border="1px solid"
            borderColor="gray.200"
          >
            <Text fontSize="lg" fontWeight="600" mb={3}>
              Scope & Applicability
            </Text>
            <VStack align="stretch" spacing={3}>
              <HStack spacing={2} flexWrap="wrap">
                <Text fontSize="sm" fontWeight="500" color="gray.700">Domain:</Text>
                <Badge bg="blue.50" color="blue.800" fontSize="xs" px={2} py={0.5} textTransform="uppercase">
                  {profile.domain}
                </Badge>
              </HStack>
              
              {useCases.length > 0 && (
                <HStack spacing={2} flexWrap="wrap">
                  <Text fontSize="sm" fontWeight="500" color="gray.700">Use Cases:</Text>
                  {useCases.map((uc, idx) => (
                    <Badge key={idx} bg="blue.50" color="blue.800" fontSize="xs" px={2} py={0.5}>
                      {uc}
                    </Badge>
                  ))}
                </HStack>
              )}
              
              {systems.length > 0 && (
                <HStack spacing={2} flexWrap="wrap">
                  <Text fontSize="sm" fontWeight="500" color="gray.700">Systems:</Text>
                  {systems.map((sys, idx) => (
                    <Badge key={idx} bg="gray.100" color="gray.700" fontSize="xs" px={2} py={0.5}>
                      {sys}
                    </Badge>
                  ))}
                </HStack>
              )}
              
              {dataSensitivity.length > 0 && (
                <HStack spacing={2} flexWrap="wrap">
                  <Text fontSize="sm" fontWeight="500" color="gray.700">Data Sensitivity:</Text>
                  {dataSensitivity.map((ds, idx) => (
                    <Badge key={idx} bg="orange.50" color="orange.700" fontSize="xs" px={2} py={0.5}>
                      {ds}
                    </Badge>
                  ))}
                </HStack>
              )}
            </VStack>
          </Box>

          {/* Risk Thresholds */}
          <Box
            p={6}
            bg="white"
            borderRadius="md"
            boxShadow="sm"
            border="1px solid"
            borderColor="gray.200"
          >
            <Text fontSize="lg" fontWeight="600" mb={3}>
              Risk Thresholds
            </Text>
            <Box
              overflowX="auto"
            >
              <Table variant="simple" size="sm" minW="100%">
                <Thead>
                  <Tr>
                    <Th fontSize="xs" fontWeight="600" color="gray.700" textTransform="none" px={1} py={1.5} whiteSpace="nowrap" textAlign="left" bg="gray.100">
                      <Tooltip label="Risk level classification" placement="top">
                        Risk
                      </Tooltip>
                    </Th>
                    <Th fontSize="xs" fontWeight="600" color="gray.700" textTransform="none" px={0} py={1.5} whiteSpace="nowrap" textAlign="left" bg="gray.100">
                      <Tooltip label="Human intervention required" placement="top">
                        Human Intervention
                      </Tooltip>
                    </Th>
                    <Th fontSize="xs" fontWeight="600" color="gray.700" textTransform="none" px={0} py={1.5} whiteSpace="nowrap" textAlign="left" bg="gray.100">
                      <Tooltip label="Auto-approval enabled" placement="top">
                        Auto Review
                      </Tooltip>
                    </Th>
                    <Th fontSize="xs" fontWeight="600" color="gray.700" textTransform="none" px={0} py={1.5} whiteSpace="nowrap" textAlign="left" bg="gray.100">
                      <Tooltip label="Additional review requirements" placement="top">
                        Review Type
                      </Tooltip>
                    </Th>
                    <Th fontSize="xs" fontWeight="600" color="gray.700" textTransform="none" px={0} py={1.5} whiteSpace="nowrap" textAlign="left" bg="gray.100">
                      <Tooltip label="Number of required reviews" placement="top">
                        Reviews
                      </Tooltip>
                    </Th>
                    <Th fontSize="xs" fontWeight="600" color="gray.700" textTransform="none" px={0} py={1.5} whiteSpace="nowrap" textAlign="left" bg="gray.100">
                      <Tooltip label="Service level agreement in hours" placement="top">
                        SLA
                      </Tooltip>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {['low', 'medium', 'high'].map((level) => {
                    const threshold = profile.risk_thresholds?.[level];
                    if (!threshold) return null;

                    const getBadgeColor = (level: string) => {
                      switch (level) {
                        case 'low':
                          return { bg: 'green.50', color: 'green.700' };
                        case 'medium':
                          return { bg: 'yellow.50', color: 'yellow.700' };
                        case 'high':
                          return { bg: 'red.50', color: 'red.700' };
                        default:
                          return { bg: 'gray.50', color: 'gray.700' };
                      }
                    };

                    const badgeColors = getBadgeColor(level);
                    const additionalRequirements: string[] = [];

                    if (threshold.requires_medical_expert) additionalRequirements.push('Medical');
                    if (threshold.requires_legal_review) additionalRequirements.push('Legal');
                    if (threshold.requires_hr_review) additionalRequirements.push('HR');
                    if (threshold.requires_technical_review) additionalRequirements.push('Tech');
                    if (threshold.requires_compliance_review) additionalRequirements.push('Compliance');

                    return (
                      <Tr key={level}>
                        <Td px={1} py={1.5} textAlign="left">
                          <Text
                            color={badgeColors.color}
                            fontSize="11px"
                            fontWeight="600"
                            bg={badgeColors.bg}
                            px={0}
                            py={0.5}
                            borderRadius="md"
                            display="inline-block"
                            textTransform="capitalize"
                          >
                            {level === 'medium' ? 'Medium' : capitalizeFirst(level)}
                          </Text>
                        </Td>
                        <Td px={0} py={1.5} textAlign="left">
                          <Text fontSize="xs" color="gray.700">
                            {threshold.requires_review ? 'Required' : 'Not Required'}
                          </Text>
                        </Td>
                        <Td px={0} py={1.5} textAlign="left">
                          <Text fontSize="xs" color="gray.700">
                            {threshold.auto_approve ? 'Yes' : 'No'}
                          </Text>
                        </Td>
                        <Td px={0} py={1.5} textAlign="left">
                          <Text fontSize="xs" color="gray.600">
                            {additionalRequirements.length > 0 ? additionalRequirements.join(', ') : '-'}
                          </Text>
                        </Td>
                        <Td px={0} py={1.5} textAlign="left">
                          <Text fontSize="xs" color="gray.700">
                            {threshold.min_reviewers || 0}
                          </Text>
                        </Td>
                        <Td px={0} py={1.5} textAlign="center">
                          <Text fontSize="xs" color="gray.700">
                            {threshold.sla_hours ? `${threshold.sla_hours}h` : '-'}
                          </Text>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </Box>
          </Box>

          {/* Assignment Rules */}
          <Box
            p={6}
            bg="white"
            borderRadius="md"
            boxShadow="sm"
            border="1px solid"
            borderColor="gray.200"
          >
            <Text fontSize="lg" fontWeight="600" mb={3}>
              Assignment Rules
            </Text>
            {profile.assignment_rules ? (
              <Box
                p={4}
                bg="gray.50"
                borderRadius="md"
                border="1px solid"
                borderColor="gray.200"
              >
                <VStack align="stretch" spacing={3} fontSize="sm">
                  {profile.assignment_rules.roles && Array.isArray(profile.assignment_rules.roles) && (
                    <HStack justify="space-between">
                      <Text fontWeight="500" color="gray.700">Role:</Text>
                      <HStack spacing={1} flexWrap="wrap">
                        {profile.assignment_rules.roles.map((role: string, idx: number) => (
                          <Badge key={idx} bg="blue.50" color="blue.800" fontSize="xs" px={2} py={0.5} textTransform="capitalize">
                            {capitalizeFirst(role)}
                          </Badge>
                        ))}
                      </HStack>
                    </HStack>
                  )}
                  
                  {profile.assignment_rules.sla_hours && (
                    <HStack justify="space-between">
                      <Text fontWeight="500" color="gray.700">SLA:</Text>
                      <Text>{profile.assignment_rules.sla_hours} hours</Text>
                    </HStack>
                  )}
                  
                  {profile.assignment_rules.escalation_hours && (
                    <HStack justify="space-between">
                      <Text fontWeight="500" color="gray.700">Escalation:</Text>
                      <Text>{profile.assignment_rules.escalation_hours} hours</Text>
                    </HStack>
                  )}
                  
                  {profile.assignment_rules.auto_assign !== undefined && (
                    <HStack justify="space-between">
                      <Text fontWeight="500" color="gray.700">Auto-assign:</Text>
                      <Text>{profile.assignment_rules.auto_assign ? 'Yes' : 'No'}</Text>
                    </HStack>
                  )}
                  
                  <HStack justify="space-between">
                    <Text fontWeight="500" color="gray.700">Escalation Enabled:</Text>
                    <Text>{profile.assignment_rules.escalation_hours ? 'Yes' : 'No'}</Text>
                  </HStack>
                </VStack>
              </Box>
            ) : (
              <Text fontSize="sm" color="gray.500">No assignment rules configured</Text>
            )}
          </Box>
            </VStack>
          </Box>

          {/* Right Column - 50% */}
          <Box width="50%" minW="0">
            <VStack align="stretch" spacing={8}>
          {/* Workflow Behavior */}
          {workflowBehavior && (
            <Box
              p={6}
              bg="white"
              borderRadius="md"
              boxShadow="sm"
              border="1px solid"
              borderColor="gray.200"
            >
              <Text fontSize="lg" fontWeight="600" mb={3}>
                Workflow Behavior
              </Text>
                <Box
                  p={4}
                  bg="gray.50"
                  borderRadius="md"
                  border="1px solid"
                  borderColor="gray.200"
                >
                  <VStack align="stretch" spacing={2} fontSize="sm">
                    <HStack justify="space-between">
                      <Text fontWeight="500" color="gray.700">Human Review Required:</Text>
                      <Badge
                        bg={workflowBehavior.humanReviewRequired ? 'orange.100' : 'green.100'}
                        color={workflowBehavior.humanReviewRequired ? 'orange.800' : 'green.800'}
                        fontSize="xs"
                        px={2}
                        py={0.5}
                      >
                        {workflowBehavior.humanReviewRequired ? 'Yes' : 'No'}
                      </Badge>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontWeight="500" color="gray.700">Auto-approval Allowed:</Text>
                      <Badge
                        bg={workflowBehavior.autoApprovalAllowed ? 'green.100' : 'gray.100'}
                        color={workflowBehavior.autoApprovalAllowed ? 'green.800' : 'gray.800'}
                        fontSize="xs"
                        px={2}
                        py={0.5}
                      >
                        {workflowBehavior.autoApprovalAllowed ? 'Yes' : 'No'}
                      </Badge>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontWeight="500" color="gray.700">Escalation Enabled:</Text>
                      <Badge
                        bg={workflowBehavior.escalationEnabled ? 'orange.100' : 'gray.100'}
                        color={workflowBehavior.escalationEnabled ? 'orange.800' : 'gray.800'}
                        fontSize="xs"
                        px={2}
                        py={0.5}
                      >
                        {workflowBehavior.escalationEnabled ? 'Yes' : 'No'}
                      </Badge>
                    </HStack>
                  </VStack>
                </Box>
            </Box>
          )}

          {/* Version History & Integrity */}
          <Box
            p={6}
            bg="white"
            borderRadius="md"
            boxShadow="sm"
            border="1px solid"
            borderColor="gray.200"
          >
            <Text fontSize="lg" fontWeight="600" mb={3}>
              Version History & Integrity
            </Text>
            <VStack align="stretch" spacing={4}>
              {profile.version_hash && (
                <Box>
                  <HStack justify="space-between" mb={2}>
                    <Text fontSize="sm" fontWeight="500" color="gray.700">Current Version Hash:</Text>
                    <HStack>
                      <Code fontSize="xs" p={2} borderRadius="md" maxW="400px" overflowX="auto">
                        {profile.version_hash}
                      </Code>
                      <IconButton
                        aria-label="Copy hash"
                        icon={<Copy size={14} />}
                        size="xs"
                        onClick={() => handleCopyHash(profile.version_hash!)}
                        variant="ghost"
                      />
                    </HStack>
                  </HStack>
                </Box>
              )}
              
              <Box>
                <Text fontSize="sm" fontWeight="500" color="gray.700" mb={2}>
                  Version History:
                </Text>
                {versionHistory.length > 0 ? (
                  <VStack align="stretch" spacing={2}>
                    {versionHistory
                      .sort((a, b) => b.version - a.version)
                      .map((version) => (
                        <Box
                          key={version.id}
                          p={3}
                          bg="gray.50"
                          borderRadius="md"
                          border="1px solid"
                          borderColor="gray.200"
                        >
                          <HStack justify="space-between">
                            <VStack align="flex-start" spacing={1}>
                              <HStack spacing={2}>
                                <Text fontSize="sm" fontWeight="500">
                                  Version {version.version}.0.0
                                </Text>
                                {getStatusBadge(version.status)}
                              </HStack>
                              <Text fontSize="xs" color="gray.600">
                                Created: {new Date(version.created_at).toLocaleString()}
                                {version.created_by && ` • By: ${version.created_by.substring(0, 8)}...`}
                              </Text>
                            </VStack>
                            {version.id === profile.id && (
                              <Badge bg="blue.100" color="blue.800" fontSize="xs" px={2} py={0.5}>
                                Current
                              </Badge>
                            )}
                          </HStack>
                        </Box>
                      ))}
                  </VStack>
                ) : (
                  <Text fontSize="sm" color="gray.500">No version history available</Text>
                )}
              </Box>
            </VStack>
          </Box>

          {/* Audit Metadata */}
          <Box
            p={6}
            bg="white"
            borderRadius="md"
            boxShadow="sm"
            border="1px solid"
            borderColor="gray.200"
          >
            <Text fontSize="lg" fontWeight="600" mb={3}>
              Audit Metadata
            </Text>
            <Box
              p={4}
              bg="gray.50"
              borderRadius="md"
              border="1px solid"
              borderColor="gray.200"
            >
              <VStack align="stretch" spacing={3} fontSize="sm">
                <HStack justify="space-between">
                  <Text fontWeight="500" color="gray.700">Created:</Text>
                  <Text>{new Date(profile.created_at).toLocaleString()}</Text>
                </HStack>
                {profile.activated_at && (
                  <HStack justify="space-between">
                    <Text fontWeight="500" color="gray.700">Activated:</Text>
                    <Text>{new Date(profile.activated_at).toLocaleString()}</Text>
                  </HStack>
                )}
                {profile.archived_at && (
                  <HStack justify="space-between">
                    <Text fontWeight="500" color="gray.700">Archived:</Text>
                    <Text>{new Date(profile.archived_at).toLocaleString()}</Text>
                  </HStack>
                )}
                {auditHistory.length > 0 && auditHistory[0]?.ledger_hash && (
                  <HStack justify="space-between">
                    <Text fontWeight="500" color="gray.700">Ledger Reference ID:</Text>
                    <HStack>
                      <Code fontSize="xs" maxW="200px" overflowX="auto">
                        {auditHistory[0].ledger_hash.substring(0, 16)}...
                      </Code>
                      <IconButton
                        aria-label="Copy ledger hash"
                        icon={<Copy size={14} />}
                        size="xs"
                        onClick={() => handleCopyHash(auditHistory[0].ledger_hash!)}
                        variant="ghost"
                      />
                    </HStack>
                  </HStack>
                )}
                {exportResult && (
                  <HStack justify="space-between">
                    <Text fontWeight="500" color="gray.700">Last Export Event:</Text>
                    <Text>{new Date(exportResult.timestamp).toLocaleString()}</Text>
                  </HStack>
                )}
              </VStack>
            </Box>
          </Box>

          {/* Advanced Configuration */}
          <Box
            p={6}
            bg="white"
            borderRadius="md"
            boxShadow="sm"
            border="1px solid"
            borderColor="gray.200"
          >
            <Accordion allowToggle defaultIndex={[]}>
              <AccordionItem border="none">
                <AccordionButton 
                  px={0} 
                  py={2} 
                  _hover={{ bg: 'transparent' }}
                  sx={{
                    fontSize: '18px !important',
                    fontWeight: '600 !important',
                    fontFamily: 'inherit',
                  }}
                >
                  <Text flex="1" textAlign="left" fontSize="lg" fontWeight="600" as="span">
                    Advanced Configuration (JSON)
                  </Text>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4} px={0}>
                  <VStack align="stretch" spacing={4}>
                    <Box>
                      <HStack justify="space-between" mb={2}>
                        <Text fontSize="sm" fontWeight="500" color="gray.700">
                          Full Profile JSON
                        </Text>
                        <IconButton
                          aria-label="Copy JSON"
                          icon={<Copy size={14} />}
                          size="xs"
                          onClick={() => handleCopyHash(JSON.stringify(profile, null, 2))}
                          variant="ghost"
                        />
                      </HStack>
                      <Code
                        p={4}
                        borderRadius="md"
                        display="block"
                        whiteSpace="pre-wrap"
                        fontSize="xs"
                        maxH="400px"
                        overflowY="auto"
                        bg="gray.100"
                        color="gray.800"
                      >
                        {JSON.stringify(profile, null, 2)}
                      </Code>
                    </Box>
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </Box>
            </VStack>
          </Box>
        </Box>
      </Box>

      {/* Activate Modal */}
      <Modal isOpen={isActivateOpen} onClose={onActivateClose}>
        <ModalOverlay />
        <ModalContent borderRadius="md">
          <ModalHeader>Activate Profile</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <Text fontSize="sm" color="gray.700">
                Activating this profile will archive any other active version with the same name.
              </Text>
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600">Justification (optional)</FormLabel>
                <Textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Enter justification..."
                  fontSize="sm"
                  minH="80px"
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600">
                  Type "Activate" to confirm
                </FormLabel>
                <Input
                  value={activateConfirmation}
                  onChange={(e) => setActivateConfirmation(e.target.value)}
                  placeholder="Activate"
                  fontSize="sm"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onActivateClose} size="sm" fontSize="xs">
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleActivate}
              isLoading={activating}
              isDisabled={activateConfirmation !== 'Activate'}
              size="sm"
              fontSize="xs"
            >
              Activate
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Archive Modal */}
      <Modal isOpen={isArchiveOpen} onClose={onArchiveClose}>
        <ModalOverlay />
        <ModalContent borderRadius="md">
          <ModalHeader>Archive Profile</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <Text fontSize="sm" color="gray.700">
                This profile will be archived permanently and cannot be edited or reactivated.
              </Text>
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600">Justification (optional)</FormLabel>
                <Textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Enter justification..."
                  fontSize="sm"
                  minH="80px"
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600">
                  Type "Archive" to confirm
                </FormLabel>
                <Input
                  value={archiveConfirmation}
                  onChange={(e) => setArchiveConfirmation(e.target.value)}
                  placeholder="Archive"
                  fontSize="sm"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onArchiveClose} size="sm" fontSize="xs">
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={handleArchive}
              isLoading={archiving}
              isDisabled={archiveConfirmation !== 'Archive'}
              size="sm"
              fontSize="xs"
            >
              Archive
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Create New Version Modal */}
      <Modal isOpen={isCreateVersionOpen} onClose={onCreateVersionClose}>
        <ModalOverlay />
        <ModalContent borderRadius="md">
          <ModalHeader>Create New Version</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text fontSize="sm" color="gray.700">
              This will create a new draft version based on the current profile. The new version can be edited before activation.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCreateVersionClose} size="sm" fontSize="xs">
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleCreateNewVersion}
              isLoading={creatingVersion}
              size="sm"
              fontSize="xs"
            >
              Create Version
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Export Modal */}
      <Modal isOpen={isExportOpen} onClose={onExportClose} size="xl">
        <ModalOverlay />
        <ModalContent borderRadius="md">
          <ModalHeader>Export Profile</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {!exportResult ? (
              <VStack align="stretch" spacing={4}>
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="600">Export Format</FormLabel>
                  <HStack spacing={3}>
                    <Button
                      size="sm"
                      variant={exportFormat === 'pdf' ? 'solid' : 'outline'}
                      colorScheme={exportFormat === 'pdf' ? 'blue' : 'gray'}
                      onClick={() => setExportFormat('pdf')}
                      fontSize="xs"
                    >
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      variant={exportFormat === 'json' ? 'solid' : 'outline'}
                      colorScheme={exportFormat === 'json' ? 'blue' : 'gray'}
                      onClick={() => setExportFormat('json')}
                      fontSize="xs"
                    >
                      JSON
                    </Button>
                  </HStack>
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="600">Justification</FormLabel>
                  <Textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Enter justification for export..."
                    fontSize="sm"
                    minH="80px"
                  />
                </FormControl>
                <FormControl>
                  <Checkbox
                    isChecked={exportConfirmed}
                    onChange={(e) => setExportConfirmed(e.target.checked)}
                    fontSize="xs"
                  >
                    <Text fontSize="xs" color="gray.700">
                      I acknowledge that this export will be recorded in the audit ledger.
                    </Text>
                  </Checkbox>
                </FormControl>
              </VStack>
            ) : (
              <VStack align="stretch" spacing={4}>
                <Box p={4} bg="green.50" borderRadius="md" border="1px solid" borderColor="green.200">
                  <Text fontSize="sm" fontWeight="500" color="green.800" mb={2}>
                    Export successful
                  </Text>
                  <VStack align="stretch" spacing={2} fontSize="xs">
                    <HStack justify="space-between">
                      <Text color="gray.600">Artifact Hash:</Text>
                      <HStack>
                        <Code fontSize="xs" maxW="200px" overflowX="auto">
                          {exportResult.artifactHash}
                        </Code>
                        <IconButton
                          aria-label="Copy hash"
                          icon={<Copy size={12} />}
                          size="xs"
                          onClick={() => handleCopyHash(exportResult.artifactHash)}
                          variant="ghost"
                        />
                      </HStack>
                    </HStack>
                    <HStack justify="space-between">
                      <Text color="gray.600">Timestamp:</Text>
                      <Text>{new Date(exportResult.timestamp).toLocaleString()}</Text>
                    </HStack>
                  </VStack>
                </Box>
                {exportResult.downloadUrl && (
                  <Button
                    leftIcon={<Download size={16} />}
                    colorScheme="blue"
                    onClick={() => window.open(exportResult.downloadUrl, '_blank')}
                    size="sm"
                    fontSize="xs"
                  >
                    Download Artifact
                  </Button>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            {!exportResult ? (
              <>
                <Button variant="ghost" mr={3} onClick={onExportClose} size="sm" fontSize="xs">
                  Cancel
                </Button>
                <Button
                  colorScheme="blue"
                  onClick={handleExport}
                  isLoading={exporting}
                  isDisabled={!exportConfirmed}
                  size="sm"
                  fontSize="xs"
                >
                  Export
                </Button>
              </>
            ) : (
              <Button onClick={onExportClose} size="sm" fontSize="xs">
                Close
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

