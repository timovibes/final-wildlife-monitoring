import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, AlertCircle } from 'lucide-react';
import authService from '../../services/auth';

const DEMO_ACCOUNTS = [
  { role: 'Admin',      email: 'admin@wildlife.com',      password: 'Admin123!' },
  { role: 'Ranger',     email: 'ranger@wildlife.com',      password: 'Ranger123!' },
  { role: 'Researcher', email: 'researcher@wildlife.com',  password: 'Researcher123!' },
];

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login(formData);
      if (response.success) {
        navigate('/dashboard');
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bush py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* Login form */}
        <div className="space-y-8">
          <div className="text-center lg:text-left">
            <div className="mx-auto lg:mx-0 h-14 w-14 border border-ochre flex items-center justify-center rotate-45">
              <LogIn className="h-6 w-6 text-ochre -rotate-45" />
            </div>
            <h2 className="mt-6 font-display text-2xl font-semibold text-bone">
              Wildlife Monitoring System
            </h2>
            <p className="mt-2 font-mono text-xs uppercase tracking-widest text-bone/50">
              Sign in to your account
            </p>
          </div>

          <form className="space-y-6 border border-bush-line bg-bush-surface p-8" onSubmit={handleSubmit}>
            {error && (
              <div className="border border-rust bg-bush p-4 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rust flex-shrink-0" />
                <p className="text-sm text-rust">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block font-mono text-[10px] uppercase tracking-widest text-bone/50">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 bg-bush border border-bush-line text-bone text-sm focus:outline-none focus:border-ochre placeholder:text-bone/30"
                  placeholder="admin@wildlife.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block font-mono text-[10px] uppercase tracking-widest text-bone/50">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 bg-bush border border-bush-line text-bone text-sm focus:outline-none focus:border-ochre placeholder:text-bone/30"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 bg-ochre text-bush font-mono text-xs uppercase tracking-widest font-semibold hover:bg-[#dda054] focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>

            <div className="text-center">
              <Link
                to="/register"
                className="font-mono text-xs uppercase tracking-widest text-teal hover:text-bone transition-colors"
              >
                Don't have an account? Register here
              </Link>
            </div>
          </form>
        </div>

        {/* Demo credentials panel */}
        <div className="border border-bush-line bg-bush-surface p-6 lg:mt-[104px]">
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-ochre mb-1">
            Demo Access
          </h3>
          <p className="text-xs text-bone/50 mb-5">
            For demo purposes, use these credentials to log in, or register a new account.
          </p>

          <div className="border border-bush-line">
            {DEMO_ACCOUNTS.map((acct) => (
              <div key={acct.role} className="field-tag">
                <div className="flex-1">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-teal border border-teal px-1.5 py-0.5">
                    {acct.role}
                  </span>
                  <div className="mt-2 font-mono text-xs text-bone/80">{acct.email}</div>
                  <div className="font-mono text-xs text-bone/50">{acct.password}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;