import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, Loader2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import ShopHeader from '../components/shop/ShopHeader';
import LandingFooter from '../components/layout/LandingFooter';
import { themes, defaultThemeName } from '../theme/themes';
import { usePageSEO } from '../utils/pageSEO';

export default function DigitalDownload() {
  usePageSEO({
    title: 'Download Your Planner PDF | The Pep Planner',
    description: 'Secure download link for your digital PEP Planner purchase.',
    noindex: true,
  });

  const { token } = useParams();
  const theme = themes[defaultThemeName];
  const [status, setStatus] = useState('loading'); // loading | ready | error | done
  const [productName, setProductName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('Missing download link.');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const fn = httpsCallable(getFunctions(), 'redeemDigitalDownload');
        const { data } = await fn({ token });
        if (cancelled) return;

        setProductName(data.productName || 'Your planner');
        setStatus('ready');

        // Trigger browser download
        const a = document.createElement('a');
        a.href = data.signedUrl;
        a.download = data.fileName || 'planner.pdf';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setStatus('done');
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setErrorMsg(err?.message || 'Could not start your download. Try the link from your email again.');
      }
    })();

    return () => { cancelled = true; };
  }, [token]);

  const handleRetry = async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const fn = httpsCallable(getFunctions(), 'redeemDigitalDownload');
      const { data } = await fn({ token });
      setProductName(data.productName || 'Your planner');
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err?.message || 'Download failed.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f0eee7' }}>
      <ShopHeader cartCount={0} onCartOpen={() => {}} />

      <main className="flex-1 max-w-lg mx-auto w-full px-5 py-16 text-center">
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin" style={{ color: theme.primary }} />
            <p className="text-sm" style={{ color: theme.textLight }}>Preparing your download…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="w-12 h-12 text-red-400" />
            <h1 className="text-xl font-bold" style={{ color: theme.text }}>Download unavailable</h1>
            <p className="text-sm" style={{ color: theme.textLight }}>{errorMsg}</p>
            <Link to="/shop" className="text-sm font-semibold" style={{ color: theme.primary }}>
              Back to shop
            </Link>
          </div>
        )}

        {(status === 'ready' || status === 'done') && (
          <div className="flex flex-col items-center gap-4">
            <CheckCircle className="w-12 h-12" style={{ color: '#22c55e' }} />
            <h1 className="text-2xl font-bold" style={{ color: theme.text }}>
              {status === 'done' ? 'Download started' : 'Starting download…'}
            </h1>
            {productName && (
              <p className="text-sm" style={{ color: theme.textLight }}>{productName}</p>
            )}
            <p className="text-sm max-w-sm" style={{ color: theme.textLight }}>
              If your file didn&apos;t open, tap below. Best on iPad with GoodNotes or Notability — not for printing.
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: theme.primary }}
            >
              <Download className="w-4 h-4" />
              Download again
            </button>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 text-sm font-medium mt-2"
              style={{ color: theme.primary }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to shop
            </Link>
          </div>
        )}
      </main>

      <LandingFooter />
    </div>
  );
}

