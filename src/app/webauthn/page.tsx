"use client"

import React, { useState } from 'react';
import { Container, Title, Stack, Button, Text, Alert, Code } from '@mantine/core';
import { Header } from '@/components/Header';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';

const WebAuthnPage = () => {
  const [publicKeyCredentialRequestOptions, setPublicKeyCredentialRequestOptions] = useState<any>(null);
  const [authenticationResult, setAuthenticationResult] = useState<any>(null);
  const [publicKeyCredentialCreationOptions, setPublicKeyCredentialCreationOptions] = useState<any>(null);
  const [registrationResult, setRegistrationResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  const generateAuthenticationOptions = async () => {
    try {
      setLoading(true);
      setError(null);
      // バックエンドから認証オプションを取得するAPIコールをここに実装
      // 例: const options = await fetch('/api/generate-authentication-options').then(res => res.json());
      // ダミーデータ
      const options = {
        challenge: 'bQn30tM_2L8a0l_y8Gf5a-5L4u0w1q3s5e3r7i9o1p3e5r7t9y1', // サーバーから取得するチャレンジ
        timeout: 60000,
        rpId: window.location.hostname,
        allowCredentials: [], // ユーザーが登録した資格情報
      };
      setPublicKeyCredentialRequestOptions(options);
    } catch (err) {
      console.error('Error generating authentication options:', err);
      setError('Failed to generate authentication options.');
    } finally {
      setLoading(false);
    }
  };

  const authenticate = async () => {
    if (!publicKeyCredentialRequestOptions) return;

    try {
      setLoading(true);
      setError(null);
      const result = await startAuthentication(publicKeyCredentialRequestOptions);
      setAuthenticationResult(result);
      // 認証結果をバックエンドに送信するAPIコールをここに実装
      // 例: await fetch('/api/verify-authentication', { method: 'POST', body: JSON.stringify(result) });
      console.log('Authentication Result:', result);
    } catch (err: any) {
      console.error('Error during authentication:', err);
      if (err.name === 'NotAllowedError') {
        setError('Authentication cancelled by user or not allowed.');
      } else {
        setError(`Authentication failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const generateRegistrationOptions = async () => {
    try {
      setLoading(true);
      setError(null);
      // バックエンドから登録オプションを取得するAPIコールをここに実装
      // 例: const options = await fetch('/api/generate-registration-options').then(res => res.json());
      // ダミーデータ
      const options = {
        rp: {
          name: 'My EIP7702 App',
          id: window.location.hostname,
        },
        user: {
          id: 'user-id-123', // ユーザーを一意に識別するID
          name: 'user@example.com', // ユーザー名
          displayName: 'Test User',
        },
        challenge: 'bQn30tM_2L8a0l_y8Gf5a-5L4u0w1q3s5e3r7i9o1p3e5r7t9y1', // サーバーから取得するチャレンジ
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        timeout: 60000,
        attestation: 'direct', // attestationの種類
      };
      setPublicKeyCredentialCreationOptions(options);
    } catch (err) {
      console.error('Error generating registration options:', err);
      setError('Failed to generate registration options.');
    } finally {
      setLoading(false);
    }
  };

  const registerPasskey = async () => {
    if (!publicKeyCredentialCreationOptions) return;

    try {
      setLoading(true);
      setError(null);
      const result = await startRegistration(publicKeyCredentialCreationOptions);
      setRegistrationResult(result);
      // 登録結果をバックエンドに送信するAPIコールをここに実装し、検証を行う
      // 例: await fetch('/api/verify-registration', { method: 'POST', body: JSON.stringify(result) });
      console.log('Registration Result:', result);
      setIsRegistered(true); // 登録成功
    } catch (err: any) {
      console.error('Error during registration:', err);
      if (err.name === 'NotAllowedError') {
        setError('Registration cancelled by user.');
      } else {
        setError(`Registration failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Header />
        <Title order={1}>WebAuthn Signature</Title>

        {error && <Alert color="red">{error}</Alert>}

        {!isRegistered ? (
          !publicKeyCredentialCreationOptions ? (
            <Button onClick={generateRegistrationOptions} loading={loading}>
              Generate Registration Options
            </Button>
          ) : (
            <>
              <Text>Registration options generated. Click below to register passkey.</Text>
              <Button onClick={registerPasskey} loading={loading}>
                Register Passkey
              </Button>
            </>
          )
        ) : (
          !publicKeyCredentialRequestOptions ? (
            <Button onClick={generateAuthenticationOptions} loading={loading}>
              Generate Authentication Options
            </Button>
          ) : (
            <>
              <Text>Authentication options generated. Click below to authenticate with passkey.</Text>
              <Button onClick={authenticate} loading={loading}>
                Authenticate with Passkey
              </Button>
            </>
          )
        )}

        {authenticationResult && (
          <Stack gap="sm">
            <Text>Authentication successful! Result:</Text>
            <Text><Code block>{JSON.stringify(authenticationResult, null, 2)}</Code></Text>
            {/* 署名結果を使ってEIP-7702トランザクションを構築・送信するロジックをここに追加 */}
          </Stack>
        )}

        {registrationResult && (
           <Stack gap="sm">
            <Text>Registration successful! Result:</Text>
            <Text><Code block>{JSON.stringify(registrationResult, null, 2)}</Code></Text>
           </Stack>
        )}

      </Stack>
    </Container>
  );
};

export default WebAuthnPage; 