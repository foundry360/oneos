'use client';

import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Textarea,
  Select,
  Button,
  FormControl,
  FormLabel,
  Checkbox,
  Badge,
  IconButton,
  useToast,
  Divider,
  Code,
  Grid,
  GridItem,
} from '@chakra-ui/react';
import { Plus, X, Save, ChevronDown } from 'lucide-react';
import { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { GovernanceProfile } from '@/hooks/useGovernanceProfiles';

interface ProfileFormProps {
  profile?: GovernanceProfile | null;
  onSave: (profileData: Partial<GovernanceProfile>) => Promise<void>;
  onCancel: () => void;
  isModal?: boolean;
  showButtons?: boolean;
  onSaveClick?: () => void;
}

const ProfileForm = forwardRef<{ save: () => Promise<void> }, ProfileFormProps>(
  ({ profile, onSave, onCancel, isModal = false, showButtons = true }, ref) => {
  const [isDomainDropdownOpen, setIsDomainDropdownOpen] = useState(false);
  const domainDropdownRef = useRef<HTMLDivElement>(null);
  const [domainInputValue, setDomainInputValue] = useState('');
  const [isHumanReviewDropdownOpen, setIsHumanReviewDropdownOpen] = useState(false);
  const humanReviewDropdownRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    description: '',
    allowed_actions: [] as string[],
    risk_thresholds: {} as Record<string, any>,
    human_review_requirement: 'conditional' as 'required' | 'conditional' | 'optional',
    assignment_rules: {} as Record<string, any>,
    rules: [] as Array<{ rule_type: string; rule_key: string; rule_value: any; priority: number }>,
    data_controls: [] as Array<{ control_type: string; control_config: Record<string, any>; is_required: boolean }>,
    metadata: {} as Record<string, any>,
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useImperativeHandle(ref, () => ({
    save: handleSave,
  }));

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        domain: profile.domain || '',
        description: profile.description || '',
        allowed_actions: profile.allowed_actions || [],
        risk_thresholds: profile.risk_thresholds || {},
        human_review_requirement: profile.human_review_requirement || 'conditional',
        assignment_rules: profile.assignment_rules || {},
        rules: profile.rules || [],
        data_controls: profile.data_controls || [],
        metadata: profile.metadata || {},
      });
      setDomainInputValue(profile.domain ? getDomainLabel(profile.domain) : '');
    } else {
      // Reset when creating new profile
      setDomainInputValue('');
    }
  }, [profile]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (domainDropdownRef.current && !domainDropdownRef.current.contains(event.target as Node)) {
        setIsDomainDropdownOpen(false);
      }
      if (humanReviewDropdownRef.current && !humanReviewDropdownRef.current.contains(event.target as Node)) {
        setIsHumanReviewDropdownOpen(false);
      }
    };

    if (isDomainDropdownOpen || isHumanReviewDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isDomainDropdownOpen, isHumanReviewDropdownOpen]);

  const domainOptions = [
    { value: 'workers-comp', label: 'Workers Comp' },
    { value: 'employment', label: 'Employment' },
    { value: 'ai-model-deployment', label: 'AI Model Deployment' },
    { value: 'other', label: 'Other' },
  ];

  const getFilteredDomains = (input: string) => {
    if (!input.trim()) {
      return domainOptions;
    }
    const lowerInput = input.toLowerCase();
    return domainOptions.filter(option => 
      option.label.toLowerCase().includes(lowerInput) ||
      option.value.toLowerCase().includes(lowerInput)
    );
  };

  const getDomainLabel = (value: string) => {
    if (!value) return 'Select or type domain';
    const option = domainOptions.find(opt => opt.value === value);
    return option ? option.label : value; // Return the value itself if it's custom
  };

  const humanReviewOptions = [
    { value: 'required', label: 'Required' },
    { value: 'conditional', label: 'Conditional' },
    { value: 'optional', label: 'Optional' },
  ];

  const getHumanReviewLabel = (value: string) => {
    const option = humanReviewOptions.find(opt => opt.value === value);
    return option ? option.label : value || 'Select requirement';
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Prepare save payload - rules and data_controls don't need IDs when creating/updating
      const savePayload: any = {
        name: formData.name,
        domain: formData.domain,
        description: formData.description,
        allowed_actions: formData.allowed_actions,
        risk_thresholds: formData.risk_thresholds || {},
        human_review_requirement: formData.human_review_requirement,
        assignment_rules: formData.assignment_rules || {},
        rules: formData.rules.map(r => ({
          rule_type: r.rule_type,
          rule_key: r.rule_key,
          rule_value: r.rule_value,
          priority: r.priority
        })),
        data_controls: formData.data_controls.map(c => ({
          control_type: c.control_type,
          control_config: c.control_config,
          is_required: c.is_required
        })),
        metadata: formData.metadata,
      };

      await onSave(savePayload);
      
      toast({
        title: 'Profile saved',
        description: profile ? 'Profile updated successfully' : 'Profile created successfully',
        status: 'success',
      });
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error.response?.data?.error || 'Failed to save profile',
        status: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleAction = (action: string) => {
    setFormData((prev) => ({
      ...prev,
      allowed_actions: prev.allowed_actions.includes(action)
        ? prev.allowed_actions.filter((a) => a !== action)
        : [...prev.allowed_actions, action],
    }));
  };

  const updateRiskThreshold = (level: 'low' | 'medium' | 'high', field: string, value: any) => {
    setFormData((prev) => {
      const currentThresholds = prev.risk_thresholds || {};
      const currentLevel = currentThresholds[level] || {};
      return {
        ...prev,
        risk_thresholds: {
          ...currentThresholds,
          [level]: {
            ...currentLevel,
            [field]: value
          }
        }
      };
    });
  };

  const addRule = () => {
    setFormData((prev) => ({
      ...prev,
      rules: [
        ...prev.rules,
        { rule_type: '', rule_key: '', rule_value: {}, priority: 0 },
      ],
    }));
  };

  const removeRule = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index),
    }));
  };

  const updateRule = (index: number, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      rules: prev.rules.map((rule, i) =>
        i === index ? { ...rule, [field]: value } : rule
      ),
    }));
  };

  const addDataControl = () => {
    setFormData((prev) => ({
      ...prev,
      data_controls: [
        ...prev.data_controls,
        { control_type: '', control_config: {}, is_required: false },
      ],
    }));
  };

  const removeDataControl = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      data_controls: prev.data_controls.filter((_, i) => i !== index),
    }));
  };

  const updateDataControl = (index: number, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      data_controls: prev.data_controls.map((control, i) =>
        i === index ? { ...control, [field]: value } : control
      ),
    }));
  };

  if (isModal) {
    return (
      <Box p={5}>
        <Grid templateColumns="repeat(2, 1fr)" gap={4}>
            <GridItem>
              <FormControl isRequired>
                <FormLabel>Name</FormLabel>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., workers-comp-ime-review"
                  isDisabled={!!profile}
                  variant="outline"
                  fontSize="sm"
                  border="1px solid"
                  borderColor="gray.300"
                  _focus={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px', outline: 'none', ring: 'none', ringOffset: 'none' }}
                  _focusVisible={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px', outline: 'none', ring: 'none', ringOffset: 'none' }}
                  _hover={{ borderColor: 'gray.400' }}
                  css={{
                    '&:focus': {
                      borderColor: '#9CA3AF !important',
                      borderWidth: '1px !important',
                      boxShadow: 'none !important',
                      outline: 'none !important',
                    },
                  }}
                />
              </FormControl>
            </GridItem>

            <GridItem>
              <FormControl isRequired>
                <FormLabel>Domain</FormLabel>
                <Box position="relative" ref={domainDropdownRef}>
                  <Input
                    value={profile ? getDomainLabel(formData.domain) : (domainInputValue !== undefined ? domainInputValue : '')}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDomainInputValue(value);
                      setFormData({ ...formData, domain: value });
                      setIsDomainDropdownOpen(true);
                    }}
                    onFocus={() => {
                      if (!profile) {
                        setIsDomainDropdownOpen(true);
                        if (domainInputValue === undefined || domainInputValue === '') {
                          setDomainInputValue('');
                        }
                      }
                    }}
                    placeholder="Select or type domain"
                    isDisabled={!!profile}
                    variant="outline"
                    fontSize="sm"
                    border="1px solid"
                    borderColor="gray.300"
                    _focus={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px', outline: 'none', ring: 'none', ringOffset: 'none' }}
                    _focusVisible={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px', outline: 'none', ring: 'none', ringOffset: 'none' }}
                    _hover={{ borderColor: 'gray.400' }}
                    css={{
                      '&:focus': {
                        borderColor: '#9CA3AF !important',
                        borderWidth: '1px !important',
                        boxShadow: 'none !important',
                        outline: 'none !important',
                      },
                    }}
                  />
                  {isDomainDropdownOpen && !profile && getFilteredDomains(domainInputValue).length > 0 && (
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
                      maxH="200px"
                      overflowY="auto"
                    >
                      <VStack align="stretch" spacing={0}>
                        {getFilteredDomains(domainInputValue).map((option, index) => (
                          <Box key={option.value}>
                            {index > 0 && <Divider borderColor="gray.200" />}
                            <Box
                              as="button"
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, domain: option.value });
                                setDomainInputValue(option.label);
                                setIsDomainDropdownOpen(false);
                              }}
                              px={3}
                              py={2}
                              textAlign="left"
                              fontSize="sm"
                              color="gray.700"
                              bg={formData.domain === option.value ? 'gray.50' : 'white'}
                              _hover={{ bg: 'gray.50' }}
                              border="none"
                              cursor="pointer"
                              w="100%"
                            >
                              {option.label}
                            </Box>
                          </Box>
                        ))}
                      </VStack>
                    </Box>
                  )}
                </Box>
              </FormControl>
            </GridItem>

            <GridItem colSpan={2}>
              <FormControl>
                <FormLabel>Policy Statement</FormLabel>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the governance profile..."
                  variant="outline"
                  fontSize="sm"
                  border="1px solid"
                  borderColor="gray.300"
                  _focus={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px', outline: 'none', ring: 'none', ringOffset: 'none' }}
                  _focusVisible={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px', outline: 'none', ring: 'none', ringOffset: 'none' }}
                  _hover={{ borderColor: 'gray.400' }}
                  css={{
                    '&:focus': {
                      borderColor: '#9CA3AF !important',
                      borderWidth: '1px !important',
                      boxShadow: 'none !important',
                      outline: 'none !important',
                    },
                  }}
                />
              </FormControl>
            </GridItem>

            <GridItem>
              <FormControl>
                <FormLabel>Human Review Requirement</FormLabel>
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
                  <Text textTransform="capitalize">{getHumanReviewLabel(formData.human_review_requirement)}</Text>
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
                        {humanReviewOptions.map((option, index) => (
                          <Box key={option.value}>
                            {index > 0 && <Divider borderColor="gray.200" />}
                            <Box
                              as="button"
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, human_review_requirement: option.value as any });
                                setIsHumanReviewDropdownOpen(false);
                              }}
                              px={3}
                              py={2}
                              textAlign="left"
                              fontSize="sm"
                              color="gray.700"
                              _hover={{ bg: 'gray.50' }}
                              bg={formData.human_review_requirement === option.value ? 'gray.50' : 'white'}
                              border="none"
                              w="100%"
                            >
                              {option.label}
                            </Box>
                          </Box>
                        ))}
                      </VStack>
                    </Box>
                  )}
                </Box>
              </FormControl>
            </GridItem>

            <GridItem>
              <FormControl>
                <FormLabel>Allowed Actions</FormLabel>
                <HStack spacing={2} flexWrap="wrap">
                  {['approve', 'reject', 'escalate', 'override'].map((action) => {
                    const isSelected = formData.allowed_actions.includes(action);
                    return (
                      <Box
                        key={action}
                        as="button"
                        type="button"
                        data-action-button
                        onClick={() => toggleAction(action)}
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
                          '&:active': {
                            border: '1px solid !important',
                            borderColor: isSelected ? '#2C5282 !important' : '#A0AEC0 !important',
                            bg: isSelected ? '#90CDF4' : '#EDF2F7',
                          },
                          '&:focus': {
                            border: '1px solid !important',
                            borderColor: isSelected ? '#2C5282 !important' : '#A0AEC0 !important',
                            outline: 'none',
                            boxShadow: 'none',
                          },
                          '&:focus-visible': {
                            border: '1px solid !important',
                            borderColor: isSelected ? '#2C5282 !important' : '#A0AEC0 !important',
                            outline: 'none',
                            boxShadow: 'none',
                          },
                        }}
                      >
                        {action.charAt(0).toUpperCase() + action.slice(1)}
                      </Box>
                    );
                  })}
                </HStack>
              </FormControl>
            </GridItem>

            <GridItem colSpan={2}>
              <FormControl>
                <FormLabel>Risk Thresholds</FormLabel>
                <VStack align="stretch" spacing={4} p={4} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.300">
                  {(['low', 'medium', 'high'] as const).map((level) => {
                    const threshold = formData.risk_thresholds?.[level] || {};
                    return (
                      <Box key={level} p={3} bg="white" borderRadius="md" border="1px solid" borderColor="gray.200">
                        <FormLabel fontSize="sm" fontWeight="bold" mb={3} textTransform="capitalize">
                          {level} Risk
                        </FormLabel>
                        <VStack align="stretch" spacing={3}>
                          <HStack spacing={2}>
                            <Checkbox
                              isChecked={threshold.requires_review || false}
                              onChange={(e) => updateRiskThreshold(level, 'requires_review', e.target.checked)}
                              size="sm"
                            >
                              <Text fontSize="sm">Requires Review</Text>
                            </Checkbox>
                            <Checkbox
                              isChecked={threshold.auto_approve || false}
                              onChange={(e) => updateRiskThreshold(level, 'auto_approve', e.target.checked)}
                              size="sm"
                            >
                              <Text fontSize="sm">Auto Approve</Text>
                            </Checkbox>
                          </HStack>
                          <HStack spacing={4}>
                            <FormControl flex={1}>
                              <FormLabel fontSize="xs">Min Reviewers</FormLabel>
                              <Input
                                type="number"
                                value={threshold.min_reviewers || ''}
                                onChange={(e) => updateRiskThreshold(level, 'min_reviewers', e.target.value ? parseInt(e.target.value) : undefined)}
                                placeholder="0"
                                size="sm"
                                variant="outline"
                                border="1px solid"
                                borderColor="gray.300"
                                _focus={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                                _focusVisible={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                                _hover={{ borderColor: 'gray.400' }}
                              />
                            </FormControl>
                            <FormControl flex={1}>
                              <FormLabel fontSize="xs">SLA Hours</FormLabel>
                              <Input
                                type="number"
                                value={threshold.sla_hours || ''}
                                onChange={(e) => updateRiskThreshold(level, 'sla_hours', e.target.value ? parseInt(e.target.value) : undefined)}
                                placeholder="48"
                                size="sm"
                                variant="outline"
                                border="1px solid"
                                borderColor="gray.300"
                                _focus={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                                _focusVisible={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                                _hover={{ borderColor: 'gray.400' }}
                              />
                            </FormControl>
                          </HStack>
                          {level === 'high' && (
                            <VStack align="stretch" spacing={2}>
                              <Text fontSize="xs" fontWeight="medium" color="gray.600">Special Requirements:</Text>
                              <HStack spacing={4} flexWrap="wrap">
                                <Checkbox
                                  isChecked={threshold.requires_compliance_officer || false}
                                  onChange={(e) => updateRiskThreshold(level, 'requires_compliance_officer', e.target.checked)}
                                  size="sm"
                                >
                                  <Text fontSize="sm">Compliance Officer</Text>
                                </Checkbox>
                                <Checkbox
                                  isChecked={threshold.requires_financial_expert || false}
                                  onChange={(e) => updateRiskThreshold(level, 'requires_financial_expert', e.target.checked)}
                                  size="sm"
                                >
                                  <Text fontSize="sm">Financial Expert</Text>
                                </Checkbox>
                                <Checkbox
                                  isChecked={threshold.requires_legal_approval || false}
                                  onChange={(e) => updateRiskThreshold(level, 'requires_legal_approval', e.target.checked)}
                                  size="sm"
                                >
                                  <Text fontSize="sm">Legal Approval</Text>
                                </Checkbox>
                              </HStack>
                            </VStack>
                          )}
                        </VStack>
                      </Box>
                    );
                  })}
                </VStack>
              </FormControl>
            </GridItem>

            <GridItem colSpan={2}>
              <FormControl>
                <FormLabel>Assignment Rules</FormLabel>
                <VStack align="stretch" spacing={4} p={4} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.300">
                  {/* Role Selection */}
                  <Box>
                    <FormLabel fontSize="sm" fontWeight="medium" mb={2}>Eligible Roles</FormLabel>
                    <HStack spacing={2} flexWrap="wrap">
                      {['governance', 'reviewer', 'admin'].map((role) => {
                        const isSelected = (formData.assignment_rules?.roles || []).includes(role);
                        return (
                          <Box
                            key={role}
                            as="button"
                            type="button"
                            onClick={() => {
                              const currentRoles = formData.assignment_rules?.roles || [];
                              const newRoles = isSelected
                                ? currentRoles.filter((r: string) => r !== role)
                                : [...currentRoles, role];
                              setFormData({
                                ...formData,
                                assignment_rules: {
                                  ...formData.assignment_rules,
                                  roles: newRoles
                                }
                              });
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
                              '&:active': {
                                border: '1px solid !important',
                                borderColor: isSelected ? '#2C5282 !important' : '#A0AEC0 !important',
                                bg: isSelected ? '#90CDF4' : '#EDF2F7',
                              },
                              '&:focus': {
                                border: '1px solid !important',
                                borderColor: isSelected ? '#3182CE !important' : '#A0AEC0 !important',
                                outline: 'none',
                                boxShadow: 'none',
                              },
                              '&:focus-visible': {
                                border: '1px solid !important',
                                borderColor: isSelected ? '#3182CE !important' : '#A0AEC0 !important',
                                outline: 'none',
                                boxShadow: 'none',
                              },
                            }}
                          >
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </Box>
                        );
                      })}
                    </HStack>
                  </Box>

                  {/* SLA Hours */}
                  <HStack spacing={4}>
                    <FormControl flex={1}>
                      <FormLabel fontSize="sm">SLA Hours</FormLabel>
                      <Input
                        type="number"
                        value={formData.assignment_rules?.sla_hours || ''}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            assignment_rules: {
                              ...formData.assignment_rules,
                              sla_hours: e.target.value ? parseInt(e.target.value) : undefined
                            }
                          });
                        }}
                        placeholder="48"
                        size="sm"
                        variant="outline"
                        border="1px solid"
                        borderColor="gray.300"
                        _focus={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                        _focusVisible={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                        _hover={{ borderColor: 'gray.400' }}
                      />
                    </FormControl>

                    <FormControl flex={1}>
                      <FormLabel fontSize="sm">Escalation Hours</FormLabel>
                      <Input
                        type="number"
                        value={formData.assignment_rules?.escalation_hours || ''}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            assignment_rules: {
                              ...formData.assignment_rules,
                              escalation_hours: e.target.value ? parseInt(e.target.value) : undefined
                            }
                          });
                        }}
                        placeholder="72"
                        size="sm"
                        variant="outline"
                        border="1px solid"
                        borderColor="gray.300"
                        _focus={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                        _focusVisible={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                        _hover={{ borderColor: 'gray.400' }}
                      />
                    </FormControl>
                  </HStack>

                  {/* Special Requirements */}
                  <Box>
                    <FormLabel fontSize="sm" fontWeight="medium" mb={2}>Special Requirements</FormLabel>
                    <VStack align="stretch" spacing={2}>
                      {[
                        { key: 'requires_compliance_certification', label: 'Requires Compliance Certification' },
                        { key: 'requires_medical_license', label: 'Requires Medical License' },
                        { key: 'requires_hr_approval', label: 'Requires HR Approval' },
                        { key: 'requires_legal_approval_for_high_risk', label: 'Requires Legal Approval for High Risk' },
                        { key: 'requires_technical_approval', label: 'Requires Technical Approval' },
                        { key: 'requires_financial_expert', label: 'Requires Financial Expert' }
                      ].map((req) => (
                        <Checkbox
                          key={req.key}
                          isChecked={formData.assignment_rules?.[req.key] || false}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              assignment_rules: {
                                ...formData.assignment_rules,
                                [req.key]: e.target.checked
                              }
                            });
                          }}
                          size="sm"
                        >
                          <Text fontSize="sm">{req.label}</Text>
                        </Checkbox>
                      ))}
                    </VStack>
                  </Box>
                </VStack>
              </FormControl>
            </GridItem>

            <GridItem colSpan={2}>
              <Divider />
            </GridItem>

            <GridItem colSpan={2}>
              <HStack justify="space-between">
                <Text fontWeight="bold">Rules</Text>
                <Button leftIcon={<Plus size={16} />} size="sm" onClick={addRule}>
                  Add Rule
                </Button>
              </HStack>
            </GridItem>

            <GridItem colSpan={2}>
              <VStack align="stretch" spacing={2}>
                {formData.rules.map((rule, index) => (
                  <Box key={index} p={3} bg="gray.50" borderRadius="md">
                    <HStack mb={2}>
                      <Input
                        placeholder="Rule type"
                        value={rule.rule_type}
                        onChange={(e) => updateRule(index, 'rule_type', e.target.value)}
                        size="sm"
                        fontSize="sm"
                        flex={1}
                        variant="outline"
                        border="1px solid"
                        borderColor="gray.300"
                        _focus={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                        _focusVisible={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                        _hover={{ borderColor: 'gray.400' }}
                      />
                      <Input
                        placeholder="Rule key"
                        value={rule.rule_key}
                        onChange={(e) => updateRule(index, 'rule_key', e.target.value)}
                        size="sm"
                        fontSize="sm"
                        flex={1}
                        variant="outline"
                        border="1px solid"
                        borderColor="gray.300"
                        _focus={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                        _focusVisible={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                        _hover={{ borderColor: 'gray.400' }}
                      />
                      <Input
                        type="number"
                        placeholder="Priority"
                        value={rule.priority}
                        onChange={(e) => updateRule(index, 'priority', parseInt(e.target.value) || 0)}
                        size="sm"
                        fontSize="sm"
                        width="100px"
                        variant="outline"
                        border="1px solid"
                        borderColor="gray.300"
                        _focus={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                        _focusVisible={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                        _hover={{ borderColor: 'gray.400' }}
                      />
                      <IconButton
                        aria-label="Remove rule"
                        icon={<X size={16} />}
                        size="sm"
                        onClick={() => removeRule(index)}
                      />
                    </HStack>
                    <Textarea
                      placeholder='Rule value (JSON)'
                      value={JSON.stringify(rule.rule_value, null, 2)}
                      onChange={(e) => {
                        try {
                          updateRule(index, 'rule_value', JSON.parse(e.target.value));
                        } catch {}
                      }}
                      size="sm"
                      fontSize="sm"
                      fontFamily="mono"
                      minH="60px"
                      variant="outline"
                      border="1px solid"
                      borderColor="gray.300"
                      _focus={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                      _focusVisible={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                      _hover={{ borderColor: 'gray.400' }}
                    />
                  </Box>
                ))}
              </VStack>
            </GridItem>

            <GridItem colSpan={2}>
              <Divider />
            </GridItem>

            <GridItem colSpan={2}>
              <HStack justify="space-between">
                <Text fontWeight="bold">Data Controls</Text>
                <Button leftIcon={<Plus size={16} />} size="sm" onClick={addDataControl}>
                  Add Control
                </Button>
              </HStack>
            </GridItem>

            <GridItem colSpan={2}>
              <VStack align="stretch" spacing={2}>
                {formData.data_controls.map((control, index) => (
                  <Box key={index} p={3} bg="gray.50" borderRadius="md">
                    <HStack mb={2}>
                      <Input
                        placeholder="Control type"
                        value={control.control_type}
                        onChange={(e) => updateDataControl(index, 'control_type', e.target.value)}
                        size="sm"
                        fontSize="sm"
                        flex={1}
                        variant="outline"
                        border="1px solid"
                        borderColor="gray.300"
                        _focus={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                        _focusVisible={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                        _hover={{ borderColor: 'gray.400' }}
                      />
                      <Checkbox
                        isChecked={control.is_required}
                        onChange={(e) => updateDataControl(index, 'is_required', e.target.checked)}
                      >
                        Required
                      </Checkbox>
                      <IconButton
                        aria-label="Remove control"
                        icon={<X size={16} />}
                        size="sm"
                        onClick={() => removeDataControl(index)}
                      />
                    </HStack>
                    <Textarea
                      placeholder='Control config (JSON)'
                      value={JSON.stringify(control.control_config, null, 2)}
                      onChange={(e) => {
                        try {
                          updateDataControl(index, 'control_config', JSON.parse(e.target.value));
                        } catch {}
                      }}
                      size="sm"
                      fontSize="sm"
                      fontFamily="mono"
                      minH="60px"
                      variant="outline"
                      border="1px solid"
                      borderColor="gray.300"
                      _focus={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                      _focusVisible={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                      _hover={{ borderColor: 'gray.400' }}
                    />
                  </Box>
                ))}
              </VStack>
            </GridItem>
          </Grid>
        </Box>
      );
    }

  return (
    <Box p={6}>
      <VStack spacing={4} align="stretch">
            <HStack justify="flex-end" mb={2}>
              <Button variant="ghost" onClick={onCancel} h="30px" fontSize="xs">
                Cancel
              </Button>
              <Button
                leftIcon={<Save size={16} />}
                colorScheme="blue"
                onClick={handleSave}
                isLoading={saving}
                h="30px"
                fontSize="xs"
              >
                Save
              </Button>
            </HStack>

            <FormControl isRequired>
              <FormLabel>Name</FormLabel>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., workers-comp-ime-review"
                isDisabled={!!profile}
                variant="outline"
                border="1px solid"
                borderColor="gray.300"
                _focus={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                _focusVisible={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                _hover={{ borderColor: 'gray.400' }}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Domain</FormLabel>
              <Box position="relative" ref={domainDropdownRef}>
                <Input
                  value={profile ? getDomainLabel(formData.domain) : (domainInputValue !== undefined ? domainInputValue : '')}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDomainInputValue(value);
                    setFormData({ ...formData, domain: value });
                    setIsDomainDropdownOpen(true);
                  }}
                  onFocus={() => {
                    if (!profile) {
                      setIsDomainDropdownOpen(true);
                      if (domainInputValue === undefined || domainInputValue === '') {
                        setDomainInputValue('');
                      }
                    }
                  }}
                  placeholder="Select or type domain"
                  isDisabled={!!profile}
                  variant="outline"
                  fontSize="sm"
                  border="1px solid"
                  borderColor="gray.300"
                  _focus={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px', outline: 'none', ring: 'none', ringOffset: 'none' }}
                  _focusVisible={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px', outline: 'none', ring: 'none', ringOffset: 'none' }}
                  _hover={{ borderColor: 'gray.400' }}
                  css={{
                    '&:focus': {
                      borderColor: '#9CA3AF !important',
                      borderWidth: '1px !important',
                      boxShadow: 'none !important',
                      outline: 'none !important',
                    },
                  }}
                />
                {isDomainDropdownOpen && !profile && getFilteredDomains(domainInputValue).length > 0 && (
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
                    maxH="200px"
                    overflowY="auto"
                  >
                    <VStack align="stretch" spacing={0}>
                      {getFilteredDomains(domainInputValue).map((option, index) => (
                        <Box key={option.value}>
                          {index > 0 && <Divider borderColor="gray.200" />}
                          <Box
                            as="button"
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, domain: option.value });
                              setDomainInputValue(option.label);
                              setIsDomainDropdownOpen(false);
                            }}
                            px={3}
                            py={2}
                            textAlign="left"
                            fontSize="sm"
                            color="gray.700"
                            bg={formData.domain === option.value ? 'gray.50' : 'white'}
                            _hover={{ bg: 'gray.50' }}
                            border="none"
                            cursor="pointer"
                            w="100%"
                          >
                            {option.label}
                          </Box>
                        </Box>
                      ))}
                    </VStack>
                  </Box>
                )}
              </Box>
            </FormControl>

            <FormControl>
              <FormLabel>Policy Statement</FormLabel>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the governance profile..."
                variant="outline"
                border="1px solid"
                borderColor="gray.300"
                _focus={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                _focusVisible={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                _hover={{ borderColor: 'gray.400' }}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Human Review Requirement</FormLabel>
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
                  <Text textTransform="capitalize">{getHumanReviewLabel(formData.human_review_requirement)}</Text>
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
                      {humanReviewOptions.map((option, index) => (
                        <Box key={option.value}>
                          {index > 0 && <Divider borderColor="gray.200" />}
                          <Box
                            as="button"
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, human_review_requirement: option.value as any });
                              setIsHumanReviewDropdownOpen(false);
                            }}
                            px={3}
                            py={2}
                            textAlign="left"
                            fontSize="sm"
                            color="gray.700"
                            _hover={{ bg: 'gray.50' }}
                            bg={formData.human_review_requirement === option.value ? 'gray.50' : 'white'}
                            border="none"
                            w="100%"
                          >
                            {option.label}
                          </Box>
                        </Box>
                      ))}
                    </VStack>
                  </Box>
                )}
              </Box>
            </FormControl>

            <FormControl>
              <FormLabel>Allowed Actions</FormLabel>
              <HStack spacing={2} flexWrap="wrap">
                {['approve', 'reject', 'escalate', 'override'].map((action) => {
                  const isSelected = formData.allowed_actions.includes(action);
                  return (
                    <Box
                      key={action}
                      as="button"
                      type="button"
                      data-action-button
                      onClick={() => toggleAction(action)}
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
                        '&:active': {
                          border: '1px solid !important',
                          borderColor: isSelected ? '#2C5282 !important' : '#A0AEC0 !important',
                          bg: isSelected ? '#90CDF4' : '#EDF2F7',
                        },
                        '&:focus': {
                          border: '1px solid !important',
                          borderColor: isSelected ? '#2C5282 !important' : '#A0AEC0 !important',
                          outline: 'none',
                          boxShadow: 'none',
                        },
                        '&:focus-visible': {
                          border: '1px solid !important',
                          borderColor: isSelected ? '#2C5282 !important' : '#A0AEC0 !important',
                          outline: 'none',
                          boxShadow: 'none',
                        },
                      }}
                    >
                      {action.charAt(0).toUpperCase() + action.slice(1)}
                    </Box>
                  );
                })}
              </HStack>
            </FormControl>

            <FormControl>
              <FormLabel>Risk Thresholds</FormLabel>
              <VStack align="stretch" spacing={4} p={4} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.300">
                {(['low', 'medium', 'high'] as const).map((level) => {
                  const threshold = formData.risk_thresholds?.[level] || {};
                  return (
                    <Box key={level} p={3} bg="white" borderRadius="md" border="1px solid" borderColor="gray.200">
                      <FormLabel fontSize="sm" fontWeight="bold" mb={3} textTransform="capitalize">
                        {level} Risk
                      </FormLabel>
                      <VStack align="stretch" spacing={3}>
                        <HStack spacing={2}>
                          <Checkbox
                            isChecked={threshold.requires_review || false}
                            onChange={(e) => updateRiskThreshold(level, 'requires_review', e.target.checked)}
                            size="sm"
                          >
                            <Text fontSize="sm">Requires Review</Text>
                          </Checkbox>
                          <Checkbox
                            isChecked={threshold.auto_approve || false}
                            onChange={(e) => updateRiskThreshold(level, 'auto_approve', e.target.checked)}
                            size="sm"
                          >
                            <Text fontSize="sm">Auto Approve</Text>
                          </Checkbox>
                        </HStack>
                        <HStack spacing={4}>
                          <FormControl flex={1}>
                            <FormLabel fontSize="xs">Min Reviewers</FormLabel>
                            <Input
                              type="number"
                              value={threshold.min_reviewers || ''}
                              onChange={(e) => updateRiskThreshold(level, 'min_reviewers', e.target.value ? parseInt(e.target.value) : undefined)}
                              placeholder="0"
                              size="sm"
                              variant="outline"
                              border="1px solid"
                              borderColor="gray.300"
                              _focus={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                              _focusVisible={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                              _hover={{ borderColor: 'gray.400' }}
                            />
                          </FormControl>
                          <FormControl flex={1}>
                            <FormLabel fontSize="xs">SLA Hours</FormLabel>
                            <Input
                              type="number"
                              value={threshold.sla_hours || ''}
                              onChange={(e) => updateRiskThreshold(level, 'sla_hours', e.target.value ? parseInt(e.target.value) : undefined)}
                              placeholder="48"
                              size="sm"
                              variant="outline"
                              border="1px solid"
                              borderColor="gray.300"
                              _focus={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                              _focusVisible={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                              _hover={{ borderColor: 'gray.400' }}
                            />
                          </FormControl>
                        </HStack>
                        {level === 'high' && (
                          <VStack align="stretch" spacing={2}>
                            <Text fontSize="xs" fontWeight="medium" color="gray.600">Special Requirements:</Text>
                            <HStack spacing={4} flexWrap="wrap">
                              <Checkbox
                                isChecked={threshold.requires_compliance_officer || false}
                                onChange={(e) => updateRiskThreshold(level, 'requires_compliance_officer', e.target.checked)}
                                size="sm"
                              >
                                <Text fontSize="sm">Compliance Officer</Text>
                              </Checkbox>
                              <Checkbox
                                isChecked={threshold.requires_financial_expert || false}
                                onChange={(e) => updateRiskThreshold(level, 'requires_financial_expert', e.target.checked)}
                                size="sm"
                              >
                                <Text fontSize="sm">Financial Expert</Text>
                              </Checkbox>
                              <Checkbox
                                isChecked={threshold.requires_legal_approval || false}
                                onChange={(e) => updateRiskThreshold(level, 'requires_legal_approval', e.target.checked)}
                                size="sm"
                              >
                                <Text fontSize="sm">Legal Approval</Text>
                              </Checkbox>
                            </HStack>
                          </VStack>
                        )}
                      </VStack>
                    </Box>
                  );
                })}
              </VStack>
            </FormControl>

            <FormControl>
              <FormLabel>Assignment Rules</FormLabel>
              <VStack align="stretch" spacing={4} p={4} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.300">
                {/* Role Selection */}
                <Box>
                  <FormLabel fontSize="sm" fontWeight="medium" mb={2}>Eligible Roles</FormLabel>
                  <HStack spacing={2} flexWrap="wrap">
                    {['governance', 'reviewer', 'admin'].map((role) => {
                      const isSelected = (formData.assignment_rules?.roles || []).includes(role);
                      return (
                        <Box
                          key={role}
                          as="button"
                          type="button"
                          onClick={() => {
                            const currentRoles = formData.assignment_rules?.roles || [];
                            const newRoles = isSelected
                              ? currentRoles.filter((r: string) => r !== role)
                              : [...currentRoles, role];
                            setFormData({
                              ...formData,
                              assignment_rules: {
                                ...formData.assignment_rules,
                                roles: newRoles
                              }
                            });
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
                            '&:active': {
                              border: '1px solid !important',
                              borderColor: isSelected ? '#2C5282 !important' : '#A0AEC0 !important',
                              bg: isSelected ? '#90CDF4' : '#EDF2F7',
                            },
                            '&:focus': {
                              border: '1px solid !important',
                              borderColor: isSelected ? '#3182CE !important' : '#A0AEC0 !important',
                              outline: 'none',
                              boxShadow: 'none',
                            },
                            '&:focus-visible': {
                              border: '1px solid !important',
                              borderColor: isSelected ? '#3182CE !important' : '#A0AEC0 !important',
                              outline: 'none',
                              boxShadow: 'none',
                            },
                          }}
                        >
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </Box>
                      );
                    })}
                  </HStack>
                </Box>

                {/* SLA Hours */}
                <HStack spacing={4}>
                  <FormControl flex={1}>
                    <FormLabel fontSize="sm">SLA Hours</FormLabel>
                    <Input
                      type="number"
                      value={formData.assignment_rules?.sla_hours || ''}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          assignment_rules: {
                            ...formData.assignment_rules,
                            sla_hours: e.target.value ? parseInt(e.target.value) : undefined
                          }
                        });
                      }}
                      placeholder="48"
                      size="sm"
                      variant="outline"
                      border="1px solid"
                      borderColor="gray.300"
                      _focus={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                      _focusVisible={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                      _hover={{ borderColor: 'gray.400' }}
                    />
                  </FormControl>

                  <FormControl flex={1}>
                    <FormLabel fontSize="sm">Escalation Hours</FormLabel>
                    <Input
                      type="number"
                      value={formData.assignment_rules?.escalation_hours || ''}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          assignment_rules: {
                            ...formData.assignment_rules,
                            escalation_hours: e.target.value ? parseInt(e.target.value) : undefined
                          }
                        });
                      }}
                      placeholder="72"
                      size="sm"
                      variant="outline"
                      border="1px solid"
                      borderColor="gray.300"
                      _focus={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                      _focusVisible={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                      _hover={{ borderColor: 'gray.400' }}
                    />
                  </FormControl>
                </HStack>

                {/* Special Requirements */}
                <Box>
                  <FormLabel fontSize="sm" fontWeight="medium" mb={2}>Special Requirements</FormLabel>
                  <VStack align="stretch" spacing={2}>
                    {[
                      { key: 'requires_compliance_certification', label: 'Requires Compliance Certification' },
                      { key: 'requires_medical_license', label: 'Requires Medical License' },
                      { key: 'requires_hr_approval', label: 'Requires HR Approval' },
                      { key: 'requires_legal_approval_for_high_risk', label: 'Requires Legal Approval for High Risk' },
                      { key: 'requires_technical_approval', label: 'Requires Technical Approval' },
                      { key: 'requires_financial_expert', label: 'Requires Financial Expert' }
                    ].map((req) => (
                      <Checkbox
                        key={req.key}
                        isChecked={formData.assignment_rules?.[req.key] || false}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            assignment_rules: {
                              ...formData.assignment_rules,
                              [req.key]: e.target.checked
                            }
                          });
                        }}
                        size="sm"
                      >
                        <Text fontSize="sm">{req.label}</Text>
                      </Checkbox>
                    ))}
                  </VStack>
                </Box>
              </VStack>
            </FormControl>

            <Divider />

            <HStack justify="space-between">
              <Text fontWeight="bold">Rules</Text>
              <Button leftIcon={<Plus size={16} />} size="sm" onClick={addRule}>
                Add Rule
              </Button>
            </HStack>

            <VStack align="stretch" spacing={2}>
              {formData.rules.map((rule, index) => (
                <Box key={index} p={3} bg="gray.50" borderRadius="md">
                  <HStack mb={2}>
                    <Input
                      placeholder="Rule type"
                      value={rule.rule_type}
                      onChange={(e) => updateRule(index, 'rule_type', e.target.value)}
                      size="sm"
                      flex={1}
                      variant="outline"
                      border="1px solid"
                      borderColor="gray.300"
                      _focus={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                      _focusVisible={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                      _hover={{ borderColor: 'gray.400' }}
                    />
                    <Input
                      placeholder="Rule key"
                      value={rule.rule_key}
                      onChange={(e) => updateRule(index, 'rule_key', e.target.value)}
                      size="sm"
                      flex={1}
                      variant="outline"
                      border="1px solid"
                      borderColor="gray.300"
                      _focus={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                      _focusVisible={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                      _hover={{ borderColor: 'gray.400' }}
                    />
                    <Input
                      type="number"
                      placeholder="Priority"
                      value={rule.priority}
                      onChange={(e) => updateRule(index, 'priority', parseInt(e.target.value) || 0)}
                      size="sm"
                      width="100px"
                      variant="outline"
                      border="1px solid"
                      borderColor="gray.300"
                      _focus={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                      _focusVisible={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                      _hover={{ borderColor: 'gray.400' }}
                    />
                    <IconButton
                      aria-label="Remove rule"
                      icon={<X size={16} />}
                      size="sm"
                      onClick={() => removeRule(index)}
                    />
                  </HStack>
                  <Textarea
                    placeholder='Rule value (JSON)'
                    value={JSON.stringify(rule.rule_value, null, 2)}
                    onChange={(e) => {
                      try {
                        updateRule(index, 'rule_value', JSON.parse(e.target.value));
                      } catch {}
                    }}
                    size="sm"
                    fontFamily="mono"
                    minH="60px"
                    variant="outline"
                    border="1px solid"
                    borderColor="gray.300"
                    _focus={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                    _focusVisible={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                    _hover={{ borderColor: 'gray.400' }}
                  />
                </Box>
              ))}
            </VStack>

            <Divider />

            <HStack justify="space-between">
              <Text fontWeight="bold">Data Controls</Text>
              <Button leftIcon={<Plus size={16} />} size="sm" onClick={addDataControl}>
                Add Control
              </Button>
            </HStack>

            <VStack align="stretch" spacing={2}>
              {formData.data_controls.map((control, index) => (
                <Box key={index} p={3} bg="gray.50" borderRadius="md">
                  <HStack mb={2}>
                    <Input
                      placeholder="Control type"
                      value={control.control_type}
                      onChange={(e) => updateDataControl(index, 'control_type', e.target.value)}
                      size="sm"
                      flex={1}
                      variant="outline"
                      border="1px solid"
                      borderColor="gray.300"
                      _focus={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                      _focusVisible={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                      _hover={{ borderColor: 'gray.400' }}
                    />
                    <Checkbox
                      isChecked={control.is_required}
                      onChange={(e) => updateDataControl(index, 'is_required', e.target.checked)}
                    >
                      Required
                    </Checkbox>
                    <IconButton
                      aria-label="Remove control"
                      icon={<X size={16} />}
                      size="sm"
                      onClick={() => removeDataControl(index)}
                    />
                  </HStack>
                  <Textarea
                    placeholder='Control config (JSON)'
                    value={JSON.stringify(control.control_config, null, 2)}
                    onChange={(e) => {
                      try {
                        updateDataControl(index, 'control_config', JSON.parse(e.target.value));
                      } catch {}
                    }}
                    size="sm"
                    fontFamily="mono"
                    minH="60px"
                    variant="outline"
                    border="1px solid"
                    borderColor="gray.300"
                    _focus={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                    _focusVisible={{ borderColor: 'gray.400', boxShadow: 'none', borderWidth: '1px' }}
                    _hover={{ borderColor: 'gray.400' }}
                  />
                </Box>
              ))}
            </VStack>
      </VStack>
    </Box>
  );
});

ProfileForm.displayName = 'ProfileForm';

export default ProfileForm;

