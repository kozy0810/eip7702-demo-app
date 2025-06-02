"use client"

import React, { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Group,
  Button,
  Stack,
  Alert,
  Box,
  Code,
  Anchor,
} from '@mantine/core';
import {
  IconSend,
  IconAlertCircle,
  IconCheck,
  IconExternalLink,
  IconLoader
} from '@tabler/icons-react';
import { createWalletClient, custom, encodeFunctionData } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, http } from 'viem';
import { WalletConnection } from '@/components/WalletConnection';
import { AuthorizationList } from '@/components/AuthorizationList';
import { TransactionParameters } from '@/components/TransactionParameters';

// anvilのチェーン設定
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
    public: { http: ['http://127.0.0.1:8545'] },
  },
} as const;

// サポートされているチェーンのリスト
const SUPPORTED_CHAINS = [sepolia, anvil];

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (eventName: string, handler: (...args: any[]) => void) => void;
      removeListener: (eventName: string, handler: (...args: any[]) => void) => void;
      isMetaMask?: boolean;
      selectedAddress?: string;
      networkVersion?: string;
    };
  }
}

// 型定義の追加
interface Authorization {
  contractAddress: string;
  nonce: string;
  signature: string;
  privateKey: string;
}

interface MethodInput {
  name: string;
  type: string;
}

interface AbiItem {
  type: string;
  name: string;
  inputs?: MethodInput[];
  stateMutability?: string;
}

