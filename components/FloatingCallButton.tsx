// Phone number for the floating call button (set NEXT_PUBLIC_CALL_NUMBER in .env).
const CALL_NUMBER = (process.env.NEXT_PUBLIC_CALL_NUMBER || '0489990844').replace(/\s+/g, '');

export default function FloatingCallButton() {
  return (
    <a href={`tel:${CALL_NUMBER}`} className="floating-call" aria-label="Call us" title="Call us">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
      </svg>
    </a>
  );
}
