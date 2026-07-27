'use client';

import { useState, useEffect } from 'react';
import SubscriberLoginForm from '@/components/SubscriberLoginForm';
import SubscriberRegisterForm from '@/components/SubscriberRegisterForm';

type Props = {
  show: boolean;
  onClose: () => void;
  defaultTab?: 'register' | 'login';
  redirectPath?: string;
  plan?: string | null;
};

export default function AuthModal({ show, onClose, defaultTab = 'register', redirectPath, plan }: Props) {
  const [tab, setTab] = useState<'register' | 'login'>(defaultTab);

  useEffect(() => { setTab(defaultTab); }, [defaultTab]);

  if (!show) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(10,15,30,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ position: 'relative', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 12, right: 12, zIndex: 3, background: '#fff', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 18, lineHeight: '32px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
          aria-label="Close"
        >×</button>

        {tab === 'register' ? (
          <SubscriberRegisterForm plan={plan} onSwitchToLogin={() => setTab('login')} />
        ) : (
          <SubscriberLoginForm redirectPath={redirectPath} onSwitchToRegister={() => setTab('register')} />
        )}
      </div>
    </div>
  );
}
