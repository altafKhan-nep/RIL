const sections = [
  {
    title: 'Acceptance of Terms',
    content: `By accessing or using NovaCart ("the Site"), you agree to be bound by these Terms of Service. If you do not agree to all of these terms, you may not use our services. We reserve the right to modify these terms at any time, and continued use of the Site constitutes acceptance of any changes.`,
  },
  {
    title: 'Account Registration',
    content: `To access certain features, you must create an account. You agree to:

- Provide accurate, current, and complete information during registration
- Maintain the security of your password and account credentials
- Promptly update your account information if it changes
- Accept responsibility for all activities that occur under your account
- Notify us immediately of any unauthorized use of your account

You must be at least 13 years old to create an account. One account per person; duplicate accounts may be suspended.`,
  },
  {
    title: 'Products and Pricing',
    content: `**Product Descriptions:** We strive to provide accurate descriptions and images of our products. However, colors may appear differently on your screen, and we do not warrant that descriptions are error-free.

**Pricing:** All prices are displayed in US Dollars. We reserve the right to change prices at any time without notice. If a product is listed at an incorrect price, we may cancel the order and notify you.

**Availability:** Products are subject to availability. We reserve the right to discontinue any product at any time. If an item you ordered is out of stock, we will notify you and offer a substitute or full refund.

**Promotions:** Promotional offers cannot be combined unless explicitly stated. Promo codes have expiration dates and may have minimum purchase requirements.`,
  },
  {
    title: 'Orders and Payment',
    content: `**Order Acceptance:** Your order constitutes an offer to purchase. We reserve the right to accept or decline any order for any reason, including product unavailability, pricing errors, or suspected fraud.

**Payment:** You agree to pay all charges incurred under your account, including applicable taxes, shipping, and handling fees. Payment must be received before order processing.

**Order Cancellation:** You may cancel your order within 1 hour of placement. After that, the order enters processing and cannot be cancelled through the website. Contact customer support for assistance.

**Fraud Prevention:** We employ fraud detection systems. Orders flagged as potentially fraudulent may be delayed or cancelled. Providing false information may result in account suspension.`,
  },
  {
    title: 'Shipping and Delivery',
    content: `**Shipping Methods:** We offer Standard, Express, and Next-Day shipping within the continental US. International shipping is available to select countries.

**Delivery Times:** Estimated delivery times are provided at checkout and are not guaranteed. Delays may occur due to carrier issues, weather, or other circumstances beyond our control.

**Risk of Loss:** All items purchased from NovaCart are shipped pursuant to a shipment contract. The risk of loss and title for items pass to you upon delivery to the carrier.

**Shipping Address:** You are responsible for providing an accurate shipping address. We are not responsible for orders delivered to incorrect addresses provided by the customer.`,
  },
  {
    title: 'Returns and Refunds',
    content: `**Return Policy:** We accept returns within 30 days of delivery for most items in their original, unused condition with tags attached.

**How to Return:** Initiate a return through My Account > Orders. Print the prepaid shipping label and drop off the package at an authorized location.

**Refunds:** Refunds are processed within 3-5 business days of receiving the returned item. The credit will appear on your statement within 1-2 billing cycles.

**Non-Returnable Items:** Personalized or custom-made items, clearance items marked as "final sale," and intimate apparel are not eligible for return unless defective.

**Exchanges:** We offer exchanges for different sizes or colors. Select "Exchange" when initiating your return.`,
  },
  {
    title: 'Intellectual Property',
    content: `All content on NovaCart — including text, graphics, logos, images, software, and design — is the property of NovaCart or its licensors and is protected by United States and international copyright, trademark, and intellectual property laws.

You may not:
- Reproduce, distribute, or create derivative works from our content
- Use our trademarks, logos, or branding without written permission
- Scrape, crawl, or use automated tools to extract content from the Site
- Use our content for commercial purposes without authorization

Product images and descriptions are used for illustrative purposes. Actual products may vary.`,
  },
  {
    title: 'User Conduct',
    content: `You agree not to:

- Use the Site for any unlawful purpose or in violation of any applicable law
- Impersonate another person or entity
- Attempt to gain unauthorized access to other accounts, systems, or networks
- Interfere with or disrupt the Site or servers
- Upload viruses, malware, or other harmful code
- Collect or harvest personal information of other users
- Use the Site to send spam, chain letters, or other unsolicited communications
- Engage in any activity that could damage, disable, or impair the Site

We reserve the right to suspend or terminate accounts that violate these terms.`,
  },
  {
    title: 'Limitation of Liability',
    content: `To the maximum extent permitted by law:

- NovaCart shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Site or products
- Our total liability shall not exceed the amount you paid for the specific product or service giving rise to the claim
- We are not liable for damages caused by third-party services, shipping carriers, or events beyond our reasonable control
- We do not warrant that the Site will be uninterrupted, error-free, or secure

Some jurisdictions do not allow limitation of liability, so the above limitations may not apply to you.`,
  },
  {
    title: 'Indemnification',
    content: `You agree to indemnify, defend, and hold harmless NovaCart, its officers, directors, employees, agents, and affiliates from and against any claims, liabilities, damages, losses, costs, or expenses (including reasonable attorneys' fees) arising from:

- Your use of the Site or services
- Your violation of these Terms of Service
- Your violation of any applicable law or third-party rights
- Any content you submit, post, or transmit through the Site`,
  },
  {
    title: 'Governing Law',
    content: `These Terms of Service are governed by and construed in accordance with the laws of the State of California, United States, without regard to conflict of law principles.

Any disputes arising from these terms or your use of the Site shall be resolved in the state or federal courts located in San Francisco County, California, and you consent to the personal jurisdiction of such courts.`,
  },
  {
    title: 'Dispute Resolution',
    content: `**Informal Resolution:** Before filing a formal claim, you agree to contact us at legal@novacart.com and attempt to resolve the dispute informally for at least 30 days.

**Arbitration:** Any dispute not resolved informally shall be resolved through binding arbitration administered by the American Arbitration Association (AAA) under its Commercial Arbitration Rules.

**Class Action Waiver:** You agree to resolve disputes with NovaCart on an individual basis and waive any right to participate in class actions, class arbitrations, or representative proceedings.`,
  },
  {
    title: 'Severability',
    content: `If any provision of these Terms of Service is found to be invalid, illegal, or unenforceable, the remaining provisions shall continue in full force and effect. The invalid provision shall be modified to the minimum extent necessary to make it valid and enforceable while preserving its original intent.`,
  },
  {
    title: 'Entire Agreement',
    content: `These Terms of Service, together with our Privacy Policy and any other legal notices published on the Site, constitute the entire agreement between you and NovaCart regarding your use of the Site and services.

Our failure to enforce any provision of these terms does not constitute a waiver of that provision or any other provision.`,
  },
  {
    title: 'Contact Information',
    content: `For questions about these Terms of Service, please contact us:

**Email:** legal@novacart.com
**Mail:** NovaCart Legal Department, 250 Brannan Street, Suite 500, San Francisco, CA 94107
**Phone:** 1-800-NOVA-CART (1-800-668-2278)`,
  },
];

const TermsPage = () => {
  return (
    <main className="flex-1 w-full px-4 md:px-8 lg:px-16 py-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <span className="material-symbols-outlined text-5xl text-primary mb-4 block">gavel</span>
        <h1 className="text-3xl md:text-4xl font-bold text-on-surface mb-3">Terms of Service</h1>
        <p className="text-sm text-on-surface-variant">
          Last Updated: September 8, 2026
        </p>
        <p className="text-on-surface-variant max-w-2xl mx-auto leading-relaxed mt-4">
          These Terms of Service govern your use of NovaCart's website and services. Please read them carefully before using our platform.
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
          By using NovaCart, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
        </p>
      </div>
    </main>
  );
};

export default TermsPage;
