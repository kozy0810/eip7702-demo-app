'use client';

import React, { useState } from 'react';
import {
  Container,
  Stack,
  Alert,
  Text,
} from '@mantine/core';
import { IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { createWalletClient } from 'viem';
import { sepolia, mainnet, goerli, polygon, optimism, arbitrum, base, zora, bsc, avalanche, fantom, celo } from 'viem/chains';
import WalletFromPrivateKey from '@/components/WalletFromPrivateKey';
import { Header } from '@/components/Header';

// サポートされているチェーンのリスト
const SUPPORTED_CHAINS = [
  mainnet,
  sepolia,
  goerli,
  polygon,
  optimism,
  arbitrum,
  base,
  zora,
  bsc,
  avalanche,
  fantom,
  celo,
];

const SamplePage = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [walletClient, setWalletClient] = useState<ReturnType<typeof createWalletClient> | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const getChainName = (id: number): string => {
    const chain = SUPPORTED_CHAINS.find(c => c.id === id);
    return chain ? chain.name : `Unknown Chain (ID: ${id})`;
  };

  const handleConnect = (acc: string, client: ReturnType<typeof createWalletClient>, chId: number) => {
    setAccount(acc);
    setWalletClient(client);
    setChainId(chId);
    setIsConnected(true);
    setSuccess('ウォレットが正常に接続されました！');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDisconnect = () => {
    setAccount(null);
    setIsConnected(false);
    setWalletClient(null);
    setChainId(null);
    setSuccess('ウォレットが切断されました。');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <Container my="md">
      <Header />
      <Stack gap="xl" mt="xl">
        {success && <Alert icon={<IconCheck size={16} />} color="green">{success}</Alert>}
        {error && <Alert icon={<IconAlertCircle size={16} />} color="red">{error}</Alert>}

        <WalletFromPrivateKey
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          isConnected={isConnected}
          account={account}
          chainId={chainId}
          getChainName={getChainName}
        />
      </Stack>
    </Container>
  );
};

export default SamplePage;