const Home = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [chainId, setChainId] = useState<number | null>(null);
  const [walletClient, setWalletClient] = useState<ReturnType<typeof createWalletClient> | null>(null);

  // EIP-7702 Transaction parameters
  const [authorizationList, setAuthorizationList] = useState<Authorization[]>([{
    contractAddress: '',
    nonce: '0',
    signature: '',
    privateKey: '',
  }]);
  const [to, setTo] = useState('');
  const [value, setValue] = useState('0');
  const [data, setData] = useState('0x');
  const [gasLimit, setGasLimit] = useState('21000');
  const [maxFeePerGas, setMaxFeePerGas] = useState('20');
  const [maxPriorityFeePerGas, setMaxPriorityFeePerGas] = useState('2');

  // ABI and method selection
  const [abi, setAbi] = useState<AbiItem[] | null>(null);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [methodInputs, setMethodInputs] = useState<MethodInput[]>([]);
  const [abiError, setAbiError] = useState('');
  const [methodInputValues, setMethodInputValues] = useState<Record<number, string>>({});

  // Utility functions
  const parseEther = (value: string): string => {
    if (!value || value === '0') return '0x0';
    const wei = Math.floor(parseFloat(value) * 1e18);
    return '0x' + wei.toString(16);
  };

  const parseGwei = (value: string): string => {
    if (!value || value === '0') return '0x0';
    const wei = Math.floor(parseFloat(value) * 1e9);
    return '0x' + wei.toString(16);
  };

  const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  // ABI handling functions
  const handleAbiUpload = (file: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (typeof result === 'string') {
          const abiContent = JSON.parse(result);
          setAbi(abiContent);
          setAbiError('');
          setSelectedMethod('');
          setMethodInputs([]);
          setData('0x');
          setSuccess('ABI uploaded successfully!');
          setTimeout(() => setSuccess(''), 3000);
        }
      } catch (err) {
        setAbiError('Invalid JSON format in ABI file');
        setAbi(null);
      }
    };
    reader.readAsText(file);
  };

  const handleAbiTextInput = (abiText: string) => {
    try {
      if (!abiText.trim()) {
        setAbi(null);
        setAbiError('');
        setSelectedMethod('');
        setMethodInputs([]);
        setData('0x');
        return;
      }

      const abiContent = JSON.parse(abiText);
      setAbi(abiContent);
      setAbiError('');
      setSelectedMethod('');
      setMethodInputs([]);
      setData('0x');
    } catch (err) {
      setAbiError('Invalid JSON format');
      setAbi(null);
    }
  };

  const getWritableMethods = (): AbiItem[] => {
    if (!abi) return [];
    return abi.filter(item => 
      item.type === 'function' && 
      (item.stateMutability === 'nonpayable' || item.stateMutability === 'payable' || !item.stateMutability)
    );
  };

  const handleMethodSelect = (methodName: string | null) => {
    if (!abi || !methodName) return;
    
    const method = abi.find(item => item.name === methodName && item.type === 'function');
    if (!method) return;

    setSelectedMethod(methodName);
    setMethodInputs(method.inputs || []);
    
    // Reset input values
    const initialInputs: Record<number, string> = {};
    method.inputs?.forEach((input, index) => {
      initialInputs[index] = '';
    });
    setMethodInputValues(initialInputs);
    
    // Update data field with method selector
    const methodSignature = `${method.name}(${method.inputs?.map(input => input.type).join(',') || ''})`;
    const methodSelector = generateMethodSelector(methodSignature);
    setData(methodSelector);
  };

  const generateMethodSelector = (signature: string): string => {
    let hash = 0;
    for (let i = 0; i < signature.length; i++) {
      hash = ((hash << 5) - hash + signature.charCodeAt(i)) & 0xffffffff;
    }
    return '0x' + Math.abs(hash).toString(16).padStart(8, '0').slice(0, 8);
  };

  const encodeMethodCallWithViem = () => {
    if (!selectedMethod || !methodInputs.length || !abi) return;

    try {
      const method = abi.find((item: AbiItem) => item.name === selectedMethod && item.type === 'function');
      if (!method) return;

      const args = methodInputs.map((input: MethodInput, index: number) => {
        const value = methodInputValues[index] || '';
        if (!value) return null;

        if (input.type === 'address') {
          return value;
        } else if (input.type.startsWith('uint') || input.type.startsWith('int')) {
          return BigInt(value);
        } else if (input.type === 'string') {
          return value;
        } else if (input.type.endsWith('[]')) {
          // 配列型の処理
          const values = value.split(',').map((v: string) => v.trim());
          if (input.type === 'address[]') {
            return values;
          } else if (input.type.startsWith('uint') || input.type.startsWith('int')) {
            return values.map((v: string) => BigInt(v));
          }
          return values;
        }
        return value;
      }).filter((arg: any) => arg !== null);

      const encodedData = encodeFunctionData({
        abi: [method],
        functionName: method.name,
        args: args
      });

      setData(encodedData);
      setSuccess('Method call encoded successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError('Failed to encode method call: ' + err.message);
      } else {
        setError('An unknown error occurred');
      }
    }
  };

  const handleInputChange = (index: number, value: string) => {
    const newInputValues = { ...methodInputValues };
    newInputValues[index] = value;
    setMethodInputValues(newInputValues);
  };

  // Connect wallet
  const connectWallet = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      const chainIdHex = await window.ethereum.request({
        method: 'eth_chainId'
      });
      const chainId = parseInt(chainIdHex, 16);

      if (!SUPPORTED_CHAINS.some(chain => chain.id === chainId)) {
        throw new Error('Unsupported network. Please connect to Sepolia or Anvil.');
      }

      const selectedChain = SUPPORTED_CHAINS.find(chain => chain.id === chainId) || sepolia;
      const client = createWalletClient({
        chain: selectedChain,
        transport: custom(window.ethereum)
      });

      setWalletClient(client);
      setAccount(accounts[0]);
      setChainId(chainId);
      setIsConnected(true);

      setSuccess('Wallet connected successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      console.error('Wallet connection error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  // チェーン変更の監視
  useEffect(() => {
    const ethereum = window.ethereum;
    if (ethereum) {
      const handleChainChanged = async (chainIdHex: string) => {
        const chainId = parseInt(chainIdHex, 16);
        setChainId(chainId);

        if (!SUPPORTED_CHAINS.some(chain => chain.id === chainId)) {
          setError('Unsupported network. Please connect to Sepolia or Anvil.');
          setIsConnected(false);
          setAccount(null);
          setWalletClient(null);
        } else {
          const selectedChain = SUPPORTED_CHAINS.find(chain => chain.id === chainId) || sepolia;
          const client = createWalletClient({
            chain: selectedChain,
            transport: custom(ethereum)
          });
          setWalletClient(client);
          setError('');
          setIsConnected(true);
        }
      };

      ethereum.on('chainChanged', handleChainChanged);

      return () => {
        ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  // Check if wallet is already connected
  useEffect(() => {
    const checkConnection = async () => {
      try {
        if (window.ethereum) {
          const accounts = await window.ethereum.request({
            method: 'eth_accounts'
          });
          if (accounts.length > 0) {
            const chainIdHex = await window.ethereum.request({
              method: 'eth_chainId'
            });
            const chainId = parseInt(chainIdHex, 16);

            if (!SUPPORTED_CHAINS.some(chain => chain.id === chainId)) {
              setError('Unsupported network. Please connect to Sepolia or Anvil.');
              setIsConnected(false);
              setAccount(null);
              setWalletClient(null);
            } else {
              const selectedChain = SUPPORTED_CHAINS.find(chain => chain.id === chainId) || sepolia;
              const client = createWalletClient({
                chain: selectedChain,
                transport: custom(window.ethereum)
              });
              setWalletClient(client);
              setAccount(accounts[0]);
              setChainId(chainId);
              setIsConnected(true);
            }
          }
        }
      } catch (err) {
        console.error('Failed to check connection:', err);
      }
    };

    checkConnection();
  }, []);

  // Generate authorization signature for EIP-7702
  const signAuthorization = async (privateKey: string, contractAddress: string, nonce: string) => {
    try {
      if (!privateKey) {
        throw new Error('Private key is required');
      }

      const account = privateKeyToAccount(privateKey as `0x${string}`);
      const client = createWalletClient({
        chain: sepolia,
        transport: http()
      });

      const message = JSON.stringify({
        type: 'EIP-7702 Authorization',
        chainId: chainId,
        contract: contractAddress.toLowerCase(),
        nonce: parseInt(nonce),
        timestamp: Date.now()
      });

      const signature = await client.signMessage({
        account,
        message
      });

      return signature;
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(`Failed to sign authorization: ${err.message}`);
      }
      throw new Error('Failed to sign authorization: Unknown error');
    }
  };

  const getAddressFromPrivateKey = (privateKey: string): string => {
    try {
      if (!privateKey) return '0x0000000000000000000000000000000000000000';
      const account = privateKeyToAccount(privateKey as `0x${string}`);
      return account.address;
    } catch (error) {
      return '0x0000000000000000000000000000000000000000';
    }
  };

  const getNonce = async (address: string): Promise<string> => {
    try {
      const client = createPublicClient({
        chain: sepolia,
        transport: http()
      });
      const nonce = await client.getTransactionCount({
        address: address as `0x${string}`
      });
      return nonce.toString();
    } catch (error) {
      console.error('Failed to get nonce:', error);
      return '0';
    }
  };

  const updateAuthorizationList = async (index: number, field: keyof Authorization, value: string) => {
    const newList = [...authorizationList];
    newList[index][field] = value;
    setAuthorizationList(newList);

    if (field === 'privateKey' && value) {
      const address = getAddressFromPrivateKey(value);
      const nonce = await getNonce(address);
      newList[index].nonce = nonce;
      setAuthorizationList([...newList]);
    }
  };

  const addAuthorization = () => {
    setAuthorizationList([...authorizationList, {
      contractAddress: '',
      nonce: '0',
      signature: '',
      privateKey: '',
    }]);
  };

  const removeAuthorization = (index: number) => {
    if (authorizationList.length > 1) {
      setAuthorizationList(authorizationList.filter((_, i) => i !== index));
    }
  };

  const sendEIP7702Transaction = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      if (!walletClient || !account) {
        throw new Error('Wallet is not connected');
      }

      if (!to) {
        throw new Error('To address is required');
      }

      if (!authorizationList[0].contractAddress) {
        throw new Error('At least one authorization is required');
      }

      const params = {
        account: account as `0x${string}`,
        to: to as `0x${string}`,
        value: BigInt(parseEther(value || '0')),
        data: data as `0x${string}`,
        gas: BigInt(gasLimit),
        maxFeePerGas: BigInt(parseGwei(maxFeePerGas)),
        maxPriorityFeePerGas: BigInt(parseGwei(maxPriorityFeePerGas)),
        chain: SUPPORTED_CHAINS.find(chain => chain.id === chainId) || sepolia,
      };

      // 認証リストをデータに含める
      const authorizationData = {
        authorizations: authorizationList.map(auth => ({
          address: auth.contractAddress as `0x${string}`,
          chainId: chainId || 1,
          nonce: Number(auth.nonce),
          r: auth.signature.slice(0, 66) as `0x${string}`,
          s: '0x' + auth.signature.slice(66, 130) as `0x${string}`,
          yParity: Number('0x' + auth.signature.slice(130, 132))
        }))
      };

      // 認証データをエンコードしてデータに追加
      const encodedAuthData = '0x' + Buffer.from(JSON.stringify(authorizationData)).toString('hex') as `0x${string}`;
      params.data = params.data === '0x' ? encodedAuthData : (params.data + encodedAuthData.slice(2)) as `0x${string}`;

      const hash = await walletClient.sendTransaction(params);
      setTxHash(hash);
      setSuccess('Transaction sent successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      console.error('Transaction error:', err);
      if (err instanceof Error) {
        // MetaMaskのキャンセルエラーを無視
        if (err.message.includes('User denied') || err.message.includes('User rejected')) {
          setSuccess('Transaction cancelled');
          setTimeout(() => setSuccess(''), 3000);
          return;
        }
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const getChainName = (chainId: number) => {
    const chains: { [key: number]: string } = {
      1: 'Ethereum Mainnet',
      11155111: 'Sepolia Testnet',
      5: 'Goerli Testnet',
      137: 'Polygon Mainnet',
      80001: 'Polygon Mumbai'
    };
    return chains[chainId] || `Chain ID: ${chainId}`;
  };

  const getExplorerUrl = (txHash: string, chainId: number) => {
    const explorers: { [key: number]: string } = {
      1: 'https://etherscan.io',
      11155111: 'https://sepolia.etherscan.io',
      5: 'https://goerli.etherscan.io',
      137: 'https://polygonscan.com',
      80001: 'https://mumbai.polygonscan.com'
    };
    const baseUrl = explorers[chainId] || 'https://etherscan.io';
    return `${baseUrl}/tx/${txHash}`;
  };

  const disconnectWallet = () => {
    setAccount(null);
    setIsConnected(false);
    setChainId(null);
    setWalletClient(null);
    setSuccess('Wallet disconnected successfully');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Box ta="center">
          <Title order={1} size="h1" variant="gradient">
            EIP-7702 Transaction Sender
          </Title>
          <Text size="lg" color="dimmed" mt="xs">
            Send Account Abstraction transactions with temporary code delegation
          </Text>
        </Box>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red">
            {error}
          </Alert>
        )}

        {success && (
          <Alert icon={<IconCheck size={16} />} color="green">
            {success}
          </Alert>
        )}

        <WalletConnection
          isConnected={isConnected}
          account={account}
          chainId={chainId}
          loading={loading}
          onConnect={connectWallet}
          onDisconnect={disconnectWallet}
          getChainName={getChainName}
        />

        {isConnected && (
          <>
            <AuthorizationList
              authorizationList={authorizationList}
              onAdd={addAuthorization}
              onRemove={removeAuthorization}
              onUpdate={updateAuthorizationList}
              onSign={async (index) => {
                try {
                  const auth = authorizationList[index];
                  if (!auth.privateKey) {
                    throw new Error('Private key is required');
                  }
                  if (!auth.contractAddress) {
                    throw new Error('Contract address is required');
                  }
                  if (!auth.nonce || auth.nonce === '0') {
                    throw new Error('Nonce is not available. Please check your private key.');
                  }

                  const signature = await signAuthorization(
                    auth.privateKey,
                    auth.contractAddress,
                    auth.nonce
                  );

                  const newList = [...authorizationList];
                  newList[index].signature = signature;
                  setAuthorizationList(newList);

                  setSuccess('Signature generated successfully');
                } catch (err) {
                  if (err instanceof Error) {
                    setError(`Signing failed: ${err.message}`);
                    setTimeout(() => setError(''), 5000);
                  }
                }
              }}
              getAddressFromPrivateKey={getAddressFromPrivateKey}
            />

            <TransactionParameters
              to={to}
              value={value}
              data={data}
              gasLimit={gasLimit}
              maxFeePerGas={maxFeePerGas}
              maxPriorityFeePerGas={maxPriorityFeePerGas}
              abi={abi}
              selectedMethod={selectedMethod}
              methodInputs={methodInputs}
              abiError={abiError}
              methodInputValues={methodInputValues}
              authorizations={authorizationList}
              onToChange={setTo}
              onValueChange={setValue}
              onDataChange={setData}
              onGasLimitChange={setGasLimit}
              onMaxFeePerGasChange={setMaxFeePerGas}
              onMaxPriorityFeePerGasChange={setMaxPriorityFeePerGas}
              onAbiUpload={handleAbiUpload}
              onAbiTextInput={handleAbiTextInput}
              onMethodSelect={handleMethodSelect}
              onInputChange={handleInputChange}
              onEncodeMethodCall={encodeMethodCallWithViem}
              getWritableMethods={getWritableMethods}
            />

            <Button
              size="lg"
              fullWidth
              leftSection={loading ? <IconLoader size={20} /> : <IconSend size={20} />}
              onClick={sendEIP7702Transaction}
              disabled={loading || !to || !authorizationList[0].contractAddress}
              variant="gradient"
              gradient={{ from: 'indigo', to: 'cyan' }}
              loading={loading}
            >
              {loading ? 'Processing...' : 'Send EIP-7702 Transaction'}
            </Button>

            {txHash && (
              <Alert color="blue">
                <Stack gap="xs">
                  <Text fw={500}>Transaction Hash:</Text>
                  <Code block>{txHash}</Code>
                  <Anchor
                    href={getExplorerUrl(txHash, chainId || 1)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Group gap={5}>
                      <Text>View on Block Explorer</Text>
                      <IconExternalLink size={14} />
                    </Group>
                  </Anchor>
                </Stack>
              </Alert>
            )}
          </>
        )}
      </Stack>
    </Container>
  );
};

export default Home; 