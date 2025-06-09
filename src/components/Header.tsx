import React from 'react';
import { Box, Title, Text, Tabs, rem } from '@mantine/core';
import { IconHome, IconBrandMeta, IconFingerprint } from '@tabler/icons-react';
import { useRouter, usePathname } from 'next/navigation';

export const Header = () => {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <>
      <Box ta="center">
        <Title order={1} size="h1" variant="gradient">
          EIP-7702 Transaction Sender
        </Title>
        <Text size="lg" color="dimmed" mt="xs">
          Send Account Abstraction transactions with temporary code delegation
        </Text>
      </Box>

      <Tabs
        defaultValue={pathname === '/webauthn' ? 'webauthn' : pathname === '/metamask' ? 'metamask' : 'home'}
        onChange={(value) => {
          if (value === 'home') {
            router.push('/');
          } else if (value === 'metamask') {
            router.push('/metamask');
          } else if (value === 'webauthn') {
            router.push('/webauthn');
          }
        }}
      >
        <Tabs.List>
          <Tabs.Tab value="home" leftSection={<IconHome style={{ width: rem(16), height: rem(16) }} />}>
            Home
          </Tabs.Tab>
          <Tabs.Tab value="metamask" leftSection={<IconBrandMeta style={{ width: rem(16), height: rem(16) }} />}>
            MetaMask
          </Tabs.Tab>
          <Tabs.Tab value="webauthn" leftSection={<IconFingerprint style={{ width: rem(16), height: rem(16) }} />}>
            WebAuthn
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>
    </>
  );
}; 