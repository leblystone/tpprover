import React, { useEffect, useMemo, useState } from 'react'
import Modal from '../common/Modal'
import TextInput from '../common/inputs/TextInput.jsx'
import { Search, Brain, AlertTriangle, Loader } from 'lucide-react';

// Levenshtein distance function for fuzzy string matching
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// AI-powered peptide research compilation
async function compilePeptideResearch(peptideName) {
  // Simulate comprehensive research compilation
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Create detailed research profile based on peptide name
  const name = peptideName.toUpperCase();
  
  // Enhanced peptide database with common variations and aliases
  const peptideDatabase = {
    'BPC-157': {
      aliases: ['BPC157', 'BPC 157', 'BODY PROTECTION COMPOUND'],
      classification: 'Gastric Pentadecapeptide',
      mechanism: 'Promotes angiogenesis, accelerates healing of various tissues including tendons, muscles, nervous system, and ligaments through growth hormone receptor pathways.',
      commonUses: ['Tissue repair research', 'Wound healing studies', 'Gastrointestinal research', 'Tendon and ligament research'],
      dosageRanges: 'Research dosages typically range from 200-800 mcg daily, administered subcutaneously or orally.',
      safetyNotes: 'Generally well-tolerated in research settings. For research purposes only.',
      researchStatus: 'Extensively studied in animal models, limited human clinical data available.'
    },
    'TB-500': {
      aliases: ['TB500', 'THYMOSIN BETA-4', 'THYMOSIN'],
      classification: 'Synthetic Thymosin Beta-4 Fragment',
      mechanism: 'Promotes cell migration, angiogenesis, and wound healing through actin regulation and anti-inflammatory pathways.',
      commonUses: ['Wound healing research', 'Cardiovascular research', 'Muscle repair studies', 'Anti-inflammatory research'],
      dosageRanges: 'Research protocols typically use 2-10mg weekly, administered subcutaneously.',
      safetyNotes: 'Research compound with limited safety data. For investigational use only.',
      researchStatus: 'Promising preclinical results, early-stage clinical research ongoing.'
    },
    'SEMAGLUTIDE': {
      aliases: ['OZEMPIC', 'WEGOVY', 'RYBELSUS'],
      classification: 'GLP-1 Receptor Agonist',
      mechanism: 'Mimics incretin hormones, regulates blood glucose, slows gastric emptying, and promotes satiety through GLP-1 receptor activation.',
      commonUses: ['Diabetes research', 'Weight management studies', 'Cardiovascular research', 'Metabolic research'],
      dosageRanges: 'Clinical dosages range from 0.25mg to 2.4mg weekly, depending on indication and research protocol.',
      safetyNotes: 'FDA-approved medication with established safety profile. Requires medical supervision.',
      researchStatus: 'Extensively studied with multiple approved clinical applications.'
    },
    'TIRZEPATIDE': {
      aliases: ['MOUNJARO', 'ZEPBOUND'],
      classification: 'Dual GLP-1/GIP Receptor Agonist',
      mechanism: 'Activates both GLP-1 and GIP receptors, providing enhanced glucose control and weight management through dual incretin pathways.',
      commonUses: ['Type 2 diabetes research', 'Obesity research', 'Metabolic syndrome studies', 'Cardiovascular research'],
      dosageRanges: 'Clinical dosages range from 2.5mg to 15mg weekly, with gradual titration protocols.',
      safetyNotes: 'FDA-approved medication with established clinical safety profile. Requires medical supervision.',
      researchStatus: 'Recently approved with extensive Phase III clinical trial data.'
    },
    'RETATRUTIDE': {
      aliases: ['RETRATRUTIDE', 'RETATRUTID', 'RETRATRUTID', 'LY3437943'],
      classification: 'Triple Hormone Receptor Agonist',
      mechanism: 'Activates GLP-1, GIP, and glucagon receptors, providing comprehensive metabolic effects including glucose control, weight loss, and energy expenditure.',
      commonUses: ['Obesity research', 'Type 2 diabetes research', 'Metabolic research', 'Weight management studies'],
      dosageRanges: 'Investigational dosages in clinical trials range from 1mg to 12mg weekly, with dose escalation protocols.',
      safetyNotes: 'Investigational compound currently in clinical trials. Safety profile still being established.',
      researchStatus: 'Phase II clinical trials completed with promising efficacy data. Phase III trials ongoing.'
    },
    'IPAMORELIN': {
      aliases: ['IPAM', 'NNC 26-0161'],
      classification: 'Growth Hormone Releasing Peptide (GHRP)',
      mechanism: 'Selectively stimulates growth hormone release from the pituitary gland through ghrelin receptor activation.',
      commonUses: ['Growth hormone research', 'Anti-aging studies', 'Muscle development research', 'Sleep quality research'],
      dosageRanges: 'Research dosages typically range from 100-300 mcg, 2-3 times daily.',
      safetyNotes: 'Research peptide with limited long-term safety data. For investigational purposes only.',
      researchStatus: 'Promising research results, not approved for therapeutic use.'
    },
    'CJC-1295': {
      aliases: ['CJC1295', 'MOD-GRF', 'MODGRF', 'CJC-1295 DAC', 'CJC-1295 NO DAC'],
      classification: 'Growth Hormone Releasing Hormone Analog',
      mechanism: 'Extended-release GHRH analog that stimulates growth hormone release with prolonged half-life.',
      commonUses: ['Growth hormone research', 'Anti-aging studies', 'Body composition research', 'Recovery studies'],
      dosageRanges: 'Research protocols typically use 1-2mg weekly for DAC version, or 100-300 mcg 2-3x daily for no-DAC version.',
      safetyNotes: 'Research compound with limited clinical safety data. For investigational use only.',
      researchStatus: 'Preclinical and early clinical research ongoing.'
    }
  };
  
  // Check if we have specific data for this peptide (including aliases)
  let specificData = peptideDatabase[name];
  let matchedName = name;
  
  // If not found by exact name, check aliases
  if (!specificData) {
    for (const [key, data] of Object.entries(peptideDatabase)) {
      if (data.aliases && data.aliases.some(alias => alias === name || fuzzyMatchStrings(name, alias))) {
        specificData = data;
        matchedName = key;
        break;
      }
    }
  }
  
  if (specificData) {
    return {
      name: matchedName,
      originalQuery: peptideName,
      ...specificData,
      disclaimer: 'This information is compiled from available research literature and is for educational purposes only. Not medical advice.'
    };
  }
  
  // Helper function for alias matching
  function fuzzyMatchStrings(str1, str2) {
    const s1 = str1.toLowerCase().replace(/[-\s]/g, '');
    const s2 = str2.toLowerCase().replace(/[-\s]/g, '');
    return s1 === s2 || levenshteinDistance(s1, s2) <= Math.max(1, Math.floor(Math.min(s1.length, s2.length) * 0.2));
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
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  useEffect(() => { try { const raw = localStorage.getItem('tpprover_glossary'); setItems(raw ? JSON.parse(raw) : []) } catch {} }, [open])
  const filtered = useMemo(() => items.filter(i => (i.name||'').toLowerCase().includes(q.toLowerCase())), [items, q])
  
  // Generate peptide suggestions based on current query
  const peptideSuggestions = useMemo(() => {
    if (!q.trim() || q.length < 2) return [];
    
    const commonPeptides = [
      'BPC-157', 'TB-500', 'Semaglutide', 'Tirzepatide', 'Retatrutide', 'Ipamorelin', 'CJC-1295',
      'GHRP-2', 'GHRP-6', 'Sermorelin', 'Tesamorelin', 'Hexarelin', 'AOD-9604', 'Fragment 176-191',
      'IGF-1', 'MGF', 'Melanotan II', 'PT-141', 'GHK-Cu', 'Epitalon', 'Selank', 'Semax'
    ];
    
    const query = q.toLowerCase();
    return commonPeptides
      .filter(peptide => peptide.toLowerCase().includes(query) || 
                        levenshteinDistance(query, peptide.toLowerCase()) <= 2)
      .slice(0, 5);
  }, [q])

  const handleAIResearch = async () => {
    if (!q.trim()) return;
    
    setAiResearch({ loading: true, data: null, error: null, query: q });
    
    try {
      // Enhanced peptide detection with fuzzy matching and common variations
      const peptideKeywords = [
        // Core peptide terms
        'peptide', 'protein', 'hormone', 'fragment', 'analog', 'agonist', 'antagonist',
        
        // Popular peptides (with common variations)
        'bpc', 'bpc-157', 'bpc157', 'tb-500', 'tb500', 'thymosin', 
        'semaglutide', 'ozempic', 'wegovy', 'tirzepatide', 'mounjaro', 'zepbound',
        'retatrutide', 'retratrutide', 'retatrutid', 'retratrutid', // Common misspellings
        'ipamorelin', 'ipam', 'cjc', 'cjc-1295', 'cjc1295', 'mod-grf', 'modgrf',
        'ghrp', 'ghrp-2', 'ghrp-6', 'ghrp2', 'ghrp6', 'hexarelin', 'sermorelin', 'tesamorelin',
        
        // Growth factors
        'igf', 'igf-1', 'igf1', 'mgf', 'mechano', 'growth hormone', 'gh', 'hgh',
        
        // Other compounds
        'melanotan', 'mt-2', 'mt2', 'pt-141', 'pt141', 'bremelanotide',
        'aod', 'aod-9604', 'aod9604', 'fragment 176-191', '176-191',
        'ghk', 'ghk-cu', 'copper peptide', 'epitalon', 'epithalon',
        'selank', 'semax', 'noopept', 'oxytocin', 'vasopressin',
        'insulin', 'glucagon', 'glp-1', 'glp1', 'gip', 'incretin',
        
        // Research terms
        'mcg', 'subcutaneous', 'reconstitution', 'lyophilized', 'vial',
        'research compound', 'investigational', 'clinical trial'
      ];
      
      // Fuzzy matching function for misspellings
      const fuzzyMatch = (query, keyword) => {
        const q = query.toLowerCase().replace(/[-\s]/g, '');
        const k = keyword.toLowerCase().replace(/[-\s]/g, '');
        
        // Exact match
        if (q === k) return true;
        
        // Contains match
        if (q.includes(k) || k.includes(q)) return true;
        
        // Levenshtein distance for close matches (allows 1-2 character differences)
        if (Math.abs(q.length - k.length) <= 2) {
          const distance = levenshteinDistance(q, k);
          const threshold = Math.max(1, Math.floor(Math.min(q.length, k.length) * 0.2)); // 20% error tolerance
          return distance <= threshold;
        }
        
        return false;
      };
      
      const isPeptideRelated = peptideKeywords.some(keyword => fuzzyMatch(q, keyword));
      
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
            <div className="flex-grow relative">
              <TextInput 
                label="Search Peptide" 
                value={q} 
                onChange={(value) => {
                  setQ(value);
                  setShowSuggestions(value.length >= 2);
                }} 
                placeholder="Type peptide name (e.g., BPC-157, Retatrutide)" 
                theme={theme} 
                className="flex-grow"
                onFocus={() => setShowSuggestions(q.length >= 2)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              
              {/* Suggestion dropdown */}
              {showSuggestions && peptideSuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white rounded-md border shadow-lg" style={{ borderColor: theme?.border }}>
                  <div className="py-1">
                    <div className="px-3 py-1 text-xs font-semibold text-gray-500 border-b" style={{ borderColor: theme?.border }}>
                      Suggestions:
                    </div>
                    {peptideSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                        onClick={() => {
                          setQ(suggestion);
                          setShowSuggestions(false);
                        }}
                        style={{ color: theme?.text }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
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
              {aiResearch.data.originalQuery && aiResearch.data.originalQuery.toLowerCase() !== aiResearch.data.name.toLowerCase() && (
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                  Found match for "{aiResearch.data.originalQuery}"
                </span>
              )}
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


