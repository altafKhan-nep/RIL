const sections = [
  {
    title: 'Information We Collect',
    content: `When you visit NovaCart, we collect certain information about your device, your interaction with our site, and information necessary to process your purchases. We may also collect additional information if you contact us for customer support.

**Personal Information We Collect:**
- Name, email address, phone number, and shipping/billing address
- Payment information (credit card number, billing address) — processed securely via our payment providers; we never store full card numbers
- Account credentials (email and hashed password)

**Device and Usage Information:**
- IP address, browser type, operating system
- Pages viewed, time spent on pages, navigation patterns
- Referring website or search engine

**Information from Third Parties:**
- Payment processors (Stripe, PayPal) for transaction verification
- Shipping carriers for delivery tracking
- Analytics providers for site improvement`,
  },
  {
    title: 'How We Use Your Information',
    content: `We use the information we collect to:

- **Process transactions:** Fulfill orders, process payments, and send order confirmations and updates
- **Improve our services:** Analyze usage patterns to enhance site functionality and user experience
- **Customer support:** Respond to your inquiries, resolve issues, and provide assistance
- **Marketing communications:** Send promotional emails and newsletters (only with your consent; unsubscribe anytime)
- **Security:** Detect and prevent fraud, unauthorized access, and other malicious activity
- **Legal compliance:** Meet legal obligations and enforce our terms of service`,
  },
  {
    title: 'Information Sharing',
    content: `We do not sell your personal information. We share information only as necessary to operate our business:

- **Payment processors:** Stripe and PayPal to securely process transactions
- **Shipping carriers:** USPS, UPS, FedEx, and DHL to deliver your orders
- **Analytics:** Google Analytics to understand site usage (anonymized data)
- **Cloud hosting:** Our data is hosted on secure, encrypted servers
- **Legal requirements:** When required by law, subpoena, or to protect our rights

All third-party service providers are contractually obligated to protect your data and use it only for the services they provide to us.`,
  },
  {
    title: 'Cookies and Tracking',
    content: `We use cookies and similar technologies to:

- **Essential cookies:** Enable core site functionality (cart, authentication, checkout)
- **Analytics cookies:** Help us understand how visitors interact with our site
- **Marketing cookies:** Deliver relevant advertisements and measure campaign effectiveness

You can manage cookie preferences through your browser settings. Disabling essential cookies may impair site functionality.

We use Google Analytics for anonymized traffic analysis. You can opt out via the [Google Analytics Opt-Out Browser Add-on](https://tools.google.com/dlpage/gaoptout).`,
  },
  {
    title: 'Data Security',
    content: `We implement industry-standard security measures to protect your information:

- SSL/TLS encryption for all data in transit
- PCI-DSS compliant payment processing
- Encrypted data storage at rest
- Regular security audits and vulnerability assessments
- Access controls and authentication for internal systems

While we take every reasonable precaution, no method of transmission or storage is 100% secure. We cannot guarantee absolute security but will promptly notify affected users in the event of a data breach.`,
  },
  {
    title: 'Your Rights',
    content: `You have the right to:

- **Access** your personal data and receive a copy
- **Correct** inaccurate or incomplete information
- **Delete** your account and associated data (subject to legal retention requirements)
- **Opt out** of marketing communications at any time
- **Restrict** processing of your personal data
- **Data portability:** Receive your data in a structured, machine-readable format

To exercise any of these rights, contact us at privacy@novacart.com. We will respond to your request within 30 days.`,
  },
  {
    title: 'Data Retention',
    content: `We retain your personal information only as long as necessary to provide our services and fulfill the purposes described in this policy:

- **Account data:** Retained while your account is active, deleted within 90 days of account closure
- **Order data:** Retained for 7 years for tax and legal compliance
- **Marketing data:** Until you unsubscribe or request deletion
- **Analytics data:** Anonymized after 26 months`,
  },
  {
    title: 'Children\'s Privacy',
    content: `NovaCart is not intended for individuals under the age of 13. We do not knowingly collect personal information from children. If we become aware that we have collected data from a child under 13, we will take steps to delete it promptly.

If you are a parent or guardian and believe your child has provided us with personal information, please contact us at privacy@novacart.com.`,
  },
  {
    title: 'International Users',
    content: `NovaCart is operated from the United States. If you are accessing our services from outside the US, please be aware that your information may be transferred to, stored, and processed in the US where our servers are located.

By using our services, you consent to the transfer of your information to the US and the application of US law governing the use and disclosure of your information.`,
  },
  {
    title: 'Changes to This Policy',
    content: `We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will notify you of material changes by posting the updated policy on this page and updating the "Last Updated" date.

We encourage you to review this policy periodically. Continued use of our services after changes constitutes acceptance of the updated policy.`,
  },
  {
    title: 'Contact Us',
    content: `If you have any questions about this Privacy Policy or our data practices, please contact us:

**Email:** privacy@novacart.com
**Mail:** NovaCart Privacy Team, 250 Brannan Street, Suite 500, San Francisco, CA 94107
**Phone:** 1-800-NOVA-CART (1-800-668-2278)`,
  },
];

const PrivacyPage = () => {
  return (
    <main className="flex-1 w-full px-4 md:px-8 lg:px-16 py-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <span className="material-symbols-outlined text-5xl text-primary mb-4 block">policy</span>
        <h1 className="text-3xl md:text-4xl font-bold text-on-surface mb-3">Privacy Policy</h1>
        <p className="text-sm text-on-surface-variant">
          Last Updated: September 8, 2026
        </p>
        <p className="text-on-surface-variant max-w-2xl mx-auto leading-relaxed mt-4">
          At NovaCart, your privacy is fundamental to us. This policy explains how we collect, use, and protect your personal information when you use our website and services.
        </p>
      </div>

      {/* Table of Contents */}
      <nav className="bg-surface-container-lowest rounded-xl border border-surface-container/60 p-6 mb-10">
        <h2 className="text-sm font-bold text-on-surface mb-3 uppercase tracking-wide">Table of Contents</h2>
        <ol className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 list-decimal list-inside">
          {sections.map((s) => (
            <li key={s.title}>
              <a href={`#${s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="text-sm text-on-surface-variant hover:text-primary transition-colors">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* Sections */}
      <div className="space-y-10">
        {sections.map((section, i) => (
          <section key={section.title} id={section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')} className="scroll-mt-24">
            <h2 className="text-lg font-bold text-on-surface mb-3">{i + 1}. {section.title}</h2>
            <div className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">
              {section.content.split('\n').map((line, j) => {
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <p key={j} className="font-semibold text-on-surface mt-3 mb-1">{line.replace(/\*\*/g, '')}</p>;
                }
                if (line.startsWith('- **')) {
                  const parts = line.replace(/^- /, '').split('**');
                  return (
                    <p key={j} className="ml-4 mb-1">
                      <span className="font-semibold text-on-surface">{parts[1]}</span>
                      {parts[2]}
                    </p>
                  );
                }
                if (line.startsWith('- ')) {
                  return <p key={j} className="ml-4 mb-1">{line}</p>;
                }
                if (line.trim() === '') return <br key={j} />;
                return <p key={j} className="mb-1">{line}</p>;
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Footer Note */}
      <div className="mt-12 bg-surface-container-lowest rounded-xl border border-surface-container/60 p-6 text-center">
        <p className="text-sm text-on-surface-variant">
          If you have any questions about this policy, please{' '}
          <a href="mailto:privacy@novacart.com" className="text-primary hover:underline">contact our privacy team</a>.
        </p>
      </div>
    </main>
  );
};

export default PrivacyPage;
