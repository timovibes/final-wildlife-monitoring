import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, AlertCircle } from 'lucide-react';
import authService from '../../services/auth';

const inputClass =
  'mt-1 block w-full px-3 py-2 bg-bush border border-bush-line text-bone text-sm focus:outline-none focus:border-ochre placeholder:text-bone/30';
const labelClass = 'block font-mono text-[10px] uppercase tracking-widest text-bone/50';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'ranger',
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

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...registerData } = formData;
      const response = await authService.register(registerData);
      
      if (response.success) {
        navigate('/dashboard');
      } else {
        setError(response.message || 'Registration failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bush py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 border border-ochre flex items-center justify-center rotate-45">
            <UserPlus className="h-6 w-6 text-ochre -rotate-45" />
          </div>
          <h2 className="mt-6 font-display text-2xl font-semibold text-bone">
            Create Account
          </h2>
          <p className="mt-2 font-mono text-xs uppercase tracking-widest text-bone/50">
            Join the wildlife monitoring team
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className={labelClass}>
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="lastName" className={labelClass}>
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className={labelClass}>
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="role" className={labelClass}>
                Role
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="ranger">Ranger</option>
                <option value="researcher">Researcher</option>
              </select>
            </div>

            <div>
              <label htmlFor="password" className={labelClass}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className={labelClass}>
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 bg-ochre text-bush font-mono text-xs uppercase tracking-widest font-semibold hover:bg-[#dda054] focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </div>

          <div className="text-center">
            <Link
              to="/login"
              className="font-mono text-xs uppercase tracking-widest text-teal hover:text-bone transition-colors"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;