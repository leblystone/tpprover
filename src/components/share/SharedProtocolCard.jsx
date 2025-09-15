import React from 'react';
import { Play, Calendar, Target, Clock, FileText, Droplet, Repeat, RotateCw, Layers, TrendingUp } from 'lucide-react';
import { formatMMDDYYYY } from '../../utils/date';
import logo from '../../assets/tpp-logo.png';

export default function SharedProtocolCard({ item: p, theme }) {
    if (!p) return null;

    const Icon = ({ I }) => <I size={16} className="mt-0.5 flex-shrink-0" style={{ color: theme.primary }} />;

    return (
        <div className="p-6 rounded-xl border bg-white w-full max-w-md" style={{ borderColor: theme.border, fontFamily: 'sans-serif' }}>
            <header className="flex items-center gap-3 mb-4">
                <img src={logo} alt="The Pep Planner Logo" className="h-12 w-12 rounded-full shadow-md object-cover" />
                <div>
                    <h1 className="font-bold text-lg" style={{ color: theme.primaryDark }}>{p.protocolName || 'Research Protocol'}</h1>
                    <p className="text-xs text-gray-500">Research Protocol</p>
                </div>
            </header>
            
            <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start gap-3"><Icon I={Target} /><span><strong>Purpose:</strong> {p.purpose || 'N/A'}</span></div>
                <div className="flex items-start gap-3"><Icon I={Clock} /><span><strong>Duration:</strong> {p.duration?.noEnd ? 'Ongoing' : (p.duration?.count && p.duration?.unit ? `${p.duration.count} ${p.duration.unit}(s)` : 'N/A')}</span></div>
                {p.washout?.enabled && p.washout?.count > 0 && (
                    <div className="flex items-start gap-3"><Icon I={RotateCw} /><span><strong>Washout:</strong> {p.washout.count} {p.washout.unit}(s)</span></div>
                )}
            </div>

            <hr className="my-4" style={{ borderColor: theme.border }} />
            
            <h2 className="font-semibold text-sm mb-2" style={{ color: theme.text }}>Included Peptides</h2>
            <div className="space-y-2">
                {p.peptides?.map((peptide, index) => (
                    <div key={peptide.id || index} className="text-sm p-2 rounded-md bg-gray-50 flex justify-between items-center">
                        <span className="font-medium">{peptide.name || 'Unnamed Peptide'}</span>
                        <span className="text-xs text-gray-600">
                            {peptide.dosage?.amount > 0 ? `${peptide.dosage.amount} ${peptide.dosage.unit}` : ''}
                        </span>
                    </div>
                ))}
            </div>

            {p.notes && (
                <>
                    <hr className="my-4" style={{ borderColor: theme.border }} />
                    <div className="flex items-start gap-3 text-sm"><Icon I={FileText} /><p><strong>Notes:</strong> <span className="text-xs italic">{p.notes}</span></p></div>
                </>
            )}

            <footer className="text-center mt-6 pt-4 border-t" style={{ borderColor: theme.border }}>
                <p className="text-xs font-semibold" style={{ color: theme.primary }}>The Pep Planner</p>
                <p className="text-xs text-gray-400 mb-2">Organize Your Research</p>
                <p className="text-[10px] text-red-600 font-semibold p-1 bg-red-100 rounded">
                    For Research & Informational Purposes Only. Not for human consumption. The content is user-generated and not endorsed by The Pep Planner.
                </p>
            </footer>
        </div>
    );
}
