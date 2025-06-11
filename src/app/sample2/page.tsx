'use client';

import React, { useState } from 'react';
import {
  Container,
  Stack,
  Alert,
  Text,
  Button,
  Group,
  Card,
  Code,
  Anchor,
  Modal,
} from '@mantine/core';
import { IconCheck, IconAlertCircle, IconPlus, IconLoader, IconSend, IconExternalLink } from '@tabler/icons-react';
import { createWalletClient, http, createPublicClient } from 'viem';
import { SignAuthorizationReturnType } from 'viem';
import { sepolia, anvil } from 'viem/chains';
import WalletFromPrivateKey from '@/components/WalletFromPrivateKey';
import { Header } from '@/components/Header';
import { Authorization } from '@/components/Authorization';
import { TransactionParameters } from '@/components/TransactionParameters';
import { AbiItem, MethodInput } from '@/types/abi';
import { parseEther } from 'viem';

interface AuthorizationInput {
  contractAddress: string;
  nonce: string;
  signature: string;
  privateKey: string;
  signedAuthorization?: SignAuthorizationReturnType;
}

// サポートされているチェーンのリスト
const SUPPORTED_CHAINS = [sepolia, anvil];

const SamplePage = () => {
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [executorWalletClient, setExecutorWalletClient] = useState<ReturnType<typeof createWalletClient> | null>(null);
  const [signerWalletClients, setSignerWalletClients] = useState<ReturnType<typeof createWalletClient>[]>([]);
  const [chainId, setChainId] = useState<number | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [showTxJson, setShowTxJson] = useState(false);
  const [txJson, setTxJson] = useState<string>('');
  const [authorizations, setAuthorizations] = useState<AuthorizationInput[]>([{
    contractAddress: '',
    nonce: '',
    signature: '',
    privateKey: '',
  }]);
  const [to, setTo] = useState('');
  const [value, setValue] = useState('');
  const [data, setData] = useState('');
  const [gasLimit, setGasLimit] = useState('');
  const [maxFeePerGas, setMaxFeePerGas] = useState('');
  const [maxPriorityFeePerGas, setMaxPriorityFeePerGas] = useState('');
  const [abi, setAbi] = useState<AbiItem[] | null>(null);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [methodInputs, setMethodInputs] = useState<MethodInput[]>([]);
  const [abiError, setAbiError] = useState('');
  const [methodInputValues, setMethodInputValues] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);

  const getChainName = (id: number): string => {
    const chain = SUPPORTED_CHAINS.find(c => c.id === id);
    return chain ? chain.name : `Unknown Chain (ID: ${id})`;
  };

  const handleConnect = (acc: string, client: ReturnType<typeof createWalletClient>, chId: number) => {
    setAccount(acc as `0x${string}`);
    setExecutorWalletClient(client);
    setChainId(chId);
    setIsConnected(true);
    setSuccess('ウォレットが正常に接続されました！');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDisconnect = () => {
    setAccount(null);
    setIsConnected(false);
    setExecutorWalletClient(null);
    setChainId(null);
    setSuccess('ウォレットが切断されました。');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleAddAuthorization = () => {
    setAuthorizations(prev => [...prev, {
      contractAddress: '',
      nonce: '',
      signature: '',
      privateKey: '',
    }]);
  };

  const handleRemoveAuthorization = (index: number) => {
    setAuthorizations(prev => prev.filter((_, i) => i !== index));
  };

  const handleAuthorizationUpdate = (index: number, field: 'contractAddress' | 'nonce' | 'signature' | 'privateKey', value: string) => {
    setAuthorizations(prev => prev.map((auth, i) => 
      i === index ? { ...auth, [field]: value } : auth
    ));
  };

  const handleAuthorizationSign = async (index: number) => {
    if (!signerWalletClients || !account) {
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

  const handleAbiUpload = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const abiData = JSON.parse(e.target?.result as string);
        setAbi(abiData);
        setAbiError('');
      } catch (error) {
        setAbiError('Invalid ABI JSON file');
      }
    };
    reader.readAsText(file);
  };

  const handleAbiTextInput = (value: string) => {
    try {
      const abiData = JSON.parse(value);
      setAbi(abiData);
      setAbiError('');
    } catch (error) {
      setAbiError('Invalid ABI JSON');
    }
  };

  const handleMethodSelect = (value: string | null) => {
    if (!value || !abi) return;
    const method = abi.find(item => item.name === value);
    if (method && method.inputs) {
      setSelectedMethod(value);
      setMethodInputs(method.inputs);
    }
  };

  const handleInputChange = (index: number, value: string) => {
    setMethodInputValues(prev => ({
      ...prev,
      [index]: value
    }));
  };

  const handleEncodeMethodCall = () => {
    // TODO: Implement method call encoding
  };

  const getWritableMethods = () => {
    if (!abi) return [];
    return abi.filter(item => item.type === 'function' && !item.stateMutability?.includes('view'));
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

  const sendEIP7702Transaction = async () => {
    if (!executorWalletClient || !account || !chainId) {
      setError('ウォレットが接続されていません。');
      return;
    }

    setLoading(true);
    try {
      const currentChain = SUPPORTED_CHAINS.find(chain => chain.id === chainId) || sepolia;
      const formattedAuthorizations = authorizations.map(auth => {
        const signature = auth.signature as `0x${string}`;
        const r = signature.slice(0, 66) as `0x${string}`;
        const s = `0x${signature.slice(66, 130)}` as `0x${string}`;
        const yParity = parseInt(signature.slice(130, 132), 16);
        return {
          address: auth.contractAddress as `0x${string}`,
          chainId: currentChain.id,
          nonce: parseInt(auth.nonce, 10),
          r,
          s,
          yParity,
        };
      });

      const publicClient = createPublicClient({
        chain: currentChain,
        transport: http()
      });

      const [estimatedGas, gasPrice] = await Promise.all([
        publicClient.estimateGas({
          account,
          to: to as `0x${string}`,
          value: parseEther(value || '0'),
          data: data as `0x${string}`,
          authorizationList: formattedAuthorizations,
        }),
        publicClient.getGasPrice()
      ]);

      const params = {
        authorizationList: formattedAuthorizations,
        to: to as `0x${string}`,
        value: parseEther(value || '0'),
        data: data as `0x${string}`,
        gas: gasLimit ? BigInt(gasLimit) : estimatedGas,
        maxFeePerGas: maxFeePerGas ? BigInt(maxFeePerGas) : gasPrice * BigInt(2),
        maxPriorityFeePerGas: maxPriorityFeePerGas ? BigInt(maxPriorityFeePerGas) : gasPrice,
        account,
        chain: currentChain,
      }
      console.log("params", params);
      const tx = await executorWalletClient.sendTransaction(params);
      console.log("tx", tx);

      setTxHash(tx);
      setSuccess('トランザクションが送信されました！');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Transaction error:', error);
      setError('トランザクションの送信に失敗しました。');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
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
          walletClient={executorWalletClient}
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
              <Card key={index} shadow="sm" padding="lg" radius="md" withBorder>
                <Authorization
                  authorization={auth}
                  index={index}
                  onUpdate={(field, value) => handleAuthorizationUpdate(index, field, value)}
                  onSign={() => handleAuthorizationSign(index)}
                  showRemoveButton={authorizations.length > 1}
                  onRemove={() => handleRemoveAuthorization(index)}
                  chainId={chainId || sepolia.id}
                  transport={http(executorWalletClient?.chain?.rpcUrls.default.http[0] || sepolia.rpcUrls.default.http[0])}
                />
              </Card>
            ))}

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
              authorizations={authorizations}
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
              onEncodeMethodCall={handleEncodeMethodCall}
              getWritableMethods={getWritableMethods}
            />

            {txHash && (
              <Alert color="blue">
                <Stack gap="xs">
                  <Text fw={500}>トランザクションハッシュ:</Text>
                  <Code block>{txHash}</Code>
                  <Anchor
                    href={getExplorerUrl(txHash, chainId || 1)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Group gap={5}>
                      <Text>ブロックエクスプローラーで確認</Text>
                      <IconExternalLink size={14} />
                    </Group>
                  </Anchor>
                </Stack>
              </Alert>
            )}

            <Group>
              <Button
                size="lg"
                fullWidth
                leftSection={loading ? <IconLoader size={20} /> : <IconSend size={20} />}
                onClick={sendEIP7702Transaction}
                disabled={loading || !to || !authorizations[0].contractAddress}
                variant="gradient"
                gradient={{ from: 'indigo', to: 'cyan' }}
                loading={loading}
              >
                {loading ? 'Processing...' : 'Send EIP-7702 Transaction'}
              </Button>
            </Group>
          </Stack>
        )}

        <Modal
          opened={showTxJson}
          onClose={() => setShowTxJson(false)}
          title="トランザクションJSON"
          size="lg"
        >
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {txJson}
          </pre>
        </Modal>
      </Stack>
    </Container>
  );
};

export default SamplePage;
