import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { supabase } from '../supabaseClient';

/**
 * Auth Component - Handles user login and signup
 * This uses Supabase's built-in authentication
 */
function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isSignUp) {
        // Confirmation dialog before signup
        const confirmMessage = `Please confirm your details:\n\n` +
        `Full Name: ${fullName}\n` +
        `Email: ${email}\n\n` +
        `⚠️ Make sure these are correct!`;

        if (!window.confirm(confirmMessage)) {
          setLoading(false);
          return;
        }

        // Sign up new user with full name
        const {data, error} = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: fullName,
            }
          }
        });

        if (error) throw error;

        setMessage('✅ Account created! Check your email for confirmation link.')
      } else {
        // Sign in existing user
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const resetEmail = prompt('Enter your email address to reset password');

    if (!resetEmail) return; // User cancelled

    setLoading(true);
    setMessage('');

    try {
      await supabase.auth.signOut(); // Close current session

      sessionStorage.removeItem('isPasswordRecovery');

      const {error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/ResetPassword`,
      });

      if (error) throw error;

      setMessage('📧 If this email is registered and correctly written, you will receive a password reset link.');
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-cyan-900 to-slate-900">
      <div className="bg-white/95 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-cyan-200 w-96">
        <h1 className="text-3xl font-bold flex items-center mb-2 bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent gap-2">
          <Sparkles className="w-6 h-6 text-cyan-400" />
          SpendWise
        </h1>
        <p className="text-center text-gray-600 mb-6">
          Expense Tracking
        </p>

        <div className="mb-4 p-3 bg-cyan-50 border border-cyan-200 rounded-lg text-cyan-800 text-sm flex gap-2">
          <span>💡</span> 
          <span>
            Please ensure only <strong>one tab</strong> of the system is open.
            Close the others to avoid conflicts.
          </span>
        </div>
        
        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
                placeholder="You Example"
                required={isSignUp}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {message && (
            <div className={`text-sm p-3 rounded ${
              message.includes('error') || message.includes('Invalid') 
                ? 'bg-red-100 text-red-700' 
                : 'bg-green-100 text-green-700'
            }`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-2 rounded-lg font-semibold hover:from-cyan-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setMessage('');
              setFullName('');
            }}
            className="text-cyan-600 hover:text-cyan-700 hover:underline text-sm transition-colors duration-200"
          >
            {isSignUp 
              ? 'Already have an account? Sign In' 
              : "Don't have an account? Sign Up"}
          </button>

          {!isSignUp && (
            <div className="mt-2">
              <button
                onClick={handlePasswordReset}
                disabled={loading}
                className="text-slate-600 hover:text-cyan-600 hover:underline text-sm disabled:opacity-50 transition-colors duration-200"
              >
                Forgot password?
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Auth;