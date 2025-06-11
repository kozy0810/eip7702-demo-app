'use client';

import React, { useState } from 'react';
import {
  Container,
  Stack,
  Alert,
  Text,
  Title,
} from '@mantine/core';
import { IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia, mainnet, goerli, polygon, optimism, arbitrum, base, zora, bsc, avalanche, fantom, celo } from 'viem/chains';
import WalletFromPrivateKey from '@/components/WalletFromPrivateKey';
import { Header } from '@/components/Header';
import { Authorization } from '@/components/Authorization';
import { TransactionParameters } from '@/components/TransactionParameters';
import { AbiItem, MethodInput } from '@/types/abi';

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
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [walletClient, setWalletClient] = useState<ReturnType<typeof createWalletClient> | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [authorization, setAuthorization] = useState({
    contractAddress: '',
    nonce: '',
    signature: '',
  });
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

  const getChainName = (id: number): string => {
    const chain = SUPPORTED_CHAINS.find(c => c.id === id);
    return chain ? chain.name : `Unknown Chain (ID: ${id})`;
  };

  const handleConnect = (account: string, client: ReturnType<typeof createWalletClient>, chId: number) => {
    setAccount(account as `0x${string}`);
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

  const handleAuthorizationUpdate = (field: 'contractAddress' | 'nonce' | 'signature', value: string) => {
    setAuthorization(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAuthorizationSign = async () => {
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

  const handleSign = async () => {
    if (!walletClient || !account) {
      setError('ウォレットが接続されていません。');
      return;
    }

    try {
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

        {isConnected && account && (
          <>
            <Authorization
              authorization={authorization}
              index={0}
              onUpdate={handleAuthorizationUpdate}
              onSign={handleSign}
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
              authorizations={[authorization]}
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
          </>
        )}
      </Stack>
    </Container>
  );
};

export default SamplePage;
