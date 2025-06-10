import React, { useState } from 'react';
import { Group, Button, Text, TextInput, Textarea, Paper, Stack, ActionIcon, PasswordInput } from '@mantine/core';
import { SignAuthorizationReturnType } from 'viem';
import { verifyAuthorization } from 'viem/utils'
import { IconPlus, IconMinus } from '@tabler/icons-react';
import { privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, createWalletClient, http } from 'viem';
import { mainnet } from 'viem/chains';

interface Authorization {
  contractAddress: string;
  nonce: string;
  signature: string;
  signedAuthorization?: SignAuthorizationReturnType;
}

interface AuthorizationProps {
  authorization: Authorization;
  index: number;
  onRemove?: () => void;
  onUpdate: (field: 'contractAddress' | 'nonce' | 'signature', value: string) => void;
  onSign: () => Promise<void>;
  showRemoveButton?: boolean;
}

export const Authorization: React.FC<AuthorizationProps> = ({
  authorization,
  index,
  onRemove,
  onUpdate,
  onSign,
  showRemoveButton = false,
}) => {
  const [privateKey, setPrivateKey] = useState('');
  const [isPrivateKeySubmitted, setIsPrivateKeySubmitted] = useState(false);
  const [generatedAddress, setGeneratedAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  const handlePrivateKeySubmit = async () => {
    try {
      setIsLoading(true);
      const formattedPrivateKey = (privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`) as `0x${string}`;
      const account = privateKeyToAccount(formattedPrivateKey);
      setGeneratedAddress(account.address);
      setIsPrivateKeySubmitted(true);

      const publicClient = createPublicClient({
        chain: mainnet,
        transport: http()
      });

      const nonce = await publicClient.getTransactionCount({
        address: account.address
      });

      onUpdate('nonce', nonce.toString());
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrivateKeyChange = (value: string) => {
    setPrivateKey(value);
    if (!value) {
      onUpdate('contractAddress', '');
      onUpdate('nonce', '');
      onUpdate('signature', '');
      setIsPrivateKeySubmitted(false);
      setGeneratedAddress('');
    }
  };

  const handleNonceChange = (value: string) => {
    if (/^\d*$/.test(value)) {
      onUpdate('nonce', value);
    }
  };

  const incrementNonce = () => {
    const currentNonce = parseInt(authorization.nonce || '0', 10);
    onUpdate('nonce', (currentNonce + 1).toString());
  };

  const decrementNonce = () => {
    const currentNonce = parseInt(authorization.nonce || '0', 10);
    if (currentNonce > 0) {
      onUpdate('nonce', (currentNonce - 1).toString());
    }
  };

  const handleSign = async () => {
    if (!authorization.contractAddress || !authorization.nonce || !privateKey) {
      return;
    }

    try {
      setIsSigning(true);
      const formattedPrivateKey = (privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`) as `0x${string}`;
      const account = privateKeyToAccount(formattedPrivateKey);

      const walletClient = createWalletClient({
        account,
        chain: mainnet,
        transport: http()
      });

      const signedAuthorization = await walletClient.signAuthorization({
        account,
        contractAddress: authorization.contractAddress as `0x${string}`,
        nonce: parseInt(authorization.nonce, 10)
      });
      console.log(signedAuthorization);
      console.log(await verifyAuthorization({address: account.address, authorization: signedAuthorization}))

      const yParity = signedAuthorization.yParity ? 1 : 0;
      const v = yParity + 27;
      const signature = `0x${signedAuthorization.r.slice(2)}${signedAuthorization.s.slice(2)}${v.toString(16).padStart(2, '0')}`;
      onUpdate('signature', signature);
      await onSign();
    } catch (error) {
      console.error('Error signing:', error);
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <Paper p="md" withBorder>
      <Stack>
        <Group justify="space-between">
          <Text fw={500}>Authorization #{index + 1}</Text>
          {showRemoveButton && onRemove && (
            <Button
              variant="light"
              color="red"
              onClick={onRemove}
            >
              Remove
            </Button>
          )}
        </Group>

        {!isPrivateKeySubmitted ? (
          <Group>
            <PasswordInput
              label="Private Key"
              value={privateKey}
              onChange={(e) => handlePrivateKeyChange(e.target.value)}
              placeholder="Enter your private key"
              required
              style={{ flex: 1 }}
            />
            <Button
              onClick={handlePrivateKeySubmit}
              disabled={!privateKey || isLoading}
              loading={isLoading}
              style={{ marginTop: '24px' }}
            >
              Submit
            </Button>
          </Group>
        ) : (
          <>
            <TextInput
              label="EOA"
              value={generatedAddress}
              readOnly
            />

            <TextInput
              label="Contract Address"
              value={authorization.contractAddress}
              onChange={(e) => onUpdate('contractAddress', e.target.value)}
              placeholder="0x..."
            />

            <Group align="flex-end">
              <TextInput
                label="Nonce"
                value={authorization.nonce}
                onChange={(e) => handleNonceChange(e.target.value)}
                placeholder="0"
                style={{ flex: 1 }}
              />
              <ActionIcon
                variant="light"
                onClick={decrementNonce}
                disabled={!authorization.nonce || parseInt(authorization.nonce, 10) <= 0}
              >
                <IconMinus size={16} />
              </ActionIcon>
              <ActionIcon
                variant="light"
                onClick={incrementNonce}
              >
                <IconPlus size={16} />
              </ActionIcon>
            </Group>

            <Textarea
              label="Signature"
              value={authorization.signature}
              onChange={(e) => onUpdate('signature', e.target.value)}
              placeholder="0x..."
              readOnly
            />

            <Button
              onClick={handleSign}
              disabled={!authorization.contractAddress || !authorization.nonce}
              loading={isSigning}
            >
              Sign Authorization Message
            </Button>
          </>
        )}
      </Stack>
    </Paper>
  );
};
