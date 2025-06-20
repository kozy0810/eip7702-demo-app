import React from 'react';
import { Card, Title, Grid, TextInput, Textarea, Group, Text, Badge, Paper, Stack, FileInput, Divider, Alert, Select, Box, Button, Modal } from '@mantine/core';
import { IconUpload, IconAlertCircle, IconCheck, IconFileCode, IconArrowLeft } from '@tabler/icons-react';
import { PREDEFINED_CONTRACTS } from '@/constants/predefinedContracts';
import { AbiItem, MethodInput } from '@/types/abi';
import { SignAuthorizationReturnType } from 'viem';

interface TransactionParametersProps {
  to: string;
  value: string;
  data: string;
  gasLimit: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  abi: AbiItem[] | null;
  selectedMethod: string;
  methodInputs: MethodInput[];
  abiError: string;
  methodInputValues: Record<string, string>;
  authorizations: Array<{
    contractAddress: string;
    nonce: string;
    signature: string;
    signedAuthorization?: SignAuthorizationReturnType;
  }>;
  onToChange: (value: string) => void;
  onValueChange: (value: string) => void;
  onDataChange: (value: string) => void;
  onGasLimitChange: (value: string) => void;
  onMaxFeePerGasChange: (value: string) => void;
  onMaxPriorityFeePerGasChange: (value: string) => void;
  onAbiUpload: (file: File | null) => void;
  onAbiTextInput: (value: string) => void;
  onMethodSelect: (value: string | null) => void;
  onInputChange: (index: string, value: string) => void;
  onEncodeMethodCall: () => void;
  getWritableMethods: () => AbiItem[];
  renderMethodInput: (input: MethodInput, index: number) => React.ReactNode;
}

// 定義済みコントラクトの型
interface PredefinedContract {
  name: string;
  address: string;
  abi: AbiItem[];
}

