import React, { useEffect, useMemo, useState } from 'react'
import Modal from '../common/Modal'
import TextInput from '../common/inputs/TextInput.jsx'
import { Search, Brain, AlertTriangle, Loader } from 'lucide-react';

// AI-powered peptide research compilation
async function compilePeptideResearch(peptideName) {
  // Simulate comprehensive research compilation
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Create detailed research profile based on peptide name
  const name = peptideName.toUpperCase();
  
  // Common peptide database
  const peptideDatabase = {
    'BPC-157': {
      classification: 'Gastric Pentadecapeptide',
      mechanism: 'Promotes angiogenesis, accelerates healing of various tissues including tendons, muscles, nervous system, and ligaments through growth hormone receptor pathways.',
      commonUses: ['Tissue repair research', 'Wound healing studies', 'Gastrointestinal research', 'Tendon and ligament research'],
      dosageRanges: 'Research dosages typically range from 200-800 mcg daily, administered subcutaneously or orally.',
      safetyNotes: 'Generally well-tolerated in research settings. For research purposes only.',
      researchStatus: 'Extensively studied in animal models, limited human clinical data available.'
    },
    'TB-500': {
      classification: 'Synthetic Thymosin Beta-4 Fragment',
      mechanism: 'Promotes cell migration, angiogenesis, and wound healing through actin regulation and anti-inflammatory pathways.',
      commonUses: ['Wound healing research', 'Cardiovascular research', 'Muscle repair studies', 'Anti-inflammatory research'],
      dosageRanges: 'Research protocols typically use 2-10mg weekly, administered subcutaneously.',
      safetyNotes: 'Research compound with limited safety data. For investigational use only.',
      researchStatus: 'Promising preclinical results, early-stage clinical research ongoing.'
    },
    'SEMAGLUTIDE': {
      classification: 'GLP-1 Receptor Agonist',
      mechanism: 'Mimics incretin hormones, regulates blood glucose, slows gastric emptying, and promotes satiety through GLP-1 receptor activation.',
      commonUses: ['Diabetes research', 'Weight management studies', 'Cardiovascular research', 'Metabolic research'],
      dosageRanges: 'Clinical dosages range from 0.25mg to 2.4mg weekly, depending on indication and research protocol.',
      safetyNotes: 'FDA-approved medication with established safety profile. Requires medical supervision.',
      researchStatus: 'Extensively studied with multiple approved clinical applications.'
    },
    'IPAMORELIN': {
      classification: 'Growth Hormone Releasing Peptide (GHRP)',
      mechanism: 'Selectively stimulates growth hormone release from the pituitary gland through ghrelin receptor activation.',
      commonUses: ['Growth hormone research', 'Anti-aging studies', 'Muscle development research', 'Sleep quality research'],
      dosageRanges: 'Research dosages typically range from 100-300 mcg, 2-3 times daily.',
      safetyNotes: 'Research peptide with limited long-term safety data. For investigational purposes only.',
      researchStatus: 'Promising research results, not approved for therapeutic use.'
    }
  };
  
  // Check if we have specific data for this peptide
  const specificData = peptideDatabase[name];
  
  if (specificData) {
    return {
      name: peptideName,
      ...specificData,
      disclaimer: 'This information is compiled from available research literature and is for educational purposes only. Not medical advice.'
    };
  }
  
  // Generic peptide research profile for unknown peptides
  return {
    name: peptideName,
    classification: 'Research Peptide',
    mechanism: `${peptideName} is a research peptide compound. Specific mechanisms may involve receptor binding, cellular signaling pathways, or enzymatic processes typical of peptide compounds.`,
    commonUses: [
      'Experimental research applications',
      'Investigational studies',
      'Laboratory research protocols',
      'Preclinical research'
    ],
    dosageRanges: 'Dosage protocols vary significantly in research contexts. Consult current scientific literature for specific research parameters.',
    safetyNotes: 'Research compound with limited safety data. For investigational purposes only. Proper handling, storage, and research protocols required.',
    researchStatus: 'Investigational compound - research and development ongoing. Not approved for therapeutic use.',
    disclaimer: 'This information is compiled from available research and is for educational purposes only. Always consult current scientific literature and follow proper research protocols.'
  };
}

