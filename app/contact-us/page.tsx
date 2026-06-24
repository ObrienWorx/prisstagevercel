import SiteLayout from '@/components/SiteLayout';
import LeadCaptureForm from '@/components/LeadCaptureForm';

export const metadata = {
  title: 'Contact Us | Pristine Gaze',
  description: 'Get in touch with the Pristine Gaze team. We\'d love to hear from you.',
};

export default function ContactUsPage() {
  return (
    <SiteLayout>
      <div className="cu-hero">
        <div className="cu-hero-overlay" />
        <div className="container cu-hero-inner">
          <h1 className="cu-hero-title">Contact Us</h1>
          <p className="cu-hero-sub">We&apos;d love to hear from you. Reach out to our team anytime.</p>
        </div>
      </div>

      <div className="cu-body">
        <div className="container">
          <div className="row g-5">

            <div className="col-lg-7">
              <h2 className="cu-section-title">Get in Touch</h2>
              <p className="cu-section-sub">
                Our team is here to help you navigate your investment journey with unbiased research and expert analysis.
              </p>

              <div className="cu-info-grid">
                <div className="cu-info-card">
                  <div className="cu-info-icon">📞</div>
                  <div>
                    <div className="cu-info-label">Phone</div>
                    <a href="tel:0489990844" className="cu-info-value">0489 990 844</a>
                  </div>
                </div>
                <div className="cu-info-card">
                  <div className="cu-info-icon">✉️</div>
                  <div>
                    <div className="cu-info-label">Email</div>
                    <a href="mailto:info@pristinegaze.com.au" className="cu-info-value">
                      info@pristinegaze.com.au
                    </a>
                  </div>
                </div>
                <div className="cu-info-card">
                  <div className="cu-info-icon">🏢</div>
                  <div>
                    <div className="cu-info-label">Headquarters</div>
                    <div className="cu-info-value">
                      Ground Floor/470 St Kilda Rd<br />
                      Melbourne VIC 3004
                    </div>
                  </div>
                </div>
                <div className="cu-info-card">
                  <div className="cu-info-icon">📍</div>
                  <div>
                    <div className="cu-info-label">Registered Office</div>
                    <div className="cu-info-value">
                      6 Hunt Club Rd Narre Warren South<br />
                      VIC 3805
                    </div>
                  </div>
                </div>
              </div>

              <div className="cu-map-wrap">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3151.835434509111!2d144.97731531531987!3d-37.8562514797512!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6ad66862f4e12cff%3A0x4f7db3f0e30a3e9d!2s470%20St%20Kilda%20Rd%2C%20Melbourne%20VIC%203004%2C%20Australia!5e0!3m2!1sen!2sau!4v1680000000000!5m2!1sen!2sau"
                  className="cu-map"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>

            <div className="col-lg-5">
              <LeadCaptureForm source="contact-us" badge='' title='Get In Touch With Us' buttonText='Submit' />
            </div>

          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
