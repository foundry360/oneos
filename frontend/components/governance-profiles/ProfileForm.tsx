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
} from '@chakra-ui/react';
import { Plus, X, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { GovernanceProfile } from '@/hooks/useGovernanceProfiles';

interface ProfileFormProps {
  profile?: GovernanceProfile | null;
  onSave: (profileData: Partial<GovernanceProfile>) => Promise<void>;
  onCancel: () => void;
}

export default function ProfileForm({ profile, onSave, onCancel }: ProfileFormProps) {
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
  const [riskThresholdsJson, setRiskThresholdsJson] = useState('');
  const [assignmentRulesJson, setAssignmentRulesJson] = useState('');
  const toast = useToast();

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
      setRiskThresholdsJson(JSON.stringify(profile.risk_thresholds || {}, null, 2));
      setAssignmentRulesJson(JSON.stringify(profile.assignment_rules || {}, null, 2));
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Parse JSON fields
      let riskThresholds = {};
      let assignmentRules = {};
      
      try {
        riskThresholds = riskThresholdsJson ? JSON.parse(riskThresholdsJson) : {};
      } catch (e) {
        toast({
          title: 'Invalid JSON',
          description: 'Risk thresholds must be valid JSON',
          status: 'error',
        });
        return;
      }
      
      try {
        assignmentRules = assignmentRulesJson ? JSON.parse(assignmentRulesJson) : {};
      } catch (e) {
        toast({
          title: 'Invalid JSON',
          description: 'Assignment rules must be valid JSON',
          status: 'error',
        });
        return;
      }

      // Prepare save payload - rules and data_controls don't need IDs when creating/updating
      const savePayload: any = {
        name: formData.name,
        domain: formData.domain,
        description: formData.description,
        allowed_actions: formData.allowed_actions,
        risk_thresholds: riskThresholds,
        human_review_requirement: formData.human_review_requirement,
        assignment_rules: assignmentRules,
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

  return (
    <Box p={6}>
      <VStack spacing={4} align="stretch">
        <HStack justify="flex-end" mb={2}>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            leftIcon={<Save size={16} />}
            colorScheme="blue"
            onClick={handleSave}
            isLoading={saving}
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
          />
        </FormControl>

        <FormControl isRequired>
          <FormLabel>Domain</FormLabel>
          <Select
            value={formData.domain}
            onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
            isDisabled={!!profile}
          >
            <option value="">Select domain</option>
            <option value="workers-comp">Workers Comp</option>
            <option value="employment">Employment</option>
            <option value="ai-model-deployment">AI Model Deployment</option>
            <option value="other">Other</option>
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>Description</FormLabel>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe the governance profile..."
          />
        </FormControl>

        <FormControl>
          <FormLabel>Human Review Requirement</FormLabel>
          <Select
            value={formData.human_review_requirement}
            onChange={(e) =>
              setFormData({
                ...formData,
                human_review_requirement: e.target.value as any,
              })
            }
          >
            <option value="required">Required</option>
            <option value="conditional">Conditional</option>
            <option value="optional">Optional</option>
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>Allowed Actions</FormLabel>
          <HStack spacing={2} flexWrap="wrap">
            {['approve', 'reject', 'escalate', 'override'].map((action) => (
              <Checkbox
                key={action}
                isChecked={formData.allowed_actions.includes(action)}
                onChange={() => toggleAction(action)}
              >
                {action}
              </Checkbox>
            ))}
          </HStack>
        </FormControl>

        <FormControl>
          <FormLabel>Risk Thresholds (JSON)</FormLabel>
          <Textarea
            value={riskThresholdsJson}
            onChange={(e) => setRiskThresholdsJson(e.target.value)}
            placeholder='{"low": {...}, "medium": {...}, "high": {...}}'
            fontFamily="mono"
            minH="150px"
          />
        </FormControl>

        <FormControl>
          <FormLabel>Assignment Rules (JSON)</FormLabel>
          <Textarea
            value={assignmentRulesJson}
            onChange={(e) => setAssignmentRulesJson(e.target.value)}
            placeholder='{"roles": [...], "sla_hours": 48}'
            fontFamily="mono"
            minH="100px"
          />
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
                />
                <Input
                  placeholder="Rule key"
                  value={rule.rule_key}
                  onChange={(e) => updateRule(index, 'rule_key', e.target.value)}
                  size="sm"
                  flex={1}
                />
                <Input
                  type="number"
                  placeholder="Priority"
                  value={rule.priority}
                  onChange={(e) => updateRule(index, 'priority', parseInt(e.target.value) || 0)}
                  size="sm"
                  width="100px"
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
              />
            </Box>
          ))}
        </VStack>
      </VStack>
    </Box>
  );
}

