'use client';

import { Button } from '@worldcoin/mini-apps-ui-kit-react';
import { LogOut } from 'iconoir-react';
import { signOut } from 'next-auth/react';

export function SignOutButton() {
  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <Button
      onClick={handleSignOut}
      variant="tertiary"
      className="w-full text-red-600"
    >
      <LogOut className="w-5 h-5 mr-2" />
      Sign Out
    </Button>
  );
}
