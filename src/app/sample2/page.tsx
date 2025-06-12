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
  TextInput,
  Box,
} from '@mantine/core';
import { IconCheck, IconAlertCircle, IconPlus, IconLoader, IconSend, IconExternalLink } from '@tabler/icons-react';
import { createWalletClient, http, createPublicClient, SignAuthorizationReturnType, parseEther, encodeFunctionData } from 'viem';
import { sepolia, anvil } from 'viem/chains';
import WalletFromPrivateKey from '@/components/WalletFromPrivateKey';
import { Header } from '@/components/Header';
import { Authorization } from '@/components/Authorization';
import { TransactionParameters } from '@/components/TransactionParameters';
import { AbiItem, MethodInput } from '@/types/abi';

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
  const [methodInputValues, setMethodInputValues] = useState<Record<string, string>>({});
  const [tupleArrayLengths, setTupleArrayLengths] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [showTxReceipt, setShowTxReceipt] = useState(false);
  const [txReceipt, setTxReceipt] = useState<any>(null);
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false);

  const getChainName = (id: number): string => {
    const chain = SUPPORTED_CHAINS.find(c => c.id === id);
    return chain ? chain.name : `Unknown Chain (ID: ${id})`;
  };

  const handleConnect = (acc: string, client: ReturnType<typeof createWalletClient>, chId: number) => {
    const currentChain = SUPPORTED_CHAINS.find(chain => chain.id === chId) || sepolia;
    // const rpcUrl = currentChain.id === anvil.id 
    //   ? 'http://localhost:8545'
    //   : 'https://eth-sepolia.g.alchemy.com/v2/KPzrBnLGj_1twv49syaYDn2raEuTKQLF';

    const newClient = createWalletClient({
      account: client.account,
      chain: currentChain,
      transport: http()
    });

    setAccount(acc as `0x${string}`);
    setExecutorWalletClient(newClient);
    setChainId(chId);
    setIsConnected(true);
    setSuccess('Wallet connected successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDisconnect = () => {
    setAccount(null);
    setIsConnected(false);
    setExecutorWalletClient(null);
    setChainId(null);
    setSuccess('Wallet disconnected.');
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

  const handleAuthorizationUpdate = (
    index: number,
    field: 'contractAddress' | 'nonce' | 'signature' | 'privateKey' | 'signedAuthorization',
    value: string | SignAuthorizationReturnType
  ) => {
    setAuthorizations(prev => prev.map((auth, i) => {
      if (i === index) {
        if (field === 'signedAuthorization') {
          const signedAuth = value as SignAuthorizationReturnType;
          return {
            ...auth,
            signedAuthorization: signedAuth,
            signature: `${signedAuth.r}${signedAuth.s.slice(2)}${signedAuth.yParity?.toString(16).padStart(2, '0') || '1b'}`
          };
        }
        return { ...auth, [field]: value };
      }
      return auth;
    }));
  };

  const handleAuthorizationSign = async (index: number) => {
    if (!signerWalletClients || !account) {
      setError('Wallet is not connected.');
      return;
    }

    try {
      // ここに署名ロジックを実装
      setSuccess('Signature generated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to generate signature.');
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
      setMethodInputValues({});
      const initialTupleLengths: Record<string, number> = {};
      method.inputs.forEach((input, index) => {
        if (input.type.endsWith('[]') && input.components) {
          initialTupleLengths[index] = 1;
        }
      });
      setTupleArrayLengths(initialTupleLengths);
    } else {
      setError('Selected method not found.');
    }
  };

  const handleInputChange = (index: string, value: string) => {
    setMethodInputValues(prev => ({
      ...prev,
      [index]: value
    }));
  };

  const handleAddTupleElement = (inputIndex: number) => {
    setTupleArrayLengths(prev => ({
      ...prev,
      [inputIndex]: (prev[inputIndex] || 0) + 1
    }));
  };

  const handleRemoveTupleElement = (inputIndex: number) => {
    setTupleArrayLengths(prev => ({
      ...prev,
      [inputIndex]: Math.max(0, (prev[inputIndex] || 0) - 1)
    }));
  };

  const handleEncodeMethodCall = () => {
    if (!selectedMethod || !abi) {
      setError('Method is not selected.');
      return;
    }

    const method = abi.find((item: AbiItem) => item.name === selectedMethod && item.type === 'function');
    if (!method) {
      setError('Selected method not found.');
      return;
    }

    if (!method.inputs) {
      setError('Method input parameters not found.');
      return;
    }
    console.log("method", method);

    try {
      const args = method.inputs.map((input: MethodInput, index: number) => {
        console.log("Processing input:", input);
        if (input.type.endsWith('[]') && input.components) {
          // tuple[]型の処理
          const arrayLength = tupleArrayLengths[index] || 1;
          console.log(`Tuple array input ${index}:`, { input, arrayLength });

          // 各タプルの値を処理
          const result = Array.from({ length: arrayLength }).map((_, tupleIndex) => {
            const tupleValues: Record<string, any> = {};
            input.components!.forEach((component, compIndex) => {
              const key = `${index}-${tupleIndex}-${compIndex}`;
              const componentValue = methodInputValues[key] || '';
              console.log(`Processing tuple[${tupleIndex}] component[${compIndex}]:`, {
                key,
                component,
                value: componentValue
              });

              if (!componentValue) return;

              if (component.type === 'address') {
                tupleValues[component.name || `param${compIndex}`] = componentValue;
              } else if (component.type.startsWith('uint') || component.type.startsWith('int')) {
                tupleValues[component.name || `param${compIndex}`] = BigInt(componentValue);
              } else if (component.type === 'string') {
                tupleValues[component.name || `param${compIndex}`] = componentValue;
              } else if (component.type === 'bytes') {
                tupleValues[component.name || `param${compIndex}`] = componentValue;
              } else if (component.type === 'bool') {
                tupleValues[component.name || `param${compIndex}`] = componentValue === 'true';
              } else {
                tupleValues[component.name || `param${compIndex}`] = componentValue;
              }
            });

            console.log(`Tuple[${tupleIndex}] values:`, tupleValues);
            return tupleValues;
          });

          console.log("Final tuple array result:", result);
          return result;
        } else if (input.type === 'tuple' && input.components) {
          // 単一タプルの処理
          const tupleValues: Record<string, any> = {};
          input.components.forEach((component, compIndex) => {
            const value = methodInputValues[`${index}-${compIndex}`] || '';
            console.log(`Tuple component ${compIndex}:`, { component, value });
            if (!value) return;

            if (component.type === 'address') {
              tupleValues[component.name || `param${compIndex}`] = value;
            } else if (component.type.startsWith('uint') || component.type.startsWith('int')) {
              tupleValues[component.name || `param${compIndex}`] = BigInt(value);
            } else if (component.type === 'string') {
              tupleValues[component.name || `param${compIndex}`] = value;
            } else if (component.type === 'bytes') {
              tupleValues[component.name || `param${compIndex}`] = value;
            } else if (component.type === 'bool') {
              tupleValues[component.name || `param${compIndex}`] = value === 'true';
            } else {
              tupleValues[component.name || `param${compIndex}`] = value;
            }
          });

          console.log("Tuple values:", tupleValues);
          return tupleValues;
        }

        // 通常の型の処理
        const value = methodInputValues[index] || '';
        console.log(`Regular input ${index}:`, { input, value });
        if (!value) return null;

        if (input.type === 'address') {
          return value;
        } else if (input.type.startsWith('uint') || input.type.startsWith('int')) {
          return BigInt(value);
        } else if (input.type === 'string') {
          return value;
        } else if (input.type === 'bytes') {
          return value;
        } else if (input.type === 'bool') {
          return value === 'true';
        } else if (input.type.endsWith('[]')) {
          const values = value.split(',').map((v: string) => v.trim());
          if (input.type === 'address[]') {
            return values;
          } else if (input.type.startsWith('uint') || input.type.startsWith('int')) {
            return values.map((v: string) => BigInt(v));
          } else if (input.type === 'bool[]') {
            return values.map((v: string) => v === 'true');
          }
          return values;
        }
        return value;
      }).filter((arg: any) => arg !== null);

      console.log("Final args:", args);
      console.log("Method inputs:", method.inputs);
      console.log("Method input values:", methodInputValues);

      const abiItem = {
        type: 'function',
        name: method.name,
        inputs: method.inputs.map(input => ({
          ...input,
          type: input.type === 'tuple[]' ? 'tuple[]' : input.type
        })),
        outputs: method.outputs,
        stateMutability: method.stateMutability
      };
      console.log("ABI item:", abiItem);

      const encodedData = encodeFunctionData({
        abi: [abiItem],
        functionName: method.name,
        args: args
      });

      console.log("encodedData", encodedData);
      setData(encodedData);
      setSuccess('Method call encoded successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      console.error("Encoding error:", err);
      if (err instanceof Error) {
        setError('Failed to encode method call: ' + err.message);
      } else {
        setError('An unknown error occurred');
      }
    }
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

  const shouldShowExplorer = (chainId: number) => {
    return chainId !== anvil.id;
  };

  const handleShowReceipt = async () => {
    if (!txHash || !chainId) return;
    
    setIsLoadingReceipt(true);
    try {
      const currentChain = SUPPORTED_CHAINS.find(chain => chain.id === chainId) || sepolia;
      const publicClient = createPublicClient({
        chain: currentChain,
        transport: http()
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash as `0x${string}`
      });
      
      // BigIntを文字列に変換
      const stringifiedReceipt = JSON.parse(JSON.stringify(receipt, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ));
      
      setTxReceipt(stringifiedReceipt);
      setShowTxReceipt(true);
    } catch (error) {
      console.error('Error fetching transaction receipt:', error);
      setError('Failed to fetch transaction receipt');
    } finally {
      setIsLoadingReceipt(false);
    }
  };

  const sendEIP7702Transaction = async () => {
    if (!executorWalletClient || !account || !chainId) {
      setError('Wallet is not connected.');
      return;
    }

    setLoading(true);
    try {
      const currentChain = SUPPORTED_CHAINS.find(chain => chain.id === chainId) || sepolia;
      // const rpcUrl = currentChain.id === anvil.id 
      //   ? 'http://localhost:8545'
      //   : 'https://eth-sepolia.g.alchemy.com/v2/KPzrBnLGj_1twv49syaYDn2raEuTKQLF';

      const authorizationList = authorizations.map(auth => {
        if (!auth.signedAuthorization) {
          throw new Error('Authorization not signed');
        }
        return auth.signedAuthorization;
      });

      const publicClient = createPublicClient({
        chain: currentChain,
        // transport: http(rpcUrl)
        transport: http()
      });

      const [estimatedGas, gasPrice] = await Promise.all([
        publicClient.estimateGas({
          account,
          to: to as `0x${string}`,
          value: parseEther(value || '0'),
          data: data as `0x${string}`,
          authorizationList: authorizationList,
        }),
        publicClient.getGasPrice()
      ]);

      if (!executorWalletClient?.account) {
        throw new Error('Wallet account not found');
      }

      const params = {
        authorizationList: authorizationList,
        to: to as `0x${string}`,
        value: parseEther(value || '0'),
        data: data as `0x${string}`,
        gas: gasLimit ? BigInt(gasLimit) : estimatedGas,
        maxFeePerGas: maxFeePerGas ? BigInt(maxFeePerGas) : gasPrice * BigInt(2),
        maxPriorityFeePerGas: maxPriorityFeePerGas ? BigInt(maxPriorityFeePerGas) : gasPrice,
        account: executorWalletClient.account,
        chain: currentChain,
      }
      console.log("params", params);
      console.log("executorWalletClient", executorWalletClient);
      console.log("executorWalletClient.uid", executorWalletClient.uid);

      // executorWalletClientを使用してトランザクションを送信
      const tx = await executorWalletClient.sendTransaction(params) as `0x${string}`;

      setTxHash(tx);
      setSuccess('Transaction sent successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Transaction error:', error);
      setError('Failed to send transaction.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const renderMethodInput = (input: MethodInput, inputIndex: number) => {
    if (input.type.endsWith('[]') && input.components) {
      // tuple[]型の入力フィールド
      const arrayLength = tupleArrayLengths[inputIndex] || 1;
      return (
        <Stack key={inputIndex} gap="xs">
          <Group justify="space-between">
            <Text size="sm" fw={500} c="indigo">{input.name || `Parameter ${inputIndex}`}</Text>
            <Button
              variant="light"
              size="xs"
              onClick={() => handleAddTupleElement(inputIndex)}
              leftSection={<IconPlus size={14} />}
            >
              Add Element
            </Button>
          </Group>
          {Array.from({ length: arrayLength }).map((_, tupleIndex) => (
            <Card key={tupleIndex} withBorder p="xs">
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" fw={500} c="indigo">Element {tupleIndex + 1}</Text>
                  {arrayLength > 1 && (
                    <Button
                      variant="light"
                      color="red"
                      size="xs"
                      onClick={() => handleRemoveTupleElement(inputIndex)}
                    >
                      Remove
                    </Button>
                  )}
                </Group>
                {input.components!.map((component, compIndex) => (
                  <TextInput
                    key={`${inputIndex}-${tupleIndex}-${compIndex}`}
                    label={component.name || `Component ${compIndex}`}
                    placeholder={component.type}
                    value={methodInputValues[`${inputIndex}-${tupleIndex}-${compIndex}`] || ''}
                    onChange={(e) => handleInputChange(`${inputIndex}-${tupleIndex}-${compIndex}`, e.target.value)}
                  />
                ))}
              </Stack>
            </Card>
          ))}
        </Stack>
      );
    } else if (input.type === 'tuple' && input.components) {
      // 単一タプルの入力フィールド
      return (
        <Stack key={inputIndex} gap="xs">
          <Text size="sm" fw={500} c="indigo">{input.name || `Parameter ${inputIndex}`}</Text>
          {input.components.map((component, compIndex) => (
            <TextInput
              key={`${inputIndex}-${compIndex}`}
              label={component.name || `Component ${compIndex}`}
              placeholder={component.type}
              value={methodInputValues[`${inputIndex}-${compIndex}`] || ''}
              onChange={(e) => handleInputChange(`${inputIndex}-${compIndex}`, e.target.value)}
            />
          ))}
        </Stack>
      );
    } else {
      // 通常の入力フィールド
      return (
        <TextInput
          key={inputIndex}
          label={input.name || `Parameter ${inputIndex}`}
          placeholder={input.type}
          value={methodInputValues[inputIndex] || ''}
          onChange={(e) => handleInputChange(inputIndex.toString(), e.target.value)}
        />
      );
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
              renderMethodInput={renderMethodInput}
            />

            {txHash && (
              <Alert color="blue">
                <Stack gap="xs">
                  <Text fw={500}>Transaction Hash:</Text>
                  <Code block>{txHash}</Code>
                  <Group justify="space-between">
                    {shouldShowExplorer(chainId || 1) && (
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
                    )}
                    <Button
                      variant="light"
                      size="xs"
                      onClick={handleShowReceipt}
                      loading={isLoadingReceipt}
                    >
                      View Transaction Receipt
                    </Button>
                  </Group>
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
          title="Transaction JSON"
          size="lg"
        >
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {txJson}
          </pre>
        </Modal>

        <Modal
          opened={showTxReceipt}
          onClose={() => setShowTxReceipt(false)}
          title="Transaction Receipt"
          size="lg"
        >
          <Box>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {JSON.stringify(txReceipt, null, 2)}
            </pre>
          </Box>
        </Modal>
      </Stack>
    </Container>
  );
};

export default SamplePage;
