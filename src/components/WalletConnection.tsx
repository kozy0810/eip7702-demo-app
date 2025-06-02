import React from 'react';
import { Card, Group, Button, Text, Badge, Loader, Box, Stack } from '@mantine/core';
import { IconWallet } from '@tabler/icons-react';

interface WalletConnectionProps {
  isConnected: boolean;
  account: string | null;
  chainId: number | null;
  loading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  getChainName: (chainId: number) => string;
}

export const WalletConnection: React.FC<WalletConnectionProps> = ({
  isConnected,
  account,
  chainId,
  loading,
  onConnect,
  onDisconnect,
  getChainName
}) => {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between" align="center">
        <Stack gap={0}>
          <Text fw={500} size="lg">Wallet Connection</Text>
          <Text size="sm" c="dimmed">
            {isConnected ? `Connected to ${getChainName(chainId || 1)}` : 'Connect your wallet to continue'}
          </Text>
        </Stack>

        {isConnected ? (
          <Group>
            <Badge size="lg" variant="light">
              {account?.slice(0, 6)}...{account?.slice(-4)}
            </Badge>
            <Button
              variant="light"
              color="red"
              onClick={onDisconnect}
              disabled={loading}
            >
              Disconnect
            </Button>
          </Group>
        ) : (
          <Button
            variant="light"
            color="blue"
            onClick={onConnect}
            loading={loading}
          >
            Connect Wallet
          </Button>
        )}
      </Group>
    </Card>
  );
}; 