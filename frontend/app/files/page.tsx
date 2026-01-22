'use client';

import { useFiles } from '@/hooks/useFiles';
import {
  Box,
  Heading,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  HStack,
  Input,
} from '@chakra-ui/react';
import { useState, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

export default function FilesPage() {
  const { files, loading, uploadFile, refetch } = useFiles();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadFile(file);
      await refetch();
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <DashboardLayout>
      <Box>
        <HStack justify="space-between" mb={6}>
          <Heading size="lg" color="gray.800" fontWeight="600">
            Files
          </Heading>
          <HStack>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.doc,.docx"
              onChange={handleFileSelect}
              display="none"
              id="file-upload"
            />
            <Button
              as="label"
              htmlFor="file-upload"
              colorScheme="blue"
              size="sm"
              isLoading={uploading}
              cursor="pointer"
            >
              Upload File
            </Button>
          </HStack>
        </HStack>

        {loading ? (
          <Spinner size="xl" />
        ) : (
          <Box overflowX="auto" border="1px solid" borderColor="gray.200" borderRadius="md" boxShadow="sm" bg="white">
            <Table variant="simple" size="sm">
              <Thead bg="gray.50">
                <Tr>
                  <Th color="gray.600" fontWeight="600" fontSize="xs" textTransform="uppercase">
                    Filename
                  </Th>
                  <Th color="gray.600" fontWeight="600" fontSize="xs" textTransform="uppercase">
                    Size
                  </Th>
                  <Th color="gray.600" fontWeight="600" fontSize="xs" textTransform="uppercase">
                    Status
                  </Th>
                  <Th color="gray.600" fontWeight="600" fontSize="xs" textTransform="uppercase">
                    Uploaded
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {files && files.length > 0 ? (
                  files.map((file: any) => (
                    <Tr key={file.id} _hover={{ bg: 'gray.50' }}>
                      <Td color="gray.700">{file.filename}</Td>
                      <Td color="gray.600">{(file.file_size / 1024).toFixed(2)} KB</Td>
                      <Td color="gray.600">{file.upload_status}</Td>
                      <Td color="gray.600">{new Date(file.uploaded_at).toLocaleDateString()}</Td>
                    </Tr>
                  ))
                ) : (
                  <Tr>
                    <Td colSpan={4} textAlign="center" color="gray.500" py={8}>
                      No files uploaded yet
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </Box>
        )}
      </Box>
    </DashboardLayout>
  );
}
