import Image from 'next/image';

const JOIN_URL =
  process.env.NEXT_PUBLIC_WHATSAPP_URL ||
  (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
    ? `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER.replace(/[^\d]/g, '')}`
    : 'https://wa.me/');

function WhatsAppIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 32 32" fill="#25D366" aria-hidden="true">
      <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035.888 2.722.888.817 0 2.15-.515 2.478-1.318.13-.33.244-.73.244-1.088 0-.058 0-.144-.03-.215-.1-.172-2.434-1.39-2.68-1.39zm-2.582 6.55h-.014c-1.706 0-3.382-.46-4.84-1.318l-.345-.205-3.59.945.957-3.504-.23-.36a9.495 9.495 0 0 1-1.451-5.04c0-5.263 4.282-9.545 9.545-9.545 2.55 0 4.942.994 6.743 2.795a9.477 9.477 0 0 1 2.797 6.75c0 5.264-4.283 9.546-9.546 9.546zm8.12-17.665A11.434 11.434 0 0 0 16.527 2.7C10.214 2.7 5.072 7.84 5.07 14.156a11.42 11.42 0 0 0 1.526 5.713L4.96 25.83l6.105-1.602a11.44 11.44 0 0 0 5.462 1.39h.005c6.313 0 11.455-5.14 11.458-11.457a11.39 11.39 0 0 0-3.34-8.07z" />
    </svg>
  );
}

export default function WhatsAppCta() {
  return (
    <section className="container" style={{ marginBottom: '3rem' }}>
      <div className="wa-cta">
        <div className="wa-cta-left">
          <span className="wa-cta-icon"><WhatsAppIcon /></span>
          <div>
            <h3 className="wa-cta-title">Get your top 5 ASX stock picks on WhatsApp</h3>
            <p className="wa-cta-sub">
              Chat with Our ASX research specialist about the stock market, research, memberships, investor resources, <em><strong>literally ANYTHING!</strong></em>
            </p>
            <p className="wa-cta-sub" style={{ marginTop: '0.25rem' }}>
              Simply scan the QR code or click the button to connect.
            </p>
          </div>
        </div>

        <div className="wa-cta-right">
          <Image
            src="/whatsapp.jpeg"
            alt="WhatsApp QR code"
            width={90}
            height={90}
            className="wa-cta-qr"
          />
          <span className="wa-cta-or">OR</span>
          <a
            href={JOIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="wa-cta-btn"
          >
            Connect on WhatsApp &#xFEFF;----&gt;
          </a>
        </div>
      </div>
    </section>
  );
}
