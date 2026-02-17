'use client';

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Text,
  VStack,
  Alert,
  AlertIcon,
  Box,
} from '@chakra-ui/react';
import { AlertCircle } from 'lucide-react';

interface LicenseInactiveDialogProps {
  isOpen: boolean;
  onClose?: () => void;
  message?: string;
}

export default function LicenseInactiveDialog({
  isOpen,
  onClose,
  message = 'Your license has been deactivated. Please contact support.'
}: LicenseInactiveDialogProps) {
  // Don't allow closing the dialog - license must be reactivated
  const handleClose = () => {
    // Do nothing - prevent closing
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      closeOnOverlayClick={false}
      closeOnEsc={false}
      isCentered
      size="md"
    >
      <ModalOverlay bg="blackAlpha.600" />
      <ModalContent>
        <ModalHeader>
          <Box display="flex" alignItems="center" gap={2}>
            <AlertCircle size={24} color="#DC2626" />
            <Text>License Inactive</Text>
          </Box>
        </ModalHeader>
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              <Box>
                <Text fontWeight="medium">License Deactivated</Text>
                <Text fontSize="sm" mt={1}>
                  {message}
                </Text>
              </Box>
            </Alert>
            <Text fontSize="sm" color="gray.600">
              Please contact support to reactivate your license. The application will be unavailable until your license is reactivated.
            </Text>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button
            colorScheme="blue"
            onClick={() => {
              // Refresh page to check status again
              window.location.reload();
            }}
          >
            Check Status
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

