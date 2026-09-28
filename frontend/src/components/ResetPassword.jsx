import React from 'react';
import { SignIn } from '@clerk/react';

export default function ResetPassword() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-cyan-900 to-slate-900">
      <SignIn routing="virtual" />
    </div>
  );
}
