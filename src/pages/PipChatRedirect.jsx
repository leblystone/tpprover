import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { openPipChat } from '../utils/pipOpen';

/**
 * Legacy /app/ai bookmarks → open Ask PiP modal and land on dashboard.
 */
export default function PipChatRedirect() {
  useEffect(() => {
    openPipChat({ freshChat: false });
  }, []);

  return <Navigate to="/app/dashboard" replace />;
}
