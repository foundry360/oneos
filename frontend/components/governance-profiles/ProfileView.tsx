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
  Radio,
  RadioGroup,
  Stack,
  FormLabel,
  Input,
  AlertDescription,
  IconButton,
  FormControl,
  FormHelperText,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Checkbox,
  Tooltip,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from '@chakra-ui/react';
import { CheckCircle, XCircle, AlertTriangle, Eye, History, Check, X, FolderOutput, Copy, Download, Archive, CopyCheck, ChevronDown, SquarePen, ScanEye, ChevronRight, ChevronLeft } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGovernanceProfiles, GovernanceProfile, AuditEntry } from '@/hooks/useGovernanceProfiles';
import axios from 'axios';

interface ProfileViewProps {
  profile: GovernanceProfile | null;
  onClose: () => void;
  onEdit?: () => void;
  onRefresh?: () => void;
  onCollapseChange?: (isCollapsed: boolean) => void;
  isCollapsed?: boolean;
}

export default function ProfileView({ profile, onClose, onEdit, onRefresh, isAdmin = false, onCreateNewVersion, onCollapseChange, isCollapsed = true }: ProfileViewProps) {
  const [isHighlightsExpanded, setIsHighlightsExpanded] = useState(!isCollapsed);
  
  // Sync local state with prop changes
  useEffect(() => {
    setIsHighlightsExpanded(!isCollapsed);
  }, [isCollapsed]);
  
  const handleToggle = () => {
    const newState = !isHighlightsExpanded;
    setIsHighlightsExpanded(newState);
    onCollapseChange?.(!newState); // Pass collapsed state (inverse of expanded)
  };
  const router = useRouter();
  const { activateProfile, archiveProfile, fetchAuditHistory, exportProfile, createNewVersion, updateProfile } = useGovernanceProfiles();
  const [auditHistory, setAuditHistory] = useState<AuditEntry[]>([]);
  const [versionHistory, setVersionHistory] = useState<GovernanceProfile[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [activating, setActivating] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'json'>('pdf');
  const [exportScope, setExportScope] = useState<'this_version'>('this_version');
  const [redactionLevel, setRedactionLevel] = useState<string>('none');
  const [isRedactionDropdownOpen, setIsRedactionDropdownOpen] = useState(false);
  const redactionDropdownRef = useRef<HTMLDivElement>(null);
  const [isHumanReviewDropdownOpen, setIsHumanReviewDropdownOpen] = useState(false);
  const humanReviewDropdownRef = useRef<HTMLDivElement>(null);
  const [watermarkLabel, setWatermarkLabel] = useState<string>('');
  const [exportConfirmed, setExportConfirmed] = useState(false);
  const [exportResult, setExportResult] = useState<{ artifactHash: string; timestamp: string; downloadUrl?: string } | null>(null);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const toast = useToast();

  const handleViewFullPage = () => {
    if (profile) {
      console.log('Navigating to profile:', profile.id);
      const url = `/governance-profiles/${profile.id}`;
      console.log('URL:', url);
      router.push(url);
    }
  };
  const { isOpen: isActivateOpen, onOpen: onActivateOpen, onClose: onActivateClose } = useDisclosure();
  const { isOpen: isArchiveOpen, onOpen: onArchiveOpen, onClose: onArchiveClose } = useDisclosure();
  
  const handleArchiveClose = () => {
    onArchiveClose();
    setJustification('');
    setArchiveConfirmation('');
  };

  const handleActivateClose = () => {
    onActivateClose();
    setJustification('');
    setActivateConfirmation('');
  };
  const { isOpen: isAuditOpen, onOpen: onAuditOpen, onClose: onAuditClose } = useDisclosure();
  const { isOpen: isExportOpen, onOpen: onExportOpen, onClose: onExportClose } = useDisclosure();
  const { isOpen: isCreateVersionSuccessOpen, onOpen: onCreateVersionSuccessOpen, onClose: onCreateVersionSuccessClose } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const [newVersionProfile, setNewVersionProfile] = useState<GovernanceProfile | null>(null);
  const [justification, setJustification] = useState('');
  const [archiveConfirmation, setArchiveConfirmation] = useState('');
  const [activateConfirmation, setActivateConfirmation] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    domain: '',
    description: '',
    human_review_requirement: 'conditional' as 'required' | 'conditional' | 'optional',
    allowed_actions: [] as string[],
  });

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (redactionDropdownRef.current && !redactionDropdownRef.current.contains(event.target as Node)) {
        setIsRedactionDropdownOpen(false);
      }
      if (humanReviewDropdownRef.current && !humanReviewDropdownRef.current.contains(event.target as Node)) {
        setIsHumanReviewDropdownOpen(false);
      }
    };

    if (isRedactionDropdownOpen || isHumanReviewDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isRedactionDropdownOpen, isHumanReviewDropdownOpen]);


  const handleActivate = async () => {
    if (!profile) return;
    setActivating(true);
    try {
      const updatedProfile = await activateProfile(profile.id, justification);
      toast({
        title: 'Profile activated',
        description: 'The profile has been activated successfully.',
        status: 'success',
        duration: 3000,
      });
      handleActivateClose();
      // Refresh the list to ensure UI is updated
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

  const handleArchive = async () => {
    if (!profile) return;
    setArchiving(true);
    try {
      await archiveProfile(profile.id, justification);
      toast({
        title: 'Profile archived',
        description: 'The profile has been archived successfully.',
        status: 'success',
        duration: 3000,
      });
      onArchiveClose();
      setJustification('');
      setArchiveConfirmation('');
      if (onRefresh) onRefresh();
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

  const capitalizeFirst = (str: string) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const formatRiskThresholds = (thresholds: any) => {
    if (!thresholds || typeof thresholds !== 'object') return 'No risk thresholds configured';
    
    const parts: string[] = [];
    
    if (thresholds.low) {
      const low = thresholds.low;
      const lowParts: string[] = [];
      if (low.auto_approve) lowParts.push('Auto-approved');
      if (low.requires_review === false) lowParts.push('No review required');
      parts.push(`Low Risk: ${lowParts.join(', ') || 'Standard processing'}`);
    }
    
    if (thresholds.medium) {
      const med = thresholds.medium;
      const medParts: string[] = [];
      if (med.requires_review) medParts.push('Requires review');
      if (med.min_reviewers) medParts.push(`${med.min_reviewers} reviewer(s)`);
      if (med.sla_hours) medParts.push(`${med.sla_hours} hour SLA`);
      parts.push(`Medium Risk: ${medParts.join(', ') || 'Standard review'}`);
    }
    
    if (thresholds.high) {
      const high = thresholds.high;
      const highParts: string[] = [];
      if (high.requires_review) highParts.push('Requires review');
      if (high.min_reviewers) highParts.push(`${high.min_reviewers} reviewer(s)`);
      if (high.sla_hours) highParts.push(`${high.sla_hours} hour SLA`);
      
      // Domain-specific requirements
      if (high.requires_medical_expert) highParts.push('Medical expert required');
      if (high.requires_legal_review) highParts.push('Legal review required');
      if (high.requires_hr_review) highParts.push('HR review required');
      if (high.requires_technical_review) highParts.push('Technical review required');
      if (high.requires_compliance_review) highParts.push('Compliance review required');
      
      parts.push(`High Risk: ${highParts.join(', ') || 'Enhanced review'}`);
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'No risk thresholds configured';
  };

  const formatAssignmentRules = (rules: any) => {
    if (!rules || typeof rules !== 'object') return 'No assignment rules configured';
    
    const parts: string[] = [];
    
    if (rules.roles && Array.isArray(rules.roles)) {
      parts.push(`Eligible roles: ${rules.roles.map((r: string) => capitalizeFirst(r)).join(', ')}`);
    }
    
    if (rules.sla_hours) {
      parts.push(`SLA: ${rules.sla_hours} hours`);
    }
    
    if (rules.escalation_hours) {
      parts.push(`Escalation: ${rules.escalation_hours} hours`);
    }
    
    // Domain-specific requirements
    if (rules.requires_medical_license) parts.push('Medical license required');
    if (rules.requires_hr_approval) parts.push('HR approval required');
    if (rules.requires_legal_approval_for_high_risk) parts.push('Legal approval for high risk');
    if (rules.requires_technical_approval) parts.push('Technical approval required');
    if (rules.requires_compliance_approval) parts.push('Compliance approval required');
    
    return parts.length > 0 ? parts.join(' • ') : 'No assignment rules configured';
  };

  const handleExport = async () => {
    if (!profile || !exportConfirmed) return;
    
    setExporting(true);
    try {
      const result = await exportProfile(profile.id, {
        format: exportFormat,
        scope: exportScope,
        justification: justification.trim(),
        redactionLevel: redactionLevel !== 'none' ? redactionLevel : undefined,
        watermarkLabel: watermarkLabel.trim() || undefined,
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

  const handleCopyHash = () => {
    if (exportResult?.artifactHash) {
      navigator.clipboard.writeText(exportResult.artifactHash);
      toast({
        title: 'Hash copied',
        description: 'Verification hash copied to clipboard',
        status: 'success',
        duration: 2000,
      });
    }
  };

  const handleDownload = () => {
    if (exportResult?.downloadUrl) {
      window.open(exportResult.downloadUrl, '_blank');
    }
  };

  const handleExportClose = () => {
    onExportClose();
    setExportResult(null);
    setJustification('');
    setRedactionLevel('none');
    setWatermarkLabel('');
    setExportConfirmed(false);
  };

  const handleEditOpen = () => {
    if (!profile) return;
    setEditFormData({
      name: profile.name,
      domain: profile.domain,
      description: profile.description || '',
      human_review_requirement: profile.human_review_requirement,
      allowed_actions: profile.allowed_actions || [],
    });
    onEditOpen();
  };

  const handleEditSave = async () => {
    if (!profile) return;
    
    setEditingProfile(true);
    try {
      await updateProfile(profile.id, {
        description: editFormData.description,
        human_review_requirement: editFormData.human_review_requirement,
        allowed_actions: editFormData.allowed_actions,
      });
      toast({
        title: 'Profile updated',
        description: 'The profile has been updated successfully.',
        status: 'success',
        duration: 3000,
      });
      onEditClose();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      // Use the error message if it's a string (from our improved error handling)
      const errorMessage = error.message || error.response?.data?.error || 'Failed to update profile';
      
      // Show error with longer duration for connection issues
      const isConnectionError = error.code === 'ERR_CONNECTION_REFUSED' || error.code === 'ERR_NETWORK';
      
      toast({
        title: 'Update failed',
        description: errorMessage,
        status: 'error',
        duration: isConnectionError ? 10000 : 5000,
        isClosable: true,
      });
    } finally {
      setEditingProfile(false);
    }
  };

  const handleEditAndActivate = async () => {
    if (!profile) return;
    
    setEditingProfile(true);
    setActivating(true);
    try {
      // First update the profile
      await updateProfile(profile.id, {
        description: editFormData.description,
        human_review_requirement: editFormData.human_review_requirement,
        allowed_actions: editFormData.allowed_actions,
      });
      
      // Then activate it
      await activateProfile(profile.id, justification);
      toast({
        title: 'Profile updated and activated',
        description: 'The profile has been updated and activated successfully.',
        status: 'success',
        duration: 3000,
      });
      onEditClose();
      handleActivateClose();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      const errorMessage = error.message || error.response?.data?.error || 'Failed to update and activate profile';
      toast({
        title: 'Operation failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setEditingProfile(false);
      setActivating(false);
    }
  };

  const handleCreateNewVersion = async () => {
    if (!profile) return;
    
    setCreatingVersion(true);
    try {
      const newProfile = await createNewVersion(profile.id);
      setNewVersionProfile(newProfile);
      onCreateVersionSuccessOpen();
      if (onRefresh) onRefresh();
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

  const handleCreateVersionSuccessClose = () => {
    onCreateVersionSuccessClose();
    setNewVersionProfile(null);
  };

  return (
    <Box 
      height="100%" 
      display="flex" 
      flexDirection="column"
      width={isHighlightsExpanded ? "100%" : "64px"}
      transition="width 0.2s ease"
    >
      {/* Header - Always visible */}
      <Box
        px={isHighlightsExpanded ? 8 : 0}
        py={5}
        borderBottom="1px solid"
        borderColor="gray.200"
        display="flex"
        justifyContent={isHighlightsExpanded ? "space-between" : "center"}
        alignItems="center"
        position="sticky"
        top={0}
        bg={isHighlightsExpanded ? "white" : "gray.50"}
        zIndex={1}
        minH="48px"
        h="48px"
      >
        <HStack spacing={2} alignItems="center" h="100%" flex={1} justifyContent={isHighlightsExpanded ? "space-between" : "center"}>
          {isHighlightsExpanded && (
            <Text fontSize="sm" fontWeight="600" color="gray.900" letterSpacing="0.01em" lineHeight="1.2">
              Profile Summary
            </Text>
          )}
          <Box
            as="button"
            onClick={handleToggle}
            cursor="pointer"
            display="flex"
            alignItems="center"
            justifyContent="center"
            color="gray.600"
            _hover={{ color: 'gray.900' }}
            aria-label={isHighlightsExpanded ? 'Collapse summary' : 'Expand summary'}
            bg="transparent"
            border="none"
            p={0}
            h="100%"
            _focus={{ outline: 'none', boxShadow: 'none' }}
            ml={isHighlightsExpanded ? "auto" : 0}
          >
            {isHighlightsExpanded ? (
              <ChevronRight size={16} style={{ filter: 'none' }} />
            ) : (
              <ChevronLeft size={16} style={{ filter: 'none' }} />
            )}
          </Box>
        </HStack>
      </Box>

      {!profile ? (
        /* Empty State */
        isHighlightsExpanded && (
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
        )
      ) : (
        /* Content */
        isHighlightsExpanded && (
          <Box flex="1" overflowY="auto" px={8} pt={4} pb={8} className="scrollbar-hover">
          <VStack spacing={2} align="stretch">
        <VStack align="stretch" spacing={4} pt={0} mt={-2}>
          {/* Profile Name */}
          <Box mt={0}>
            <Text as="h3" fontSize="2xl" fontWeight="600" mb={2}>{profile.name}</Text>
          </Box>

          {/* Status Badge and Controls */}
          <HStack spacing={2} mb={2} justify="flex-start">
            {(() => {
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
                        py={1.5}
                        h="32px"
                        borderRadius="md"
                        fontSize="12px"
                        fontWeight="normal"
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
                        py={1.5}
                        h="32px"
                        borderRadius="md"
                        fontSize="12px"
                        fontWeight="normal"
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
                        py={1.5}
                        h="32px"
                        borderRadius="md"
                        fontSize="12px"
                        fontWeight="normal"
                      >
                        <Archive size={12} />
                        Archived
                      </Badge>
                    );
                  default:
                    return null;
                }
              };
              return getStatusBadge(profile.status);
            })()}
            <Tooltip label="View Full Page" fontSize="xs" placement="top">
              <Box
                as="button"
                onClick={handleViewFullPage}
                p={1.5}
                borderRadius="md"
                border="none"
                bg="transparent"
                _hover={{ bg: 'gray.100' }}
                transition="all 0.2s"
                cursor="pointer"
                aria-label="View Full Page"
              >
                <ScanEye size={18} color="#6B7280" />
              </Box>
            </Tooltip>
            {isAdmin && (
              <>
                {(profile.status === 'active' || profile.status === 'archived') && (
                  <Tooltip label="Create New Version" fontSize="xs" placement="top">
                    <Box
                      as="button"
                      onClick={handleCreateNewVersion}
                      p={1.5}
                      borderRadius="md"
                      border="none"
                      bg="transparent"
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
                <Tooltip label="Export Profile" fontSize="xs" placement="top">
                  <Box
                    as="button"
                    onClick={onExportOpen}
                    p={1.5}
                    borderRadius="md"
                    border="none"
                    bg="transparent"
                    _hover={{ bg: 'gray.100' }}
                    transition="all 0.2s"
                    cursor="pointer"
                    aria-label="Export Profile"
                  >
                    <FolderOutput size={18} color="#6B7280" />
                  </Box>
                </Tooltip>
                {profile.status === 'active' && (
                  <Tooltip label="Archive Profile" fontSize="xs" placement="top">
                    <Box
                      as="button"
                      onClick={onArchiveOpen}
                      p={1.5}
                      borderRadius="md"
                      border="none"
                      bg="transparent"
                      _hover={{ bg: 'gray.100' }}
                      transition="all 0.2s"
                      cursor="pointer"
                      aria-label="Archive Profile"
                    >
                      <Archive size={18} color="#6B7280" />
                    </Box>
                  </Tooltip>
                )}
                {profile.status === 'draft' && (
                  <>
                    <Tooltip label="Activate Profile" fontSize="xs" placement="top">
                      <Box
                        as="button"
                        onClick={onActivateOpen}
                        p={1.5}
                        borderRadius="md"
                        border="none"
                        bg="transparent"
                        _hover={{ bg: 'gray.100' }}
                        transition="all 0.2s"
                        cursor="pointer"
                        aria-label="Activate Profile"
                        disabled={activating}
                        opacity={activating ? 0.6 : 1}
                      >
                        <CheckCircle size={18} color="#6B7280" />
                      </Box>
                    </Tooltip>
                    {onEdit && (
                      <Tooltip label="Edit Profile" fontSize="xs" placement="top">
                        <Box
                          as="button"
                          onClick={handleEditOpen}
                          p={1.5}
                          borderRadius="md"
                          border="none"
                          bg="transparent"
                          _hover={{ bg: 'gray.100' }}
                          transition="all 0.2s"
                          cursor="pointer"
                          aria-label="Edit Profile"
                        >
                          <SquarePen size={18} color="#6B7280" />
                        </Box>
                      </Tooltip>
                    )}
                  </>
                )}
              </>
            )}
          </HStack>

          <Box>
            <Text fontWeight="600" mb={2}>Domain</Text>
            <Badge bg="blue.50" color="blue.800" fontSize="12px" fontWeight="500" textTransform="uppercase" px={2} py={0.5}>{profile.domain}</Badge>
          </Box>

          {profile.description && (
            <Box>
              <Text fontWeight="600" mb={2}>Policy Statement</Text>
              <Text fontSize="sm" color="gray.700">{profile.description}</Text>
            </Box>
          )}

          <Box>
            <Text fontWeight="600" mb={2}>Human Review Requirement</Text>
            <Badge bg="blue.50" color="blue.800" fontSize="12px" fontWeight="500" textTransform="none" px={2} py={0.5}>{capitalizeFirst(profile.human_review_requirement)}</Badge>
          </Box>

          <Box>
            <Text fontWeight="600" mb={2}>Allowed Actions</Text>
            <HStack spacing={2}>
              {profile.allowed_actions.map((action) => (
                <Badge key={action} fontSize="12px" textTransform="none" bg="blue.50" color="blue.800" fontWeight="500" px={2} py={0.5}>
                  {capitalizeFirst(action)}
                </Badge>
              ))}
            </HStack>
          </Box>

          <Box>
            <Text fontWeight="600" mb={3}>Risk Thresholds</Text>
              <Box
                p={3}
                bg="white"
                borderRadius="md"
                border="1px solid"
                borderColor="gray.200"
                overflowX="auto"
                className="scrollbar-hover"
              >
                <Table variant="simple" size="sm" minW="100%">
                  <Thead>
                    <Tr>
                      <Th fontSize="xs" fontWeight="600" color="gray.700" textTransform="none" px={1.5} py={1.5} whiteSpace="nowrap" textAlign="left" bg="blue.50">
                        <Tooltip label="Risk level classification" placement="top">
                          Risk
                        </Tooltip>
                      </Th>
                      <Th fontSize="xs" fontWeight="600" color="gray.700" textTransform="none" px={1.5} py={1.5} whiteSpace="nowrap" textAlign="left" bg="blue.50">
                        <Tooltip label="Human intervention required" placement="top">
                          HI
                        </Tooltip>
                      </Th>
                      <Th fontSize="xs" fontWeight="600" color="gray.700" textTransform="none" px={1.5} py={1.5} whiteSpace="nowrap" textAlign="left" bg="blue.50">
                        <Tooltip label="Auto-approval enabled" placement="top">
                          Auto
                        </Tooltip>
                      </Th>
                      <Th fontSize="xs" fontWeight="600" color="gray.700" textTransform="none" px={1.5} py={1.5} whiteSpace="nowrap" textAlign="left" bg="blue.50">
                        <Tooltip label="Number of required reviews" placement="top">
                          Reviews
                        </Tooltip>
                      </Th>
                      <Th fontSize="xs" fontWeight="600" color="gray.700" textTransform="none" px={1.5} py={1.5} whiteSpace="nowrap" textAlign="left" bg="blue.50">
                        <Tooltip label="Service level agreement hours" placement="top">
                          SLA
                        </Tooltip>
                      </Th>
                      <Th fontSize="xs" fontWeight="600" color="gray.700" textTransform="none" px={1} py={1.5} textAlign="left" w="25%" bg="blue.50">
                        <Tooltip label="Type of review required" placement="top">
                          Type
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
                        <Td px={1.5} py={1.5} textAlign="left">
                          <Text
                            color={badgeColors.color}
                            fontSize="11px"
                            fontWeight="600"
                          >
                            {level === 'medium' ? 'Med' : level.charAt(0).toUpperCase() + level.slice(1)}
                          </Text>
                        </Td>
                        <Td px={1.5} py={1.5} fontSize="11px" color="gray.700" whiteSpace="nowrap" textAlign="left">
                          {threshold.requires_review ? 'Yes' : 'No'}
                        </Td>
                        <Td px={1.5} py={1.5} fontSize="11px" color="gray.700" whiteSpace="nowrap" textAlign="left">
                          {threshold.auto_approve ? 'Yes' : 'No'}
                        </Td>
                        <Td px={1.5} py={1.5} fontSize="11px" color="gray.700" whiteSpace="nowrap" textAlign="left">
                          {threshold.min_reviewers || '-'}
                        </Td>
                        <Td px={1.5} py={1.5} fontSize="11px" color="gray.700" whiteSpace="nowrap" textAlign="left">
                          {threshold.sla_hours ? `${threshold.sla_hours}h` : '-'}
                        </Td>
                        <Td px={1} py={1.5} fontSize="11px" color="gray.700" textAlign="left">
                          <Text 
                            noOfLines={2} 
                            title={level === 'low' ? 'Auto Review' : level === 'medium' ? 'Standard' : (additionalRequirements.length > 0 ? additionalRequirements.join(', ') : '-')}
                            lineHeight="1.3"
                            fontSize="11px"
                          >
                            {level === 'low' ? 'Auto Review' : level === 'medium' ? 'Standard' : (additionalRequirements.length > 0 ? additionalRequirements.join(', ') : '-')}
                          </Text>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </Box>
          </Box>

          <Box>
            <Text fontWeight="600" mb={3}>Assignment Rules</Text>
            {profile.assignment_rules ? (
              <Box
                p={3}
                bg="white"
                borderRadius="md"
                border="1px solid"
                borderColor="gray.200"
                overflowX="auto"
                className="scrollbar-hover"
              >
                <Table variant="simple" size="sm" minW="100%">
                  <Thead>
                    <Tr>
                      <Th fontSize="xs" fontWeight="600" color="gray.700" textTransform="none" px={1.5} py={1.5} w="40%" textAlign="left" bg="blue.50">
                        <Tooltip label="Assignment rule name" placement="top">
                          Rule
                        </Tooltip>
                      </Th>
                      <Th fontSize="xs" fontWeight="600" color="gray.700" textTransform="none" px={1.5} py={1.5} w="60%" textAlign="left" bg="blue.50">
                        <Tooltip label="Rule value or configuration" placement="top">
                          Value
                        </Tooltip>
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {profile.assignment_rules.roles && Array.isArray(profile.assignment_rules.roles) && (
                      <Tr>
                        <Td px={1.5} py={1.5} fontSize="11px" color="gray.600" fontWeight="500" whiteSpace="nowrap" textAlign="left">Eligible Roles</Td>
                        <Td px={1.5} py={1.5} fontSize="11px" color="gray.700" textAlign="left">
                          <HStack spacing={1.5} flexWrap="wrap">
                            {profile.assignment_rules.roles.map((role: string, idx: number) => (
                              <Badge
                                key={idx}
                                bg="blue.50"
                                color="blue.800"
                                textTransform="capitalize"
                                fontSize="12px"
                                fontWeight="500"
                                px={2}
                                py={0.5}
                              >
                                {capitalizeFirst(role)}
                              </Badge>
                            ))}
                          </HStack>
                        </Td>
                      </Tr>
                    )}
                    {profile.assignment_rules.sla_hours && (
                      <Tr>
                        <Td px={1.5} py={1.5} fontSize="11px" color="gray.600" fontWeight="500" whiteSpace="nowrap" textAlign="left">SLA Hours</Td>
                        <Td px={1.5} py={1.5} fontSize="11px" color="gray.700" textAlign="left">{profile.assignment_rules.sla_hours}</Td>
                      </Tr>
                    )}
                    {profile.assignment_rules.escalation_hours && (
                      <Tr>
                        <Td px={1.5} py={1.5} fontSize="11px" color="gray.600" fontWeight="500" whiteSpace="nowrap" textAlign="left">Escalation Hours</Td>
                        <Td px={1.5} py={1.5} fontSize="11px" color="gray.700" textAlign="left">{profile.assignment_rules.escalation_hours}</Td>
                      </Tr>
                    )}
                    {profile.assignment_rules.requires_medical_license && (
                      <Tr>
                        <Td px={1.5} py={1.5} fontSize="11px" color="gray.600" fontWeight="500" whiteSpace="nowrap" textAlign="left">Medical License</Td>
                        <Td px={1.5} py={1.5} fontSize="11px" color="gray.700" textAlign="left">Required</Td>
                      </Tr>
                    )}
                    {profile.assignment_rules.requires_hr_approval && (
                      <Tr>
                        <Td px={1.5} py={1.5} fontSize="11px" color="gray.600" fontWeight="500" whiteSpace="nowrap" textAlign="left">HR Approval</Td>
                        <Td px={1.5} py={1.5} fontSize="11px" color="gray.700" textAlign="left">Required</Td>
                      </Tr>
                    )}
                    {profile.assignment_rules.requires_legal_approval_for_high_risk && (
                      <Tr>
                        <Td px={1.5} py={1.5} fontSize="11px" color="gray.600" fontWeight="500" whiteSpace="nowrap" textAlign="left">Legal Approval</Td>
                        <Td px={1.5} py={1.5} fontSize="11px" color="gray.700" textAlign="left">
                          <Text noOfLines={1} title="Required for high risk" fontSize="11px">Required for high risk</Text>
                        </Td>
                      </Tr>
                    )}
                    {profile.assignment_rules.requires_technical_approval && (
                      <Tr>
                        <Td px={1.5} py={1.5} fontSize="11px" color="gray.600" fontWeight="500" whiteSpace="nowrap" textAlign="left">Technical Approval</Td>
                        <Td px={1.5} py={1.5} fontSize="11px" color="gray.700" textAlign="left">Required</Td>
                      </Tr>
                    )}
                    {profile.assignment_rules.requires_compliance_approval && (
                      <Tr>
                        <Td px={1.5} py={1.5} fontSize="11px" color="gray.600" fontWeight="500" whiteSpace="nowrap" textAlign="left">Compliance Approval</Td>
                        <Td px={1.5} py={1.5} fontSize="11px" color="gray.700" textAlign="left">Required</Td>
                      </Tr>
                    )}
                  </Tbody>
                </Table>
              </Box>
            ) : (
              <Text fontSize="sm" color="gray.500">No assignment rules configured</Text>
            )}
          </Box>

          <Accordion allowToggle defaultIndex={[]} sx={{ '& > *': { border: 'none !important' } }}>
            <AccordionItem border="none" sx={{ border: 'none !important', borderTop: 'none !important', borderBottom: 'none !important' }}>
              <AccordionButton 
                px={0} 
                py={2} 
                bg="transparent"
                border="none"
                _hover={{ bg: 'transparent', border: 'none' }}
                _focus={{ bg: 'transparent', border: 'none', boxShadow: 'none' }}
                _active={{ bg: 'transparent', border: 'none' }}
                _expanded={{ bg: 'transparent', border: 'none' }}
                sx={{
                  border: 'none !important',
                  backgroundColor: 'transparent !important',
                  boxShadow: 'none !important',
                  fontSize: '18px !important',
                  fontWeight: '600 !important',
                  fontFamily: 'inherit',
                  '&:hover': {
                    border: 'none !important',
                    backgroundColor: 'transparent !important',
                    boxShadow: 'none !important',
                  },
                  '&:focus': {
                    border: 'none !important',
                    backgroundColor: 'transparent !important',
                    boxShadow: 'none !important',
                  },
                  '&:active': {
                    border: 'none !important',
                    backgroundColor: 'transparent !important',
                    boxShadow: 'none !important',
                  },
                  '&[aria-expanded="true"]': {
                    border: 'none !important',
                    backgroundColor: 'transparent !important',
                    boxShadow: 'none !important',
                  },
                }}
              >
                <Text flex="1" textAlign="left" fontSize="lg" fontWeight="600" as="span">
                  Advanced Configuration
                </Text>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel pb={4} px={0}>
                <VStack align="stretch" spacing={4}>
                  <Box>
                    <Code p={2} borderRadius="md" display="block" whiteSpace="pre-wrap" fontSize="xs">
                      {JSON.stringify(profile.risk_thresholds, null, 2)}
                    </Code>
                  </Box>
                  <Box>
                    <Code p={2} borderRadius="md" display="block" whiteSpace="pre-wrap" fontSize="xs">
                      {JSON.stringify(profile.assignment_rules, null, 2)}
                    </Code>
                  </Box>
                </VStack>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>

          {profile.rules && profile.rules.length > 0 && (
            <Box>
              <Text fontWeight="600" mb={2}>Rules ({profile.rules.length})</Text>
              <VStack align="stretch" spacing={2}>
                {profile.rules.map((rule) => (
                  <Box key={rule.id} p={3} bg="gray.50" borderRadius="md">
                    <HStack justify="space-between" mb={1}>
                      <Badge bg="blue.50" color="blue.700" fontWeight="normal" px={2} py={0.5}>{rule.rule_type}</Badge>
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
              <Text fontWeight="600" mb={2}>Data Controls ({profile.data_controls.length})</Text>
              <VStack align="stretch" spacing={2}>
                {profile.data_controls.map((control) => (
                  <Box key={control.id} p={3} bg="gray.50" borderRadius="md">
                    <HStack justify="space-between">
                      <Badge bg={control.is_required ? 'red.50' : 'blue.50'} color={control.is_required ? 'red.700' : 'blue.700'} fontWeight="normal" px={2} py={0.5}>
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

          <Accordion allowToggle defaultIndex={[]} sx={{ '& > *': { border: 'none !important' } }}>
            <AccordionItem border="none" sx={{ border: 'none !important', borderTop: 'none !important', borderBottom: 'none !important' }}>
              <AccordionButton 
                px={0} 
                py={2} 
                bg="transparent"
                border="none"
                _hover={{ bg: 'transparent', border: 'none' }}
                _focus={{ bg: 'transparent', border: 'none', boxShadow: 'none' }}
                _active={{ bg: 'transparent', border: 'none' }}
                _expanded={{ bg: 'transparent', border: 'none' }}
                sx={{
                  border: 'none !important',
                  backgroundColor: 'transparent !important',
                  boxShadow: 'none !important',
                  fontSize: '18px !important',
                  fontWeight: '600 !important',
                  fontFamily: 'inherit',
                  '&:hover': {
                    border: 'none !important',
                    backgroundColor: 'transparent !important',
                    boxShadow: 'none !important',
                  },
                  '&:focus': {
                    border: 'none !important',
                    backgroundColor: 'transparent !important',
                    boxShadow: 'none !important',
                  },
                  '&:active': {
                    border: 'none !important',
                    backgroundColor: 'transparent !important',
                    boxShadow: 'none !important',
                  },
                  '&[aria-expanded="true"]': {
                    border: 'none !important',
                    backgroundColor: 'transparent !important',
                    boxShadow: 'none !important',
                  },
                }}
              >
                <Text flex="1" textAlign="left" fontSize="lg" fontWeight="600" as="span">
                  Versioning
                </Text>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel pb={4} px={0}>
                <VStack align="stretch" spacing={4}>
                  {profile.version_hash && (
                    <Box>
                      <Text fontWeight="600" mb={2}>Version Hash</Text>
                      <Code fontSize="xs" p={2} borderRadius="md" display="block">
                        {profile.version_hash}
                      </Code>
                    </Box>
                  )}

                  <Box>
                    <Text fontWeight="600" mb={2}>Version History</Text>
                    {loadingVersions ? (
                      <Text color="gray.500" fontSize="sm">Loading...</Text>
                    ) : versionHistory.length > 0 ? (
                      <VStack align="stretch" spacing={2}>
                        {versionHistory
                          .sort((a, b) => b.version - a.version)
                          .map((version) => {
                            const formatTimestamp = (dateString: string) => {
                              const date = new Date(dateString);
                              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                              const hours = date.getHours();
                              const minutes = date.getMinutes();
                              const ampm = hours >= 12 ? 'PM' : 'AM';
                              const displayHours = hours % 12 || 12;
                              const displayMinutes = minutes.toString().padStart(2, '0');
                              return `${months[date.getMonth()]} ${date.getDate()} ${date.getFullYear()} ${displayHours}:${displayMinutes} ${ampm}`;
                            };

                            const getStatusText = (status: string) => {
                              switch (status) {
                                case 'active':
                                  return 'Active';
                                case 'draft':
                                  return 'Draft';
                                case 'archived':
                                  return 'Archived';
                                default:
                                  return status;
                              }
                            };

                            return (
                              <Box key={version.id} p={3} bg="gray.50" borderRadius="md">
                                <VStack align="stretch" spacing={1}>
                                  <Text fontSize="xs" fontWeight="medium">{version.name}</Text>
                                  <Text fontSize="xs" color="gray.700">
                                    Version {version.version}.0.0 | {getStatusText(version.status)} | Created: {version.created_at ? formatTimestamp(version.created_at) : 'N/A'}
                                    {version.created_by && ` | By: ${version.created_by}`}
                                  </Text>
                                </VStack>
                              </Box>
                            );
                          })}
                      </VStack>
                    ) : (
                      <Text color="gray.500" fontSize="sm">No version history available</Text>
                    )}
                  </Box>
                </VStack>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        </VStack>
      </VStack>

      {/* Activate Modal */}
      <Modal isOpen={isActivateOpen} onClose={handleActivateClose}>
        <ModalOverlay />
        <ModalContent borderRadius="3xl">
          <ModalHeader>Activate Profile</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={4} fontSize="sm" color="gray.700">
              Activating this profile will archive any other active version with the same name.
            </Text>
            <Textarea
              placeholder="Justification (optional)"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              mb={4}
              fontSize="sm"
              border="1px solid"
              borderColor="gray.300"
              sx={{
                border: '1px solid #CBD5E0 !important',
                '&:focus': {
                  border: '1px solid #9CA3AF !important',
                  boxShadow: 'none !important',
                  outline: 'none !important',
                  outlineOffset: '0 !important',
                  ring: 'none !important',
                  ringOffset: 'none !important',
                  ringColor: 'transparent !important'
                },
                '&:focus-visible': {
                  border: '1px solid #9CA3AF !important',
                  boxShadow: 'none !important',
                  outline: 'none !important',
                  outlineOffset: '0 !important',
                  ring: 'none !important',
                  ringOffset: 'none !important',
                  ringColor: 'transparent !important'
                },
                '&:hover': {
                  border: '1px solid #9CA3AF !important'
                },
                '&:active': {
                  border: '1px solid #9CA3AF !important'
                }
              }}
            />
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="600" color="gray.600">
                Type "Activate" to confirm
              </FormLabel>
              <Input
                value={activateConfirmation}
                onChange={(e) => setActivateConfirmation(e.target.value)}
                placeholder="Activate"
                fontSize="sm"
                border="1px solid"
                borderColor="gray.300"
                sx={{
                  border: '1px solid #CBD5E0 !important',
                  '&:focus': {
                    border: '1px solid #9CA3AF !important',
                    boxShadow: 'none !important',
                    outline: 'none !important',
                    outlineOffset: '0 !important',
                    ring: 'none !important',
                    ringOffset: 'none !important',
                    ringColor: 'transparent !important'
                  },
                  '&:focus-visible': {
                    border: '1px solid #9CA3AF !important',
                    boxShadow: 'none !important',
                    outline: 'none !important',
                    outlineOffset: '0 !important',
                    ring: 'none !important',
                    ringOffset: 'none !important',
                    ringColor: 'transparent !important'
                  },
                  '&:hover': {
                    border: '1px solid #9CA3AF !important'
                  },
                  '&:active': {
                    border: '1px solid #9CA3AF !important'
                  }
                }}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleActivateClose} h="30px" fontSize="xs">
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={handleActivate} 
              isLoading={activating} 
              h="30px" 
              fontSize="xs"
              isDisabled={activateConfirmation !== 'Activate'}
              aria-label="Activate profile"
              sx={{
                border: 'none !important',
                boxShadow: 'none !important',
                '&:hover': {
                  border: 'none !important',
                  boxShadow: 'none !important',
                },
                '&:focus': {
                  border: 'none !important',
                  boxShadow: 'none !important',
                  outline: 'none !important',
                },
                '&:active': {
                  border: 'none !important',
                  boxShadow: 'none !important',
                },
                '&:disabled': {
                  border: 'none !important',
                  boxShadow: 'none !important',
                },
              }}
            >
              Activate
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Archive Modal */}
      <Modal isOpen={isArchiveOpen} onClose={handleArchiveClose}>
        <ModalOverlay />
        <ModalContent borderRadius="3xl">
          <ModalHeader>Archive Profile</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={4} fontSize="sm" color="gray.700">
              This profile will be archived permanently and cannot be edited or reactivated.
            </Text>
            <Textarea
              placeholder="Justification (optional)"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              mb={4}
              fontSize="sm"
              border="1px solid"
              borderColor="gray.300"
              sx={{
                border: '1px solid #CBD5E0 !important',
                '&:focus': {
                  border: '1px solid #9CA3AF !important',
                  boxShadow: 'none !important',
                  outline: 'none !important',
                  outlineOffset: '0 !important',
                  ring: 'none !important',
                  ringOffset: 'none !important',
                  ringColor: 'transparent !important'
                },
                '&:focus-visible': {
                  border: '1px solid #9CA3AF !important',
                  boxShadow: 'none !important',
                  outline: 'none !important',
                  outlineOffset: '0 !important',
                  ring: 'none !important',
                  ringOffset: 'none !important',
                  ringColor: 'transparent !important'
                },
                '&:hover': {
                  border: '1px solid #9CA3AF !important'
                },
                '&:active': {
                  border: '1px solid #9CA3AF !important'
                }
              }}
            />
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="600" color="gray.600">
                Type "Archive" to confirm
              </FormLabel>
              <Input
                value={archiveConfirmation}
                onChange={(e) => setArchiveConfirmation(e.target.value)}
                placeholder="Archive"
                fontSize="sm"
                border="1px solid"
                borderColor="gray.300"
                sx={{
                  border: '1px solid #CBD5E0 !important',
                  '&:focus': {
                    border: '1px solid #9CA3AF !important',
                    boxShadow: 'none !important',
                    outline: 'none !important',
                    outlineOffset: '0 !important',
                    ring: 'none !important',
                    ringOffset: 'none !important',
                    ringColor: 'transparent !important'
                  },
                  '&:focus-visible': {
                    border: '1px solid #9CA3AF !important',
                    boxShadow: 'none !important',
                    outline: 'none !important',
                    outlineOffset: '0 !important',
                    ring: 'none !important',
                    ringOffset: 'none !important',
                    ringColor: 'transparent !important'
                  },
                  '&:hover': {
                    border: '1px solid #9CA3AF !important'
                  },
                  '&:active': {
                    border: '1px solid #9CA3AF !important'
                  }
                }}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleArchiveClose} h="30px" fontSize="xs">
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={handleArchive} 
              isLoading={archiving}
              isDisabled={archiveConfirmation !== 'Archive'}
              h="30px"
              fontSize="xs"
            >
              Archive
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Export Modal */}
      <Modal isOpen={isExportOpen} onClose={exportResult ? undefined : handleExportClose} closeOnOverlayClick={!exportResult} closeOnEsc={!exportResult} size="xl">
        <ModalOverlay />
        <ModalContent borderRadius="3xl">
          <ModalHeader>Export Governance Profile</ModalHeader>
          {!exportResult && <ModalCloseButton />}
          <ModalBody>
            {!exportResult ? (
              <VStack align="stretch" spacing={4}>
                {/* Read-only context fields */}
                <Box p={3} bg="gray.50" borderRadius="md">
                  <VStack align="stretch" spacing={2} fontSize="sm">
                    <HStack justify="space-between">
                      <Text fontWeight="600" color="gray.600">Profile Name:</Text>
                      <Text>{profile?.name}</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontWeight="600" color="gray.600">Version:</Text>
                      <Text>v {profile?.version}.0.0</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontWeight="600" color="gray.600">Status:</Text>
                      <Badge>{profile?.status}</Badge>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontWeight="600" color="gray.600">Domain:</Text>
                      <Text>{profile?.domain}</Text>
                    </HStack>
                  </VStack>
                </Box>

                {/* Export format */}
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="600">Export Format</FormLabel>
                  <HStack spacing={3}>
                    <Box
                      as="button"
                      type="button"
                      onClick={() => setExportFormat('pdf')}
                      px={3}
                      py={1.5}
                      borderRadius="md"
                      border="1px solid"
                      borderColor={exportFormat === 'pdf' ? 'gray.400' : 'gray.300'}
                      bg={exportFormat === 'pdf' ? 'gray.100' : 'white'}
                      color="gray.700"
                      fontSize="xs"
                      fontWeight={exportFormat === 'pdf' ? '500' : '400'}
                      cursor="pointer"
                      _hover={{ borderColor: 'gray.400' }}
                      transition="all 0.2s"
                    >
                      PDF
                    </Box>
                    <Box
                      as="button"
                      type="button"
                      onClick={() => setExportFormat('json')}
                      px={3}
                      py={1.5}
                      borderRadius="md"
                      border="1px solid"
                      borderColor={exportFormat === 'json' ? 'gray.400' : 'gray.300'}
                      bg={exportFormat === 'json' ? 'gray.100' : 'white'}
                      color="gray.700"
                      fontSize="xs"
                      fontWeight={exportFormat === 'json' ? '500' : '400'}
                      cursor="pointer"
                      _hover={{ borderColor: 'gray.400' }}
                      transition="all 0.2s"
                    >
                      JSON
                    </Box>
                  </HStack>
                </FormControl>

                {/* Export scope */}
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="600">Export Scope</FormLabel>
                  <Box
                    px={3}
                    py={1.5}
                    borderRadius="md"
                    border="1px solid"
                    borderColor="gray.300"
                    bg="gray.50"
                    color="gray.700"
                    fontSize="xs"
                    display="inline-block"
                  >
                    This version only
                  </Box>
                </FormControl>

                {/* Justification */}
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="600">Justification</FormLabel>
                  <Textarea
                    placeholder="What is your justification for exporting this profile?"
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    minH="80px"
                    fontSize="sm"
                    _placeholder={{ fontSize: 'sm' }}
                    border="1px solid"
                    borderColor="gray.300"
                    sx={{
                      border: '1px solid #CBD5E0 !important',
                      '&:focus': {
                        border: '1px solid #9CA3AF !important',
                        boxShadow: 'none !important',
                        outline: 'none !important',
                        outlineOffset: '0 !important',
                        ring: 'none !important',
                        ringOffset: 'none !important',
                        ringColor: 'transparent !important'
                      },
                      '&:focus-visible': {
                        border: '1px solid #9CA3AF !important',
                        boxShadow: 'none !important',
                        outline: 'none !important',
                        outlineOffset: '0 !important',
                        ring: 'none !important',
                        ringOffset: 'none !important',
                        ringColor: 'transparent !important'
                      },
                      '&:hover': {
                        border: '1px solid #9CA3AF !important'
                      },
                      '&:active': {
                        border: '1px solid #9CA3AF !important'
                      }
                    }}
                  />
                </FormControl>

                {/* Advanced options */}
                <Accordion allowToggle defaultIndex={[]}>
                  <AccordionItem border="none">
                    <AccordionButton 
                      px={0} 
                      py={2} 
                      bg="transparent"
                      border="none"
                      _hover={{ bg: 'transparent', border: 'none' }}
                      _focus={{ bg: 'transparent', border: 'none', boxShadow: 'none' }}
                      _active={{ bg: 'transparent', border: 'none' }}
                      _expanded={{ bg: 'transparent', border: 'none' }}
                    >
                      <Box flex="1" textAlign="left">
                        <FormLabel fontSize="sm" fontWeight="600" mb={0}>Advanced Options</FormLabel>
                      </Box>
                      <AccordionIcon />
                    </AccordionButton>
                    <AccordionPanel pb={4} px={0}>
                      <VStack align="stretch" spacing={3}>
                    <FormControl>
                      <FormLabel fontSize="xs" fontWeight="500">Redaction Level</FormLabel>
                      <Box position="relative" ref={redactionDropdownRef}>
                        <Box
                          as="button"
                          type="button"
                          onClick={() => setIsRedactionDropdownOpen(!isRedactionDropdownOpen)}
                          w="100%"
                          px={3}
                          py={1.5}
                          borderRadius="md"
                          border="1px solid"
                          borderColor="gray.300"
                          bg="white"
                          color="gray.700"
                          fontSize="xs"
                          textAlign="left"
                          cursor="pointer"
                          _hover={{ borderColor: 'gray.400' }}
                          transition="all 0.2s"
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Text textTransform="capitalize">{redactionLevel}</Text>
                          <ChevronDown size={16} style={{ transform: isRedactionDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                        </Box>
                        {isRedactionDropdownOpen && (
                          <Box
                            position="absolute"
                            top="100%"
                            left={0}
                            right={0}
                            mt={1}
                            bg="white"
                            border="1px solid"
                            borderColor="gray.300"
                            borderRadius="md"
                            boxShadow="md"
                            zIndex={10}
                          >
                            <VStack align="stretch" spacing={0}>
                              {['none', 'partial', 'full'].map((option, index) => (
                                <Box key={option}>
                                  {index > 0 && <Divider borderColor="gray.200" />}
                                  <Box
                                    as="button"
                                    type="button"
                                    onClick={() => {
                                      setRedactionLevel(option);
                                      setIsRedactionDropdownOpen(false);
                                    }}
                                    px={3}
                                    py={2}
                                    textAlign="left"
                                    fontSize="xs"
                                    color="gray.700"
                                    bg={redactionLevel === option ? 'gray.100' : 'white'}
                                    _hover={{ bg: 'gray.50' }}
                                    border="none"
                                    textTransform="capitalize"
                                    cursor="pointer"
                                    w="100%"
                                  >
                                    {option}
                                  </Box>
                                </Box>
                              ))}
                            </VStack>
                          </Box>
                        )}
                      </Box>
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="xs" fontWeight="500">Watermark Label</FormLabel>
                      <Input
                        value={watermarkLabel}
                        onChange={(e) => setWatermarkLabel(e.target.value)}
                        placeholder="Optional watermark text"
                        size="sm"
                        fontSize="sm"
                      />
                        </FormControl>
                      </VStack>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>

                {/* Confirmation checkbox */}
                <FormControl>
                  <Checkbox
                    isChecked={exportConfirmed}
                    onChange={(e) => setExportConfirmed(e.target.checked)}
                    fontSize="xs"
                    colorScheme="blue"
                  >
                    <Text fontSize="xs" color="gray.700">
                      By exporting this profile, you acknowledge that the action is permanent and will be recorded in the audit ledger.
                    </Text>
                  </Checkbox>
                </FormControl>
              </VStack>
            ) : (
              <VStack align="stretch" spacing={4}>
                <Alert status="success">
                  <AlertIcon />
                  <AlertDescription>
                    Profile exported successfully. The artifact has been created and logged in the ledger.
                  </AlertDescription>
                </Alert>
                
                <Box p={4} bg="gray.50" borderRadius="md">
                  <VStack align="stretch" spacing={3}>
                    <Box>
                      <Text fontSize="xs" fontWeight="600" color="gray.600" mb={1}>Artifact Hash</Text>
                      <HStack>
                        <Code fontSize="xs" p={2} borderRadius="md" flex="1">
                          {exportResult.artifactHash}
                        </Code>
                        <IconButton
                          aria-label="Copy hash"
                          icon={<Copy size={16} />}
                          size="sm"
                          onClick={handleCopyHash}
                        />
                      </HStack>
                    </Box>
                    <Box>
                      <Text fontSize="xs" fontWeight="600" color="gray.600" mb={1}>Timestamp</Text>
                      <Text fontSize="sm">{new Date(exportResult.timestamp).toLocaleString()}</Text>
                    </Box>
                  </VStack>
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            {!exportResult ? (
              <>
                <Button variant="ghost" mr={3} onClick={handleExportClose} h="30px" fontSize="xs">
                  Cancel
                </Button>
                <Button
                  colorScheme="blue"
                  onClick={handleExport}
                  isLoading={exporting}
                  isDisabled={!exportConfirmed}
                  h="30px"
                  fontSize="xs"
                >
                  Export
                </Button>
              </>
            ) : (
              <>
                <Button
                  leftIcon={<Copy size={16} />}
                  variant="outline"
                  mr={3}
                  onClick={handleCopyHash}
                  h="30px"
                  fontSize="xs"
                >
                  Copy Hash
                </Button>
                {exportResult.downloadUrl && (
                  <Button
                    leftIcon={<Download size={16} />}
                    colorScheme="blue"
                    onClick={handleDownload}
                    h="30px"
                    fontSize="xs"
                  >
                    Download Artifact
                  </Button>
                )}
                <Button ml={3} onClick={handleExportClose} h="30px" fontSize="xs">
                  Close
                </Button>
              </>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} size="xl">
        <ModalOverlay />
        <ModalContent borderRadius="3xl">
          <ModalHeader>Edit Profile</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600">Profile Name</FormLabel>
                <Box
                  px={3}
                  py={2}
                  bg="gray.50"
                  fontSize="sm"
                  borderRadius="md"
                  border="1px solid"
                  borderColor="gray.300"
                  color="gray.500"
                >
                  {editFormData.name}
                </Box>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600">Domain</FormLabel>
                <Box
                  px={3}
                  py={2}
                  bg="gray.50"
                  fontSize="sm"
                  borderRadius="md"
                  border="1px solid"
                  borderColor="gray.300"
                  color="gray.500"
                >
                  {editFormData.domain}
                </Box>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600">Policy Statement</FormLabel>
                <Textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  placeholder="Enter profile description"
                  minH="80px"
                  fontSize="sm"
                  border="1px solid"
                  borderColor="gray.300"
                  sx={{
                    border: '1px solid #CBD5E0 !important',
                    '&:focus': {
                      border: '1px solid #9CA3AF !important',
                      boxShadow: 'none !important',
                      outline: 'none !important',
                      outlineOffset: '0 !important',
                      ring: 'none !important',
                      ringOffset: 'none !important',
                      ringColor: 'transparent !important'
                    },
                    '&:focus-visible': {
                      border: '1px solid #9CA3AF !important',
                      boxShadow: 'none !important',
                      outline: 'none !important',
                      outlineOffset: '0 !important',
                      ring: 'none !important',
                      ringOffset: 'none !important',
                      ringColor: 'transparent !important'
                    },
                    '&:hover': {
                      border: '1px solid #9CA3AF !important'
                    },
                    '&:active': {
                      border: '1px solid #9CA3AF !important'
                    }
                  }}
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600">Human Review Requirement</FormLabel>
                <Box position="relative" ref={humanReviewDropdownRef}>
                  <Box
                    as="button"
                    type="button"
                    data-dropdown-button
                    onClick={() => setIsHumanReviewDropdownOpen(!isHumanReviewDropdownOpen)}
                    w="100%"
                    px={3}
                    py={2}
                    borderRadius="md"
                    border="1px solid"
                    borderColor="gray.300"
                    bg="white"
                    color="gray.700"
                    fontSize="sm"
                    textAlign="left"
                    cursor="pointer"
                    _hover={{ borderColor: 'gray.400' }}
                    _focus={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px', outline: 'none' }}
                    _focusVisible={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px', outline: 'none' }}
                    transition="all 0.2s"
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    css={{
                      '&:focus': {
                        borderColor: '#9CA3AF !important',
                        borderWidth: '1px !important',
                        boxShadow: 'none !important',
                        outline: 'none !important',
                      },
                    }}
                  >
                    <Text textTransform="capitalize">{editFormData.human_review_requirement}</Text>
                    <ChevronDown size={16} style={{ transform: isHumanReviewDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                  </Box>
                  {isHumanReviewDropdownOpen && (
                    <Box
                      position="absolute"
                      top="100%"
                      left={0}
                      right={0}
                      mt={1}
                      bg="white"
                      border="1px solid"
                      borderColor="gray.300"
                      borderRadius="md"
                      boxShadow="md"
                      zIndex={10}
                    >
                      <VStack align="stretch" spacing={0}>
                        {['required', 'conditional', 'optional'].map((option, index) => (
                          <Box key={option}>
                            {index > 0 && <Divider borderColor="gray.200" />}
                            <Box
                              as="button"
                              type="button"
                              onClick={() => {
                                setEditFormData({ ...editFormData, human_review_requirement: option as 'required' | 'conditional' | 'optional' });
                                setIsHumanReviewDropdownOpen(false);
                              }}
                              px={3}
                              py={2}
                              textAlign="left"
                              fontSize="sm"
                              color="gray.700"
                              bg={editFormData.human_review_requirement === option ? 'gray.100' : 'white'}
                              _hover={{ bg: 'gray.50' }}
                              border="none"
                              textTransform="capitalize"
                              cursor="pointer"
                              w="100%"
                            >
                              {option}
                            </Box>
                          </Box>
                        ))}
                      </VStack>
                    </Box>
                  )}
                </Box>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600">Allowed Actions</FormLabel>
                <HStack spacing={2} flexWrap="wrap">
                  {['approve', 'reject', 'escalate', 'override'].map((action) => {
                    const isSelected = editFormData.allowed_actions.includes(action);
                    return (
                      <Box
                        key={action}
                        as="button"
                        type="button"
                        data-action-button
                        onClick={() => {
                          if (isSelected) {
                            setEditFormData({
                              ...editFormData,
                              allowed_actions: editFormData.allowed_actions.filter(a => a !== action),
                            });
                          } else {
                            setEditFormData({
                              ...editFormData,
                              allowed_actions: [...editFormData.allowed_actions, action],
                            });
                          }
                        }}
                        px={3}
                        py={1.5}
                        borderRadius="md"
                        bg={isSelected ? 'blue.50' : 'white'}
                        color={isSelected ? 'blue.700' : 'gray.700'}
                        fontSize="sm"
                        fontWeight={isSelected ? '500' : '400'}
                        cursor="pointer"
                        sx={{
                          border: '1px solid !important',
                          borderColor: isSelected ? '#3182CE !important' : '#CBD5E0 !important',
                          '&:hover': {
                            borderColor: isSelected ? '#2C5282 !important' : '#A0AEC0 !important',
                            border: '1px solid !important',
                            bg: isSelected ? '#BEE3F8' : '#F7FAFC',
                          },
                          '&:focus': {
                            border: '1px solid !important',
                            borderColor: isSelected ? '#2C5282 !important' : '#A0AEC0 !important',
                            outline: 'none',
                            boxShadow: 'none',
                          },
                          '&:active': {
                            border: '1px solid !important',
                            borderColor: isSelected ? '#2B6CB0 !important' : '#718096 !important',
                          },
                          '&:focus-visible': {
                            border: '1px solid !important',
                            borderColor: isSelected ? '#2C5282 !important' : '#A0AEC0 !important',
                            outline: 'none',
                            boxShadow: 'none',
                          },
                        }}
                        transition="all 0.2s"
                      >
                        {action.charAt(0).toUpperCase() + action.slice(1)}
                      </Box>
                    );
                  })}
                </HStack>
              </FormControl>

              <Divider />

              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600">Justification (for activation)</FormLabel>
                <Textarea
                  placeholder="Justification (optional)"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  fontSize="sm"
                  border="1px solid"
                  borderColor="gray.300"
                  sx={{
                    border: '1px solid #CBD5E0 !important',
                    '&:focus': {
                      border: '1px solid #9CA3AF !important',
                      boxShadow: 'none !important',
                      outline: 'none !important',
                      outlineOffset: '0 !important',
                      ring: 'none !important',
                      ringOffset: 'none !important',
                      ringColor: 'transparent !important'
                    },
                    '&:focus-visible': {
                      border: '1px solid #9CA3AF !important',
                      boxShadow: 'none !important',
                      outline: 'none !important',
                      outlineOffset: '0 !important',
                      ring: 'none !important',
                      ringOffset: 'none !important',
                      ringColor: 'transparent !important'
                    },
                    '&:hover': {
                      border: '1px solid #9CA3AF !important'
                    },
                    '&:active': {
                      border: '1px solid #9CA3AF !important'
                    }
                  }}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEditClose} h="30px" fontSize="xs">
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleEditSave}
              isLoading={editingProfile}
              mr={3}
              h="30px"
              fontSize="xs"
            >
              Save Changes
            </Button>
            <Button
              colorScheme="green"
              onClick={handleEditAndActivate}
              isLoading={editingProfile || activating}
              h="30px"
              fontSize="xs"
            >
              Save & Activate
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Create New Version Success Modal */}
      <Modal isOpen={isCreateVersionSuccessOpen} onClose={handleCreateVersionSuccessClose} size="xl">
        <ModalOverlay />
        <ModalContent borderRadius="3xl">
          <ModalHeader>New Version Created</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {newVersionProfile && (
              <VStack align="stretch" spacing={4}>
                <Alert status="success">
                  <AlertIcon />
                  <AlertDescription>
                    A new draft version has been created successfully.
                  </AlertDescription>
                </Alert>
                <Box p={4} bg="gray.50" borderRadius="md">
                  <VStack align="stretch" spacing={2}>
                    <HStack justify="space-between">
                      <Text fontWeight="600" color="gray.600">Profile Name:</Text>
                      <Text>{newVersionProfile.name}</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontWeight="600" color="gray.600">Version:</Text>
                      <Text>v {newVersionProfile.version}.0.0</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontWeight="600" color="gray.600">Status:</Text>
                      <Badge>{newVersionProfile.status}</Badge>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontWeight="600" color="gray.600">Domain:</Text>
                      <Text>{newVersionProfile.domain}</Text>
                    </HStack>
                  </VStack>
                </Box>
                <Text fontSize="sm" color="gray.600">
                  The new draft version is ready for editing. You can now modify it before activating.
                </Text>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={handleCreateVersionSuccessClose} h="30px" fontSize="xs">
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Audit History Modal */}
      <Modal isOpen={isAuditOpen} onClose={onAuditClose} size="xl">
        <ModalOverlay />
        <ModalContent borderRadius="3xl">
          <ModalHeader>Audit History</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={2} maxH="400px" overflowY="auto" className="scrollbar-hover">
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
            <Button onClick={onAuditClose} h="30px" fontSize="xs">Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
        </Box>
        )
      )}
    </Box>
  );
}

