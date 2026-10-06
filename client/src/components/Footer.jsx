import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../api';

const FooterBannerStrip = () => {
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    api.getActiveBanners('footer').then(setBanners).catch(() => {});
  }, []);

  if (banners.length === 0) return null;

  return (
    <div className="bg-[#111] border-b border-white/5">
      <div className="max-w-container-max mx-auto px-4 md:px-margin-desktop py-4">
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {banners.map((banner) => (
            <Link
              key={banner._id}
              to={banner.link || '/shop'}
              className="flex items-center gap-3 shrink-0 px-4 py-2 rounded-xl border border-[#333]/50 hover:shadow-md transition-all duration-200 hover:border-[#C89B58]/20 group"
              style={{ background: banner.bgColor || '#252525' }}
            >
              {banner.image && (
                <img src={banner.image} alt={banner.title} className="w-10 h-10 rounded-lg object-cover shrink-0" />
              )}
              <div>
                <p className="text-xs font-bold text-white whitespace-nowrap">{banner.title}</p>
                {banner.subtitle && <p className="text-[10px] text-[#999] whitespace-nowrap">{banner.subtitle}</p>}
              </div>
              <span className="text-[10px] font-semibold text-[#C89B58] group-hover:underline whitespace-nowrap">
                {banner.ctaText || 'Learn More'}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

const Footer = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [footerLinks, setFooterLinks] = useState([]);
  const { t } = useLanguage();

  useEffect(() => {
    api.getNavigationByPosition('footer').then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setFooterLinks(data);
      }
    }).catch(() => {});
  }, []);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  return (
    <>
      <FooterBannerStrip />
      <footer className="bg-[#241610] border-t-[3px] border-[#C89B58] mt-12">
        <div className="max-w-container-max mx-auto px-4 md:px-margin-desktop py-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <Link to="/" className="flex items-center gap-2.5 mb-3">
                <span className="bg-[#F9F4ED] rounded-xl p-0.5 shrink-0">
                  <img
                    src="/logo_lip.png"
                    alt="Life In Pieces"
                    width={500}
                    height={500}
                    className="h-14 w-auto object-contain block"
                  />
                </span>
                <span className="font-serif text-xl font-semibold text-white">Life In Pieces</span>
              </Link>
              <p className="text-sm text-[#999] leading-relaxed">
                {t('hero.subtitle')}
              </p>
              <div className="flex items-center gap-2 mt-4">
                {[
                  { name: 'Instagram', icon: 'photo_camera', href: '#' },
                  { name: 'Twitter', icon: 'chat', href: '#' },
                  { name: 'Facebook', icon: 'group', href: '#' },
                ].map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg bg-[#252525] flex items-center justify-center text-[#999] hover:bg-[#C89B58] hover:text-[#111] transition-colors"
                    aria-label={social.name}
                  >
                    <span className="material-symbols-outlined text-lg">{social.icon}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">{t('footer.shop')}</h3>
              <ul className="space-y-2">
                {[
                  { label: t('footer.allProducts'), to: '/shop' },
                  { label: 'Electronics', to: '/shop/Electronics' },
                  { label: 'Fashion', to: '/shop/Fashion' },
                  { label: 'Home Decor', to: '/shop/Home%20Decor' },
                  { label: 'Toys', to: '/shop/Toys' },
                  { label: 'Sports', to: '/shop/Sports' },
                  { label: 'Books', to: '/shop/Books' },
                ].map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-sm text-[#999] hover:text-[#C89B58] transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Help — dynamic from Navigation API */}
            <div>
              <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">{t('footer.support')}</h3>
              <ul className="space-y-2">
                {footerLinks.length > 0
                  ? footerLinks.map((link) => (
                      <li key={link._id}>
                        <Link to={link.url} className="text-sm text-[#999] hover:text-[#C89B58] transition-colors">
                          {link.label}
                        </Link>
                      </li>
                    ))
                  : [
                      { label: t('footer.helpCenter'), to: '/help' },
                      { label: t('footer.contactUs'), to: '/support' },
                      { label: t('footer.shippingInfo'), to: '/help#shipping-delivery' },
                      { label: 'FAQ', to: '/help#general-faq' },
                    ].map((item) => (
                      <li key={item.to}>
                        <Link to={item.to} className="text-sm text-[#999] hover:text-[#C89B58] transition-colors">
                          {item.label}
                        </Link>
                      </li>
                    ))
                }
              </ul>
            </div>

            {/* Newsletter */}
            <div>
              <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">{t('newsletter.title')}</h3>
              <p className="text-sm text-[#999] mb-3">{t('newsletter.subtitle')}</p>
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('newsletter.placeholder')}
                  className="flex-1 bg-[#252525] text-sm rounded-lg px-3 py-2 border border-[#333] outline-none focus:border-[#C89B58] transition-colors"
                />
                <button type="submit" className="bg-[#C89B58] text-black text-sm font-semibold px-3 py-2 rounded-lg hover:bg-white transition-colors">
                  <span className="material-symbols-outlined text-lg">send</span>
                </button>
              </form>
              {subscribed && (
                <p className="text-xs text-green-700 mt-2 font-medium">Thanks for subscribing!</p>
              )}
            </div>
          </div>

          <div className="border-t border-[#333] mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-xs text-[#999]">
              &copy; {new Date().getFullYear()} Life In Pieces. {t('footer.rights')}
            </p>
            <div className="flex items-center gap-4 text-xs text-[#999]">
              <Link to="/privacy" className="hover:text-[#C89B58] transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-[#C89B58] transition-colors">Terms of Service</Link>
              <Link to="/help" className="hover:text-[#C89B58] transition-colors">{t('nav.help')}</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
