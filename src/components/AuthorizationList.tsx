import React, { useState, useEffect } from 'react';
import { Card, Group, Button, Text, Grid, TextInput, NumberInput, ActionIcon, Paper, Stack, Title, Badge, Textarea } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { SignAuthorizationReturnType } from 'viem';

interface Authorization {
  contractAddress: string;
  nonce: string;
  signature: string;
  signedAuthorization?: SignAuthorizationReturnType;
}

interface AuthorizationListProps {
  authorizationList: Authorization[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: 'contractAddress' | 'nonce' | 'signature', value: string) => void;
  onSign: (index: number) => void;
}

export const AuthorizationList: React.FC<AuthorizationListProps> = ({
  authorizationList,
  onAdd,
  onRemove,
  onUpdate,
  onSign,
}) => {
  return (
    <Stack>
      <Group justify="space-between">
        <Text fw={500}>Authorization List</Text>
        <Button variant="light" onClick={onAdd}>
          Add Authorization
        </Button>
      </Group>

      {authorizationList.map((auth, index) => (
        <Paper key={index} p="md" withBorder>
          <Stack>
            <Group justify="space-between">
              <Text fw={500}>Authorization #{index + 1}</Text>
              {authorizationList.length > 1 && (
                <Button
                  variant="light"
                  color="red"
                  onClick={() => onRemove(index)}
                >
                  Remove
                </Button>
              )}
            </Group>

            <TextInput
              label="Contract Address"
              value={auth.contractAddress}
              onChange={(e) => onUpdate(index, 'contractAddress', e.target.value)}
              placeholder="0x..."
            />

            <TextInput
              label="Nonce"
              value={auth.nonce}
              onChange={(e) => onUpdate(index, 'nonce', e.target.value)}
              placeholder="0"
            />

            <Textarea
              label="Signature"
              value={auth.signature}
              onChange={(e) => onUpdate(index, 'signature', e.target.value)}
              placeholder="0x..."
              readOnly
            />

            <Button
              onClick={() => onSign(index)}
              disabled={!auth.contractAddress}
            >
              Generate Signature
            </Button>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}; 