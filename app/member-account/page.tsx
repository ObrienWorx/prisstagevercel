'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import SiteLayout from '@/components/SiteLayout';
import SubscriberLoginForm from '@/components/SubscriberLoginForm';

function LoginFormPageContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan');
  const resetSuccess = searchParams.get('reset') === '1';

  return <SubscriberLoginForm plan={plan} resetSuccess={resetSuccess} />;
}

export default function SubscriberLoginPage() {
  return (
    <SiteLayout>
      <div className="auth-section">
        <Suspense fallback={<div className="auth-card text-center auth-countdown">Loading...</div>}>
          <LoginFormPageContent />
        </Suspense>
      </div>
    </SiteLayout>
  );
}
