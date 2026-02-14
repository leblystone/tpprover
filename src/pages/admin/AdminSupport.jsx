import React from 'react';
import { useOutletContext } from 'react-router-dom';
import AdminFeedback from './AdminFeedback';

/**
 * AdminSupport - Support ticket and feedback management
 * Now directly renders AdminFeedback (consolidated view)
 * Contact forms moved to separate /admin/overview/contact route
 * Work Queue moved to /admin/overview/automation
 */
export default function AdminSupport() {
  const { theme } = useOutletContext();
  
  return <AdminFeedback />;
}
