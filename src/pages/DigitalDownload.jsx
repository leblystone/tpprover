import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, Loader2, AlertCircle, CheckCircle, ArrowLeft, FileText } from 'lucide-react';
import ShopHeader from '../components/shop/ShopHeader';
import LandingFooter from '../components/layout/LandingFooter';
import { themes, defaultThemeName } from '../theme/themes';
import { usePageSEO } from '../utils/pageSEO';

const PAGE_BG = '#f0eee7';

function apiBase() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://thepepplanner.app';
}

function downloadInfoUrl(token) {
  return `${apiBase()}/api/download-file/${encodeURIComponent(token)}/info`;
}

function downloadFileUrl(token) {
  return `${apiBase()}/api/download-file/${encodeURIComponent(token)}`;
}

function safeDownloadFileName(name) {
  const base = String(name || 'pep-planner.pdf')
    .replace(/[^\w.\- ()]+/g, '_')
    .slice(0, 120);
  return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
}

export default function DigitalDownload() {
  usePageSEO({
    title: 'Download Your Planner PDF | The Pep Planner',
    description: 'Secure download link for your digital PEP Planner purchase.',
    noindex: true,
  });

  const { token } = useParams();
  const theme = themes[defaultThemeName];
  const [status, setStatus] = useState('loading'); // loading | ready | downloading | done | error
  const [info, setInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('Missing download link.');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(downloadInfoUrl(token));
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || (await res.text().catch(() => '')) || 'Invalid download link.');
        }
        const data = await res.json();
        if (cancelled) return;
        setInfo(data);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setErrorMsg(
          err?.message || 'This link is invalid or has expired. Use the link from your order email.'
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleDownload = useCallback(async () => {
    if (!token) return;
    setDownloadError('');
    setStatus('downloading');
    try {
      const fileName = safeDownloadFileName(info?.fileName);
      const res = await fetch(downloadFileUrl(token));
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Download failed. Please try again.');
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);

      const refresh = await fetch(downloadInfoUrl(token));
      if (refresh.ok) {
        setInfo(await refresh.json());
      }
      setStatus('done');
    } catch (err) {
      setStatus('ready');
      setDownloadError(err?.message || 'Download failed. Please try again.');
    }
  }, [token, info?.fileName]);

  const expiresLabel =
    info?.expiresAt &&
    new Date(info.expiresAt).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: PAGE_BG }}>
      <ShopHeader cartCount={0} onCartOpen={() => {}} />

      <main className="flex-1 max-w-lg mx-auto w-full px-5 py-12 md:py-16">
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4 text-center py-12">
            <Loader2 className="w-10 h-10 animate-spin" style={{ color: theme.primary }} />
            <p className="text-sm" style={{ color: theme.textLight }}>
              Loading your download…
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="content-section flex flex-col items-center gap-4 p-8 rounded-2xl text-center">
            <AlertCircle className="w-12 h-12 text-red-400" />
            <h1 className="text-xl font-bold" style={{ color: theme.text }}>
              Download unavailable
            </h1>
            <p className="text-sm" style={{ color: theme.textLight }}>
              {errorMsg}
            </p>
            <Link to="/shop" className="text-sm font-semibold" style={{ color: theme.primary }}>
              Back to shop
            </Link>
          </div>
        )}

        {(status === 'ready' || status === 'downloading' || status === 'done') && info && (
          <div className="content-section p-6 sm:p-8 rounded-2xl space-y-6">
            <div className="text-center">
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                style={{ backgroundColor: `${theme.primary}18` }}
              >
                <FileText className="w-7 h-7" style={{ color: theme.primary }} />
              </div>
              <h1
                className="text-2xl sm:text-3xl font-bold mb-2"
                style={{ color: theme.text, fontFamily: 'Playfair Display, serif' }}
              >
                Your planner is ready
              </h1>
              <p className="text-sm font-semibold" style={{ color: theme.primary }}>
                {info.productName}
              </p>
            </div>

            <div
              className="rounded-xl p-4 text-sm leading-relaxed space-y-2"
              style={{ backgroundColor: '#f9f8f5', color: theme.textLight }}
            >
              <p>
                This page stays open so you can download when you&apos;re ready. Tap the button below — your PDF
                will save to your device.
              </p>
              <p className="text-xs">
                Best on iPad or tablet with GoodNotes or Notability. Not intended for printing.
              </p>
              {expiresLabel && (
                <p className="text-xs pt-1 border-t" style={{ borderColor: `${theme.text}15` }}>
                  Link valid until {expiresLabel}
                  {info.downloadsRemaining != null && (
                    <> · {info.downloadsRemaining} download{info.downloadsRemaining !== 1 ? 's' : ''} left</>
                  )}
                </p>
              )}
            </div>

            {status === 'done' && (
              <div
                className="flex items-start gap-3 p-3 rounded-xl text-sm"
                style={{ backgroundColor: '#dcfce7', color: '#166534' }}
              >
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>
                  Download started. If nothing appeared, tap <strong>Download PDF</strong> again — this page will
                  stay here.
                </p>
              </div>
            )}

            {downloadError && (
              <p className="text-sm text-red-600 text-center" role="alert">
                {downloadError}
              </p>
            )}

            <button
              type="button"
              onClick={handleDownload}
              disabled={status === 'downloading' || info.downloadsRemaining === 0}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full text-sm font-bold tracking-wide uppercase text-white transition-all hover:scale-[1.02] disabled:opacity-50 disabled:pointer-events-none"
              style={{ backgroundColor: theme.primary }}
            >
              {status === 'downloading' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Preparing file…
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Download PDF
                </>
              )}
            </button>

            {info.downloadsRemaining === 0 && (
              <p className="text-xs text-center text-red-600">
                Download limit reached for this link. Reply to your order email if you need help.
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                to="/shop"
                className="inline-flex items-center justify-center gap-2 text-sm font-medium"
                style={{ color: theme.primary }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to shop
              </Link>
            </div>
          </div>
        )}
      </main>

      <LandingFooter />
    </div>
  );
}
