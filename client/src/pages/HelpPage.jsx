import { Link } from 'react-router-dom';

const helpTopics = [
  {
    icon: 'shopping_cart',
    title: 'Ordering',
    desc: 'How to place, track, and manage your orders.',
    links: [
      { label: 'How do I place an order?', text: 'Browse our shop, add items to your cart, and proceed to checkout. You can pay via credit card, debit card, or PayPal. You\'ll receive an order confirmation email immediately after placing your order.' },
      { label: 'Can I modify my order after placing it?', text: 'You can modify or cancel your order within 1 hour of placement. After that, the order enters processing and cannot be changed. Contact support for urgent changes.' },
      { label: 'How do I track my order?', text: 'Go to My Account > Orders to view real-time tracking. We also send email and SMS updates at each stage: Confirmed, Processing, Shipped, and Delivered.' },
      { label: 'What payment methods do you accept?', text: 'We accept Visa, Mastercard, American Express, Discover, and PayPal. All transactions are encrypted and secure.' },
    ],
  },
  {
    icon: 'local_shipping',
    title: 'Shipping & Delivery',
    desc: 'Shipping options, times, and costs.',
    links: [
      { label: 'What are the shipping options?', text: 'Standard Shipping (5-7 business days): Free on orders over $50. Express Shipping (2-3 business days): $9.99. Next-Day Delivery: $19.99. International shipping available to 50+ countries.' },
      { label: 'Do you offer free shipping?', text: 'Yes! Free standard shipping on all orders over $50 within the continental United States. Express and international shipping rates vary by destination.' },
      { label: 'How do I change my shipping address?', text: 'You can update your shipping address in My Account > Addresses before your order ships. Once shipped, contact support for redirect options.' },
      { label: 'Do you ship internationally?', text: 'Yes, we ship to over 50 countries. International shipping rates and delivery times are calculated at checkout based on your location and chosen shipping method.' },
    ],
  },
  {
    icon: 'autorenew',
    title: 'Returns & Exchanges',
    desc: 'Our return policy and how to initiate a return.',
    links: [
      { label: 'What is your return policy?', text: 'We offer a 30-day return policy on most items. Products must be unused, in original packaging, with tags attached. Sale items are eligible for store credit only.' },
      { label: 'How do I start a return?', text: 'Go to My Account > Orders, select the order, and click "Request Return." Print the prepaid shipping label and drop off the package at any authorized shipping location.' },
      { label: 'When will I receive my refund?', text: 'Refunds are processed within 3-5 business days of receiving the returned item. The credit will appear on your statement within 1-2 billing cycles depending on your bank.' },
      { label: 'Can I exchange an item?', text: 'Yes! Select "Exchange" when initiating your return. We\'ll ship the new item as soon as we confirm the original item is on its way back to us.' },
    ],
  },
  {
    icon: 'person',
    title: 'Account & Profile',
    desc: 'Managing your NovaCart account.',
    links: [
      { label: 'How do I create an account?', text: 'Click "Sign Up" in the top right corner. Enter your email, create a password, and you\'re ready to start shopping. You can also check out as a guest.' },
      { label: 'How do I reset my password?', text: 'Click "Forgot Password" on the login page, enter your email, and follow the secure link sent to your inbox. The link expires after 24 hours.' },
      { label: 'How do I update my profile information?', text: 'Go to My Account > Profile to update your name, email, phone, and addresses. Changes are saved automatically.' },
      { label: 'What are loyalty points?', text: 'Earn 1 point for every $1 spent. Redeem 100 points for $5 off your next order. Points never expire and accumulate across all purchases.' },
    ],
  },
  {
    icon: 'credit_card',
    title: 'Payments & Gift Cards',
    desc: 'Payment options, security, and gift cards.',
    links: [
      { label: 'Is my payment information secure?', text: 'Absolutely. We use industry-standard SSL encryption and PCI-DSS compliant payment processing. We never store your full card number on our servers.' },
      { label: 'Do you offer gift cards?', text: 'Yes! Digital gift cards are available in denominations from $25 to $200. They\'re delivered via email and never expire. Perfect for any occasion.' },
      { label: 'Can I use multiple payment methods?', text: 'Currently, one payment method per order. However, you can combine gift card balance with a credit card for orders exceeding the gift card value.' },
      { label: 'How do promo codes work?', text: 'Enter your promo code at checkout in the "Discount Code" field and click Apply. Only one promo code can be used per order. Some codes have minimum purchase requirements.' },
    ],
  },
  {
    icon: 'help',
    title: 'General FAQ',
    desc: 'Common questions about NovaCart.',
    links: [
      { label: 'How do I contact customer support?', text: 'Reach us via live chat (bottom right corner), email at support@novacart.com, or call 1-800-NOVA-CART (1-800-668-2278). Our team is available Mon-Fri 9AM-6PM EST.' },
      { label: 'Do you have a size guide?', text: 'Yes! Each product page includes a detailed size guide. For clothing, we provide measurements in both inches and centimeters. Our fit recommendation tool helps you find your perfect size.' },
      { label: 'Is NovaCart eco-friendly?', text: 'We\'re committed to sustainability. We use recycled packaging, offset 100% of shipping carbon emissions, and partner with eco-conscious brands. Our goal is zero-waste operations by 2030.' },
      { label: 'How do I unsubscribe from emails?', text: 'Click "Unsubscribe" at the bottom of any marketing email. Transactional emails (order confirmations, shipping updates) will still be sent as they\'re essential to your orders.' },
    ],
  },
];

