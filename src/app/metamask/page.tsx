"use client"

import React, { useState, useEffect } from 'react';
import {
  Container,
  Button,
  Stack,
  Alert,
  Code,
  Anchor,
  Modal,
} from '@mantine/core';
import {
  IconSend,
  IconAlertCircle,
  IconCheck,
  IconExternalLink,
} from '@tabler/icons-react';
import { createWalletClient, custom, encodeFunctionData, SignAuthorizationReturnType, keccak256, concatHex, toRlp, numberToHex } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, http } from 'viem';
import { verifyAuthorization } from 'viem/utils';
import { WalletConnection } from '@/components/WalletConnection';
import { AuthorizationList } from '@/components/AuthorizationList';
import { TransactionParameters } from '@/components/TransactionParameters';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';


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
  signedAuthorization?: SignAuthorizationReturnType;
  privateKey?: string;
}

interface AuthorizationData {
  address: `0x${string}`;
  chainId: number;
  nonce: number;
  r: `0x${string}`;
  s: `0x${string}`;
  yParity: number;
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

const MetaMaskPage = () => {
  const router = useRouter();
  const [account, setAccount] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [chainId, setChainId] = useState<number | null>(null);
  const [walletClient, setWalletClient] = useState<ReturnType<typeof createWalletClient> | null>(null);
  const [showTxJson, setShowTxJson] = useState(false);
  const [txJson, setTxJson] = useState<string>('');

  // EIP-7702 Transaction parameters
  const [authorizationList, setAuthorizationList] = useState<Authorization[]>([{
    contractAddress: '0x63c0c19a282a1b52b07dd5a65b58948a07dae32b',
    nonce: '0',
    signature: '',
  }]);
  const [to, setTo] = useState('');
  const [value, setValue] = useState('0');
  const [data, setData] = useState('0x');
  const [gasLimit, setGasLimit] = useState('300000');
  const [maxFeePerGas, setMaxFeePerGas] = useState('20');
  const [maxPriorityFeePerGas, setMaxPriorityFeePerGas] = useState('2');
  const [isCalculatingGas, setIsCalculatingGas] = useState(false);

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
      const currentChain = SUPPORTED_CHAINS.find(chain => chain.id === chainId) || sepolia;
      const client = createPublicClient({
        chain: currentChain,
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

  const updateAuthorizationList = async (index: number, field: 'contractAddress' | 'nonce' | 'signature' | 'privateKey', value: string) => {
    const newList = [...authorizationList];
    newList[index][field] = value;
    setAuthorizationList(newList);

    if (field === 'privateKey' && value) {
      const address = getAddressFromPrivateKey(value);
      if (chainId) {  // チェーンIDが設定されている場合のみNonceを取得
        const nonce = await getNonce(address);
        newList[index].nonce = nonce;
        setAuthorizationList([...newList]);
      }
    }
  };

  const handleSignAuthorization = async (index: number) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const auth = authorizationList[index];
      if (!auth.contractAddress) {
        throw new Error('Contract address is required for signing');
      }

      if (!window.ethereum) {
        throw new Error('MetaMaskはインストールされていません');
      }

      const currentChain = SUPPORTED_CHAINS.find(chain => chain.id === chainId) || sepolia;

      const debugWalletClient = createWalletClient({
        account: privateKeyToAccount("0x92406fb0bc2df3386ea4fc930f2dc6fa2e0e5c83aeae14f0e7cce6506f607621"),
        chain: sepolia,
        transport: custom(window.ethereum),
      });

      const _authorization = await walletClient?.signAuthorization({
        account: debugWalletClient.account,
        contractAddress: auth.contractAddress as `0x${string}`,
      });
      console.log("_authorization", _authorization);
      if (_authorization) {
        console.log("_isValid", await verifyAuthorization({
          address: account as `0x${string}`,
          authorization: _authorization,
        }));
      }

      // EIP-7702の署名メッセージを作成:
      // keccak256(0x05 || rlp([chain_id, address, nonce]))
      console.log("auth.nonce", auth.nonce)
      const message = keccak256(
        concatHex([
          '0x05',
          toRlp([
              numberToHex(currentChain.id),
              auth.contractAddress as `0x${string}`,
              numberToHex(Number(auth.nonce))
          ]),
        ])
      );
      console.log("_authorization message", message);

      // MetaMaskで署名を実行
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, account] // 署名メッセージとしてHex文字列を渡す
      });

      // 署名データを解析
      const r = `0x${signature.slice(2, 66)}`;
      const s = `0x${signature.slice(66, 130)}`;
      const v = parseInt(signature.slice(130, 132), 16);

      const authorization: SignAuthorizationReturnType = {
        address: auth.contractAddress as `0x${string}`,
        chainId: currentChain.id,
        nonce: Number(auth.nonce),
        r: r as `0x${string}`,
        s: s as `0x${string}`,
        yParity: v
      };

      const newList = [...authorizationList];
      newList[index] = {
        ...auth,
        signature: signature,
        signedAuthorization: authorization,
      };
      setAuthorizationList(newList);

      setSuccess('Authorization signed successfully!');
      setTimeout(() => setSuccess(''), 3000);

