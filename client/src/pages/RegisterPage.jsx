import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { validateEmail, validatePassword } from '../utils/security';
import LoadingSpinner from '../components/LoadingSpinner';

const getPasswordStrength = (password) => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return { label: 'Weak', color: 'bg-error', width: 'w-1/3', textColor: 'text-error' };
  if (score <= 4) return { label: 'Medium', color: 'bg-tertiary-container', width: 'w-2/3', textColor: 'text-tertiary' };
  return { label: 'Strong', color: 'bg-secondary', width: 'w-full', textColor: 'text-secondary' };
};

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const validate = () => {
    const errs = {};
    if (!name.trim()) {
      errs.name = 'Name is required';
    } else if (name.trim().length < 2 || name.trim().length > 50) {
      errs.name = 'Name must be 2-50 characters';
    }
    if (!email.trim()) {
      errs.email = 'Email is required';
    } else if (!validateEmail(email)) {
      errs.email = 'Please enter a valid email address';
    }
    if (!password) {
      errs.password = 'Password is required';
    } else {
      const { valid, errors: pwErrors } = validatePassword(password);
      if (!valid) errs.password = pwErrors.join('. ');
    }
    if (!confirmPassword) {
      errs.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }
    if (!agreeTerms) {
      errs.terms = 'You must agree to the Terms of Service';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      toast.success('Account created successfully!');
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12 relative overflow-hidden bg-background">
      <div className="absolute top-0 right-0 w-64 h-64 bg-secondary-container/20 rounded-full blur-3xl animate-blob"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary-container/20 rounded-full blur-3xl animate-blob" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-md relative z-10">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8 group">
          <span className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center group-hover:animate-wiggle transition-transform">
            <span className="material-symbols-outlined text-on-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
              local_mall
            </span>
          </span>
          <span className="text-xl font-bold text-primary">NovaCart</span>
        </Link>

        <div className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_8px_30px_rgba(164,60,18,0.06)] border border-surface-container/60">
          <h1 className="text-xl font-bold text-on-surface mb-1">Create Account</h1>
          <p className="text-sm text-on-surface-variant mb-6">Join the joyful shopping experience.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1.5">Full Name</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none">
                  person
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((p) => ({ ...p, name: '' })); }}
                  className={`w-full pl-10 pr-4 py-2.5 bg-surface-container-low border rounded-lg text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary-container/20 transition-all ${errors.name ? 'border-error' : 'border-surface-container focus:border-primary-container'}`}
                  placeholder="Jane Doe"
                />
              </div>
              {errors.name && <p className="text-xs text-error mt-1.5 font-medium">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1.5">Email</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none">
                  mail
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((p) => ({ ...p, email: '' })); }}
                  className={`w-full pl-10 pr-4 py-2.5 bg-surface-container-low border rounded-lg text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary-container/20 transition-all ${errors.email ? 'border-error' : 'border-surface-container focus:border-primary-container'}`}
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && <p className="text-xs text-error mt-1.5 font-medium">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1.5">Password</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none">
                  lock
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((p) => ({ ...p, password: '' })); }}
                  className={`w-full pl-10 pr-10 py-2.5 bg-surface-container-low border rounded-lg text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary-container/20 transition-all ${errors.password ? 'border-error' : 'border-surface-container focus:border-primary-container'}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              {errors.password && <p className="text-xs text-error mt-1.5 font-medium">{errors.password}</p>}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-on-surface-variant">Password strength</span>
                    <span className={`text-xs font-semibold ${strength.textColor}`}>{strength.label}</span>
                  </div>
                  <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1.5">Confirm Password</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none">
                  lock
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); if (errors.confirmPassword) setErrors((p) => ({ ...p, confirmPassword: '' })); }}
                  className={`w-full pl-10 pr-4 py-2.5 bg-surface-container-low border rounded-lg text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary-container/20 transition-all ${errors.confirmPassword ? 'border-error' : 'border-surface-container focus:border-primary-container'}`}
                  placeholder="••••••••"
                />
              </div>
              {errors.confirmPassword && <p className="text-xs text-error mt-1.5 font-medium">{errors.confirmPassword}</p>}
            </div>

            <div>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => { setAgreeTerms(e.target.checked); if (errors.terms) setErrors((p) => ({ ...p, terms: '' })); }}
                  className="w-4 h-4 mt-0.5 rounded border-surface-container text-primary focus:ring-primary-container accent-primary cursor-pointer"
                />
                <span className="text-sm text-on-surface-variant leading-snug">
                  I agree to the{' '}
                  <Link to="/terms" className="text-primary font-semibold hover:underline">Terms of Service</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-primary font-semibold hover:underline">Privacy Policy</Link>
                </span>
              </label>
              {errors.terms && <p className="text-xs text-error mt-1.5 font-medium">{errors.terms}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary text-on-primary-container font-semibold py-3 rounded-lg flex items-center justify-center gap-2 text-sm disabled:opacity-60"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Creating account...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">person_add</span>
                  Create Account
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-on-surface-variant mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
};

export default RegisterPage;
