"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0d1117] px-4 text-center font-sans text-white text-shadow-none">
      <div className="stone-panel w-full max-w-sm p-6">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold">Secure sign-in</p>
        <h1 className="mt-3 text-2xl font-black">Opening the kingdom...</h1>
        <p className="mt-3 text-sm leading-6 text-gray-300">Finishing your Google or Facebook login.</p>
        <AuthenticateWithRedirectCallback
          signInUrl="/"
          signUpUrl="/"
          signInForceRedirectUrl="/"
          signUpForceRedirectUrl="/"
          signInFallbackRedirectUrl="/"
          signUpFallbackRedirectUrl="/"
          continueSignUpUrl="/"
          verifyEmailAddressUrl="/"
        />
      </div>
    </div>
  );
}
