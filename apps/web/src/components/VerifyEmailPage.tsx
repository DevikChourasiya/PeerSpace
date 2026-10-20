import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Mail,
  RefreshCw,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { verifyEmailToken, resendVerificationEmail } from '../api/auth';

interface VerifyEmailPageProps {
  onBackToLogin: () => void;
  initialToken?: string;
}

export const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({
  onBackToLogin,
  initialToken,
}) => {
  const [token] = useState<string>(() => {
    if (initialToken) return initialToken;
    const params = new URLSearchParams(window.location.search);
    return params.get('token') || '';
  });

  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>(
    token ? 'verifying' : 'idle'
  );
  const [message, setMessage] = useState<string>('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [resendMessage, setResendMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!token) {
      setStatus('idle');
      return;
    }

    let isMounted = true;
    setStatus('verifying');

    verifyEmailToken(token)
      .then((res) => {
        if (!isMounted) return;
        setStatus('success');
        setMessage(
          res.message ||
            'Your university email address has been verified successfully. Your account is now pending administrator approval.'
        );
      })
      .catch((err: any) => {
        if (!isMounted) return;
        setStatus('error');
        setMessage(
          err.message ||
            'The email verification link is invalid, expired, or has already been consumed.'
        );
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim() || cooldown > 0) return;

    setResendStatus('sending');
    setResendMessage('');

    try {
      const res = await resendVerificationEmail(resendEmail.trim());
      setResendStatus('sent');
      setResendMessage(
        res.message || 'A fresh verification link has been sent to your university email address.'
      );
      setCooldown(60);
    } catch (err: any) {
      setResendStatus('error');
      if (err.status === 429 && err.details?.retryAfterSeconds) {
        setCooldown(err.details.retryAfterSeconds);
      }
      setResendMessage(
        err.message || 'Unable to send verification link. Please check your email and try again.'
      );
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8">
      <div className="bg-[#FCFBF9] dark:bg-[#211F1D] border border-[#E4E0D8] dark:border-[#33302B] rounded-2xl shadow-sm p-6 sm:p-8 backdrop-blur-xs transition-all">
        {/* Header Icon */}
        <div className="flex items-center justify-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-[#EEF9F2] dark:bg-emerald-950/40 text-[#34A866] dark:text-emerald-400 flex items-center justify-center border border-[#34A866]/20 shadow-xs">
            {status === 'verifying' ? (
              <Loader2 className="h-7 w-7 animate-spin text-[#5B9CF6]" />
            ) : status === 'success' ? (
              <CheckCircle2 className="h-7 w-7" />
            ) : status === 'error' ? (
              <AlertCircle className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            ) : (
              <Mail className="h-7 w-7 text-[#5B9CF6]" />
            )}
          </div>
        </div>

        {/* Content based on status */}
        {status === 'verifying' && (
          <div className="text-center">
            <h1 className="text-xl font-bold text-[#1C1B18] dark:text-[#F5F2EB]">
              Verifying Email Address
            </h1>
            <p className="text-sm text-[#5C5952] dark:text-[#B5B0A4] mt-2">
              Validating your institutional cryptographic security token...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EEF9F2] dark:bg-emerald-950/50 text-[#34A866] dark:text-emerald-400 border border-[#34A866]/30 mb-3">
              <ShieldCheck className="h-3.5 w-3.5" />
              Email Verified
            </div>
            <h1 className="text-xl font-bold text-[#1C1B18] dark:text-[#F5F2EB]">
              Verification Successful
            </h1>
            <p className="text-sm text-[#5C5952] dark:text-[#B5B0A4] mt-2 leading-relaxed">
              {message}
            </p>

            <div className="my-6 p-4 rounded-xl bg-[#F5F2EB] dark:bg-[#1C1A17] border border-[#E4E0D8] dark:border-[#33302B] text-left">
              <div className="text-xs font-semibold text-[#1C1B18] dark:text-[#F5F2EB] flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                Next Step: Administrator Approval
              </div>
              <p className="text-xs text-[#5C5952] dark:text-[#B5B0A4] mt-1.5 leading-relaxed">
                An authorized course instructor or system administrator must approve your account
                before peer evaluation rounds can be accessed.
              </p>
            </div>

            <button
              type="button"
              onClick={onBackToLogin}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold bg-[#1C1B18] text-[#FCFBF9] hover:bg-[#2C2A26] dark:bg-[#F5F2EB] dark:text-[#1C1B18] dark:hover:bg-white shadow-xs transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Proceed to Sign In
            </button>
          </div>
        )}

        {(status === 'error' || status === 'idle') && (
          <div>
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-[#1C1B18] dark:text-[#F5F2EB]">
                {status === 'error' ? 'Verification Link Expired or Invalid' : 'Verify Your Email'}
              </h1>
              <p className="text-sm text-[#5C5952] dark:text-[#B5B0A4] mt-2 leading-relaxed">
                {status === 'error'
                  ? message
                  : 'Enter your university email address below to receive a new cryptographic verification link.'}
              </p>
            </div>

            {/* Resend Form */}
            <form onSubmit={handleResend} className="space-y-4">
              <div>
                <label
                  htmlFor="resend-email"
                  className="block text-xs font-semibold text-[#1C1B18] dark:text-[#F5F2EB] mb-1.5"
                >
                  University Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6E6A61] dark:text-[#8E8A80]" />
                  <input
                    id="resend-email"
                    type="email"
                    required
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="student@university.edu"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-[#E4E0D8] dark:border-[#33302B] bg-[#FCFBF9] dark:bg-[#181715] text-[#1C1B18] dark:text-[#F5F2EB] placeholder:text-[#6E6A61] dark:placeholder:text-[#8E8A80] focus:outline-hidden focus:ring-2 focus:ring-[#5B9CF6] transition-all"
                  />
                </div>
              </div>

              {resendMessage && (
                <div
                  className={`p-3 rounded-xl text-xs ${
                    resendStatus === 'sent'
                      ? 'bg-[#EEF9F2] dark:bg-emerald-950/40 text-[#34A866] dark:text-emerald-300 border border-[#34A866]/30'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50'
                  }`}
                >
                  {resendMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={resendStatus === 'sending' || cooldown > 0 || !resendEmail.trim()}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold bg-[#5B9CF6] hover:bg-[#4689E2] text-white shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {resendStatus === 'sending' ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Sending link...
                  </>
                ) : cooldown > 0 ? (
                  `Resend in ${cooldown}s`
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Resend Verification Link
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-[#E4E0D8] dark:border-[#33302B] text-center">
              <button
                type="button"
                onClick={onBackToLogin}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5C5952] hover:text-[#1C1B18] dark:text-[#B5B0A4] dark:hover:text-[#F5F2EB] transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Return to Sign In
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