export const TransactionParameters: React.FC<TransactionParametersProps> = ({
  to,
  value,
  data,
  gasLimit,
  maxFeePerGas,
  maxPriorityFeePerGas,
  abi,
  selectedMethod,
  methodInputs,
  abiError,
  methodInputValues,
  authorizations,
  onToChange,
  onValueChange,
  onDataChange,
  onGasLimitChange,
  onMaxFeePerGasChange,
  onMaxPriorityFeePerGasChange,
  onAbiUpload,
  onAbiTextInput,
  onMethodSelect,
  onInputChange,
  onEncodeMethodCall,
  getWritableMethods,
  renderMethodInput
}) => {
  const [showTxParams, setShowTxParams] = React.useState(false);
  const [showGasParams, setShowGasParams] = React.useState(false);
  const [selectedAbiInput, setSelectedAbiInput] = React.useState<'predefined' | 'file' | 'json' | null>(null);

  const handleContractSelect = (contractName: string | null) => {
    if (!contractName) return;
    
    const selectedContract = PREDEFINED_CONTRACTS.find(contract => contract.name === contractName);
    if (selectedContract) {
      onToChange(selectedContract.address);
      onAbiTextInput(JSON.stringify(selectedContract.abi));
      setSelectedAbiInput('predefined');
    }
  };

  const handleFileUpload = (file: File | null) => {
    onAbiUpload(file);
    if (file) {
      setSelectedAbiInput('file');
    }
  };

  const handleJsonInput = (value: string) => {
    onAbiTextInput(value);
    if (value) {
      setSelectedAbiInput('json');
    }
  };

  const resetAbiInput = () => {
    setSelectedAbiInput(null);
    onAbiTextInput('');
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <Title order={3}>Transaction Parameters</Title>

        {/* ABI Upload Section */}
        <Paper p="md" withBorder mb="md">
          <Title order={4} mb="md">Smart Contract ABI</Title>
          <Stack gap="md">
            {!selectedAbiInput ? (
              <>
                <Select
                  label="Predefined Contracts"
                  placeholder="Select a contract"
                  data={PREDEFINED_CONTRACTS.map(contract => ({
                    value: contract.name || '',
                    label: contract.name || ''
                  }))}
                  onChange={handleContractSelect}
                />

                <Divider label="or" labelPosition="center" />

                <FileInput
                  label="Upload ABI File"
                  placeholder="Select JSON file"
                  accept=".json"
                  onChange={handleFileUpload}
                  leftSection={<IconUpload size={14} />}
                />
                
                <Divider label="or" labelPosition="center" />
                
                <Textarea
                  label="Enter ABI JSON"
                  placeholder='[{"type":"function","name":"transfer","inputs":[...]}]'
                  onChange={(e) => handleJsonInput(e.target.value)}
                  minRows={4}
                  styles={{ input: { fontFamily: 'monospace', fontSize: '12px' } }}
                />
              </>
            ) : (
              <>
                {selectedAbiInput === 'predefined' && (
                  <Select
                    label="Predefined Contracts"
                    placeholder="Select a contract"
                    data={PREDEFINED_CONTRACTS.map(contract => ({
                      value: contract.name || '',
                      label: contract.name || ''
                    }))}
                    onChange={handleContractSelect}
                  />
                )}

                {selectedAbiInput === 'file' && (
                  <FileInput
                    label="Upload ABI File"
                    placeholder="Select JSON file"
                    accept=".json"
                    onChange={handleFileUpload}
                    leftSection={<IconUpload size={14} />}
                  />
                )}

                {selectedAbiInput === 'json' && (
                  <Textarea
                    label="Enter ABI JSON"
                    placeholder='[{"type":"function","name":"transfer","inputs":[...]}]'
                    onChange={(e) => handleJsonInput(e.target.value)}
                    minRows={4}
                    styles={{ input: { fontFamily: 'monospace', fontSize: '12px' } }}
                  />
                )}

                {selectedAbiInput && (
                  <Group justify="left" mt="md">
                    <Button
                      variant="subtle"
                      leftSection={<IconArrowLeft size={14} />}
                      onClick={resetAbiInput}
                    >
                      Change Input Method
                    </Button>
                  </Group>
                )}
              </>
            )}
            
            {abiError && (
              <Alert icon={<IconAlertCircle size={16} />} color="red">
                {abiError}
              </Alert>
            )}
            
            {abi && (
              <Alert icon={<IconCheck size={16} />} color="green">
                ABI loaded successfully ({getWritableMethods().length} writable methods found)
              </Alert>
            )}

            {/* Method Selection */}
            {abi && getWritableMethods().length > 0 && (
              <>
                <Divider my="md" />
                <Title order={4} mb="md">Method Selection</Title>
                <Stack gap="md">
                  <Select
                    label="Select Method"
                    placeholder="-- Select a method --"
                    value={selectedMethod}
                    onChange={onMethodSelect}
                    data={getWritableMethods().map((method) => ({
                      value: method.name || '',
                      label: `${method.name || ''}(${method.inputs?.map(input => `${input.type} ${input.name}`).join(', ')})`,
                    }))}
                  />

                  {/* Method Parameters */}
                  {selectedMethod && methodInputs.length > 0 && (
                    <Box>
                      <Text fw={500} c="indigo" mb="sm">Method Parameters</Text>
                      <Stack gap="sm">
                        {methodInputs.map((input, index) => (
                          <Box key={index}>
                            {renderMethodInput(input, index)}
                          </Box>
                        ))}
                      </Stack>
                      <Group justify="flex-end" mt="md">
                        <Button
                          variant="light"
                          color="blue"
                          onClick={onEncodeMethodCall}
                          leftSection={<IconFileCode size={16} />}
                        >
                          Encode Method Call
                        </Button>
                      </Group>
                    </Box>
                  )}
                </Stack>
              </>
            )}
          </Stack>
        </Paper>

        <Paper p="md" withBorder>
          <Title order={4} mb="md">Transaction Details</Title>
          <Stack gap="md">
            <TextInput
              label="To Address"
              placeholder="0x..."
              value={to}
              onChange={(e) => onToChange(e.target.value)}
              required
            />

            <TextInput
              label="Value (ETH)"
              placeholder="0.0"
              value={value || '0'}
              onChange={(e) => {
                const input = e.target.value;
                // 数値と小数点のみを許可
                if (input === '' || /^\d*\.?\d*$/.test(input)) {
                  onValueChange(input);
                }
              }}
              required
              description="Enter amount in ETH (e.g., 0.1, 0.222)"
            />

            <TextInput
              label={
                <Group justify="space-between" align="center">
                  <Text>Data (Hex)</Text>
                  {selectedMethod && (
                    <Badge size="xs" variant="light">
                      Auto-generated from method call
                    </Badge>
                  )}
                </Group>
              }
              placeholder="0x"
              value={data || '0x'}
              onChange={(e) => onDataChange(e.target.value)}
              styles={{ input: { fontFamily: 'monospace', fontSize: '12px' } }}
            />
            {selectedMethod && (
              <Text size="xs" color="dimmed" mt={2}>
                Generated from method: {selectedMethod}()
              </Text>
            )}
          </Stack>
        </Paper>

        <Paper p="md" withBorder>
          <Group justify="space-between" mb="md">
            <Text fw={500}>Gas Parameters (Optional)</Text>
            <Button
              variant="subtle"
              size="xs"
              onClick={() => setShowGasParams(!showGasParams)}
            >
              {showGasParams ? 'Hide' : 'Show'}
            </Button>
          </Group>
          {showGasParams && (
            <Stack gap="md">
              <TextInput
                label="Gas Limit"
                value={gasLimit}
                onChange={(e) => onGasLimitChange(e.target.value)}
                placeholder="Auto-calculated if not specified"
              />
              <TextInput
                label="Max Fee Per Gas (Gwei)"
                value={maxFeePerGas}
                onChange={(e) => onMaxFeePerGasChange(e.target.value)}
                placeholder="Auto-calculated if not specified"
              />
              <TextInput
                label="Max Priority Fee Per Gas (Gwei)"
                value={maxPriorityFeePerGas}
                onChange={(e) => onMaxPriorityFeePerGasChange(e.target.value)}
                placeholder="Auto-calculated if not specified"
              />
            </Stack>
          )}
        </Paper>

        <Group justify="flex-end" gap="md">
          <Button
            variant="light"
            color="blue"
            onClick={() => {
              const txParams = {
                to,
                value: value ? `0x${(BigInt(Math.floor(parseFloat(value) * 1e18))).toString(16)}` : '0x0',
                data,
                gasLimit: gasLimit ? `0x${parseInt(gasLimit).toString(16)}` : undefined,
                maxFeePerGas: maxFeePerGas ? `0x${parseInt(maxFeePerGas).toString(16)}` : undefined,
                maxPriorityFeePerGas: maxPriorityFeePerGas ? `0x${parseInt(maxPriorityFeePerGas).toString(16)}` : undefined,
                authorizations: authorizations.map(auth => ({
                  contractAddress: auth.contractAddress,
                  nonce: auth.nonce,
                  signature: auth.signature
                }))
              };
              setShowTxParams(true);
            }}
          >
            Show Transaction JSON
          </Button>
        </Group>

        <Modal
          opened={showTxParams}
          onClose={() => setShowTxParams(false)}
          title="Transaction Parameters"
          size="lg"
        >
          <Box>
            <Text size="sm" mb="md">以下のパラメータでトランザクションを送信します：</Text>
            <Paper p="md" withBorder>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify({
                  to,
                  value: value ? `0x${(BigInt(Math.floor(parseFloat(value) * 1e18))).toString(16)}` : '0x0',
                  data,
                  gasLimit: gasLimit ? `0x${parseInt(gasLimit).toString(16)}` : undefined,
                  maxFeePerGas: maxFeePerGas ? `0x${parseInt(maxFeePerGas).toString(16)}` : undefined,
                  maxPriorityFeePerGas: maxPriorityFeePerGas ? `0x${parseInt(maxPriorityFeePerGas).toString(16)}` : undefined,
                  authorizations: authorizations.map(auth => ({
                    contractAddress: auth.contractAddress,
                    nonce: auth.nonce,
                    signature: auth.signature
                  }))
                }, null, 2)}
              </pre>
            </Paper>
          </Box>
        </Modal>
      </Stack>
    </Card>
  );
}; 