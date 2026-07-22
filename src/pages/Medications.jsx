import { Navigate } from 'react-router-dom';

/** Legacy route — meds live under Supplements → Meds tab. */
export default function Medications() {
  return <Navigate to="/app/supplements?tab=meds" replace />;
}