const HelpPage = () => {
  return (
    <main className="flex-1 w-full px-4 md:px-8 lg:px-16 py-10 max-w-7xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-12">
        <span className="material-symbols-outlined text-5xl text-primary mb-4 block">help</span>
        <h1 className="text-3xl md:text-4xl font-bold text-on-surface mb-3">Help Center</h1>
        <p className="text-on-surface-variant max-w-xl mx-auto leading-relaxed">
          Find answers to common questions about ordering, shipping, returns, and your account.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link to="/support" className="btn-primary px-6 py-2.5 rounded-lg text-sm font-medium">
            Contact Support
          </Link>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-12">
        {helpTopics.map((topic) => (
          <a
            key={topic.title}
            href={`#${topic.title.toLowerCase().replace(/[^a-z]/g, '-')}`}
            className="flex flex-col items-center gap-2 p-4 bg-surface-container-lowest rounded-xl border border-surface-container/60 hover:border-primary/40 hover:shadow-sm transition-all text-center"
          >
            <span className="material-symbols-outlined text-2xl text-primary">{topic.icon}</span>
            <span className="text-sm font-medium text-on-surface">{topic.title}</span>
          </a>
        ))}
      </div>

      {/* Topics */}
      <div className="space-y-12">
        {helpTopics.map((topic) => (
          <section key={topic.title} id={topic.title.toLowerCase().replace(/[^a-z]/g, '-')} className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-2xl text-primary">{topic.icon}</span>
              <h2 className="text-xl font-bold text-on-surface">{topic.title}</h2>
            </div>
            <p className="text-sm text-on-surface-variant mb-4 ml-10">{topic.desc}</p>
            <div className="space-y-3 ml-10">
              {topic.links.map((item) => (
                <details key={item.label} className="group bg-surface-container-lowest rounded-xl border border-surface-container/60 overflow-hidden">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer select-none hover:bg-surface-container/30 transition-colors">
                    <span className="text-sm font-medium text-on-surface pr-4">{item.label}</span>
                    <span className="material-symbols-outlined text-lg text-on-surface-variant group-open:rotate-180 transition-transform">expand_more</span>
                  </summary>
                  <div className="px-5 pb-4 text-sm text-on-surface-variant leading-relaxed border-t border-surface-container/60 pt-3">
                    {item.text}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Still Need Help */}
      <div className="mt-16 text-center bg-surface-container-lowest rounded-2xl border border-surface-container/60 p-10">
        <span className="material-symbols-outlined text-4xl text-primary mb-3 block">support_agent</span>
        <h2 className="text-2xl font-bold text-on-surface mb-2">Still Need Help?</h2>
        <p className="text-sm text-on-surface-variant mb-6 max-w-md mx-auto">
          Our customer support team is available Monday through Friday, 9 AM to 6 PM EST.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link to="/support" className="btn-primary px-6 py-2.5 rounded-lg text-sm font-medium">
            Live Chat
          </Link>
          <a href="mailto:support@novacart.com" className="px-6 py-2.5 rounded-lg text-sm font-medium border border-surface-container text-on-surface hover:bg-surface-container/40 transition-colors">
            Email Us
          </a>
          <a href="tel:18006682278" className="px-6 py-2.5 rounded-lg text-sm font-medium border border-surface-container text-on-surface hover:bg-surface-container/40 transition-colors">
            1-800-NOVA-CART
          </a>
        </div>
      </div>
    </main>
  );
};

export default HelpPage;
