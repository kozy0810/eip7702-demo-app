'use client';

import React, { useState } from 'react';
import {
  Container,
  Stack,
  Alert,
  Text,
  Button,
  Group,
} from '@mantine/core';
import { IconCheck, IconAlertCircle, IconPlus } from '@tabler/icons-react';
import { createWalletClient } from 'viem';
import { sepolia, mainnet, goerli, polygon, optimism, arbitrum, base, zora, bsc, avalanche, fantom, celo } from 'viem/chains';
import WalletFromPrivateKey from '@/components/WalletFromPrivateKey';
import { Header } from '@/components/Header';
import { Authorization } from '@/components/Authorization';

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
  const [authorizations, setAuthorizations] = useState<Array<{
    contractAddress: string;
    nonce: string;
    signature: string;
  }>>([{
    contractAddress: '',
    nonce: '',
    signature: '',
  }]);

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

  const handleAddAuthorization = () => {
    setAuthorizations(prev => [...prev, {
      contractAddress: '',
      nonce: '',
      signature: '',
    }]);
  };

  const handleRemoveAuthorization = (index: number) => {
    setAuthorizations(prev => prev.filter((_, i) => i !== index));
  };

  const handleAuthorizationUpdate = (index: number, field: 'contractAddress' | 'nonce' | 'signature', value: string) => {
    setAuthorizations(prev => prev.map((auth, i) => 
      i === index ? { ...auth, [field]: value } : auth
    ));
  };

  const handleAuthorizationSign = async (index: number) => {
    if (!walletClient || !account) {
      setError('ウォレットが接続されていません。');
      return;
    }

    try {
      // ここに署名ロジックを実装
      setSuccess('署名が生成されました！');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('署名の生成に失敗しました。');
      setTimeout(() => setError(''), 3000);
    }
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

        {isConnected && (
          <Stack>
            <Group justify="space-between">
              <Text fw={500}>Authorization List</Text>
              <Button variant="light" onClick={handleAddAuthorization} leftSection={<IconPlus size={16} />}>
                Add Authorization
              </Button>
            </Group>

            {authorizations.map((auth, index) => (
              <Authorization
                key={index}
                authorization={auth}
                index={index}
                onUpdate={(field, value) => handleAuthorizationUpdate(index, field, value)}
                onSign={() => handleAuthorizationSign(index)}
                showRemoveButton={authorizations.length > 1}
                onRemove={() => handleRemoveAuthorization(index)}
              />
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
};

export default SamplePage;
