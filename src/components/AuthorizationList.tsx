import React from 'react';
import { Card, Group, Button, Text, Grid, TextInput, NumberInput, ActionIcon, Paper, Stack, Title } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';

interface Authorization {
  contractAddress: string;
  nonce: string;
  signature: string;
  privateKey: string;
}

interface AuthorizationListProps {
  authorizationList: Authorization[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: keyof Authorization, value: string) => void;
  onSign: (index: number) => void;
  getAddressFromPrivateKey: (privateKey: string) => string;
}

export const AuthorizationList: React.FC<AuthorizationListProps> = ({
  authorizationList,
  onAdd,
  onRemove,
  onUpdate,
  onSign,
  getAddressFromPrivateKey
}) => {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <Title order={3}>Authorization List</Title>
        <Text size="sm" color="dimmed">
          Add authorizations for EIP-7702 transaction
        </Text>

        {authorizationList.map((auth, index) => (
          <Paper key={index} p="md" withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Title order={4}>Authorization #{index + 1}</Title>
                {authorizationList.length > 1 && (
                  <Button
                    variant="subtle"
                    color="red"
                    size="sm"
                    onClick={() => onRemove(index)}
                  >
                    Remove
                  </Button>
                )}
              </Group>

              <TextInput
                label="Contract Address"
                placeholder="0x..."
                value={auth.contractAddress}
                onChange={(e) => onUpdate(index, 'contractAddress', e.target.value)}
              />

              <TextInput
                label="Private Key"
                placeholder="0x..."
                value={auth.privateKey}
                onChange={(e) => onUpdate(index, 'privateKey', e.target.value)}
              />

              <TextInput
                label="Nonce"
                value={auth.nonce}
                onChange={(e) => onUpdate(index, 'nonce', e.target.value)}
                disabled
              />

              <TextInput
                label="Signature"
                value={auth.signature}
                onChange={(e) => onUpdate(index, 'signature', e.target.value)}
                disabled
              />

              <Group justify="flex-end">
                <Button
                  variant="light"
                  color="blue"
                  onClick={() => onSign(index)}
                  disabled={!auth.privateKey || !auth.contractAddress}
                >
                  Generate Signature
                </Button>
              </Group>
            </Stack>
          </Paper>
        ))}

        <Button
          variant="light"
          color="blue"
          onClick={onAdd}
          leftSection={<IconPlus size={14} />}
        >
          Add Authorization
        </Button>
      </Stack>
    </Card>
  );
}; 