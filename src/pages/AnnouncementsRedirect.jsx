import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * /app/announcements opens the global announcements bottom sheet and leaves the user on the dashboard
 * (no full-page feed — keeps Topbar flow consistent).
 */
export default function AnnouncementsRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('tpp:open-announcements'));
    navigate('/app/dashboard', { replace: true });
  }, [navigate]);

  return null;
}
