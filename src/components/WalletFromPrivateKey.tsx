import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Group,
  Text,
  Badge,
  Stack,
  TextInput,
  Alert,
  Select,
  PasswordInput,
} from '@mantine/core';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http, formatEther } from 'viem';
import { createPublicClient } from 'viem';
import { sepolia } from 'viem/chains';

interface WalletFromPrivateKeyProps {
  onConnect: (account: string, walletClient: ReturnType<typeof createWalletClient>, chainId: number) => void;
  onDisconnect: () => void;
  isConnected: boolean;
  account: string | null;
  chainId: number | null;
  getChainName: (id: number) => string;
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
}) => {
  const [privateKey, setPrivateKey] = useState<string>('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<string>(sepolia.id.toString());
  const [walletClient, setWalletClient] = useState<ReturnType<typeof createWalletClient> | null>(null);

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
    
    setLoading(true);
    setError(null);
    try {
      const chain = SUPPORTED_CHAINS.find(c => c.id.toString() === newChainId) || sepolia;
      const newClient = createWalletClient({
        account: walletClient.account,
        chain: chain,
        transport: http(chain.rpcUrls.default.http[0])
      });

      const publicClient = createPublicClient({
        chain: chain,
        transport: http()
      });
      const currentChainId = await publicClient.getChainId();

      onConnect(account, newClient, currentChainId);
      setWalletClient(newClient);
      setSelectedChain(newChainId);
    } catch (err: any) {
      setError(err.message || 'チェーンの切り替えに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
        throw new Error('無効なプライベートキーです。0xから始まり66文字の16進数文字列である必要があります。');
      }

      const chain = SUPPORTED_CHAINS.find(c => c.id.toString() === selectedChain) || sepolia;
      const acc = privateKeyToAccount(privateKey as `0x${string}`);
      const client = createWalletClient({
        account: acc,
        chain: chain,
        transport: http(chain.rpcUrls.default.http[0])
      });
      
      const publicClient = createPublicClient({
        chain: chain,
        transport: http()
      });
      const currentChainId = await publicClient.getChainId();

      setWalletClient(client);
      onConnect(acc.address, client, currentChainId);
    } catch (err: any) {
      setError(err.message || 'ウォレットの接続に失敗しました。');
      onDisconnect();
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    setPrivateKey('');
    setWalletClient(null);
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
                  disabled={loading}
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
              disabled={loading}
            />
            <PasswordInput
              label="プライベートキー"
              placeholder="0x..." 
              value={privateKey}
              onChange={(event) => setPrivateKey(event.currentTarget.value)}
              disabled={loading}
            />
            <Button
              variant="light"
              color="blue"
              onClick={handleConnect}
              loading={loading}
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
