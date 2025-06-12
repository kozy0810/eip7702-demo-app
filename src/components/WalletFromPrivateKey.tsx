import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Group,
  Text,
  Badge,
  Stack,
  Alert,
  Select,
  PasswordInput,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http, formatEther } from 'viem';
import { createPublicClient } from 'viem';
import { sepolia } from 'viem/chains';

interface WalletFromPrivateKeyProps {
  onConnect: (account: string, client: ReturnType<typeof createWalletClient>, chainId: number) => void;
  onDisconnect: () => void;
  isConnected: boolean;
  account: `0x${string}` | null;
  chainId: number | null;
  getChainName: (id: number) => string;
  walletClient: ReturnType<typeof createWalletClient> | null;
}

// anvilのチェーン設定 (MetaMaskPage.tsx と重複しますが、ここでは独立して定義します)
const anvil = {
  id: 31337,
  name: 'Anvil',
  network: 'anvil',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
    public: { http: ['http://127.00.1:8545'] },
  },
} as const;

// サポートされているチェーンのリスト (MetaMaskPage.tsx と重複しますが、ここでは独立して定義します)
const SUPPORTED_CHAINS = [sepolia, anvil];

const WalletFromPrivateKey: React.FC<WalletFromPrivateKeyProps> = ({
  onConnect,
  onDisconnect,
  isConnected,
  account,
  chainId,
  getChainName,
  walletClient,
}) => {
  const [privateKey, setPrivateKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [balance, setBalance] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<string>(sepolia.id.toString());

  useEffect(() => {
    if (account && chainId) {
      fetchBalance(account, chainId);
    } else {
      setBalance(null);
    }
  }, [account, chainId]);

  const fetchBalance = async (address: string, currentChainId: number) => {
    try {
      const currentChain = SUPPORTED_CHAINS.find(chain => chain.id === currentChainId) || sepolia;
      const publicClient = createPublicClient({
        chain: currentChain,
        transport: http()
      });
      const balanceWei = await publicClient.getBalance({
        address: address as `0x${string}`
      });
      setBalance(formatEther(balanceWei));
    } catch (err) {
      console.error('Failed to fetch balance:', err);
      setBalance('Error');
    }
  };

  const handleChainChange = async (newChainId: string) => {
    if (!walletClient || !account) return;
    
    setIsLoading(true);
    setError('');
    try {
      const chain = SUPPORTED_CHAINS.find(c => c.id.toString() === newChainId) || sepolia;
      const client = createWalletClient({
        account: walletClient.account,
        chain: chain,
        transport: http(chain.rpcUrls.default.http[0])
      });

      const publicClient = createPublicClient({
        chain: chain,
        transport: http()
      });
      const currentChainId = await publicClient.getChainId();

      onConnect(account, client, currentChainId);
      setSelectedChain(newChainId);
    } catch (err: any) {
      setError(err.message || 'チェーンの切り替えに失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!privateKey) return;

    setIsLoading(true);
    setError('');

    try {
      const formattedPrivateKey = (privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`) as `0x${string}`;
      const account = privateKeyToAccount(formattedPrivateKey);
      const client = createWalletClient({
        account,
        chain: SUPPORTED_CHAINS.find(chain => chain.id.toString() === selectedChain) || sepolia,
        transport: http()
      });

      onConnect(account.address, client, client.chain.id);
    } catch (err) {
      console.error('Connection error:', err);
      setError('ウォレットの接続に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    setPrivateKey('');
    onDisconnect();
    setBalance(null);
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        {error && <Alert icon={<IconAlertCircle size={16} />} color="red">{error}</Alert>}
        {isConnected ? (
          <>
            <Group justify="space-between" align="center">
              <Stack gap={0}>
                <Text fw={500} size="lg">Wallet Connection</Text>
                <Text size="sm" c="dimmed">
                  Connected to {getChainName(chainId || 1)}
                </Text>
              </Stack>
              <Group>
                <Badge size="lg" variant="light">
                  {account?.slice(0, 6)}...{account?.slice(-4)}
                </Badge>
                <Badge size="lg" variant="light" color="green">
                  {getChainName(chainId || 1)}
                </Badge>
                <Button
                  variant="light"
                  color="red"
                  onClick={handleDisconnect}
                  disabled={isLoading}
                >
                  Disconnect
                </Button>
              </Group>
            </Group>
            <Text size="sm" c="dimmed">
              Balance: {balance !== null ? `${balance} ETH` : 'Loading...'}
            </Text>
          </>
        ) : (
          <Stack gap="sm">
            <Group justify="space-between" align="center">
              <Stack gap={0}>
                <Text fw={500} size="lg">Wallet Connection</Text>
                <Text size="sm" c="dimmed">
                  Connect your wallet to continue
                </Text>
              </Stack>
            </Group>
            <Select
              label="Network"
              placeholder="Networkを選択"
              value={selectedChain}
              onChange={(value) => setSelectedChain(value || sepolia.id.toString())}
              data={SUPPORTED_CHAINS.map(chain => ({
                value: chain.id.toString(),
                label: chain.name
              }))}
              disabled={isLoading}
            />
            <PasswordInput
              label="プライベートキー"
              placeholder="0x..." 
              value={privateKey}
              onChange={(event) => setPrivateKey(event.currentTarget.value)}
              disabled={isLoading}
            />
            <Button
              variant="light"
              color="blue"
              onClick={handleConnect}
              loading={isLoading}
            >
              Connect Wallet
            </Button>
          </Stack>
        )}
      </Stack>
    </Card>
  );
};

export default WalletFromPrivateKey;
