import React, { useEffect, useMemo, useState } from 'react'
import Modal from '../common/Modal'
import TextInput from '../common/inputs/TextInput.jsx'
import { Search, Brain, AlertTriangle, Loader, Filter, Star, StarOff, BookOpen, Heart, Target, Shield, Sparkles, ChevronDown, ChevronRight, FileText, Plus, Edit3, Trash2, Upload, Link } from 'lucide-react';
import { Zap } from '../../icons/lucide-safe';
import { generateId } from '../../utils/string';

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
    
    // === POPULAR RESEARCH BLENDS ===
    'WOLVERINE STACK': {
      aliases: ['WOLVERINE', 'HEALING STACK', 'RECOVERY BLEND'],
      classification: 'Multi-Peptide Research Blend',
      mechanism: 'Synergistic combination targeting tissue repair, recovery, and regeneration through multiple pathways including angiogenesis, anti-inflammatory, and growth factor modulation.',
      composition: 'Typically contains BPC-157 (500-1000mcg), TB-500 (2-5mg), and sometimes additional peptides like GHK-Cu or Ipamorelin',
      commonUses: ['Comprehensive tissue repair research', 'Athletic recovery studies', 'Wound healing research', 'Multi-modal regenerative research'],
      dosageRanges: 'Varies by composition. Common protocols: BPC-157 500mcg + TB-500 2mg weekly for 4-8 weeks.',
      safetyNotes: 'Combination therapy requires careful monitoring. Individual peptide safety profiles apply.',
      researchStatus: 'Popular research combination with anecdotal support. Individual components well-studied.',
      synergies: 'BPC-157 enhances TB-500 tissue repair effects. Complementary mechanisms for optimal recovery research.'
    },

    'FOUNTAIN OF YOUTH STACK': {
      aliases: ['YOUTH STACK', 'ANTI-AGING BLEND', 'LONGEVITY STACK'],
      classification: 'Anti-Aging Research Blend',
      mechanism: 'Targets multiple aging pathways including growth hormone optimization, cellular repair, and metabolic enhancement.',
      composition: 'Typically contains Ipamorelin (200-300mcg), CJC-1295 (100-200mcg), and sometimes NAD+ precursors or other longevity compounds',
      commonUses: ['Aging research', 'Growth hormone studies', 'Longevity research', 'Metabolic optimization studies'],
      dosageRanges: 'Common protocol: Ipamorelin 200mcg + CJC-1295 100mcg, 2-3x daily, 5 days on/2 days off.',
      safetyNotes: 'Long-term effects of combination therapy not fully established. Monitor for GH-related side effects.',
      researchStatus: 'Popular research combination. Individual peptides have established research profiles.',
      synergies: 'CJC-1295 extends Ipamorelin half-life, creating sustained GH release patterns.'
    },

    'METABOLIC STACK': {
      aliases: ['WEIGHT LOSS STACK', 'GLP-1 STACK', 'METABOLIC BLEND'],
      classification: 'Metabolic Research Blend',
      mechanism: 'Multi-target approach to metabolic research including appetite regulation, glucose control, and energy expenditure.',
      composition: 'May include Semaglutide (0.25-2.4mg), Tirzepatide (2.5-15mg), or combination with other metabolic compounds',
      commonUses: ['Obesity research', 'Diabetes research', 'Metabolic syndrome studies', 'Weight management research'],
      dosageRanges: 'Highly variable based on composition. Requires gradual titration and medical supervision.',
      safetyNotes: 'Requires medical supervision. GI side effects common. Not for recreational use.',
      researchStatus: 'Based on FDA-approved medications with extensive clinical data.',
      synergies: 'Dual GLP-1/GIP activation provides enhanced metabolic effects compared to single-target approaches.'
    },

    // === AMINO ACIDS & BUILDING BLOCKS ===
    'L-ARGININE': {
      aliases: ['ARGININE', 'ARG', 'L-ARG'],
      classification: 'Semi-Essential Amino Acid',
      mechanism: 'Precursor to nitric oxide (NO), supports vascular function, protein synthesis, and immune function through multiple enzymatic pathways.',
      commonUses: ['Cardiovascular research', 'Exercise performance studies', 'Wound healing research', 'Immune function studies'],
      dosageRanges: 'Research dosages range from 3-20g daily, typically divided into multiple doses.',
      safetyNotes: 'Generally well-tolerated. May interact with blood pressure medications. Avoid with herpes infections.',
      researchStatus: 'Extensively studied with established cardiovascular and performance benefits.',
      interactions: 'May enhance effects of nitrates and blood pressure medications. Monitor cardiovascular parameters.'
    },

    'L-CITRULLINE': {
      aliases: ['CITRULLINE', 'CIT', 'L-CIT'],
      classification: 'Non-Essential Amino Acid',
      mechanism: 'Converts to L-arginine in the kidneys, providing sustained nitric oxide production with better bioavailability than direct arginine supplementation.',
      commonUses: ['Exercise performance research', 'Cardiovascular studies', 'Fatigue research', 'Muscle recovery studies'],
      dosageRanges: 'Research protocols typically use 3-8g daily, often 30-60 minutes pre-exercise.',
      safetyNotes: 'Excellent safety profile with minimal side effects. Well-tolerated at research dosages.',
      researchStatus: 'Strong research support for exercise performance and cardiovascular benefits.',
      advantages: 'Superior bioavailability compared to L-arginine. Less GI distress. Sustained NO production.'
    },

    'L-ORNITHINE': {
      aliases: ['ORNITHINE', 'ORN', 'L-ORN'],
      classification: 'Non-Proteinogenic Amino Acid',
      mechanism: 'Key component of urea cycle, supports ammonia detoxification, may enhance growth hormone release and sleep quality.',
      commonUses: ['Sleep quality research', 'Recovery studies', 'Liver function research', 'Growth hormone studies'],
      dosageRanges: 'Research dosages typically range from 2-10g daily, often taken before bed.',
      safetyNotes: 'Generally safe with minimal side effects. May cause mild GI upset at high doses.',
      researchStatus: 'Moderate research support for sleep and recovery benefits. Part of established metabolic pathways.',
      timing: 'Most effective when taken on empty stomach, preferably before bed for sleep benefits.'
    },

    'BETA-ALANINE': {
      aliases: ['β-ALANINE', 'BA', 'BETA ALANINE'],
      classification: 'Non-Essential Amino Acid',
      mechanism: 'Precursor to carnosine synthesis, acts as intracellular pH buffer, reducing muscle fatigue during high-intensity exercise.',
      commonUses: ['Exercise performance research', 'Muscle fatigue studies', 'High-intensity training research', 'Endurance studies'],
      dosageRanges: 'Research protocols use 3-5g daily, typically divided into 800mg doses to minimize paresthesia.',
      safetyNotes: 'Safe with characteristic tingling sensation (paresthesia). Reduce dose if uncomfortable.',
      researchStatus: 'Extensively researched with strong evidence for high-intensity exercise performance.',
      loading: 'Benefits appear after 2-4 weeks of consistent supplementation due to carnosine accumulation.'
    },

    'TAURINE': {
      aliases: ['TAU', '2-AMINOETHANESULFONIC ACID'],
      classification: 'Sulfur-Containing Amino Acid',
      mechanism: 'Osmoregulation, membrane stabilization, antioxidant effects, and modulation of calcium signaling in multiple tissues.',
      commonUses: ['Cardiovascular research', 'Neurological studies', 'Exercise research', 'Antioxidant studies'],
      dosageRanges: 'Research dosages range from 1-6g daily, typically divided into 2-3 doses.',
      safetyNotes: 'Excellent safety profile. No significant adverse effects reported at research dosages.',
      researchStatus: 'Extensive research supporting cardiovascular, neurological, and performance benefits.',
      distribution: 'Highly concentrated in heart, brain, retina, and skeletal muscle tissues.'
    },

    'CREATINE': {
      aliases: ['CREATINE MONOHYDRATE', 'CR', 'CREATINE HCL', 'BUFFERED CREATINE'],
      classification: 'Phosphocreatine System Substrate',
      mechanism: 'Regenerates ATP through phosphocreatine system, enhances cellular energy availability, supports muscle volumization through increased water retention.',
      commonUses: ['Exercise performance research', 'Power output studies', 'Muscle mass research', 'Cognitive function studies'],
      dosageRanges: 'Loading: 20g/day x 5 days, then 3-5g daily. Alternative: 3-5g daily without loading.',
      safetyNotes: 'Extensively studied with excellent safety profile. May cause initial water weight gain.',
      researchStatus: 'Most researched supplement with overwhelming evidence for efficacy and safety.',
      forms: 'Monohydrate most studied. HCl and buffered forms may reduce GI distress but lack comparative research.'
    },

    'HMB': {
      aliases: ['β-HYDROXY β-METHYLBUTYRATE', 'BETA-HYDROXY BETA-METHYLBUTYRATE', 'CALCIUM HMB'],
      classification: 'Leucine Metabolite',
      mechanism: 'Anti-catabolic compound that reduces protein breakdown, supports muscle recovery, and may enhance protein synthesis.',
      commonUses: ['Muscle preservation research', 'Recovery studies', 'Catabolic state research', 'Athletic performance studies'],
      dosageRanges: 'Research protocols use 1.5-3g daily, typically divided into 3 doses with meals.',
      safetyNotes: 'Excellent safety profile with minimal side effects reported in research.',
      researchStatus: 'Well-researched with moderate evidence for anti-catabolic effects, particularly during caloric restriction.',
      timing: 'Most effective when taken with meals to enhance absorption and minimize GI upset.'
    },

    'GLUTAMINE': {
      aliases: ['L-GLUTAMINE', 'GLN', 'Q'],
      classification: 'Conditionally Essential Amino Acid',
      mechanism: 'Primary fuel for immune cells and enterocytes, supports gut barrier function, protein synthesis, and nitrogen transport.',
      commonUses: ['Immune function research', 'Gut health studies', 'Recovery research', 'Critical care studies'],
      dosageRanges: 'Research dosages range from 10-30g daily, often divided into multiple doses.',
      safetyNotes: 'Generally safe with excellent tolerability. May cause mild GI upset at very high doses.',
      researchStatus: 'Extensive research in clinical settings. Mixed results for healthy populations.',
      conditions: 'Most beneficial during periods of physiological stress, illness, or intense training.'
    },

    // === ADVANCED PEPTIDE BLENDS ===
    'ULTIMATE RECOVERY STACK': {
      aliases: ['RECOVERY STACK', 'HEALING BLEND ADVANCED', 'REGEN STACK'],
      classification: 'Multi-Modal Recovery Blend',
      mechanism: 'Comprehensive approach targeting inflammation, tissue repair, growth factor optimization, and cellular regeneration.',
      composition: 'BPC-157 (500mcg), TB-500 (2mg), GHK-Cu (2mg), Ipamorelin (200mcg), sometimes includes PEG-MGF or other growth factors',
      commonUses: ['Comprehensive recovery research', 'Multi-tissue repair studies', 'Athletic performance research', 'Regenerative medicine research'],
      dosageRanges: 'Complex protocols requiring careful timing. Typically administered over 8-12 week cycles.',
      safetyNotes: 'Multi-compound therapy requires expert supervision. Individual safety profiles apply.',
      researchStatus: 'Popular advanced research combination. Limited studies on combination effects.',
      protocols: 'Often includes cycling protocols with rest periods to optimize receptor sensitivity.'
    },

    'COGNITIVE ENHANCEMENT STACK': {
      aliases: ['NOOTROPIC STACK', 'BRAIN STACK', 'COGNITIVE BLEND'],
      classification: 'Cognitive Research Blend',
      mechanism: 'Multi-target approach to cognitive enhancement including neuroprotection, neurotransmitter optimization, and cerebral blood flow.',
      composition: 'May include Semax (300mcg), Selank (200mcg), Noopept (10-30mg), or other nootropic compounds',
      commonUses: ['Cognitive research', 'Neuroprotection studies', 'Memory research', 'Focus and attention studies'],
      dosageRanges: 'Highly variable based on composition. Requires individual titration and monitoring.',
      safetyNotes: 'Research compounds with limited long-term safety data. Requires careful monitoring.',
      researchStatus: 'Emerging area with promising individual compound research. Limited combination studies.',
      considerations: 'Individual response highly variable. Start with single compounds before combining.'
    },

    // === POPULAR RESEARCH PEPTIDES ===
    'MELANOTAN II': {
      aliases: ['MT-II', 'MT2', 'MELANOTAN-2'],
      classification: 'Melanocortin Receptor Agonist',
      mechanism: 'Non-selective melanocortin receptor agonist affecting pigmentation, appetite, and sexual function through multiple MC receptor subtypes.',
      commonUses: ['Pigmentation research', 'Photoprotection studies', 'Appetite research', 'Sexual behavior research'],
      dosageRanges: 'Research protocols typically use 0.25-1mg daily, often with loading and maintenance phases.',
      safetyNotes: 'Research compound with known side effects including nausea, flushing, and darkening of moles/freckles.',
      researchStatus: 'Well-characterized research compound with established effects on multiple systems.',
      monitoring: 'Requires monitoring of pigmentation changes, cardiovascular parameters, and sexual side effects.'
    },

    'HEXARELIN': {
      aliases: ['HEX', 'EXAMORELIN'],
      classification: 'Growth Hormone Secretagogue',
      mechanism: 'Potent GHRP with strong GH-releasing activity and potential cardioprotective effects through ghrelin receptor activation.',
      commonUses: ['Growth hormone research', 'Cardiovascular research', 'Body composition studies', 'Aging research'],
      dosageRanges: 'Research protocols typically use 100-200 mcg 2-3 times daily.',
      safetyNotes: 'Research compound with known GH-related effects. May cause cortisol and prolactin elevation.',
      researchStatus: 'Well-studied GHRP with established GH-releasing properties and cardiovascular research potential.',
      desensitization: 'May cause receptor desensitization with continuous use. Cycling protocols recommended.'
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
    
    'KLOW': {
      aliases: ['KLOW BLEND', 'K-LOW', 'KLOW PEPTIDE BLEND'],
      classification: 'Multi-Peptide Healing Blend',
      mechanism: 'Synergistic blend of four research peptides (BPC-157, TB-500, KPV, GHK-Cu) designed to work together for comprehensive healing and regeneration support.',
      commonUses: ['Tissue healing research', 'Regeneration studies', 'Anti-inflammatory research', 'Wound healing studies', 'Anti-aging research'],
      dosageRanges: 'Research protocols vary. Typically administered as reconstituted blend with individual component dosing considerations.',
      safetyNotes: 'Combination peptide blend. Safety profile based on individual components. For research purposes only.',
      researchStatus: 'Research blend combining well-studied individual peptides for synergistic effects.',
      category: 'blend',
      composition: [
        'BPC-157: Accelerated tissue healing and blood vessel growth',
        'TB-500: Tissue repair and regeneration through actin regulation', 
        'KPV: Anti-inflammatory and antimicrobial properties',
        'GHK-Cu: Collagen production and cellular repair stimulation'
      ],
      synergies: [
        'BPC-157 + TB-500: Enhanced tissue repair and blood flow improvement',
        'KPV: Reduces inflammation to optimize healing environment',
        'GHK-Cu: Drives tissue remodeling and renewal processes'
      ],
      forms: ['Injectable blend'],
      timing: ['Variable based on research protocol and healing objectives'],
      protocols: ['Healing and regeneration research protocols', 'Anti-aging studies', 'Tissue repair investigations'],
      considerations: [
        'Multi-component blend requiring careful reconstitution',
        'Individual peptide interactions should be considered',
        'Synergistic effects may enhance overall healing response',
        'Research applications in wellness and regenerative studies'
      ]
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
      dosageRanges: 'Research dosages typically range from 24-40 IU intranasally for social behavior studies.',
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
    
    '5-AMINO-1MQ': {
      aliases: ['5-AMINO-1MQ', '5AMINO1MQ', '5-AMINO 1MQ', 'L-AMINO 1MQ CHLORIDE', '1MQ', 'L-AMINO-1MQ'],
      classification: 'NNMT Inhibitor',
      mechanism: 'Inhibits nicotinamide N-methyltransferase (NNMT), promoting fat loss and metabolic enhancement by increasing NAD+ levels and cellular energy production.',
      commonUses: ['Fat loss research', 'Metabolic enhancement studies', 'NAD+ research', 'Aging studies', 'Cellular metabolism research'],
      dosageRanges: 'Research protocols typically use 50-100mg daily, administered orally or via injection.',
      safetyNotes: 'Research compound with limited long-term safety data. For investigational purposes only.',
      researchStatus: 'Emerging research compound with promising metabolic and fat loss effects in animal studies.'
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
    },
    
    // === PEPTIDE BLENDS & COMBINATIONS ===
    'BPC-157 + TB-500 BLEND': {
      aliases: ['BPC TB500 BLEND', 'HEALING BLEND', 'BPC TB COMBO', 'RECOVERY BLEND'],
      classification: 'Healing Peptide Combination',
      mechanism: 'Synergistic combination of BPC-157 and TB-500 for enhanced tissue repair, wound healing, and recovery through multiple pathways including angiogenesis and actin regulation.',
      commonUses: ['Accelerated injury recovery', 'Tissue repair research', 'Post-surgical healing studies', 'Athletic recovery research'],
      dosageRanges: 'Research protocols typically use 250-500 mcg BPC-157 + 2-5mg TB-500, administered separately or in combination.',
      safetyNotes: 'Combination of well-studied research peptides. Individual safety profiles apply.',
      researchStatus: 'Popular combination based on complementary mechanisms of individual peptides.'
    },
    
    'GHRP-2 + MOD GRF 1-29 BLEND': {
      aliases: ['GHRP2 CJC BLEND', 'GROWTH HORMONE BLEND', 'GH STACK', 'GHRP CJC COMBO'],
      classification: 'Growth Hormone Releasing Combination',
      mechanism: 'Synergistic combination that amplifies growth hormone release through dual pathway activation - GHRP-2 stimulates ghrelin receptors while Mod GRF 1-29 stimulates GHRH receptors.',
      commonUses: ['Enhanced GH release research', 'Body composition studies', 'Anti-aging research', 'Recovery enhancement studies'],
      dosageRanges: 'Research protocols typically use 100-300 mcg of each peptide, administered together 2-3 times daily.',
      safetyNotes: 'Well-established peptide combination with known synergistic effects.',
      researchStatus: 'Popular research combination with established synergistic GH-releasing effects.'
    },
    
    'IPAMORELIN + CJC-1295 BLEND': {
      aliases: ['IPAM CJC BLEND', 'IPA CJC COMBO', 'SELECTIVE GH BLEND'],
      classification: 'Selective Growth Hormone Combination',
      mechanism: 'Combines selective GHRP (Ipamorelin) with long-acting GHRH analog (CJC-1295) for sustained, clean growth hormone release without significant side effects.',
      commonUses: ['Clean GH release research', 'Sleep quality studies', 'Body composition research', 'Anti-aging studies'],
      dosageRanges: 'Research protocols typically use 200-300 mcg Ipamorelin + 100-200 mcg CJC-1295, administered together.',
      safetyNotes: 'Considered one of the safest GH-releasing combinations with minimal side effects.',
      researchStatus: 'Preferred combination for research due to selective action and minimal side effects.'
    },
    
    // === NASAL FORMULATIONS ===
    'INSULIN NASAL SPRAY': {
      aliases: ['INTRANASAL INSULIN', 'NASAL INSULIN', 'BRAIN INSULIN'],
      classification: 'Intranasal Hormone Therapy',
      mechanism: 'Bypasses blood-brain barrier via intranasal delivery to enhance cognitive function, memory, and neuroprotection without systemic metabolic effects.',
      commonUses: ['Cognitive enhancement research', 'Memory studies', 'Alzheimer\'s research', 'Neuroprotection studies'],
      dosageRanges: 'Research protocols typically use 20-40 IU administered intranasally.',
      safetyNotes: 'Intranasal delivery avoids systemic hypoglycemia risk. Research compound with promising safety profile.',
      researchStatus: 'Active clinical research for cognitive disorders and neurodegenerative diseases.'
    },
    
    'OXYTOCIN NASAL SPRAY': {
      aliases: ['INTRANASAL OXYTOCIN', 'NASAL OXYTOCIN', 'SOCIAL BONDING SPRAY'],
      classification: 'Intranasal Neuropeptide',
      mechanism: 'Direct delivery to brain via nasal route, enhancing social bonding, trust, empathy, and reducing social anxiety through oxytocin receptor activation.',
      commonUses: ['Social behavior research', 'Autism studies', 'Anxiety research', 'Relationship therapy research'],
      dosageRanges: 'Research protocols typically use 12-40 IU administered intranasally.',
      safetyNotes: 'Well-established safety profile for intranasal administration.',
      researchStatus: 'Extensive clinical research on social and emotional effects.'
    },
    
    'SELANK NASAL SPRAY': {
      aliases: ['INTRANASAL SELANK', 'NASAL SELANK', 'SELANK DROPS'],
      classification: 'Intranasal Anxiolytic Peptide',
      mechanism: 'Enhanced bioavailability through nasal delivery, providing anxiolytic, nootropic, and stress-reducing effects through tuftsin analog action.',
      commonUses: ['Anxiety research', 'Stress management studies', 'Cognitive enhancement research', 'Mood regulation studies'],
      dosageRanges: 'Research protocols typically use 2-6 drops (approximately 100-300 mcg) intranasally.',
      safetyNotes: 'Nasal delivery improves bioavailability and reduces systemic exposure.',
      researchStatus: 'Established anxiolytic research compound with proven nasal delivery benefits.'
    },
    
    'SEMAX NASAL SPRAY': {
      aliases: ['INTRANASAL SEMAX', 'NASAL SEMAX', 'SEMAX DROPS'],
      classification: 'Intranasal Nootropic Peptide',
      mechanism: 'Direct brain delivery via nasal route for enhanced cognitive function, neuroprotection, and memory improvement through ACTH analog action.',
      commonUses: ['Cognitive enhancement research', 'Neuroprotection studies', 'Memory research', 'Stroke recovery research'],
      dosageRanges: 'Research protocols typically use 2-6 drops (approximately 200-600 mcg) intranasally.',
      safetyNotes: 'Nasal administration provides targeted brain delivery with established safety profile.',
      researchStatus: 'Well-established nootropic with proven benefits via intranasal delivery.'
    },
    
    'KISSPEPTIN NASAL SPRAY': {
      aliases: ['INTRANASAL KISSPEPTIN', 'NASAL KISS1', 'KISSPEPTIN DROPS'],
      classification: 'Intranasal Reproductive Peptide',
      mechanism: 'Direct hypothalamic delivery via nasal route to stimulate GnRH release and regulate reproductive hormone axis.',
      commonUses: ['Reproductive research', 'Fertility studies', 'Hormonal regulation research', 'Puberty research'],
      dosageRanges: 'Clinical research protocols vary, typically administered as measured nasal doses.',
      safetyNotes: 'Clinical research compound with ongoing safety evaluation for intranasal use.',
      researchStatus: 'Active clinical research for reproductive disorders and fertility treatments.'
    },
    
    // === ADDITIONAL POPULAR PEPTIDES ===
    'DIHEXA': {
      aliases: ['DIHEXA', 'N-HEXANOIC-TYR-ILE-(6) AMINOHEXANOIC AMIDE'],
      classification: 'Cognitive Enhancement Compound',
      mechanism: 'Potent cognitive enhancer that promotes synaptogenesis and neuroplasticity through hepatocyte growth factor (HGF) pathway activation.',
      commonUses: ['Memory enhancement research', 'Neuroplasticity studies', 'Cognitive disorder research', 'Neurodegenerative disease research'],
      dosageRanges: 'Research protocols typically use 5-10mg daily, administered orally.',
      safetyNotes: 'Research compound with limited long-term safety data. Potent effects require careful dosing.',
      researchStatus: 'Promising preclinical results for cognitive enhancement and neuroprotection.'
    },
    
    'EPITALON': {
      aliases: ['EPITHALON', 'EPITALONE', 'EPITALON TETRAPEPTIDE'],
      classification: 'Anti-Aging Tetrapeptide',
      mechanism: 'Telomerase activator that may extend cellular lifespan, regulate circadian rhythms, and provide anti-aging effects through pineal gland function enhancement.',
      commonUses: ['Anti-aging research', 'Longevity studies', 'Circadian rhythm research', 'Cellular aging research'],
      dosageRanges: 'Research protocols typically use 5-10mg administered via injection for 10-20 day cycles.',
      safetyNotes: 'Research compound with promising safety profile in studies.',
      researchStatus: 'Promising anti-aging research with telomere lengthening effects demonstrated.'
    },
    
    'CEREBROLYSIN': {
      aliases: ['CEREBROLYSIN', 'BRAIN-DERIVED PEPTIDES', 'NEUROPEPTIDE COMPLEX'],
      classification: 'Neuropeptide Complex',
      mechanism: 'Complex mixture of brain-derived peptides that provides neuroprotection, promotes neuroplasticity, and supports cognitive function through multiple neurotrophic pathways.',
      commonUses: ['Stroke research', 'Dementia studies', 'Traumatic brain injury research', 'Cognitive enhancement studies'],
      dosageRanges: 'Medical protocols typically use 5-30ml administered intravenously.',
      safetyNotes: 'Prescription medication in many countries with established clinical safety profile.',
      researchStatus: 'Extensive clinical research with proven neuroprotective and cognitive benefits.'
    },
    
    'CAGRILINTIDE': {
      aliases: ['CAGRILINTIDE', 'CAGRILINTIDE', 'CAGRILINTIDE'],
      classification: 'GLP-1 Receptor Agonist',
      mechanism: 'Long-acting GLP-1 receptor agonist that regulates blood glucose, slows gastric emptying, and promotes satiety through sustained GLP-1 receptor activation.',
      commonUses: ['Diabetes research', 'Weight management studies', 'Metabolic research', 'Appetite regulation studies'],
      dosageRanges: 'Research dosages typically range from 0.3-2.4mg weekly, administered subcutaneously.',
      safetyNotes: 'Research compound with established safety profile. For investigational use only.',
      researchStatus: 'Extensively studied in clinical trials with promising efficacy data.'
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

export default function GlossaryQuickModal({ open, onClose, theme, initialSearchTerm = '', initialTab = 'search', autoSearch = false }) {
  const [q, setQ] = useState('')
  const [items, setItems] = useState([])
  const [aiResearch, setAiResearch] = useState({ loading: false, data: null, error: null, query: '' })
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeTab, setActiveTab] = useState('search') // 'search', 'browse', 'favorites', 'notes'
  const [selectedCategory, setSelectedCategory] = useState('All Categories')
  const [favorites, setFavorites] = useState([])
  const [expandedCategories, setExpandedCategories] = useState(new Set(['Popular']))
  const [userNotes, setUserNotes] = useState([])
  const [showAddNoteForm, setShowAddNoteForm] = useState(false)
  const [noteForm, setNoteForm] = useState({ name: '', category: 'Custom', content: '', attachments: [] })
  
  // Load favorites from localStorage
  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem('tpprover_research_favorites');
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  }, [open])

  // Set initial search term and tab when modal opens
  useEffect(() => {
    if (open) {
      if (initialSearchTerm) {
        setQ(initialSearchTerm);
        // Automatically trigger search when autoSearch is enabled or initial search term is provided
        if (autoSearch || initialSearchTerm) {
          setTimeout(() => {
            handleAIResearch();
          }, 200);
        }
      }
      setActiveTab(initialTab);
    }
  }, [open, initialSearchTerm, initialTab, autoSearch]);

  // Load user notes from localStorage
  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem('tpprover_user_notes');
      if (savedNotes) {
        setUserNotes(JSON.parse(savedNotes));
      }
    } catch (error) {
      console.error('Error loading user notes:', error);
    }
  }, [open]);

  // Save user notes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tpprover_user_notes', JSON.stringify(userNotes));
    } catch (error) {
      console.error('Error saving user notes:', error);
    }
  }, [userNotes]);
  
  // Save favorites to localStorage
  const saveFavorites = (newFavorites) => {
    try {
      localStorage.setItem('tpprover_research_favorites', JSON.stringify(newFavorites));
      setFavorites(newFavorites);
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  }

  // User notes functions
  const handleAddNote = () => {
    if (!noteForm.name.trim() || !noteForm.content.trim()) return;
    
    const newNote = {
      id: Date.now(),
      name: noteForm.name.trim(),
      category: noteForm.category,
      content: noteForm.content.trim(),
      attachments: noteForm.attachments,
      dateCreated: new Date().toISOString(),
      dateModified: new Date().toISOString()
    };
    
    setUserNotes(prev => [...prev, newNote]);
    setNoteForm({ name: '', category: 'Custom', content: '', attachments: [] });
    setShowAddNoteForm(false);
  };

  const handleEditNote = (noteId, updatedNote) => {
    setUserNotes(prev => prev.map(note => 
      note.id === noteId 
        ? { ...updatedNote, dateModified: new Date().toISOString() }
        : note
    ));
  };

  const handleDeleteNote = (noteId) => {
    setUserNotes(prev => prev.filter(note => note.id !== noteId));
  };

  const handleAttachmentAdd = (type, value) => {
    const newAttachment = {
      id: Date.now(),
      type, // 'link' or 'file'
      value,
      name: type === 'link' ? value : value.name
    };
    setNoteForm(prev => ({
      ...prev,
      attachments: [...prev.attachments, newAttachment]
    }));
  };

  const handleAttachmentRemove = (attachmentId) => {
    setNoteForm(prev => ({
      ...prev,
      attachments: prev.attachments.filter(att => att.id !== attachmentId)
    }));
  };;
  
  const toggleFavorite = (peptideName) => {
    const newFavorites = favorites.includes(peptideName) 
      ? favorites.filter(f => f !== peptideName)
      : [...favorites, peptideName];
    saveFavorites(newFavorites);
  };
  
  // Peptide categories for browsing
  const peptideCategories = {
    'Popular': ['BPC-157', 'TB-500', 'Semaglutide', 'Tirzepatide', 'Ipamorelin', 'CJC-1295', '5-Amino-1MQ'],
    'Growth Hormone': ['Ipamorelin', 'CJC-1295', 'GHRP-2', 'GHRP-6', 'Sermorelin', 'Tesamorelin', 'Hexarelin', 'HGH'],
    'Healing & Recovery': ['BPC-157', 'TB-500', 'GHK-Cu', 'BPC-157 + TB-500 Blend', 'PEG MGF', 'Thymosin Alpha 1'],
    'Weight Loss': ['Semaglutide', 'Tirzepatide', 'Retatrutide', '5-Amino-1MQ', 'AOD-9604', 'Tesofensine', 'Mazdutide'],
    'Cognitive & Brain': ['Selank', 'Semax', 'Dihexa', 'Cerebrolysin', 'Noopept', 'Insulin Nasal Spray', 'Oxytocin Nasal Spray'],
    'Anti-Aging': ['Epitalon', 'NMN', 'NAD+', 'MOTS-C', 'SS31', 'Metformin', 'Glutathione'],
    'Nasal Sprays': ['Insulin Nasal Spray', 'Oxytocin Nasal Spray', 'Selank Nasal Spray', 'Semax Nasal Spray', 'Kisspeptin Nasal Spray'],
    'Blends & Combos': ['BPC-157 + TB-500 Blend', 'GHRP-2 + Mod GRF 1-29 Blend', 'Ipamorelin + CJC-1295 Blend'],
    'Tanning & Libido': ['Melanotan II', 'Melanotan 1', 'PT-141'],
    'Liver & Detox': ['TUDCA', 'UDCA', 'NAC', 'Glutathione', 'Berberine'],
  }
  
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
      'KLOW', 'KPV', 'LL-37', 'Mazdutide', 'Melanotan 1', 'MOTS-C', 'NA Selank Amidate', 'NA Semax Amidate',
      'Oxytocin', 'PEG MGF', 'SNAP-8', 'SS31', 'Survodutide', 'Thymosin Alpha 1', 'Thymulin',
      'Tesofensine', 'Metformin', 'NMN', 'NAD+', 'Glutathione', 'TUDCA', 'NAC', 'Berberine',
      '5-Amino-1MQ', 'Dihexa', 'Cerebrolysin', 'BPC-157 + TB-500 Blend', 'GHRP-2 + Mod GRF Blend',
      'Ipamorelin + CJC-1295 Blend', 'Insulin Nasal Spray', 'Oxytocin Nasal Spray', 'Selank Nasal Spray',
      'Semax Nasal Spray', 'Kisspeptin Nasal Spray'
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
        'ghk', 'ghk-cu', 'copper peptide', 'kisspeptin', 'kiss1', 'klow', 'k-low', 'kpv', 'll-37', 'cathelicidin',
        'mazdutide', 'ibi-362', 'melanotan', 'mt-1', 'mt-2', 'mt2', 'afamelanotide',
        'mots-c', 'mitochondrial peptide', 'selank', 'semax', 'na selank', 'na semax',
        'oxytocin', 'p21', 'pe-22-28', 'peg mgf', 'pt-141', 'pt141', 'bremelanotide',
        'snap-8', 'snap8', 'ss31', 'ss-31', 'elamipretide', 'survodutide', 'bi 456906',
        'thymosin alpha 1', 'ta1', 'zadaxin', 'thymulin', 'fts', '5-amino-1mq', '5amino1mq',
        
        // Additional peptides and compounds
        'cerebrolysin', 'brain-derived peptides', 'neuropeptide complex', 'dihexa', 
        'nicotinamide mononucleotide', 'nmn', 'nicotinamide adenine dinucleotide', 'nad', 'nad+',
        
        // Nasal formulations
        'nasal spray', 'intranasal', 'nasal insulin', 'nasal oxytocin', 'nasal selank', 'nasal semax',
        'nasal melanotan', 'nasal pt141', 'nasal kisspeptin', 'nasal dsip',
        
        // Amino blends and combinations
        'amino blend', 'peptide blend', 'stack', 'combination', 'blend', 'mix',
        'bpc tb500 blend', 'ghrp cjc blend', 'healing blend', 'growth blend', 'klow blend',
        
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

  const toggleCategory = (category) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getCategoryIcon = (category) => {
    const iconMap = {
      'Popular': <Sparkles size={16} />,
      'Growth Hormone': <Zap size={16} />,
      'Healing & Recovery': <Heart size={16} />,
      'Weight Loss': <Target size={16} />,
      'Cognitive & Brain': <Brain size={16} />,
      'Anti-Aging': <Shield size={16} />,
      'Nasal Sprays': <Search size={16} />,
      'Blends & Combos': <BookOpen size={16} />,
      'Tanning & Libido': <Star size={16} />,
      'Liver & Detox': <Shield size={16} />
    };
    return iconMap[category] || <BookOpen size={16} />;
  };

  const getCategoryColors = (category) => {
    const colorMap = {
      'Popular': { bg: '#FFE4B5', border: '#F4A460', text: '#8B4513', icon: '#D2691E' }, // Sandy brown
      'Growth Hormone': { bg: '#E6F3FF', border: '#4A90E2', text: '#1E3A8A', icon: '#3B82F6' }, // Blue
      'Healing & Recovery': { bg: '#FFF0F5', border: '#FF69B4', text: '#8B1538', icon: '#DC2626' }, // Pink/Red
      'Weight Loss': { bg: '#F0FDF4', border: '#22C55E', text: '#15803D', icon: '#16A34A' }, // Green
      'Cognitive & Brain': { bg: '#F3E8FF', border: '#A855F7', text: '#6B21A8', icon: '#9333EA' }, // Purple
      'Anti-Aging': { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E', icon: '#D97706' }, // Amber
      'Nasal Sprays': { bg: '#E0F2FE', border: '#0891B2', text: '#164E63', icon: '#0E7490' }, // Cyan
      'Blends & Combos': { bg: '#F1F5F9', border: '#64748B', text: '#334155', icon: '#475569' }, // Slate
      'Tanning & Libido': { bg: '#FDF2F8', border: '#EC4899', text: '#9D174D', icon: '#DB2777' }, // Rose
      'Liver & Detox': { bg: '#ECFDF5', border: '#10B981', text: '#047857', icon: '#059669' } // Emerald
    };
    return colorMap[category] || { bg: '#F8FAFC', border: '#CBD5E1', text: '#475569', icon: '#64748B' };
  };

  const renderPeptideCard = (peptideName, showCategory = false, categoryColors = null) => {
    const isFavorite = favorites.includes(peptideName);
    const cardColors = categoryColors || { bg: theme?.cardBackground, border: theme?.border, text: theme?.text };
    
    return (
      <div key={peptideName} className="flex items-center justify-between p-3 border rounded-lg hover:shadow-sm transition-all duration-200" 
           style={{ 
             borderColor: cardColors.border || theme?.border, 
             backgroundColor: cardColors.bg || theme?.cardBackground 
           }}>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setQ(peptideName);
                setActiveTab('search');
                handleAIResearch();
              }}
              className="font-medium text-left hover:underline transition-colors"
              style={{ color: cardColors.text || theme?.text }}
            >
              {peptideName}
            </button>
            {showCategory && (
              <span className="text-xs px-2 py-1 rounded-full font-medium" 
                    style={{ 
                      backgroundColor: (cardColors.border || theme?.accent) + '20',
                      color: cardColors.text || theme?.text,
                      border: `1px solid ${(cardColors.border || theme?.accent)}40`
                    }}>
                {Object.entries(peptideCategories).find(([_, peptides]) => 
                  peptides.includes(peptideName))?.[0] || 'Other'}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => toggleFavorite(peptideName)}
          className="p-1.5 rounded-full hover:bg-opacity-20 hover:bg-gray-500 transition-all duration-200"
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          {isFavorite ? (
            <Star size={16} className="fill-current" style={{ color: theme?.warning || '#F59E0B' }} />
          ) : (
            <StarOff size={16} style={{ color: cardColors.icon || theme?.textLight }} />
          )}
        </button>
      </div>
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Research Database" theme={theme} footer={(
      <>
        <button onClick={onClose} className="px-3 py-2 rounded-md border" style={{ borderColor: theme?.border }}>Close</button>
      </>
    )}>
      <div className="space-y-4">
        {/* Tab Navigation */}
        <div className="flex border-b" style={{ borderColor: theme?.border }}>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'search' ? 'border-current' : 'border-transparent hover:border-gray-300'
            }`}
            style={{ color: activeTab === 'search' ? theme?.primary : theme?.textLight }}
          >
            <div className="flex items-center gap-2">
              <Search size={16} />
              Search
            </div>
          </button>
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'browse' ? 'border-current' : 'border-transparent hover:border-gray-300'
            }`}
            style={{ color: activeTab === 'browse' ? theme?.primary : theme?.textLight }}
          >
            <div className="flex items-center gap-2">
              <Filter size={16} />
              Browse
            </div>
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'favorites' ? 'border-current' : 'border-transparent hover:border-gray-300'
            }`}
            style={{ color: activeTab === 'favorites' ? theme?.primary : theme?.textLight }}
          >
            <div className="flex items-center gap-2">
              <Star size={16} />
              Favorites
            </div>
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'notes' ? 'border-current' : 'border-transparent hover:border-gray-300'
            }`}
            style={{ color: activeTab === 'notes' ? theme?.primary : theme?.textLight }}
          >
            <div className="flex items-center gap-2">
              <FileText size={16} />
              Notes
            </div>
          </button>
        </div>

        {/* Search Tab */}
        {activeTab === 'search' && (
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
                    placeholder="Type peptide name (e.g., BPC-157, 5-Amino-1MQ)" 
                    theme={theme} 
                    className="flex-grow"
                    onFocus={() => setShowSuggestions(q.length >= 2)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && q.trim()) {
                        setShowSuggestions(false);
                        handleAIResearch();
                      }
                    }}
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
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2" style={{ color: theme.success }}>
                    <Brain size={18} />
                    <span className="font-semibold">{aiResearch.data.name}</span>
                    {aiResearch.data.originalQuery && aiResearch.data.originalQuery.toLowerCase() !== aiResearch.data.name.toLowerCase() && (
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                        Found match for "{aiResearch.data.originalQuery}"
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => toggleFavorite(aiResearch.data.name)}
                    className="p-1 rounded hover:bg-opacity-10 hover:bg-gray-500 transition-colors"
                    title={favorites.includes(aiResearch.data.name) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {favorites.includes(aiResearch.data.name) ? (
                      <Star size={16} className="fill-current" style={{ color: theme?.warning }} />
                    ) : (
                      <StarOff size={16} style={{ color: theme?.textLight }} />
                    )}
                  </button>
                </div>
                
                <div className="space-y-4 text-sm" style={{ color: theme.text }}>
                  {/* Basic Information Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Target size={14} style={{ color: theme.primary }} />
                        <span className="font-semibold">Classification</span>
                      </div>
                      <p>{aiResearch.data.classification}</p>
                    </div>
                    
                    {aiResearch.data.aliases && (
                      <div className="p-3 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen size={14} style={{ color: theme.primary }} />
                          <span className="font-semibold">Also Known As</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {aiResearch.data.aliases.map((alias, index) => (
                            <span key={index} className="text-xs px-2 py-1 rounded-full border" 
                                  style={{ borderColor: theme.border, backgroundColor: theme.accent }}>
                              {alias}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mechanism of Action */}
                  <div className="p-4 rounded-lg border-2" style={{ borderColor: theme.primary + '40', backgroundColor: theme.primary + '10' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Zap size={16} style={{ color: theme.primary }} />
                      <span className="font-semibold text-lg">How It Works</span>
                    </div>
                    <p className="leading-relaxed">{aiResearch.data.mechanism}</p>
                  </div>

                  {/* Composition for Blends */}
                  {aiResearch.data.composition && (
                    <div className="p-3 rounded-lg border-2" style={{ borderColor: theme.accent, backgroundColor: theme.cardBackground }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Shield size={14} style={{ color: theme.primary }} />
                        <span className="font-semibold">Typical Composition</span>
                      </div>
                      <p>{aiResearch.data.composition}</p>
                    </div>
                  )}

                  {/* Research Applications */}
                  <div className="p-3 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Brain size={16} style={{ color: theme.primary }} />
                      <span className="font-semibold">Research Applications</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {aiResearch.data.commonUses.map((use, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 rounded border" 
                             style={{ borderColor: theme.border }}>
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.success }}></div>
                          <span className="text-sm">{use}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Dosage Information */}
                  <div className="p-4 rounded-lg border-2 border-yellow-200 bg-yellow-50">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle size={18} className="text-yellow-600" />
                      <span className="font-semibold text-lg text-yellow-800">Research Protocols</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-yellow-700 font-medium">{aiResearch.data.dosageRanges}</p>
                      
                      {/* Additional Protocol Information */}
                      {aiResearch.data.timing && (
                        <div className="text-yellow-700">
                          <span className="font-medium">Timing:</span> {aiResearch.data.timing}
                        </div>
                      )}
                      {aiResearch.data.loading && (
                        <div className="text-yellow-700">
                          <span className="font-medium">Loading Protocol:</span> {aiResearch.data.loading}
                        </div>
                      )}
                      {aiResearch.data.protocols && (
                        <div className="text-yellow-700">
                          <span className="font-medium">Protocol Notes:</span> {aiResearch.data.protocols}
                        </div>
                      )}
                      {aiResearch.data.desensitization && (
                        <div className="text-yellow-700">
                          <span className="font-medium">Cycling:</span> {aiResearch.data.desensitization}
                        </div>
                      )}
                    </div>
                    <div className="mt-3 p-2 rounded bg-yellow-100">
                      <p className="text-xs text-yellow-800 font-medium">
                        ⚠️ This information is for research purposes only and is NOT medical advice. 
                        Always consult with qualified healthcare professionals before considering any compounds.
                      </p>
                    </div>
                  </div>

                  {/* Advanced Information Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Safety Profile */}
                    <div className="p-3 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Shield size={14} style={{ color: theme.warning }} />
                        <span className="font-semibold">Safety Profile</span>
                      </div>
                      <p className="text-sm">{aiResearch.data.safetyNotes}</p>
                    </div>

                    {/* Research Status */}
                    <div className="p-3 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen size={14} style={{ color: theme.success }} />
                        <span className="font-semibold">Research Status</span>
                      </div>
                      <p className="text-sm">{aiResearch.data.researchStatus}</p>
                    </div>
                  </div>

                  {/* Additional Information */}
                  {(aiResearch.data.interactions || aiResearch.data.advantages || aiResearch.data.synergies || 
                    aiResearch.data.forms || aiResearch.data.distribution || aiResearch.data.monitoring || 
                    aiResearch.data.considerations || aiResearch.data.conditions) && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-base border-b pb-2" style={{ borderColor: theme.border }}>
                        Additional Research Information
                      </h4>
                      
                      {aiResearch.data.interactions && (
                        <div className="p-3 rounded border" style={{ borderColor: theme.border }}>
                          <span className="font-medium">Drug Interactions:</span> {aiResearch.data.interactions}
                        </div>
                      )}
                      
                      {aiResearch.data.advantages && (
                        <div className="p-3 rounded border" style={{ borderColor: theme.border }}>
                          <span className="font-medium">Research Advantages:</span> {aiResearch.data.advantages}
                        </div>
                      )}
                      
                      {aiResearch.data.synergies && (
                        <div className="p-3 rounded border" style={{ borderColor: theme.border }}>
                          <span className="font-medium">Synergistic Effects:</span> {aiResearch.data.synergies}
                        </div>
                      )}
                      
                      {aiResearch.data.forms && (
                        <div className="p-3 rounded border" style={{ borderColor: theme.border }}>
                          <span className="font-medium">Available Forms:</span> {aiResearch.data.forms}
                        </div>
                      )}
                      
                      {aiResearch.data.distribution && (
                        <div className="p-3 rounded border" style={{ borderColor: theme.border }}>
                          <span className="font-medium">Tissue Distribution:</span> {aiResearch.data.distribution}
                        </div>
                      )}
                      
                      {aiResearch.data.monitoring && (
                        <div className="p-3 rounded border" style={{ borderColor: theme.border }}>
                          <span className="font-medium">Monitoring Requirements:</span> {aiResearch.data.monitoring}
                        </div>
                      )}
                      
                      {aiResearch.data.considerations && (
                        <div className="p-3 rounded border" style={{ borderColor: theme.border }}>
                          <span className="font-medium">Special Considerations:</span> {aiResearch.data.considerations}
                        </div>
                      )}
                      
                      {aiResearch.data.conditions && (
                        <div className="p-3 rounded border" style={{ borderColor: theme.border }}>
                          <span className="font-medium">Optimal Conditions:</span> {aiResearch.data.conditions}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Research Disclaimer */}
                  <div className="text-xs italic pt-3 border-t" style={{ borderColor: theme.border, color: theme.textLight }}>
                    {aiResearch.data.disclaimer || "This information is compiled from research literature and is intended for educational purposes only. Individual results may vary. Not intended as medical advice."}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Browse Tab */}
        {activeTab === 'browse' && (
          <div className="space-y-4">
            <div className="text-sm p-3 rounded-lg border" style={{ borderColor: theme?.border, backgroundColor: theme?.infoBg, color: theme?.text }}>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen size={16} />
                <span className="font-semibold">Discover Peptides by Category</span>
              </div>
              Browse our comprehensive database organized by research applications and benefits.
            </div>
            
            <div className="space-y-3">
              {Object.entries(peptideCategories).map(([category, peptides]) => {
                const colors = getCategoryColors(category);
                return (
                  <div key={category} className="border-2 rounded-xl overflow-hidden" style={{ borderColor: colors.border }}>
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between p-4 hover:opacity-90 transition-all duration-200"
                      style={{ 
                        backgroundColor: colors.bg,
                        color: colors.text
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div style={{ color: colors.icon }}>
                          {getCategoryIcon(category)}
                        </div>
                        <span className="font-semibold">{category}</span>
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium" 
                              style={{ 
                                backgroundColor: colors.border + '30',
                                color: colors.text,
                                border: `1px solid ${colors.border}50`
                              }}>
                          {peptides.length}
                        </span>
                      </div>
                      <div style={{ color: colors.icon }}>
                        {expandedCategories.has(category) ? (
                          <ChevronDown size={18} />
                        ) : (
                          <ChevronRight size={18} />
                        )}
                      </div>
                    </button>
                  
                    {expandedCategories.has(category) && (
                      <div className="border-t p-4 space-y-2" style={{ 
                        borderColor: colors.border,
                        backgroundColor: colors.bg + '30'
                      }}>
                        {peptides.map(peptide => renderPeptideCard(peptide, true, colors))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Favorites Tab */}
        {activeTab === 'favorites' && (
          <div className="space-y-4">
            {favorites.length === 0 ? (
              <div className="text-center py-8">
                <Star size={48} className="mx-auto mb-4" style={{ color: theme?.textLight }} />
                <h3 className="text-lg font-medium mb-2" style={{ color: theme?.text }}>
                  No Favorites Yet
                </h3>
                <p className="text-sm mb-4" style={{ color: theme?.textLight }}>
                  Star your favorite peptides while browsing to save them here for quick access.
                </p>
                <button
                  onClick={() => setActiveTab('browse')}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: theme?.primary, color: theme?.textOnPrimary }}
                >
                  Browse Peptides
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-4">
                  <Star size={16} style={{ color: theme?.warning }} />
                  <span className="font-medium" style={{ color: theme?.text }}>
                    Your Favorite Peptides ({favorites.length})
                  </span>
                </div>
                {favorites.map(peptide => renderPeptideCard(peptide, true))}
              </div>
            )}
          </div>
        )}

        {/* Notes Tab - Google Keep Style */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            {/* Quick Add Note - Always Visible at Top */}
            <div 
              className="p-4 rounded-lg border-2 border-dashed cursor-pointer hover:border-solid transition-all duration-200 group"
              style={{ 
                borderColor: showAddNoteForm ? theme?.primary : theme?.border,
                backgroundColor: showAddNoteForm ? theme?.cardBackground : 'transparent'
              }}
              onClick={() => !showAddNoteForm && setShowAddNoteForm(true)}
            >
              {!showAddNoteForm ? (
                <div className="flex items-center gap-3 py-2">
                  <Plus size={18} style={{ color: theme?.textLight }} className="group-hover:scale-110 transition-transform" />
                  <span 
                    className="text-sm font-medium group-hover:text-opacity-80 transition-colors" 
                    style={{ color: theme?.textLight }}
                  >
                    Take a note...
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Title"
                    className="w-full text-lg font-medium bg-transparent border-none focus:outline-none placeholder-opacity-60"
                    style={{ color: theme?.text }}
                    id="note-title"
                    autoFocus
                  />
                  <textarea
                    placeholder="Take a note..."
                    rows={3}
                    className="w-full bg-transparent border-none focus:outline-none resize-none placeholder-opacity-60"
                    style={{ color: theme?.text }}
                    id="note-content"
                  />
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const title = document.getElementById('note-title').value.trim();
                          const content = document.getElementById('note-content').value.trim();
                          
                          if (title || content) {
                            const newNote = {
                              id: generateId(),
                              title: title || 'Untitled',
                              content: content || '',
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                              color: '#ffffff'
                            };
                            
                            const updatedNotes = [newNote, ...userNotes];
                            setUserNotes(updatedNotes);
                            localStorage.setItem('tpprover_user_notes', JSON.stringify(updatedNotes));
                            
                            // Clear form
                            document.getElementById('note-title').value = '';
                            document.getElementById('note-content').value = '';
                            setShowAddNoteForm(false);
                          }
                        }}
                        className="px-4 py-1.5 rounded-full text-sm font-medium hover:shadow-md transition-all"
                        style={{ backgroundColor: theme?.primary, color: theme?.textOnPrimary }}
                      >
                        Done
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          document.getElementById('note-title').value = '';
                          document.getElementById('note-content').value = '';
                          setShowAddNoteForm(false);
                        }}
                        className="px-4 py-1.5 rounded-full text-sm hover:bg-gray-100 transition-colors"
                        style={{ color: theme?.text }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notes Grid - Google Keep Style */}
            {userNotes.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: theme?.primary + '15' }}>
                  <FileText size={32} style={{ color: theme?.primary }} />
                </div>
                <h3 className="text-xl font-semibold mb-2" style={{ color: theme?.text }}>
                  Notes you add appear here
                </h3>
                <p className="text-sm" style={{ color: theme?.textLight }}>
                  Create your first research note using the box above
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {userNotes.map((note) => (
                  <div 
                    key={note.id} 
                    className="group relative rounded-xl border hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden"
                    style={{ 
                      borderColor: theme?.border,
                      backgroundColor: note.color || theme?.cardBackground
                    }}
                  >
                    {/* Note Content */}
                    <div className="p-3 md:p-4">
                      {note.title && note.title !== 'Untitled' && (
                        <h4 className="font-semibold mb-1.5 text-sm md:text-base line-clamp-1 md:line-clamp-2" style={{ color: theme?.text }}>
                          {note.title}
                        </h4>
                      )}
                      <p className="text-xs md:text-sm leading-relaxed line-clamp-2 md:line-clamp-4" style={{ color: theme?.text }}>
                        {note.content}
                      </p>
                    </div>

                    {/* Hover Actions - Always visible on mobile, hover on desktop */}
                    <div className="absolute top-1 md:top-2 right-1 md:right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                      <div className="flex items-center gap-0.5 md:gap-1 bg-white rounded-md md:rounded-lg shadow-md md:shadow-lg p-0.5 md:p-1" style={{ backgroundColor: theme?.cardBackground }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Add edit functionality
                          }}
                          className="p-1 md:p-1.5 rounded hover:bg-gray-100 transition-colors"
                          style={{ color: theme?.textLight }}
                          title="Edit note"
                        >
                          <Edit3 size={12} className="md:w-3.5 md:h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const updatedNotes = userNotes.filter(n => n.id !== note.id);
                            setUserNotes(updatedNotes);
                            localStorage.setItem('tpprover_user_notes', JSON.stringify(updatedNotes));
                          }}
                          className="p-1 md:p-1.5 rounded hover:bg-red-50 hover:text-red-600 transition-colors"
                          style={{ color: theme?.textLight }}
                          title="Delete note"
                        >
                          <Trash2 size={12} className="md:w-3.5 md:h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Footer with timestamp */}
                    <div className="px-3 md:px-4 pb-2 md:pb-3">
                      <div className="text-xs opacity-60" style={{ color: theme?.textLight }}>
                        {new Date(note.createdAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          ...(window.innerWidth >= 768 && {
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="text-xs p-2 rounded border" style={{ borderColor: theme?.border, color: theme?.text }}>
          Disclaimer: Information is provided for research and educational purposes only. Not medical advice.
        </div>
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