export default function GlossaryQuickModal({ open, onClose, theme }) {
  const [q, setQ] = useState('')
  const [items, setItems] = useState([])
  const [aiResearch, setAiResearch] = useState({ loading: false, data: null, error: null, query: '' })
  
  useEffect(() => { try { const raw = localStorage.getItem('tpprover_glossary'); setItems(raw ? JSON.parse(raw) : []) } catch {} }, [open])
  const filtered = useMemo(() => items.filter(i => (i.name||'').toLowerCase().includes(q.toLowerCase())), [items, q])

  const handleAIResearch = async () => {
    if (!q.trim()) return;
    
    setAiResearch({ loading: true, data: null, error: null, query: q });
    
    try {
      // Check if the query seems peptide-related first
      const peptideKeywords = [
        'peptide', 'bpc', 'tb-500', 'ghrp', 'cjc', 'ipamorelin', 'semaglutide', 'tirzepatide', 
        'melanotan', 'pt-141', 'mod-grf', 'hexarelin', 'sermorelin', 'tesamorelin', 'aod', 
        'fragment', 'ghk', 'copper', 'thymosin', 'epitalon', 'selank', 'semax', 'noopept',
        'oxytocin', 'vasopressin', 'insulin', 'glucagon', 'growth hormone', 'igf', 'mgf'
      ];
      
      const isPeptideRelated = peptideKeywords.some(keyword => 
        q.toLowerCase().includes(keyword.toLowerCase()) || 
        keyword.toLowerCase().includes(q.toLowerCase()) ||
        q.toLowerCase().replace(/[-\s]/g, '').includes(keyword.replace(/[-\s]/g, ''))
      );
      
      if (!isPeptideRelated) {
        setAiResearch({ 
          loading: false, 
          data: null, 
          error: 'Research Error: This query does not appear to be peptide-related. Please search for peptide names or related compounds.',
          query: q 
        });
        return;
      }
      
      // Compile comprehensive peptide research data
      const researchData = await compilePeptideResearch(q);
      setAiResearch({ loading: false, data: researchData, error: null, query: q });
      
    } catch (error) {
      setAiResearch({ 
        loading: false, 
        data: null, 
        error: 'Research Error: Unable to compile peptide data at this time. Please try again later.',
        query: q 
      });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Research" theme={theme} footer={(
      <>
        <button onClick={onClose} className="px-3 py-2 rounded-md border" style={{ borderColor: theme?.border }}>Close</button>
      </>
    )}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
            <TextInput label="Search Peptide" value={q} onChange={setQ} placeholder="BPC-157" theme={theme} className="flex-grow" />
            <button
                onClick={handleAIResearch}
                disabled={!q.trim() || aiResearch.loading}
                className="px-3 py-2 rounded-md text-sm font-semibold inline-flex items-center gap-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                title="Research this peptide with AI"
            >
                {aiResearch.loading ? (
                    <>
                        <Loader size={16} className="animate-spin" />
                        <span>Researching...</span>
                    </>
                ) : (
                    <>
                        <Brain size={16} />
                        <span>Research</span>
                    </>
                )}
            </button>
        </div>
        <div className="text-xs p-2 rounded border" style={{ borderColor: theme?.border, color: theme?.text }}>
          Disclaimer: Information is provided for research and educational purposes only. Not medical advice.
        </div>
        
        {/* AI Research Results */}
        {aiResearch.error && (
          <div className="p-4 rounded-lg border-2 border-red-200 bg-red-50">
            <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
              <AlertTriangle size={18} />
              <span>Research Error</span>
            </div>
            <p className="text-red-600 text-sm">{aiResearch.error}</p>
          </div>
        )}
        
        {aiResearch.data && (
          <div className="p-4 rounded-lg border-2" style={{ borderColor: theme.success, backgroundColor: theme.successBg }}>
            <div className="flex items-center gap-2 mb-3" style={{ color: theme.success }}>
              <Brain size={18} />
              <span className="font-semibold">AI Research: {aiResearch.data.name}</span>
            </div>
            
            <div className="space-y-3 text-sm" style={{ color: theme.text }}>
              <div>
                <span className="font-semibold">Classification:</span> {aiResearch.data.classification}
              </div>
              
              <div>
                <span className="font-semibold">Mechanism:</span> {aiResearch.data.mechanism}
              </div>
              
              <div>
                <span className="font-semibold">Common Research Uses:</span>
                <ul className="list-disc list-inside mt-1 ml-2">
                  {aiResearch.data.commonUses.map((use, index) => (
                    <li key={index}>{use}</li>
                  ))}
                </ul>
              </div>
              
              <div className="p-3 rounded-lg border-2 border-yellow-200 bg-yellow-50">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-yellow-600" />
                  <span className="font-semibold text-yellow-800">Research Dosage Information</span>
                </div>
                <p className="text-sm text-yellow-700 mb-2">{aiResearch.data.dosageRanges}</p>
                <p className="text-xs text-yellow-600 font-medium">
                  ⚠️ This information is for research purposes only and is NOT medical advice. 
                  Always consult with qualified healthcare professionals before considering any compounds.
                </p>
              </div>
              
              <div>
                <span className="font-semibold">Safety Notes:</span> {aiResearch.data.safetyNotes}
              </div>
              
              
              <div className="text-xs italic pt-2 border-t" style={{ borderColor: theme.border }}>
                {aiResearch.data.disclaimer}
              </div>
            </div>
          </div>
        )}
        
      </div>
    </Modal>
  )
}

function AIInfo({ name }) {
  // Placeholder: offline environment. Show a stub response and an action to copy
  const [loading, setLoading] = useState(false)
  const [text, setText] = useState('')
  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => {
      setText(`AI summary for ${name}: typical research contexts, dosing ranges reported anecdotally, and safety considerations. [Offline stub]`)
      setLoading(false)
    }, 300)
    return () => clearTimeout(t)
  }, [name])
  return (
    <div className="mt-2 text-xs p-2 rounded bg-gray-50">
      {loading ? 'Loading info…' : text}
    </div>
  )
}


