'use client';

import { TabItem, Tabs } from '@worldcoin/mini-apps-ui-kit-react';
import { Home, List, Plus, User } from 'iconoir-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Bottom navigation for the Substrate mini app
 * 4 tabs: Home, Create, Registry, Profile
 */

const tabs = [
  { value: 'home', icon: <Home />, label: 'Home', path: '/home' },
  { value: 'create', icon: <Plus />, label: 'Create', path: '/create' },
  { value: 'registry', icon: <List />, label: 'Registry', path: '/registry' },
  { value: 'profile', icon: <User />, label: 'Profile', path: '/profile' },
];

export const Navigation = () => {
  const pathname = usePathname();
  const router = useRouter();

  // Determine initial tab from pathname
  const getTabFromPath = (path: string) => {
    const tab = tabs.find((t) => path.startsWith(t.path));
    return tab?.value || 'home';
  };

  const [value, setValue] = useState(getTabFromPath(pathname));

  useEffect(() => {
    setValue(getTabFromPath(pathname));
  }, [pathname]);

  const handleTabChange = (newValue: string) => {
    setValue(newValue);
    const tab = tabs.find((t) => t.value === newValue);
    if (tab) {
      router.push(tab.path);
    }
  };

  return (
    <Tabs value={value} onValueChange={handleTabChange}>
      {tabs.map((tab) => (
        <TabItem
          key={tab.value}
          value={tab.value}
          icon={tab.icon}
          label={tab.label}
        />
      ))}
    </Tabs>
  );
};