      const isValid = await verifyAuthorization({
        address: account as `0x${string}`,
        authorization: authorization,
      });
      console.log("account", account)
      console.log("authorization", authorization)
      console.log("isValid", isValid)

    } catch (err: unknown) {
      console.error('Signing error:', err);
      if (err instanceof Error) {
        setError(`Signing failed: ${err.message}`);
      } else {
        setError('An unknown error occurred during signing');
      }
    } finally {
      setLoading(false);
    }
  };

  const addAuthorization = () => {
    setAuthorizationList([...authorizationList, {
      contractAddress: '',
      nonce: '0',
      signature: '',
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

      if (!authorizationList || authorizationList.length === 0 || !authorizationList[0].signature) {
         throw new Error('At least one signed authorization is required');
      }

      const currentChain = SUPPORTED_CHAINS.find(chain => chain.id === chainId) || sepolia;

      // ガス制限の見積もり
      const publicClient = createPublicClient({
        chain: currentChain,
        transport: http()
      });

      const estimatedGas = await publicClient.estimateGas({
        account: account as `0x${string}`,
        to: to as `0x${string}`,
        value: BigInt(parseEther(value || '0')),
        data: data as `0x${string}`,
        type: 'eip7702',
      });
      console.log('estimatedGas', estimatedGas);

      const params = {
        account: account as `0x${string}`,
        chain: currentChain,
        calls: [{
          to: to as `0x${string}`,
          value: BigInt(parseEther(value || '0')),
          data: data as `0x${string}`,
          gas: estimatedGas,
          maxFeePerGas: BigInt(parseGwei(maxFeePerGas)),
          maxPriorityFeePerGas: BigInt(parseGwei(maxPriorityFeePerGas)),
          type: 'eip7702' as const,
          authorizationList: authorizationList
            .filter(auth => auth.signedAuthorization)
            .map(auth => auth.signedAuthorization as SignAuthorizationReturnType)
        }]
      };
      console.log("tx params", params)

      const { id } = await walletClient.sendCalls(params);
      setTxHash(id);
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

  // ガス代を動的に計算する関数
  const calculateGasFees = async () => {
    try {
      setIsCalculatingGas(true);
      setError('');
      setSuccess('');

      if (!to || !isValidAddress(to)) {
        throw new Error('有効な「To」アドレスは、ガス料金の計算に必要です。');
      }

      const currentChain = SUPPORTED_CHAINS.find(chain => chain.id === chainId) || sepolia;
      const publicClient = createPublicClient({
        chain: currentChain,
        transport: http()
      });

      // 最新のブロックを取得
      const block = await publicClient.getBlock();
      if (!block) {
        throw new Error('最新のブロックを取得できませんでした');
      }

      // ガス制限の見積もり
      const estimatedGas = await publicClient.estimateGas({
        account: account as `0x${string}`,
        to: to as `0x${string}`,
        value: BigInt(parseEther(value || '0')),
        data: data as `0x${string}`,
        type: 'eip7702',
      });
      console.log('estimatedGas', estimatedGas);

      setSuccess('Gas fees calculated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      console.error('Gas fees calculation error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setIsCalculatingGas(false);
    }
  };

  const getChainName = (id: number): string => {
    const chain = SUPPORTED_CHAINS.find(c => c.id === id);
    return chain ? chain.name : `Unknown Chain (ID: ${id})`;
  };

  return (
    <Container my="md">
      <Header />
      <Stack gap="xl">
        {success && <Alert icon={<IconCheck size={16} />} color="green">{success}</Alert>}
        {error && <Alert icon={<IconAlertCircle size={16} />} color="red">{error}</Alert>}

        <WalletConnection
          account={account}
          isConnected={isConnected}
          loading={loading}
          onConnect={connectWallet}
          onDisconnect={() => {
            setAccount(null);
            setIsConnected(false);
            setWalletClient(null);
            setChainId(null);
            setSuccess('Wallet disconnected');
            setTimeout(() => setSuccess(''), 3000);
          }}
          getChainName={getChainName}
          chainId={chainId}
        />

        <TransactionParameters
          to={to}
          onToChange={setTo}
          value={value}
          onValueChange={setValue}
          data={data}
          onDataChange={setData}
          gasLimit={gasLimit}
          onGasLimitChange={setGasLimit}
          maxFeePerGas={maxFeePerGas}
          onMaxFeePerGasChange={setMaxFeePerGas}
          maxPriorityFeePerGas={maxPriorityFeePerGas}
          onMaxPriorityFeePerGasChange={setMaxPriorityFeePerGas}
          abi={abi}
          selectedMethod={selectedMethod}
          methodInputs={methodInputs}
          abiError={abiError}
          methodInputValues={methodInputValues}
          onInputChange={handleInputChange}
          onAbiUpload={handleAbiUpload}
          onAbiTextInput={handleAbiTextInput}
          getWritableMethods={getWritableMethods}
          onMethodSelect={handleMethodSelect}
          onEncodeMethodCall={encodeMethodCallWithViem}
          authorizations={authorizationList}
        />

        <AuthorizationList
          authorizationList={authorizationList}
          onAdd={addAuthorization}
          onRemove={removeAuthorization}
          onUpdate={updateAuthorizationList}
          onSign={handleSignAuthorization}
        />

        <Button
          leftSection={<IconSend size={16} />}
          size="md"
          fullWidth
          onClick={sendEIP7702Transaction}
          loading={loading}
          disabled={!isConnected || !to || !authorizationList[0]?.signedAuthorization}
        >
          Send EIP7702 Transaction
        </Button>

        {txHash && (
          <Alert icon={<IconCheck size={16} />} color="blue" title="Transaction Sent">
            Transaction Hash: <Anchor href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer">{txHash} <IconExternalLink size={14} /></Anchor>
          </Alert>
        )}

        <Modal opened={showTxJson} onClose={() => setShowTxJson(false)} title="Transaction JSON" size="xl">
          <Code block>{txJson}</Code>
        </Modal>
      </Stack>
    </Container>
  );
};

export default MetaMaskPage;