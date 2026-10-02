import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../api';

const HeroSection = () => {
  const [slides, setSlides] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    api.getActiveBanners('hero').then((data) => {
      if (Array.isArray(data) && data.length > 0) setSlides(data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const goTo = useCallback((i) => {
    if (i === activeIdx || isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveIdx(i);
      setProgress(0);
      setTimeout(() => setIsTransitioning(false), 100);
    }, 200);
  }, [activeIdx, isTransitioning]);

  const next = useCallback(() => {
    goTo((activeIdx + 1) % slides.length);
  }, [activeIdx, slides.length, goTo]);

  const prev = useCallback(() => {
    goTo((activeIdx - 1 + slides.length) % slides.length);
  }, [activeIdx, slides.length, goTo]);

  useEffect(() => {
    if (isPaused || slides.length <= 1 || isTransitioning) return;
    const interval = 6000;
    const step = 30;
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          goTo((activeIdx + 1) % slides.length);
          return 0;
        }
        return p + (step / interval) * 100;
      });
    }, step);
    return () => clearInterval(timer);
  }, [isPaused, slides.length, activeIdx, isTransitioning, goTo]);

  if (loading) {
    return (
      <section className="relative rounded-3xl overflow-hidden bg-surface-container min-h-[340px] md:min-h-[420px] animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-br from-surface via-primary/[0.02] to-secondary/[0.02]" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-[1400px] mx-auto px-6 md:px-10 w-full">
            <div className="max-w-xl space-y-4">
              <div className="h-5 w-32 rounded-full bg-surface-container-high" />
              <div className="h-10 w-80 rounded-xl bg-surface-container-high" />
              <div className="h-10 w-56 rounded-xl bg-surface-container-high" />
              <div className="h-4 w-64 rounded-lg bg-surface-container-high" />
              <div className="flex gap-3 mt-6">
                <div className="h-11 w-36 rounded-2xl bg-surface-container-high" />
                <div className="h-11 w-36 rounded-2xl bg-surface-container-high" />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (slides.length === 0) {
    return <PremiumFallback />;
  }

  return (
    <section
      className="relative rounded-3xl overflow-hidden bg-surface-container-lowest min-h-[340px] md:min-h-[420px]"
      style={{ boxShadow: '0 25px 60px -12px rgba(164, 60, 18, 0.15), 0 8px 20px -4px rgba(0, 0, 0, 0.05)' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Subtle top shine line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary-container/40 to-transparent z-30" />

      {slides.map((slide, i) => (
        <PremiumSlide key={slide._id || i} slide={slide} isActive={i === activeIdx} index={i} activeIdx={activeIdx} />
      ))}

      {slides.length > 1 && (
        <>
          {/* Nav arrows — glass morphism */}
          <button
            onClick={prev}
            className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-white/25 hover:scale-110 shadow-lg transition-all duration-300"
          >
            <span className="material-symbols-outlined text-lg">chevron_left</span>
          </button>
          <button
            onClick={next}
            className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-white/25 hover:scale-110 shadow-lg transition-all duration-300"
          >
            <span className="material-symbols-outlined text-lg">chevron_right</span>
          </button>

          {/* Bottom bar — glass panel with progress dots + counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 bg-black/20 backdrop-blur-2xl border border-white/10 rounded-full px-5 py-2.5 shadow-lg">
            {/* Slide counter */}
            <span className="text-[11px] font-bold text-white/70 tabular-nums">
              {String(activeIdx + 1).padStart(2, '0')}<span className="text-white/30 mx-1">/</span>{String(slides.length).padStart(2, '0')}
            </span>

            {/* Divider */}
            <div className="w-[1px] h-3 bg-white/15" />

            {/* Progress dots */}
            <div className="flex items-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className="group relative"
                >
                  <span className={`block rounded-full transition-all duration-500 ${
                    i === activeIdx
                      ? 'w-8 h-2 bg-white'
                      : 'w-2 h-2 bg-white/25 group-hover:bg-white/50'
                  }`} />
                  {i === activeIdx && (
                    <span
                      className="absolute inset-0 rounded-full bg-white/40 origin-left"
                      style={{ transform: `scaleX(${progress / 100})` }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
};

const PremiumSlide = ({ slide, isActive, index, activeIdx }) => {
  const { t } = useLanguage();
  const delay = (index - activeIdx) * 80;

  return (
    <div className={`absolute inset-0 transition-all duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
      isActive ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 scale-[1.03]'
    }`}>
      {/* Image */}
      <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />

      {/* Subtle gradient — just enough for text readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/10 to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex items-center">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 w-full">
          <div className="max-w-xl">
            {/* Badge */}
            {slide.ctaText && (
              <div className={`inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3.5 py-1.5 mb-4 transition-all duration-500 delay-100 ${
                isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span className="text-[11px] font-bold text-white uppercase tracking-widest">{slide.ctaText}</span>
              </div>
            )}

            {/* Title */}
            <h2 className={`text-3xl md:text-4xl lg:text-[3.25rem] font-extrabold text-white mb-4 leading-[1.1] tracking-tight transition-all duration-700 delay-200 ${
              isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
            }`}>
              {slide.title}
            </h2>

            {/* Subtitle */}
            {slide.subtitle && (
              <p className={`text-white/70 text-sm md:text-base mb-7 max-w-md leading-relaxed transition-all duration-700 delay-300 ${
                isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
              }`}>
                {slide.subtitle}
              </p>
            )}

            {/* CTAs */}
            <div className={`flex items-center gap-3 transition-all duration-700 delay-[400ms] ${
              isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
            }`}>
              <Link
                to={slide.link || '/shop'}
                className="group relative inline-flex items-center gap-2.5 bg-primary text-on-primary text-sm font-bold px-7 py-3.5 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_12px_30px_-5px_rgba(164,60,18,0.5)] hover:scale-[1.03] active:scale-[0.97]"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-primary-container/0 via-white/10 to-primary-container/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <span className="relative z-10">{t('hero.shopNow')}</span>
                <span className="material-symbols-outlined text-lg relative z-10 group-hover:translate-x-0.5 transition-transform duration-300">arrow_forward</span>
              </Link>

              <Link
                to="/shop?flash=true"
                className="group inline-flex items-center gap-2 bg-surface-container-lowest/40 backdrop-blur-md border border-outline-variant/15 text-on-surface text-sm font-semibold px-6 py-3.5 rounded-2xl hover:bg-surface-container-lowest/60 hover:border-primary/20 hover:scale-[1.03] active:scale-[0.97] transition-all duration-300"
              >
                <span className="material-symbols-outlined text-lg text-primary group-hover:animate-[wiggle_0.3s_ease-in-out]">flash_on</span>
                <span>{t('products.flashDeals')}</span>
              </Link>
            </div>

            {/* Social proof strip */}
            <div className={`flex items-center gap-4 mt-7 transition-all duration-700 delay-500 ${
              isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
            }`}>
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-1.5">
                  {[0,1,2].map((i) => (
                    <div key={i} className="w-5 h-5 rounded-full border-2 border-black/20 bg-white/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[10px] text-white">person</span>
                    </div>
                  ))}
                </div>
                <span className="text-[11px] font-semibold text-white/60">2.4k+</span>
              </div>
              <div className="w-[1px] h-3 bg-white/20" />
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map((i) => (
                  <span key={i} className="material-symbols-outlined text-[13px] text-yellow-400">star</span>
                ))}
                <span className="text-[11px] font-semibold text-white/60 ml-1">4.9</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PremiumFallback = () => {
  const { t } = useLanguage();
  return (
    <section
      className="relative rounded-3xl overflow-hidden min-h-[340px] md:min-h-[420px]"
      style={{ boxShadow: '0 25px 60px -12px rgba(164, 60, 18, 0.15), 0 8px 20px -4px rgba(0, 0, 0, 0.05)' }}
    >
    {/* Top shine */}
    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary-container/40 to-transparent z-30" />

    {/* Rich gradient background */}
    <div className="absolute inset-0 bg-gradient-to-br from-surface via-primary/[0.03] to-secondary/[0.04]" />

    {/* Animated gradient orbs */}
    <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary-container/10 rounded-full blur-[100px] animate-blob" />
    <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-secondary-container/10 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '3s' }} />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-tertiary-container/5 rounded-full blur-[80px] animate-blob" style={{ animationDelay: '5s' }} />

    {/* Dot texture */}
    <div className="absolute inset-0 opacity-[0.02]" style={{
      backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.15) 1px, transparent 0)',
      backgroundSize: '24px 24px'
    }} />

    {/* Content */}
    <div className="absolute inset-0 flex items-center">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 w-full relative z-10">
        <div className="max-w-xl">
          {/* Animated badge */}
          <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3.5 py-1.5 mb-5 animate-fade-up">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] font-bold text-primary uppercase tracking-widest">{t('hero.tagline')}</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-[3.25rem] font-extrabold text-on-surface mb-4 leading-[1.1] tracking-tight animate-fade-up" style={{ animationDelay: '100ms' }}>
            {t('hero.title1')}<br />
            <span className="bg-gradient-to-r from-primary via-primary-container to-secondary bg-clip-text text-transparent">
              {t('hero.title2')}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-on-surface-variant/70 text-sm md:text-base mb-7 max-w-md leading-relaxed animate-fade-up" style={{ animationDelay: '200ms' }}>
            {t('hero.subtitle')}
          </p>

          {/* CTAs */}
          <div className="flex items-center gap-3 animate-fade-up" style={{ animationDelay: '300ms' }}>
            <Link to="/shop" className="group relative inline-flex items-center gap-2.5 bg-primary text-on-primary text-sm font-bold px-7 py-3.5 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_12px_30px_-5px_rgba(164,60,18,0.5)] hover:scale-[1.03] active:scale-[0.97]">
              <span className="absolute inset-0 bg-gradient-to-r from-primary-container/0 via-white/10 to-primary-container/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <span className="relative z-10">{t('hero.shopNow')}</span>
              <span className="material-symbols-outlined text-lg relative z-10 group-hover:translate-x-0.5 transition-transform duration-300">arrow_forward</span>
            </Link>
            <Link to="/shop?flash=true" className="group inline-flex items-center gap-2 bg-surface-container-lowest/40 backdrop-blur-md border border-outline-variant/15 text-on-surface text-sm font-semibold px-6 py-3.5 rounded-2xl hover:bg-surface-container-lowest/60 hover:border-primary/20 hover:scale-[1.03] active:scale-[0.97] transition-all duration-300">
              <span className="material-symbols-outlined text-lg text-primary group-hover:animate-[wiggle_0.3s_ease-in-out]">flash_on</span>
              <span>{t('products.flashDeals')}</span>
            </Link>
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-4 mt-7 animate-fade-up" style={{ animationDelay: '400ms' }}>
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-1.5">
                {[0,1,2].map((i) => (
                  <div key={i} className="w-5 h-5 rounded-full border-2 border-surface bg-primary-container/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[10px] text-primary">person</span>
                  </div>
                ))}
              </div>
              <span className="text-[11px] font-semibold text-on-surface-variant/60">2.4k+ shoppers</span>
            </div>
            <div className="w-[1px] h-3 bg-outline-variant/20" />
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map((i) => (
                <span key={i} className="material-symbols-outlined text-[13px] text-tertiary-fixed-dim">star</span>
              ))}
              <span className="text-[11px] font-semibold text-on-surface-variant/60 ml-1">4.9</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Premium floating product cards */}
    <div className="absolute right-0 top-0 h-full w-1/2 hidden lg:block">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-full h-full">
          {/* Main card — large */}
          <div className="absolute top-[15%] right-[10%] w-52 h-64 bg-surface-container-lowest/80 backdrop-blur-sm rounded-3xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.12)] overflow-hidden border border-surface-container-lowest/40 rotate-3 animate-blob hover:rotate-0 hover:scale-105 transition-all duration-500">
            <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400" alt="" className="w-full h-[65%] object-cover" />
            <div className="p-3.5">
              <p className="text-[11px] font-bold text-on-surface">Vibe Headphones</p>
              <p className="text-[13px] font-extrabold text-primary mt-0.5">$89.99</p>
            </div>
            <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-sm text-on-primary">shopping_bag</span>
            </div>
          </div>

          {/* Secondary card */}
          <div className="absolute top-[45%] right-[45%] w-44 h-56 bg-surface-container-lowest/80 backdrop-blur-sm rounded-3xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.12)] overflow-hidden border border-surface-container-lowest/40 -rotate-2 animate-blob hover:rotate-0 hover:scale-105 transition-all duration-500" style={{ animationDelay: '2s' }}>
            <img src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400" alt="" className="w-full h-[60%] object-cover" />
            <div className="p-3.5">
              <p className="text-[11px] font-bold text-on-surface">Aura Watch</p>
              <p className="text-[13px] font-extrabold text-primary mt-0.5">$119.00</p>
            </div>
          </div>

          {/* Small accent card */}
          <div className="absolute top-[25%] right-[35%] w-28 h-28 bg-surface-container-lowest/80 backdrop-blur-sm rounded-2xl shadow-[0_15px_40px_-8px_rgba(0,0,0,0.1)] overflow-hidden border border-surface-container-lowest/40 rotate-6 animate-blob hover:rotate-0 hover:scale-110 transition-all duration-500" style={{ animationDelay: '4s' }}>
            <img src="https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=300" alt="" className="w-full h-full object-cover" />
          </div>

          {/* Floating tag */}
          <div className="absolute bottom-[20%] right-[15%] bg-surface-container-lowest/90 backdrop-blur-md rounded-2xl px-4 py-2.5 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.1)] border border-surface-container-lowest/40 animate-blob hover:scale-105 transition-all duration-500" style={{ animationDelay: '6s' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-sm text-primary">local_shipping</span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wider">{t('nav.freeShipping')}</p>
                <p className="text-[12px] font-extrabold text-on-surface">$50+</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  );
};

export default HeroSection;
