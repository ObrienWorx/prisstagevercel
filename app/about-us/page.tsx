import SiteLayout from '@/components/SiteLayout';
import Link from 'next/link';

export const metadata = {
  title: 'About Us | Pristine Gaze',
  description: 'Learn about Pristine Gaze equity research, client service, and stock analysis methodology.',
};

export default function AboutUsPage() {
  return (
    <SiteLayout>
      <div className="about-page">
        <section className="about-intro">
          <div className="container about-shell">
            <div className="about-intro-grid">
              <div className="about-intro-copy">
                <h1>About us</h1>
                <p>
                  At Pristine Gaze, we offer Independent Equity Research through technology-powered, in-depth analysis and insights on a range of listed stocks, enabling investors to make informed decisions about Buy, Sell, or Hold positions. Our primary goal is to provide general investment ideas to clients, helping them navigate and succeed in complex financial markets.
                </p>
                <p>
                  Our stock picks are driven by Value, Growth, and Hybrid Investment Strategies, with a strong emphasis on the Value Investing Principle advocated by the renowned American Economist Benjamin Graham, focusing on ensuring a sufficient &apos;Margin of Safety&apos; for Investors.
                </p>
                <div className="about-intro-actions">
                  <Link href="/subscribe" className="about-button about-button-strong">Start your free Trial</Link>
                  <Link href="/reports" className="about-button">Get Sample Report</Link>
                </div>
                <div className="about-proof">
                  <div className="about-proof-lock">7-Days Free Trial, no credit card required</div>
                  <div className="about-proof-check">Trusted by 10K+ Investors</div>
                </div>
              </div>
              <div
                className="about-crop about-market-crop"
                role="img"
                aria-label="Bull and bear stock market illustration"
              />
            </div>
          </div>
        </section>

        <section className="about-reasons">
          <div className="container about-shell">
            <h2>Why Choose Pristine Gaze?</h2>
            <div className="about-reason-grid">
              <div className="about-reason-card">
                <h3>Expertise and Innovation</h3>
                <p>Our team comprises seasoned analysts with extensive experience in the Australian, US and Canadian markets. With a strong foundation in financial regulations and research techniques, we provide insights that meet the highest standards.</p>
              </div>
              <div className="about-reason-card">
                <h3>Client-Centric Service</h3>
                <p>Our research is available via an intuitive web and mobile platform, designed for ease of access and personalized user experience. Whether you&apos;re a long-term investor or exploring short-term gains, Pristine Gaze&apos;s recommendations can help guide your investment choices effectively.</p>
              </div>
              <div className="about-reason-card">
                <h3>Data-Driven Insights</h3>
                <p>Leveraging the latest in data science, we offer our clients a seamless research experience on our proprietary platform, where data-driven insights support informed, independent decision-making.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="about-methodology">
          <div className="container about-shell">
            <div className="about-methodology-grid">
              <div
                className="about-crop about-analysis-crop"
                role="img"
                aria-label="Investor reviewing stock charts on a tablet"
              />
              <div className="about-methodology-copy">
                <h2>Our Stock Analysis Methodology</h2>
                <p>While Pristine Gaze&apos;s research is primarily geared towards identifying long-term investment opportunities, we recognize the value of seizing short-term profit potentials when appropriate. Our analysis method is designed to highlight stocks that have reached their full potential or present temporary retracements, providing investors with options to capitalize on these moments.</p>
                <p>With a focus on quality data and well-structured research, we aim to guide our clients in making strategic decisions that align with their financial goals.</p>
                <Link href="/contact-us" className="about-button about-contact-button">Get in touch with our expert</Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
