/**
 * Google Custom Search API integration for peptide research
 * Provides restricted search results focused on peptides, medical compounds, and amino acids
 */

// Note: In a production environment, these should be environment variables
const GOOGLE_API_KEY = 'YOUR_GOOGLE_API_KEY'; // Replace with actual API key
const SEARCH_ENGINE_ID = 'YOUR_SEARCH_ENGINE_ID'; // Replace with actual Custom Search Engine ID

/**
 * Search Google for peptide-related information
 * @param {string} query - Search term
 * @param {number} num - Number of results (1-10, default 5)
 * @returns {Promise<Array>} - Array of search results
 */
export async function searchPeptideInfo(query, num = 5) {
  // For demo/development, return mock data
  if (!GOOGLE_API_KEY || GOOGLE_API_KEY === 'YOUR_GOOGLE_API_KEY') {
    return getMockSearchResults(query);
  }

  try {
    const restrictedQuery = `${query} peptide OR compound OR amino acid OR medical research`;
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(restrictedQuery)}&num=${num}&safe=active`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return (data.items || []).map(item => ({
      title: item.title,
      snippet: item.snippet,
      link: item.link,
      displayLink: item.displayLink,
      source: 'Google Search'
    }));
    
  } catch (error) {
    console.error('Google search error:', error);
    // Fallback to mock data on error
    return getMockSearchResults(query);
  }
}

/**
 * Mock search results for development/demo
 * @param {string} query - Search term
 * @returns {Array} - Mock search results
 */
function getMockSearchResults(query) {
  const lowerQuery = query.toLowerCase();
  
  // Common peptide search results
  const mockResults = {
    'semaglutide': [
      {
        title: 'Semaglutide: GLP-1 Receptor Agonist for Diabetes and Weight Management',
        snippet: 'Semaglutide is a glucagon-like peptide-1 (GLP-1) receptor agonist used for treating type 2 diabetes and chronic weight management. It mimics the incretin hormone GLP-1.',
        link: 'https://pubmed.ncbi.nlm.nih.gov/semaglutide-research',
        displayLink: 'pubmed.ncbi.nlm.nih.gov',
        source: 'Medical Research'
      },
      {
        title: 'Clinical Efficacy and Safety of Semaglutide',
        snippet: 'Studies show semaglutide significantly reduces HbA1c levels and body weight in patients with type 2 diabetes. Common side effects include nausea and gastrointestinal issues.',
        link: 'https://clinicaltrials.gov/semaglutide-trials',
        displayLink: 'clinicaltrials.gov',
        source: 'Clinical Trials'
      }
    ],
    'tirzepatide': [
      {
        title: 'Tirzepatide: Dual GIP/GLP-1 Receptor Agonist',
        snippet: 'Tirzepatide is a novel dual glucose-dependent insulinotropic polypeptide (GIP) and GLP-1 receptor agonist for diabetes treatment and weight management.',
        link: 'https://pubmed.ncbi.nlm.nih.gov/tirzepatide-mechanism',
        displayLink: 'pubmed.ncbi.nlm.nih.gov',
        source: 'Medical Research'
      }
    ],
    'bpc-157': [
      {
        title: 'BPC-157: Body Protection Compound Research',
        snippet: 'BPC-157 is a pentadecapeptide derived from human gastric juice. Research suggests potential healing properties for tendons, muscles, and gastrointestinal tract.',
        link: 'https://pubmed.ncbi.nlm.nih.gov/bpc157-research',
        displayLink: 'pubmed.ncbi.nlm.nih.gov',
        source: 'Peptide Research'
      }
    ],
    'tb-500': [
      {
        title: 'TB-500 (Thymosin Beta-4): Tissue Repair Peptide',
        snippet: 'TB-500 is a synthetic version of thymosin beta-4, a naturally occurring peptide. Research indicates potential benefits for wound healing and tissue repair.',
        link: 'https://pubmed.ncbi.nlm.nih.gov/tb500-thymosin',
        displayLink: 'pubmed.ncbi.nlm.nih.gov',
        source: 'Regenerative Medicine'
      }
    ],
    'ipamorelin': [
      {
        title: 'Ipamorelin: Growth Hormone Releasing Peptide',
        snippet: 'Ipamorelin is a selective growth hormone secretagogue that stimulates the release of growth hormone from the pituitary gland with minimal side effects.',
        link: 'https://pubmed.ncbi.nlm.nih.gov/ipamorelin-ghrp',
        displayLink: 'pubmed.ncbi.nlm.nih.gov',
        source: 'Endocrinology Research'
      }
    ]
  };
  
  // Find relevant results
  for (const [key, results] of Object.entries(mockResults)) {
    if (lowerQuery.includes(key) || key.includes(lowerQuery)) {
      return results;
    }
  }
  
  // Generic peptide research results
  return [
    {
      title: `${query} - Peptide Research Overview`,
      snippet: `Research information about ${query} and its potential applications in medical therapy. This peptide compound has been studied for various therapeutic uses.`,
      link: `https://pubmed.ncbi.nlm.nih.gov/search/${encodeURIComponent(query)}`,
      displayLink: 'pubmed.ncbi.nlm.nih.gov',
      source: 'Medical Database'
    },
    {
      title: `${query} - Clinical Studies and Safety Profile`,
      snippet: `Clinical research and safety data for ${query}. Review of current studies, dosing protocols, and reported effects in research literature.`,
      link: `https://clinicaltrials.gov/search/${encodeURIComponent(query)}`,
      displayLink: 'clinicaltrials.gov',
      source: 'Clinical Research'
    }
  ];
}

/**
 * Get search suggestions based on query
 * @param {string} query - Partial search term
 * @returns {Array} - Array of suggested search terms
 */
export function getSearchSuggestions(query) {
  const commonPeptides = [
    'Semaglutide', 'Tirzepatide', 'BPC-157', 'TB-500', 'Ipamorelin', 'CJC-1295',
    'Sermorelin', 'GHRP-2', 'GHRP-6', 'Hexarelin', 'Tesamorelin', 'AOD-9604',
    'Melanotan II', 'PT-141', 'Oxytocin', 'Kisspeptin', 'Thymosin Alpha-1',
    'Glutathione', 'NAD+', 'Epithalon', 'GHK-Cu', 'Pentosan Polysulfate'
  ];
  
  if (!query || query.length < 2) return [];
  
  const lowerQuery = query.toLowerCase();
  return commonPeptides
    .filter(peptide => peptide.toLowerCase().includes(lowerQuery))
    .slice(0, 5);
}

export default {
  searchPeptideInfo,
  getSearchSuggestions
};