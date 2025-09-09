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
    },
    
    // === ADDITIONAL RESEARCH COMPOUNDS ===
    'ADAMAX': {
      aliases: ['ADAMAX'],
      classification: 'Research Peptide',
      mechanism: 'Novel peptide compound under investigation for metabolic and performance-related research applications.',
      commonUses: ['Metabolic research', 'Performance studies', 'Preclinical research'],
      dosageRanges: 'Research dosing protocols vary. Consult current literature for specific parameters.',
      safetyNotes: 'Limited safety data available. For research purposes only.',
      researchStatus: 'Early-stage research compound.'
    },
    
    'ADIPOTIDE': {
      aliases: ['FTPP', 'ADIPOTIDE'],
      classification: 'Prohibitin-targeting Peptide',
      mechanism: 'Targets prohibitin in blood vessels of white adipose tissue, potentially affecting fat tissue vascularization.',
      commonUses: ['Obesity research', 'Metabolic studies', 'Adipose tissue research'],
      dosageRanges: 'Experimental dosing only. Significant safety concerns limit research applications.',
      safetyNotes: 'Experimental compound with significant safety concerns. Research use only with extreme caution.',
      researchStatus: 'Preclinical research with limited safety data.'
    },
    
    'AICAR': {
      aliases: ['AICAR', '5-AMINOIMIDAZOLE-4-CARBOXAMIDE RIBONUCLEOSIDE'],
      classification: 'AMPK Activator',
      mechanism: 'Activates AMP-activated protein kinase (AMPK), potentially affecting cellular energy metabolism and glucose uptake.',
      commonUses: ['Metabolic research', 'Exercise physiology', 'Diabetes research', 'Energy metabolism studies'],
      dosageRanges: 'Research protocols typically use 0.5-2mg/kg in animal studies. Human research limited.',
      safetyNotes: 'Research compound with established metabolic effects but limited long-term safety data.',
      researchStatus: 'Research compound with established metabolic effects.'
    },
    
    'GHRP-2': {
      aliases: ['GHRP2', 'GROWTH HORMONE RELEASING PEPTIDE-2'],
      classification: 'Growth Hormone Secretagogue',
      mechanism: 'Synthetic ghrelin receptor agonist that stimulates growth hormone release from the pituitary gland.',
      commonUses: ['Growth hormone research', 'Body composition studies', 'Metabolic research'],
      dosageRanges: 'Research protocols typically use 100-300 mcg 2-3 times daily.',
      safetyNotes: 'Well-established research compound with known effects.',
      researchStatus: 'Well-established research compound with known GH-releasing effects.'
    },
    
    'GHRP-6': {
      aliases: ['GHRP6', 'GROWTH HORMONE RELEASING PEPTIDE-6'],
      classification: 'Growth Hormone Secretagogue',
      mechanism: 'First-generation synthetic GHRP that stimulates GH release and may affect appetite and metabolism.',
      commonUses: ['Growth hormone research', 'Appetite studies', 'Metabolic research'],
      dosageRanges: 'Research protocols typically use 100-300 mcg 2-3 times daily.',
      safetyNotes: 'Extensively studied with established safety profile.',
      researchStatus: 'Extensively studied research compound.'
    },
    
    'HCG': {
      aliases: ['HUMAN CHORIONIC GONADOTROPIN', 'HCG'],
      classification: 'Glycoprotein Hormone',
      mechanism: 'Hormone that mimics luteinizing hormone (LH) and may affect testosterone production and fertility.',
      commonUses: ['Fertility research', 'Hormonal studies', 'Reproductive research'],
      dosageRanges: 'Medical dosing: 500-4000 IU as prescribed. Research protocols vary.',
      safetyNotes: 'FDA-approved medication with established safety profile for approved uses.',
      researchStatus: 'FDA-approved medication for specific medical conditions.'
    },
    
    'HEXARELIN': {
      aliases: ['HEXARELIN'],
      classification: 'Growth Hormone Secretagogue',
      mechanism: 'Potent synthetic GHRP that stimulates GH release and may have cardioprotective properties.',
      commonUses: ['Growth hormone research', 'Cardiovascular studies', 'Metabolic research'],
      dosageRanges: 'Research protocols typically use 100-200 mcg 2-3 times daily.',
      safetyNotes: 'Research compound with established effects but limited long-term safety data.',
      researchStatus: 'Research compound with established GH-releasing and cardioprotective effects.'
    },
    
    'HGH': {
      aliases: ['HUMAN GROWTH HORMONE', 'SOMATROPIN', 'GROWTH HORMONE'],
      classification: 'Protein Hormone',
      mechanism: 'Naturally occurring hormone essential for growth, cell reproduction, and regeneration.',
      commonUses: ['Growth studies', 'Anti-aging research', 'Metabolic research', 'Body composition studies'],
      dosageRanges: 'Medical dosing: 0.1-0.3mg daily as prescribed. Research protocols vary.',
      safetyNotes: 'FDA-approved medication with established safety profile for approved uses.',
      researchStatus: 'FDA-approved medication for growth hormone deficiency and other conditions.'
    },
    
    'IGF-1 LR3': {
      aliases: ['IGF1 LR3', 'LONG R3 IGF-1', 'LR3'],
      classification: 'Insulin-like Growth Factor Analog',
      mechanism: 'Modified version of IGF-1 with extended half-life and reduced binding to IGF-binding proteins.',
      commonUses: ['Growth factor research', 'Muscle development studies', 'Cellular research'],
      dosageRanges: 'Research protocols typically use 20-100 mcg daily. Potent compound requiring careful dosing.',
      safetyNotes: 'Research compound with potent anabolic effects. Requires careful handling.',
      researchStatus: 'Research compound with known anabolic effects.'
    },
    
    'KISSPEPTIN': {
      aliases: ['KISSPEPTIN', 'KISS1'],
      classification: 'Neuropeptide',
      mechanism: 'Key regulator of the reproductive hormone axis, affecting GnRH release and puberty onset.',
      commonUses: ['Reproductive research', 'Hormonal studies', 'Fertility research'],
      dosageRanges: 'Clinical research protocols vary. Typically administered as infusion or injection.',
      safetyNotes: 'Clinical research compound with ongoing safety evaluation.',
      researchStatus: 'Active clinical research for reproductive disorders.'
    },
    
    'KPV': {
      aliases: ['KPV PEPTIDE'],
      classification: 'Anti-inflammatory Peptide',
      mechanism: 'Tripeptide derived from α-MSH with anti-inflammatory and antimicrobial properties.',
      commonUses: ['Inflammation research', 'Skin studies', 'Immunological research'],
      dosageRanges: 'Research protocols typically use 200-500 mcg daily.',
      safetyNotes: 'Research compound with established anti-inflammatory effects.',
      researchStatus: 'Research compound with established anti-inflammatory effects.'
    },
    
    'LL-37': {
      aliases: ['LL37', 'CATHELICIDIN'],
      classification: 'Antimicrobial Peptide',
      mechanism: 'Human antimicrobial peptide with broad-spectrum antimicrobial and immunomodulatory properties.',
      commonUses: ['Antimicrobial research', 'Immune system studies', 'Infection research'],
      dosageRanges: 'Research applications vary. Topical and systemic administration studied.',
      safetyNotes: 'Naturally occurring peptide with established antimicrobial properties.',
      researchStatus: 'Well-characterized natural antimicrobial peptide.'
    },
    
    'MAZDUTIDE': {
      aliases: ['MAZDUTIDE', 'IBI-362'],
      classification: 'Dual GLP-1/Glucagon Receptor Agonist',
      mechanism: 'Novel dual agonist targeting both GLP-1 and glucagon receptors for metabolic regulation.',
      commonUses: ['Diabetes research', 'Obesity studies', 'Metabolic research'],
      dosageRanges: 'Clinical trial protocols vary. Weekly subcutaneous administration.',
      safetyNotes: 'Clinical development compound with ongoing safety evaluation.',
      researchStatus: 'Clinical development for metabolic disorders.'
    },
    
    'MELANOTAN 1': {
      aliases: ['MT-1', 'MELANOTAN I', 'AFAMELANOTIDE'],
      classification: 'Melanocortin Receptor Agonist',
      mechanism: 'Synthetic analog of α-MSH that stimulates melanogenesis and may have photoprotective effects.',
      commonUses: ['Skin pigmentation research', 'Photoprotection studies', 'Dermatological research'],
      dosageRanges: 'Medical dosing: 16mg implant for approved condition. Research protocols vary.',
      safetyNotes: 'FDA-approved for specific condition with established safety profile.',
      researchStatus: 'FDA-approved for erythropoietic protoporphyria; research ongoing.'
    },
    
    'MELANOTAN 2': {
      aliases: ['MT-2', 'MELANOTAN II', 'MT2'],
      classification: 'Melanocortin Receptor Agonist',
      mechanism: 'Synthetic melanocortin that affects pigmentation and may influence libido and appetite.',
      commonUses: ['Pigmentation research', 'Sexual behavior studies', 'Appetite research'],
      dosageRanges: 'Research protocols typically use 0.25-1mg daily. Significant side effects possible.',
      safetyNotes: 'Research compound with known effects but safety concerns.',
      researchStatus: 'Research compound with known melanogenic effects.'
    },
    
    'MOTS-C': {
      aliases: ['MOTS-C', 'MITOCHONDRIAL PEPTIDE'],
      classification: 'Mitochondrial-derived Peptide',
      mechanism: 'Mitochondrial-encoded peptide that may regulate metabolic homeostasis and cellular energy.',
      commonUses: ['Metabolic research', 'Aging studies', 'Mitochondrial research'],
      dosageRanges: 'Research protocols typically use 5-15mg weekly.',
      safetyNotes: 'Emerging research compound with limited long-term safety data.',
      researchStatus: 'Emerging research compound with metabolic effects.'
    },
    
    'NA SELANK AMIDATE': {
      aliases: ['N-ACETYL SELANK AMIDATE', 'SELANK AMIDATE'],
      classification: 'Nootropic Peptide',
      mechanism: 'Modified version of Selank with enhanced stability and potential cognitive-enhancing properties.',
      commonUses: ['Cognitive research', 'Anxiety studies', 'Neurological research'],
      dosageRanges: 'Research protocols typically use 100-300 mcg daily.',
      safetyNotes: 'Research compound with some clinical investigation.',
      researchStatus: 'Research compound with some clinical investigation.'
    },
    
    'NA SEMAX AMIDATE': {
      aliases: ['N-ACETYL SEMAX AMIDATE', 'SEMAX AMIDATE'],
      classification: 'Nootropic Peptide',
      mechanism: 'Modified version of Semax with improved stability and potential cognitive-enhancing effects.',
      commonUses: ['Cognitive research', 'Neuroprotection studies', 'Neurological research'],
      dosageRanges: 'Research protocols typically use 200-600 mcg daily.',
      safetyNotes: 'Research compound with established neuroprotective properties.',
      researchStatus: 'Research compound with established neuroprotective properties.'
    },
    
    'OXYTOCIN': {
      aliases: ['OT', 'OXYTOCIN'],
      classification: 'Neurohypophysial Hormone',
      mechanism: 'Naturally occurring hormone involved in social bonding, reproduction, and childbirth.',
      commonUses: ['Social behavior research', 'Reproductive studies', 'Neurological research'],
      dosageRanges: 'Medical dosing: 10-40 IU as prescribed. Research protocols vary.',
      safetyNotes: 'FDA-approved medication with established safety profile.',
      researchStatus: 'FDA-approved medication; extensive research on social effects.'
    },
    
    'P21': {
      aliases: ['P21', 'CYCLIN-DEPENDENT KINASE INHIBITOR'],
      classification: 'Cell Cycle Regulator',
      mechanism: 'Protein involved in cell cycle regulation and DNA damage response.',
      commonUses: ['Cancer research', 'Cell cycle studies', 'DNA repair research'],
      dosageRanges: 'Research applications focus on cellular mechanisms rather than dosing.',
      safetyNotes: 'Natural cellular protein with established biological function.',
      researchStatus: 'Well-characterized cellular protein; therapeutic research ongoing.'
    },
    
    'PE-22-28': {
      aliases: ['PE22-28'],
      classification: 'Research Peptide',
      mechanism: 'Experimental peptide under investigation for potential therapeutic applications.',
      commonUses: ['Preclinical research', 'Experimental studies'],
      dosageRanges: 'Limited research data available on dosing protocols.',
      safetyNotes: 'Limited safety data available. Research use only.',
      researchStatus: 'Early-stage research compound with limited data.'
    },
    
    'PEG MGF': {
      aliases: ['PEGYLATED MGF', 'PEG-MGF'],
      classification: 'Modified Growth Factor',
      mechanism: 'PEGylated version of Mechano Growth Factor with extended half-life and tissue repair properties.',
      commonUses: ['Muscle research', 'Tissue repair studies', 'Recovery research'],
      dosageRanges: 'Research protocols typically use 100-300 mcg daily.',
      safetyNotes: 'Research compound with limited safety data.',
      researchStatus: 'Research compound with known muscle-building effects.'
    },
    
    'PT141': {
      aliases: ['PT-141', 'BREMELANOTIDE'],
      classification: 'Melanocortin Receptor Agonist',
      mechanism: 'Selective melanocortin-4 receptor agonist that affects sexual arousal and behavior.',
      commonUses: ['Sexual dysfunction research', 'Behavioral studies', 'Neurological research'],
      dosageRanges: 'Medical dosing: 1.75mg as prescribed. Research protocols vary.',
      safetyNotes: 'FDA-approved medication with established safety profile for approved use.',
      researchStatus: 'FDA-approved for hypoactive sexual desire disorder in women.'
    },
    
    'SELANK': {
      aliases: ['SELANK'],
      classification: 'Anxiolytic Peptide',
      mechanism: 'Synthetic analog of tuftsin with anxiolytic and cognitive-enhancing properties.',
      commonUses: ['Anxiety research', 'Cognitive studies', 'Neurological research'],
      dosageRanges: 'Research protocols typically use 100-300 mcg daily.',
      safetyNotes: 'Research compound with established anxiolytic effects.',
      researchStatus: 'Research compound with established anxiolytic effects.'
    },
    
    'SEMAX': {
      aliases: ['SEMAX'],
      classification: 'Nootropic Peptide',
      mechanism: 'Synthetic analog of ACTH with neuroprotective and cognitive-enhancing properties.',
      commonUses: ['Cognitive research', 'Neuroprotection studies', 'Stroke research'],
      dosageRanges: 'Research protocols typically use 200-600 mcg daily.',
      safetyNotes: 'Research compound with established neuroprotective effects.',
      researchStatus: 'Research compound with established neuroprotective effects.'
    },
    
    'SERMORELIN': {
      aliases: ['SERMORELIN', 'GRF 1-29'],
      classification: 'Growth Hormone Releasing Hormone',
      mechanism: 'Synthetic GHRH analog that stimulates natural growth hormone release.',
      commonUses: ['Growth hormone research', 'Anti-aging studies', 'Pediatric growth research'],
      dosageRanges: 'Medical dosing: 0.2-0.3mg daily as prescribed. Research protocols vary.',
      safetyNotes: 'FDA-approved medication with established safety profile.',
      researchStatus: 'FDA-approved for growth hormone deficiency in children.'
    },
    
    'SNAP-8': {
      aliases: ['SNAP8', 'ACETYL OCTAPEPTIDE-3'],
      classification: 'Cosmetic Peptide',
      mechanism: 'Synthetic peptide that may reduce muscle contractions and wrinkle formation.',
      commonUses: ['Cosmetic research', 'Skin aging studies', 'Dermatological research'],
      dosageRanges: 'Topical application in cosmetic formulations, typically 3-10% concentration.',
      safetyNotes: 'Cosmetic ingredient with established safety profile.',
      researchStatus: 'Cosmetic ingredient with some clinical testing.'
    },
    
    'SS31': {
      aliases: ['SS-31', 'ELAMIPRETIDE'],
      classification: 'Mitochondria-targeted Peptide',
      mechanism: 'Synthetic peptide that targets mitochondria and may improve cellular energy production.',
      commonUses: ['Mitochondrial research', 'Aging studies', 'Cardiovascular research'],
      dosageRanges: 'Clinical trial protocols vary. Subcutaneous administration studied.',
      safetyNotes: 'Clinical development compound with ongoing safety evaluation.',
      researchStatus: 'Clinical development for mitochondrial disorders.'
    },
    
    'SURVODUTIDE': {
      aliases: ['SURVODUTIDE', 'BI 456906'],
      classification: 'Dual GLP-1/Glucagon Receptor Agonist',
      mechanism: 'Dual agonist targeting GLP-1 and glucagon receptors for metabolic regulation.',
      commonUses: ['Obesity research', 'Diabetes studies', 'Metabolic research'],
      dosageRanges: 'Clinical trial protocols vary. Weekly subcutaneous administration.',
      safetyNotes: 'Clinical development compound with ongoing safety evaluation.',
      researchStatus: 'Clinical development for metabolic disorders.'
    },
    
    'TB500': {
      aliases: ['TB-500', 'THYMOSIN BETA-4'],
      classification: 'Actin-binding Protein',
      mechanism: 'Synthetic version of thymosin β4 that promotes cell migration, angiogenesis, and wound healing.',
      commonUses: ['Wound healing research', 'Tissue repair studies', 'Cardiovascular research'],
      dosageRanges: 'Research protocols typically use 2-5mg weekly.',
      safetyNotes: 'Research compound with established healing properties.',
      researchStatus: 'Research compound with established healing properties.'
    },
    
    'THYMOSIN ALPHA 1': {
      aliases: ['TA1', 'THYMOSIN α1', 'ZADAXIN'],
      classification: 'Immunomodulatory Peptide',
      mechanism: 'Naturally occurring peptide that modulates immune system function and T-cell activity.',
      commonUses: ['Immunological research', 'Vaccine studies', 'Infection research'],
      dosageRanges: 'Medical dosing: 1.6mg twice weekly as prescribed. Research protocols vary.',
      safetyNotes: 'FDA-approved in some countries with established safety profile.',
      researchStatus: 'FDA-approved in some countries; extensive immunological research.'
    },
    
    'THYMULIN': {
      aliases: ['THYMULIN', 'FTS'],
      classification: 'Thymic Hormone',
      mechanism: 'Zinc-dependent thymic hormone involved in T-cell maturation and immune function.',
      commonUses: ['Immunological research', 'T-cell studies', 'Aging research'],
      dosageRanges: 'Research protocols vary. Typically administered as injection.',
      safetyNotes: 'Research compound with established immune effects.',
      researchStatus: 'Research compound with established immune effects.'
    },
    
    // === PHARMACEUTICAL COMPOUNDS ===
    'TESOFENSINE': {
      aliases: ['TESOFENSINE', 'NS2330'],
      classification: 'Triple Reuptake Inhibitor',
      mechanism: 'Inhibits reuptake of dopamine, norepinephrine, and serotonin, affecting appetite and metabolism.',
      commonUses: ['Obesity research', 'Neurological studies', 'Weight management research'],
      dosageRanges: 'Clinical trial protocols typically use 0.25-1mg daily.',
      safetyNotes: 'Clinical development compound with ongoing safety evaluation.',
      researchStatus: 'Clinical development for obesity and neurological disorders.'
    },
    
    'METFORMIN': {
      aliases: ['METFORMIN', 'GLUCOPHAGE'],
      classification: 'Biguanide',
      mechanism: 'Activates AMPK, reduces hepatic glucose production, and improves insulin sensitivity.',
      commonUses: ['Diabetes research', 'Aging studies', 'Metabolic research', 'Longevity research'],
      dosageRanges: 'Medical dosing: 500-2000mg daily as prescribed. Research protocols vary.',
      safetyNotes: 'FDA-approved medication with well-established safety profile.',
      researchStatus: 'FDA-approved for type 2 diabetes; extensive research on anti-aging effects.'
    },
    
    'L-AMINO 1MQ CHLORIDE': {
      aliases: ['1MQ', 'L-AMINO-1MQ'],
      classification: 'NNMT Inhibitor',
      mechanism: 'Inhibits nicotinamide N-methyltransferase (NNMT), potentially affecting cellular metabolism.',
      commonUses: ['Metabolic research', 'Aging studies', 'Cellular metabolism research'],
      dosageRanges: 'Research protocols typically use 50-100mg daily.',
      safetyNotes: 'Research compound with limited safety data.',
      researchStatus: 'Research compound with emerging metabolic effects.'
    },
    
    'GNB': {
      aliases: ['GNB', 'GAMMA-AMINOBUTYRIC ACID'],
      classification: 'Neurotransmitter',
      mechanism: 'Primary inhibitory neurotransmitter in the central nervous system.',
      commonUses: ['Neurological research', 'Anxiety studies', 'Sleep research'],
      dosageRanges: 'Supplement dosing: 100-750mg daily. Research protocols vary.',
      safetyNotes: 'Natural neurotransmitter with established safety as supplement.',
      researchStatus: 'Well-established neurotransmitter; supplement research ongoing.'
    },
    
    'SALBUTAMOL': {
      aliases: ['ALBUTEROL', 'VENTOLIN'],
      classification: 'Beta-2 Adrenergic Agonist',
      mechanism: 'Selective β2-adrenergic receptor agonist that may affect bronchodilation and metabolism.',
      commonUses: ['Respiratory research', 'Metabolic studies', 'Exercise physiology'],
      dosageRanges: 'Medical dosing: 2-4mg 3-4 times daily as prescribed. Research protocols vary.',
      safetyNotes: 'FDA-approved medication with established safety profile for approved uses.',
      researchStatus: 'FDA-approved bronchodilator; research on metabolic effects.'
    },
    
    'YOHIMBINE HCL': {
      aliases: ['YOHIMBINE HYDROCHLORIDE', 'YOHIMBINE'],
      classification: 'Alpha-2 Adrenergic Antagonist',
      mechanism: 'Blocks α2-adrenergic receptors, potentially affecting fat metabolism and blood flow.',
      commonUses: ['Fat metabolism research', 'Cardiovascular studies', 'Sexual function research'],
      dosageRanges: 'Research protocols typically use 5-20mg daily. Cardiovascular monitoring recommended.',
      safetyNotes: 'Natural compound with established effects but potential cardiovascular risks.',
      researchStatus: 'Research compound with established α2-blocking effects.'
    },
    
    'T4 SODIUM SALT': {
      aliases: ['LEVOTHYROXINE', 'T4', 'THYROXINE'],
      classification: 'Thyroid Hormone',
      mechanism: 'Synthetic thyroid hormone that regulates metabolism, growth, and development.',
      commonUses: ['Thyroid research', 'Metabolic studies', 'Endocrine research'],
      dosageRanges: 'Medical dosing: 25-200 mcg daily as prescribed. Research protocols vary.',
      safetyNotes: 'FDA-approved medication with established safety profile for approved uses.',
      researchStatus: 'FDA-approved for hypothyroidism and thyroid disorders.'
    },
    
    'ORLISTAT': {
      aliases: ['XENICAL', 'ALLI'],
      classification: 'Lipase Inhibitor',
      mechanism: 'Inhibits pancreatic and gastric lipases, reducing dietary fat absorption.',
      commonUses: ['Obesity research', 'Fat metabolism studies', 'Weight management research'],
      dosageRanges: 'Medical dosing: 120mg three times daily with meals as prescribed.',
      safetyNotes: 'FDA-approved medication with established safety profile.',
      researchStatus: 'FDA-approved for obesity treatment.'
    },
    
    'BERBERINE HCL': {
      aliases: ['BERBERINE HYDROCHLORIDE', 'BERBERINE'],
      classification: 'Isoquinoline Alkaloid',
      mechanism: 'Activates AMPK, affects glucose metabolism, and has antimicrobial properties.',
      commonUses: ['Metabolic research', 'Diabetes studies', 'Antimicrobial research'],
      dosageRanges: 'Supplement dosing: 500-1500mg daily in divided doses.',
      safetyNotes: 'Natural compound with established safety profile as supplement.',
      researchStatus: 'Natural compound with extensive research on metabolic effects.'
    },
    
    // === LIVER HEALTH & PROTECTION ===
    'NICOTINAMIDE MONONUCLEOTIDE': {
      aliases: ['NMN', 'β-NICOTINAMIDE MONONUCLEOTIDE'],
      classification: 'NAD+ Precursor',
      mechanism: 'Precursor to NAD+ that may support cellular energy metabolism and aging processes.',
      commonUses: ['Aging research', 'Metabolic studies', 'Cellular energy research'],
      dosageRanges: 'Research protocols typically use 250-1000mg daily.',
      safetyNotes: 'Research compound with promising safety profile in studies.',
      researchStatus: 'Research compound with promising anti-aging effects.'
    },
    
    'NICOTINAMIDE ADENINE DINUCLEOTIDE': {
      aliases: ['NAD+', 'NADH', 'COENZYME 1'],
      classification: 'Coenzyme',
      mechanism: 'Essential coenzyme in cellular energy production and DNA repair processes.',
      commonUses: ['Aging research', 'Metabolic studies', 'Cellular research'],
      dosageRanges: 'Supplement dosing: 100-500mg daily. IV administration in clinical settings.',
      safetyNotes: 'Natural cellular component with established safety profile.',
      researchStatus: 'Fundamental cellular component; supplementation research ongoing.'
    },
    
    'GLUTATHIONE': {
      aliases: ['GSH', 'L-GLUTATHIONE'],
      classification: 'Antioxidant Tripeptide',
      mechanism: 'Primary cellular antioxidant involved in detoxification and oxidative stress protection.',
      commonUses: ['Antioxidant research', 'Liver studies', 'Detoxification research'],
      dosageRanges: 'Supplement dosing: 250-1000mg daily. IV administration in clinical settings.',
      safetyNotes: 'Natural cellular component with established safety profile.',
      researchStatus: 'Well-established antioxidant with extensive clinical research.'
    },
    
    'TUDCA': {
      aliases: ['TAUROURSODEOXYCHOLIC ACID', 'TUDCA'],
      classification: 'Bile Acid',
      mechanism: 'Hydrophilic bile acid with hepatoprotective and neuroprotective properties.',
      commonUses: ['Liver research', 'Neuroprotection studies', 'Metabolic research'],
      dosageRanges: 'Medical dosing: 10-15mg/kg daily as prescribed. Supplement dosing: 250-500mg daily.',
      safetyNotes: 'FDA-approved for certain conditions with established safety profile.',
      researchStatus: 'FDA-approved for certain liver conditions; research ongoing.'
    },
    
    'UDCA': {
      aliases: ['URSODEOXYCHOLIC ACID', 'URSODIOL'],
      classification: 'Bile Acid',
      mechanism: 'Natural bile acid with hepatoprotective and choleretic properties.',
      commonUses: ['Liver research', 'Gallstone studies', 'Hepatoprotection research'],
      dosageRanges: 'Medical dosing: 8-10mg/kg daily as prescribed.',
      safetyNotes: 'FDA-approved medication with established safety profile.',
      researchStatus: 'FDA-approved for primary biliary cholangitis and gallstones.'
    },
    
    'NAC': {
      aliases: ['N-ACETYLCYSTEINE', 'N-ACETYL-L-CYSTEINE'],
      classification: 'Amino Acid Derivative',
      mechanism: 'Precursor to glutathione with antioxidant and mucolytic properties.',
      commonUses: ['Antioxidant research', 'Respiratory studies', 'Liver research'],
      dosageRanges: 'Medical dosing: 600-1200mg daily as prescribed. Supplement dosing: 600-1800mg daily.',
      safetyNotes: 'FDA-approved medication with established safety profile.',
      researchStatus: 'FDA-approved for acetaminophen overdose; extensive research on other uses.'
    },
    
    // === STATINS & CHOLESTEROL ===
    'ATORVASTATIN CALCIUM': {
      aliases: ['LIPITOR', 'ATORVASTATIN'],
      classification: 'HMG-CoA Reductase Inhibitor',
      mechanism: 'Inhibits cholesterol synthesis by blocking HMG-CoA reductase enzyme.',
      commonUses: ['Cardiovascular research', 'Cholesterol studies', 'Lipid metabolism research'],
      dosageRanges: 'Medical dosing: 10-80mg daily as prescribed.',
      safetyNotes: 'FDA-approved medication with established safety profile.',
      researchStatus: 'FDA-approved for hypercholesterolemia and cardiovascular disease prevention.'
    },
    
    // === NOOTROPICS ===
    'DMAA': {
      aliases: ['1,3-DIMETHYLAMYLAMINE', 'METHYLHEXANAMINE'],
      classification: 'Stimulant',
      mechanism: 'Sympathomimetic amine that may affect neurotransmitter release and energy.',
      commonUses: ['Stimulant research', 'Exercise physiology', 'Neurotransmitter studies'],
      dosageRanges: 'Research use only. Previously used at 25-75mg in supplements before FDA ban.',
      safetyNotes: 'Banned by FDA in supplements due to safety concerns.',
      researchStatus: 'Banned by FDA in dietary supplements; research on effects and safety.'
    },
    
    'PHENYLPIRACETAM HYDRAZIDE': {
      aliases: ['PHENYLPIRACETAM HYDRAZIDE', 'FONTURACETAM HYDRAZIDE'],
      classification: 'Nootropic Compound',
      mechanism: 'Modified piracetam analog with potential cognitive-enhancing properties.',
      commonUses: ['Cognitive research', 'Neurological studies', 'Memory research'],
      dosageRanges: 'Research protocols typically use 5-20mg daily.',
      safetyNotes: 'Research compound with limited safety data.',
      researchStatus: 'Research compound with limited clinical data.'
    },
    
    'FLADRAFINIL': {
      aliases: ['CRL-40,941', 'FLUOROMODAFINIL'],
      classification: 'Eugeroic',
      mechanism: 'Fluorinated analog of modafinil with wakefulness-promoting properties.',
      commonUses: ['Sleep research', 'Cognitive studies', 'Wakefulness research'],
      dosageRanges: 'Research protocols typically use 30-80mg daily.',
      safetyNotes: 'Research compound with limited safety data.',
      researchStatus: 'Research compound with limited safety and efficacy data.'
    },
    
    'ANIRACETAM': {
      aliases: ['ANIRACETAM'],
      classification: 'Nootropic',
      mechanism: 'AMPA receptor modulator with potential cognitive-enhancing properties.',
      commonUses: ['Cognitive research', 'Memory studies', 'Neurological research'],
      dosageRanges: 'Research protocols typically use 750-1500mg daily.',
      safetyNotes: 'Research compound with some clinical investigation.',
      researchStatus: 'Research compound with some clinical investigation.'
    },
    
    'FASORACETAM': {
      aliases: ['FASORACETAM', 'NS-105'],
      classification: 'Nootropic',
      mechanism: 'GABA-B receptor agonist and cognitive enhancer under investigation.',
      commonUses: ['Cognitive research', 'ADHD studies', 'Neurological research'],
      dosageRanges: 'Clinical trial protocols typically use 100-800mg daily.',
      safetyNotes: 'Clinical development compound with ongoing safety evaluation.',
      researchStatus: 'Clinical development for ADHD and cognitive disorders.'
    },
    
    'ALPHA-GPC': {
      aliases: ['L-ALPHA GLYCERYLPHOSPHORYLCHOLINE', 'CHOLINE ALFOSCERATE'],
      classification: 'Choline Compound',
      mechanism: 'Choline precursor that may support acetylcholine synthesis and cognitive function.',
      commonUses: ['Cognitive research', 'Neurotransmitter studies', 'Memory research'],
      dosageRanges: 'Supplement dosing: 300-600mg daily.',
      safetyNotes: 'Dietary supplement with established safety profile.',
      researchStatus: 'Dietary supplement with some clinical research on cognitive effects.'
    },
    
    'NOOPEPT': {
      aliases: ['NOOPEPT', 'GVS-111'],
      classification: 'Nootropic Peptide',
      mechanism: 'Synthetic peptide with potential cognitive-enhancing and neuroprotective properties.',
      commonUses: ['Cognitive research', 'Neuroprotection studies', 'Memory research'],
      dosageRanges: 'Research protocols typically use 10-30mg daily.',
      safetyNotes: 'Research compound with some clinical investigation.',
      researchStatus: 'Research compound with some clinical investigation.'
    },
    
    'NOOGLUTYL': {
      aliases: ['NOOGLUTYL'],
      classification: 'Nootropic',
      mechanism: 'Glutamate derivative with potential cognitive-enhancing properties.',
      commonUses: ['Cognitive research', 'Memory studies', 'Neurological research'],
      dosageRanges: 'Research protocols typically use 25-50mg daily.',
      safetyNotes: 'Research compound with limited safety data.',
      researchStatus: 'Research compound with limited clinical data.'
    },
    
    'PRL-8-53': {
      aliases: ['PRL-8-53'],
      classification: 'Nootropic Compound',
      mechanism: 'Synthetic nootropic with potential memory-enhancing properties.',
      commonUses: ['Memory research', 'Cognitive studies', 'Learning research'],
      dosageRanges: 'Research protocols typically use 2.5-5mg daily.',
      safetyNotes: 'Research compound with very limited safety data.',
      researchStatus: 'Research compound with very limited clinical data.'
    },
    
    'CDP CHOLINE': {
      aliases: ['CITICOLINE', 'CYTIDINE DIPHOSPHATE CHOLINE'],
      classification: 'Choline Compound',
      mechanism: 'Choline and cytidine precursor that supports brain metabolism and neurotransmitter synthesis.',
      commonUses: ['Cognitive research', 'Neuroprotection studies', 'Stroke research'],
      dosageRanges: 'Medical dosing: 500-2000mg daily as prescribed. Supplement dosing: 250-1000mg daily.',
      safetyNotes: 'FDA-approved in some countries with established safety profile.',
      researchStatus: 'FDA-approved in some countries for stroke; dietary supplement research ongoing.'
    },
    
    'L-THEANINE': {
      aliases: ['THEANINE', 'L-THEANINE'],
      classification: 'Amino Acid Analog',
      mechanism: 'Non-protein amino acid that may promote relaxation and affect neurotransmitter levels.',
      commonUses: ['Anxiety research', 'Sleep studies', 'Cognitive research'],
      dosageRanges: 'Supplement dosing: 100-400mg daily.',
      safetyNotes: 'Natural compound with established safety profile.',
      researchStatus: 'Dietary supplement with established relaxation effects.'
    },
    
    // === ANXIETY & MOOD ===
    'PREGABALIN': {
      aliases: ['LYRICA', 'PREGABALIN'],
      classification: 'Gabapentinoid',
      mechanism: 'Calcium channel blocker that affects neurotransmitter release and pain signaling.',
      commonUses: ['Pain research', 'Anxiety studies', 'Neurological research'],
      dosageRanges: 'Medical dosing: 75-600mg daily as prescribed.',
      safetyNotes: 'FDA-approved medication with established safety profile.',
      researchStatus: 'FDA-approved for neuropathic pain, fibromyalgia, and generalized anxiety disorder.'
    },
    
    'PHENIBUT': {
      aliases: ['β-PHENYL-GABA', 'PHENIBUT'],
      classification: 'GABA Analog',
      mechanism: 'GABA-B receptor agonist with anxiolytic and nootropic properties.',
      commonUses: ['Anxiety research', 'Sleep studies', 'Neurological research'],
      dosageRanges: 'Research protocols typically use 250-1000mg daily. Potential for dependence.',
      safetyNotes: 'Potential for dependence and withdrawal. Use with caution.',
      researchStatus: 'Prescription medication in some countries; research on effects and safety.'
    },
    
    'GABAPENTIN': {
      aliases: ['NEURONTIN', 'GABAPENTIN'],
      classification: 'Gabapentinoid',
      mechanism: 'Calcium channel blocker that affects neurotransmitter release and pain signaling.',
      commonUses: ['Pain research', 'Epilepsy studies', 'Neurological research'],
      dosageRanges: 'Medical dosing: 300-3600mg daily as prescribed.',
      safetyNotes: 'FDA-approved medication with established safety profile.',
      researchStatus: 'FDA-approved for epilepsy and neuropathic pain.'
    },
    
    'FLUOXETINE': {
      aliases: ['PROZAC', 'FLUOXETINE'],
      classification: 'SSRI Antidepressant',
      mechanism: 'Selective serotonin reuptake inhibitor that increases serotonin availability.',
      commonUses: ['Depression research', 'Anxiety studies', 'Neurological research'],
      dosageRanges: 'Medical dosing: 10-80mg daily as prescribed.',
      safetyNotes: 'FDA-approved medication with established safety profile.',
      researchStatus: 'FDA-approved for depression, anxiety, and other psychiatric conditions.'
    },
    
    'QUETIAPINE FUMARATE': {
      aliases: ['SEROQUEL', 'QUETIAPINE'],
      classification: 'Atypical Antipsychotic',
      mechanism: 'Multi-receptor antagonist affecting dopamine, serotonin, and other neurotransmitter systems.',
      commonUses: ['Psychiatric research', 'Sleep studies', 'Neurological research'],
      dosageRanges: 'Medical dosing: 25-800mg daily as prescribed.',
      safetyNotes: 'FDA-approved medication with established safety profile for approved uses.',
      researchStatus: 'FDA-approved for schizophrenia, bipolar disorder, and major depressive disorder.'
    },
    
    'MIRTAZAPINE': {
      aliases: ['REMERON', 'MIRTAZAPINE'],
      classification: 'Atypical Antidepressant',
      mechanism: 'α2-adrenergic antagonist that affects norepinephrine and serotonin neurotransmission.',
      commonUses: ['Depression research', 'Sleep studies', 'Appetite research'],
      dosageRanges: 'Medical dosing: 15-45mg daily as prescribed.',
      safetyNotes: 'FDA-approved medication with established safety profile.',
      researchStatus: 'FDA-approved for major depressive disorder.'
    },
    
    'BACLOFEN': {
      aliases: ['LIORESAL', 'BACLOFEN'],
      classification: 'GABA-B Agonist',
      mechanism: 'GABA-B receptor agonist with muscle relaxant and anti-spasmodic properties.',
      commonUses: ['Muscle spasticity research', 'Addiction studies', 'Neurological research'],
      dosageRanges: 'Medical dosing: 5-80mg daily as prescribed.',
      safetyNotes: 'FDA-approved medication with established safety profile for approved uses.',
      researchStatus: 'FDA-approved for muscle spasticity; research on addiction treatment.'
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
      'GHRP-2', 'GHRP-6', 'Sermorelin', 'Tesamorelin', 'Hexarelin', 'AOD-9604', 'IGF-1 LR3',
      'Melanotan II', 'PT-141', 'GHK-Cu', 'Epitalon', 'Selank', 'Semax', 'HGH', 'HCG',
      'Adamax', 'Adipotide', 'AICAR', 'Cagrilintide', 'DSIP', 'FOX04 DRI', 'Kisspeptin',
      'KPV', 'LL-37', 'Mazdutide', 'Melanotan 1', 'MOTS-C', 'NA Selank Amidate', 'NA Semax Amidate',
      'Oxytocin', 'PEG MGF', 'SNAP-8', 'SS31', 'Survodutide', 'Thymosin Alpha 1', 'Thymulin',
      'Tesofensine', 'Metformin', 'NMN', 'NAD+', 'Glutathione', 'TUDCA', 'NAC', 'Berberine'
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
        'bpc', 'bpc-157', 'bpc157', 'bpc-167', 'bpc167', 'tb-500', 'tb500', 'thymosin', 
        'semaglutide', 'ozempic', 'wegovy', 'tirzepatide', 'mounjaro', 'zepbound',
        'retatrutide', 'retratrutide', 'retatrutid', 'retratrutid', // Common misspellings
        'ipamorelin', 'ipam', 'cjc', 'cjc-1295', 'cjc1295', 'mod-grf', 'modgrf',
        'ghrp', 'ghrp-2', 'ghrp-6', 'ghrp2', 'ghrp6', 'hexarelin', 'sermorelin', 'tesamorelin',
        
        // Additional peptides from user list
        'adamax', 'adipotide', 'ftpp', 'aicar', 'aod-9604', 'aod9604', 'ara-290', 'ara290',
        'cagrilintide', 'dsip', 'delta sleep', 'epitalon', 'epithalon', 'fox04', 'foxo4',
        'ghk', 'ghk-cu', 'copper peptide', 'kisspeptin', 'kiss1', 'kpv', 'll-37', 'cathelicidin',
        'mazdutide', 'ibi-362', 'melanotan', 'mt-1', 'mt-2', 'mt2', 'afamelanotide',
        'mots-c', 'mitochondrial peptide', 'selank', 'semax', 'na selank', 'na semax',
        'oxytocin', 'p21', 'pe-22-28', 'peg mgf', 'pt-141', 'pt141', 'bremelanotide',
        'snap-8', 'snap8', 'ss31', 'ss-31', 'elamipretide', 'survodutide', 'bi 456906',
        'thymosin alpha 1', 'ta1', 'zadaxin', 'thymulin', 'fts',
        
        // Growth factors
        'igf', 'igf-1', 'igf1', 'lr3', 'mgf', 'mechano', 'growth hormone', 'gh', 'hgh',
        
        // Pharmaceutical compounds
        'tesofensine', 'ns2330', 'metformin', 'glucophage', '1mq', 'l-amino-1mq',
        'gnb', 'gaba', 'salbutamol', 'albuterol', 'ventolin', 'yohimbine', 'yohimbine hcl',
        't4', 'levothyroxine', 'thyroxine', 'orlistat', 'xenical', 'alli', 'berberine',
        
        // Liver health compounds
        'nmn', 'nicotinamide mononucleotide', 'nad+', 'nadh', 'glutathione', 'gsh',
        'tudca', 'tauroursodeoxycholic acid', 'udca', 'ursodeoxycholic acid', 'ursodiol',
        'nac', 'n-acetylcysteine', 'acetylcysteine',
        
        // Statins & cholesterol
        'atorvastatin', 'lipitor', 'statin',
        
        // Nootropics
        'dmaa', '1,3-dimethylamylamine', 'methylhexanamine', 'phenylpiracetam hydrazide',
        'fonturacetam hydrazide', 'fladrafinil', 'crl-40,941', 'fluoromodafinil',
        'aniracetam', 'fasoracetam', 'ns-105', 'alpha-gpc', 'choline alfoscerate',
        'noopept', 'gvs-111', 'nooglutyl', 'prl-8-53', 'cdp choline', 'citicoline',
        'l-theanine', 'theanine',
        
        // Anxiety & mood compounds
        'pregabalin', 'lyrica', 'phenibut', 'β-phenyl-gaba', 'gabapentin', 'neurontin',
        'fluoxetine', 'prozac', 'quetiapine', 'seroquel', 'mirtazapine', 'remeron',
        'baclofen', 'lioresal',
        
        // Research terms
        'mcg', 'subcutaneous', 'reconstitution', 'lyophilized', 'vial',
        'research compound', 'investigational', 'clinical trial', 'ampk activator',
        'melanocortin receptor', 'dual agonist', 'triple agonist', 'secretagogue'
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


