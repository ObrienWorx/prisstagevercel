'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import SiteLayout from '@/components/SiteLayout';
import SubscriberRegisterForm from '@/components/SubscriberRegisterForm';

function RegisterFormPageContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan');
  return <SubscriberRegisterForm plan={plan} />;
}

export default function SubscriberRegisterPage() {
  return (
    <SiteLayout>
      <div className="auth-section">
        <Suspense fallback={<div className="auth-card text-center auth-countdown">Loading...</div>}>
          <RegisterFormPageContent />
        </Suspense>
      </div>
    </SiteLayout>
  );
}
