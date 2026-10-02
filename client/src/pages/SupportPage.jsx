import { useState } from 'react';
import { Link } from 'react-router-dom';

const faqs = [
  { q: 'How do I track my order?', a: 'Go to My Account > Orders to view real-time tracking for all your orders. You\'ll also receive email and SMS updates at each stage.' },
  { q: 'What is your return policy?', a: 'We offer a 30-day return policy on most items. Products must be unused, in original packaging, with tags attached.' },
  { q: 'How do I contact support?', a: 'You can reach us via live chat, email at support@novacart.com, or call 1-800-NOVA-CART (1-800-668-2278).' },
  { q: 'Do you offer free shipping?', a: 'Yes! Free standard shipping on all orders over $50 within the continental United States.' },
  { q: 'How do I reset my password?', a: 'Click "Forgot Password" on the login page, enter your email, and follow the secure link sent to your inbox.' },
  { q: 'Can I cancel my order?', a: 'You can cancel within 1 hour of placing your order. After that, contact support for assistance.' },
];

const SupportPage = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <main className="flex-1 w-full px-4 md:px-8 lg:px-16 py-10 max-w-7xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-12">
        <span className="material-symbols-outlined text-5xl text-primary mb-4 block">support_agent</span>
        <h1 className="text-3xl md:text-4xl font-bold text-on-surface mb-3">Contact Support</h1>
        <p className="text-on-surface-variant max-w-xl mx-auto leading-relaxed">
          We're here to help. Reach out to our team and we'll get back to you within 24 hours.
        </p>
      </div>

      {/* Contact Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        {[
          { icon: 'chat', title: 'Live Chat', desc: 'Chat with our support team in real-time', detail: 'Mon-Fri 9AM-6PM EST', action: 'Start Chat' },
          { icon: 'mail', title: 'Email', desc: 'Send us a detailed message', detail: 'support@novacart.com', action: 'Send Email' },
          { icon: 'call', title: 'Phone', desc: 'Speak directly with our team', detail: '1-800-NOVA-CART', action: 'Call Now' },
        ].map((option) => (
          <div key={option.title} className="bg-surface-container-lowest rounded-xl border border-surface-container/60 p-6 text-center hover:border-primary/40 hover:shadow-sm transition-all">
            <span className="material-symbols-outlined text-3xl text-primary mb-3 block">{option.icon}</span>
            <h3 className="text-lg font-bold text-on-surface mb-1">{option.title}</h3>
            <p className="text-sm text-on-surface-variant mb-2">{option.desc}</p>
            <p className="text-sm font-medium text-primary mb-4">{option.detail}</p>
            {option.title === 'Email' ? (
              <a href="mailto:support@novacart.com" className="inline-block px-5 py-2 rounded-lg text-sm font-medium border border-surface-container text-on-surface hover:bg-surface-container/40 transition-colors">
                {option.action}
              </a>
            ) : option.title === 'Phone' ? (
              <a href="tel:18006682278" className="inline-block px-5 py-2 rounded-lg text-sm font-medium border border-surface-container text-on-surface hover:bg-surface-container/40 transition-colors">
                {option.action}
              </a>
            ) : (
              <Link to="/support" className="inline-block px-5 py-2 rounded-lg text-sm font-medium btn-primary">
                {option.action}
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Contact Form */}
        <div>
          <h2 className="text-xl font-bold text-on-surface mb-5">Send Us a Message</h2>
          {submitted ? (
            <div className="bg-surface-container-lowest rounded-xl border border-surface-container/60 p-8 text-center">
              <span className="material-symbols-outlined text-5xl text-green-500 mb-4 block">check_circle</span>
              <h3 className="text-xl font-bold text-on-surface mb-2">Message Sent!</h3>
              <p className="text-sm text-on-surface-variant mb-6">
                Thank you for reaching out. Our team will review your message and get back to you within 24 hours.
              </p>
              <button onClick={() => { setSubmitted(false); setForm({ name: '', email: '', subject: '', message: '' }); }} className="btn-primary px-6 py-2.5 rounded-lg text-sm font-medium">
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-surface-container-lowest border border-surface-container/60 rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-surface-container-lowest border border-surface-container/60 rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5">Subject</label>
                <select
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full px-4 py-2.5 bg-surface-container-lowest border border-surface-container/60 rounded-lg text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                >
                  <option value="">Select a topic</option>
                  <option value="order">Order Issue</option>
                  <option value="return">Return / Exchange</option>
                  <option value="shipping">Shipping Question</option>
                  <option value="payment">Payment Problem</option>
                  <option value="account">Account Issue</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5">Message</label>
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full px-4 py-2.5 bg-surface-container-lowest border border-surface-container/60 rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors resize-none"
                  placeholder="How can we help you?"
                />
              </div>
              <button type="submit" className="btn-primary px-6 py-2.5 rounded-lg text-sm font-medium">
                Send Message
              </button>
            </form>
          )}
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-xl font-bold text-on-surface mb-5">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details key={faq.q} className="group bg-surface-container-lowest rounded-xl border border-surface-container/60 overflow-hidden">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer select-none hover:bg-surface-container/30 transition-colors">
                  <span className="text-sm font-medium text-on-surface pr-4">{faq.q}</span>
                  <span className="material-symbols-outlined text-lg text-on-surface-variant group-open:rotate-180 transition-transform">expand_more</span>
                </summary>
                <div className="px-5 pb-4 text-sm text-on-surface-variant leading-relaxed border-t border-surface-container/60 pt-3">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
          <div className="mt-6">
            <Link to="/help" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
              View all help topics
            </Link>
          </div>
        </div>
      </div>

      {/* Business Hours */}
      <div className="mt-16 bg-surface-container-lowest rounded-2xl border border-surface-container/60 p-8">
        <h2 className="text-xl font-bold text-on-surface mb-4 text-center">Business Hours</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto text-center">
          <div>
            <span className="material-symbols-outlined text-2xl text-primary mb-2 block">schedule</span>
            <p className="text-sm font-medium text-on-surface">Live Chat</p>
            <p className="text-xs text-on-surface-variant mt-1">Mon - Fri: 9AM - 6PM EST</p>
          </div>
          <div>
            <span className="material-symbols-outlined text-2xl text-primary mb-2 block">mail</span>
            <p className="text-sm font-medium text-on-surface">Email Support</p>
            <p className="text-xs text-on-surface-variant mt-1">24/7 (Response within 24hrs)</p>
          </div>
          <div>
            <span className="material-symbols-outlined text-2xl text-primary mb-2 block">call</span>
            <p className="text-sm font-medium text-on-surface">Phone Support</p>
            <p className="text-xs text-on-surface-variant mt-1">Mon - Fri: 9AM - 6PM EST</p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default SupportPage;
