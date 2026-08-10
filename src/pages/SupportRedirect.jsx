import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * /app/support opens the Support modal (live ticket thread) and leaves the user
 * on the dashboard — used by push deep links + shared URLs.
 */
export default function SupportRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('tpp:open-support'));
    navigate('/app/dashboard', { replace: true });
  }, [navigate]);

  return null;
}
