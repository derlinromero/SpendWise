import React from 'react';
import { SignIn, SignUp } from '@clerk/react';

function Auth() {
  const isSignUp = new URLSearchParams(window.location.search).get('signup') === '1';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-cyan-900 to-slate-900">
      {isSignUp ? (
        <SignUp routing="virtual" signInUrl="/?signup=0" />
      ) : (
        <SignIn routing="virtual" signUpUrl="/?signup=1" />
      )}
    </div>
  );
}

export default Auth;
