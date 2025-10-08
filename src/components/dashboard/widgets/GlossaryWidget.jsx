import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Star, StarOff, ChevronDown, ChevronRight, Brain, AlertTriangle, Loader, Filter, FileText, Plus, Edit3, Trash2, Heart, Target, Shield, Sparkles, CheckCircle } from 'lucide-react';
import { Zap } from '../../../icons/lucide-safe';
import ModernTooltip from '../../ui/ModernTooltip';

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

// Validate and find peptide matches
function findPeptideMatch(searchTerm, peptideDatabase) {
  const name = searchTerm.toUpperCase().trim();
  
  // SPECIAL CASE: Basic vitamins, minerals, and peptide supplies - allow shorter searches and no fuzzy matching
  const basicCompounds = ['B12', 'VITAMIN C', 'VITAMIN D3', 'MAGNESIUM', 'ZINC', 'IRON', 'CALCIUM', 'BAC WATER', 'BAC'];
  for (const compound of basicCompounds) {
    if (name === compound || name === compound.replace(/\s/g, '') || 
        (compound.includes('VITAMIN') && name === compound.split(' ')[1])) {
      if (peptideDatabase[compound]) {
        return { key: compound, data: peptideDatabase[compound], matchType: 'exact' };
      }
    }
  }
  
  // Standard validation for complex compounds
  if (name.length < 3 || !/[A-Z]/.test(name)) {
    return null;
  }
  
  // Direct exact match (including aliases)
  for (const [key, data] of Object.entries(peptideDatabase)) {
    if (key === name || data.aliases.some(alias => alias === name)) {
      return { key, data, matchType: 'exact' };
    }
  }
  
  // PREVENT fuzzy matching for basic compounds that might be misspelled
  for (const compound of basicCompounds) {
    const distance = levenshteinDistance(name, compound);
    if (distance <= 2) {
      return null; // Don't suggest corrections for basic compounds
    }
  }
  
  // Fuzzy matching for complex peptides only (max distance of 2)
  const fuzzyMatches = [];
  for (const [key, data] of Object.entries(peptideDatabase)) {
    // Skip basic compounds from fuzzy matching
    if (basicCompounds.includes(key)) continue;
    
    const distance = levenshteinDistance(name, key);
    if (distance <= 2 && distance > 0) {
      fuzzyMatches.push({ key, data, distance, matchType: 'fuzzy' });
    }
    
    // Check aliases too
    for (const alias of data.aliases) {
      const aliasDistance = levenshteinDistance(name, alias);
      if (aliasDistance <= 2 && aliasDistance > 0) {
        fuzzyMatches.push({ key, data, distance: aliasDistance, matchType: 'fuzzy', matchedAlias: alias });
      }
    }
  }
  
  // Return best fuzzy match if found
  if (fuzzyMatches.length > 0) {
    fuzzyMatches.sort((a, b) => a.distance - b.distance);
    return fuzzyMatches[0];
  }
  
  return null;
}

// Enhanced peptide database - curated, verified research data
  const PEPTIDE_DATABASE = {
    // BASIC VITAMINS - Should never be "corrected"
    'B12': {
      aliases: ['CYANOCOBALAMIN', 'METHYLCOBALAMIN', 'HYDROXOCOBALAMIN', 'VITAMIN B12'],
      classification: 'Essential Vitamin',
      mechanism: 'Essential vitamin for DNA synthesis, red blood cell formation, and neurological function.',
      commonUses: ['B12 deficiency research', 'Neurological studies', 'Energy metabolism research', 'Anemia research'],
      dosageRanges: 'Typical supplementation: 1000-5000mcg daily oral, or 1000mcg weekly injection for deficiency.',
      researchFindings: 'Essential for proper nervous system function and red blood cell formation.',
      considerations: 'Generally safe with no upper limit established. Water-soluble vitamin.',
      researchStatus: 'Essential nutrient with established RDA.',
      disclaimer: 'Dietary supplement - consult healthcare provider for deficiency treatment.'
    },
    'VITAMIN C': {
      aliases: ['ASCORBIC ACID', 'VIT C', 'L-ASCORBIC ACID'],
      classification: 'Essential Vitamin',
      mechanism: 'Essential water-soluble vitamin and powerful antioxidant for collagen synthesis and immune function.',
      commonUses: ['Immune system research', 'Collagen studies', 'Antioxidant research', 'Wound healing research'],
      dosageRanges: 'RDA: 65-90mg daily. Research doses: 500-2000mg daily. IV protocols up to 25-100g for research.',
      researchFindings: 'Critical for immune function, collagen synthesis, and antioxidant protection.',
      considerations: 'High doses may cause GI upset. Generally safe water-soluble vitamin.',
      researchStatus: 'Essential nutrient with established safety profile.',
      disclaimer: 'Dietary supplement - high-dose IV administration requires medical supervision.'
    },
    'VITAMIN D3': {
      aliases: ['CHOLECALCIFEROL', 'VIT D3', 'VITAMIN D'],
      classification: 'Essential Vitamin Hormone',
      mechanism: 'Fat-soluble vitamin that functions as a hormone, regulating calcium absorption and immune function.',
      commonUses: ['Bone health research', 'Immune function studies', 'Hormone research', 'Deficiency research'],
      dosageRanges: 'RDA: 600-800 IU daily. Research doses: 2000-5000 IU daily. Deficiency treatment: 50,000 IU weekly.',
      researchFindings: 'Essential for bone health, immune function, and may support cardiovascular health.',
      considerations: 'Fat-soluble - monitor levels with high-dose supplementation. Can be toxic in excess.',
      researchStatus: 'Essential nutrient with established therapeutic uses.',
      disclaimer: 'Dietary supplement - high doses require monitoring of blood levels.'
    },
    'MAGNESIUM': {
      aliases: ['MG', 'MAGNESIUM GLYCINATE', 'MAGNESIUM CITRATE', 'MAGNESIUM OXIDE'],
      classification: 'Essential Mineral',
      mechanism: 'Essential mineral cofactor for over 300 enzymatic reactions, muscle function, and energy production.',
      commonUses: ['Muscle function research', 'Sleep studies', 'Cardiovascular research', 'Metabolic research'],
      dosageRanges: 'RDA: 310-420mg daily. Research doses: 200-800mg daily depending on form and study.',
      researchFindings: 'Critical for muscle function, energy metabolism, and cardiovascular health.',
      considerations: 'Different forms have varying absorption and GI tolerance. May cause loose stools.',
      researchStatus: 'Essential nutrient with established safety profile.',
      disclaimer: 'Dietary supplement - consult healthcare provider for high doses.'
    },
    'BAC WATER': {
      aliases: ['BACTERIOSTATIC WATER', 'BAC', 'BACT WATER', 'STERILE WATER'],
      classification: 'Pharmaceutical Diluent',
      mechanism: 'Sterile water containing 0.9% benzyl alcohol as a bacteriostatic agent, used for reconstituting lyophilized peptides and medications.',
      commonUses: ['Peptide reconstitution', 'Injectable preparation', 'Research compound dilution', 'Pharmaceutical compounding'],
      dosageRanges: 'Reconstitution: Typically 1-3ml per vial depending on desired concentration. Common ratios: 1ml = 1mg/ml, 2ml = 0.5mg/ml, 3ml = 0.33mg/ml.',
      researchFindings: 'Gold standard for peptide reconstitution due to bacteriostatic properties allowing multiple withdrawals from single vial.',
      considerations: 'Contains benzyl alcohol - do not use for neonatal applications. Store refrigerated after opening. Multi-dose vial stable for 28 days.',
      researchStatus: 'USP pharmaceutical grade diluent.',
      disclaimer: 'Pharmaceutical diluent - for research use only. Follow proper sterile technique.'
    },
    'BPC-157': {
      aliases: ['BPC157', 'BPC 157', 'BODY PROTECTION COMPOUND'],
      classification: 'Gastric Pentadecapeptide',
      mechanism: 'Promotes angiogenesis, accelerates healing of various tissues including tendons, muscles, nervous system, and ligaments through growth hormone receptor pathways.',
      commonUses: ['Tissue repair research', 'Wound healing studies', 'Gastrointestinal research', 'Tendon and ligament research'],
      dosageRanges: 'Research dosages typically range from 200-800 mcg daily, administered subcutaneously or orally.',
      researchFindings: 'Studies demonstrate significant acceleration in healing processes, improved tissue regeneration, and protective effects against various forms of tissue damage.',
      considerations: 'Generally well-tolerated in research settings. May interact with blood clotting mechanisms.',
      researchStatus: 'Extensive preclinical research with growing clinical interest.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'SEMAGLUTIDE': {
      aliases: ['GLP-1 AGONIST', 'OZEMPIC', 'WEGOVY'],
      classification: 'GLP-1 Receptor Agonist',
      mechanism: 'Mimics incretin hormones, regulating blood sugar levels and slowing gastric emptying, leading to reduced appetite and food intake.',
      commonUses: ['Metabolic research', 'Weight management studies', 'Diabetes research', 'Cardiovascular research'],
      dosageRanges: 'Research protocols typically start at 0.25mg weekly, escalating to 1.0-2.4mg weekly based on study parameters.',
      researchFindings: 'Demonstrates significant effects on weight reduction, glycemic control, and cardiovascular outcomes in clinical trials.',
      considerations: 'May cause gastrointestinal effects. Requires careful monitoring in research protocols.',
      researchStatus: 'FDA-approved for specific indications, ongoing research for additional applications.',
      disclaimer: 'Prescription medication - research use must comply with applicable regulations.'
    },
    'TIRZEPATIDE': {
      aliases: ['MOUNJARO', 'ZEPBOUND', 'GIP/GLP-1 AGONIST'],
      classification: 'Dual GIP/GLP-1 Receptor Agonist',
      mechanism: 'Activates both GIP and GLP-1 receptors, providing enhanced glycemic control and weight management effects compared to single-target approaches.',
      commonUses: ['Advanced metabolic research', 'Dual-pathway studies', 'Comparative effectiveness research', 'Weight management research'],
      dosageRanges: 'Research protocols typically range from 2.5mg to 15mg weekly, with careful dose escalation.',
      researchFindings: 'Superior weight loss and glycemic control compared to single GLP-1 agonists in head-to-head trials.',
      considerations: 'Enhanced potency requires careful monitoring. May have increased gastrointestinal effects.',
      researchStatus: 'Recently approved, extensive ongoing research into optimal applications.',
      disclaimer: 'Prescription medication - research use must comply with applicable regulations.'
    },
    'TB-500': {
      aliases: ['TB500', 'TB 500', 'THYMOSIN BETA-4'],
      classification: 'Synthetic Peptide Fragment',
      mechanism: 'Promotes cell migration, angiogenesis, and wound healing through actin regulation and anti-inflammatory pathways.',
      commonUses: ['Tissue repair research', 'Athletic recovery studies', 'Wound healing research', 'Anti-inflammatory research'],
      dosageRanges: 'Research protocols typically use 2-5mg weekly, administered subcutaneously.',
      researchFindings: 'Demonstrates significant tissue repair and anti-inflammatory effects in preclinical studies.',
      considerations: 'Generally well-tolerated in research settings. Long-term effects under investigation.',
      researchStatus: 'Investigational compound with growing research interest.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'IPAMORELIN': {
      aliases: ['IPA', 'IPAM'],
      classification: 'Growth Hormone Releasing Peptide',
      mechanism: 'Selective growth hormone secretagogue that stimulates GH release without affecting cortisol or prolactin levels.',
      commonUses: ['Growth hormone research', 'Anti-aging studies', 'Body composition research', 'Sleep quality research'],
      dosageRanges: 'Research dosages typically range from 100-300mcg daily, often administered before sleep.',
      researchFindings: 'Selective GH stimulation with minimal side effects compared to other GHRPs.',
      considerations: 'Well-tolerated with minimal impact on other hormone systems.',
      researchStatus: 'Extensively studied GHRP with established research protocols.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'CJC-1295': {
      aliases: ['CJC1295', 'CJC 1295', 'MODIFIED GRF 1-29'],
      classification: 'Growth Hormone Releasing Hormone Analog',
      mechanism: 'Extended half-life GHRH analog that stimulates growth hormone release through cAMP pathways.',
      commonUses: ['Growth hormone research', 'Anti-aging studies', 'Muscle growth research', 'Fat loss research'],
      dosageRanges: 'Research protocols use 1-2mg weekly, often combined with GHRPs.',
      researchFindings: 'Sustained GH elevation with extended duration compared to natural GHRH.',
      considerations: 'May cause injection site reactions. Long-term studies ongoing.',
      researchStatus: 'Well-established research compound with extensive clinical data.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'SELANK': {
      aliases: ['SELANK NASAL SPRAY', 'TUFTSIN ANALOG'],
      classification: 'Synthetic Heptapeptide',
      mechanism: 'Anxiolytic and nootropic peptide that modulates GABA and serotonin systems, enhances cognitive function and reduces anxiety through neuroplasticity mechanisms.',
      commonUses: ['Anxiety research', 'Cognitive enhancement studies', 'Neuroplasticity research', 'Stress response studies'],
      dosageRanges: 'Research protocols typically use 150-300mcg daily, administered intranasally.',
      researchFindings: 'Demonstrates significant anxiolytic effects without sedation, enhances memory consolidation and learning capacity.',
      considerations: 'Generally well-tolerated with minimal side effects. Non-addictive profile.',
      researchStatus: 'Extensively studied in Russia with growing international research interest.',
      disclaimer: 'Research compound - not approved for therapeutic use in most countries.'
    },
    'SEMAX': {
      aliases: ['SEMAX NASAL SPRAY', 'ACTH ANALOG'],
      classification: 'Synthetic Heptapeptide',
      mechanism: 'Nootropic peptide derived from ACTH that enhances cognitive function through BDNF upregulation and neuroplasticity promotion.',
      commonUses: ['Cognitive enhancement research', 'Neuroprotection studies', 'Memory research', 'Stroke recovery research'],
      dosageRanges: 'Research protocols use 200-400mcg daily, administered intranasally.',
      researchFindings: 'Significant improvements in memory, attention, and cognitive processing. Neuroprotective effects demonstrated.',
      considerations: 'Well-tolerated with minimal side effects. May cause mild nasal irritation.',
      researchStatus: 'Extensively researched with established safety profile and efficacy data.',
      disclaimer: 'Research compound - not approved for therapeutic use in most countries.'
    },
    'PT-141': {
      aliases: ['BREMELANOTIDE', 'BMT'],
      classification: 'Melanocortin Receptor Agonist',
      mechanism: 'Selective melanocortin-4 receptor agonist that enhances sexual function through central nervous system pathways.',
      commonUses: ['Sexual dysfunction research', 'Libido enhancement studies', 'Melanocortin receptor research'],
      dosageRanges: 'Research protocols typically use 1-2mg as needed, administered subcutaneously.',
      researchFindings: 'Effective for both male and female sexual dysfunction with rapid onset of action.',
      considerations: 'May cause nausea, flushing, and decreased appetite. Contraindicated with uncontrolled hypertension.',
      researchStatus: 'FDA-approved for female hypoactive sexual desire disorder under brand name Vyleesi.',
      disclaimer: 'Prescription medication - research use must comply with applicable regulations.'
    },
    'MELANOTAN II': {
      aliases: ['MT-II', 'MT2', 'MELANOTAN 2'],
      classification: 'Melanocortin Receptor Agonist',
      mechanism: 'Non-selective melanocortin receptor agonist that stimulates melanogenesis and has effects on sexual function and appetite.',
      commonUses: ['Photoprotection research', 'Pigmentation studies', 'Sexual function research', 'Appetite research'],
      dosageRanges: 'Research protocols use 0.25-1mg daily during loading phase, then maintenance dosing.',
      researchFindings: 'Effective for skin tanning and photoprotection, with secondary effects on libido and appetite suppression.',
      considerations: 'May cause nausea, flushing, and darkening of moles/freckles. Requires UV exposure for tanning effects.',
      researchStatus: 'Investigational compound with ongoing safety and efficacy studies.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'THYMOSIN BETA-4': {
      aliases: ['TB4', 'TΒETA4', 'THYMOSIN B4'],
      classification: 'Naturally Occurring Peptide',
      mechanism: 'Promotes tissue repair and regeneration through actin regulation, angiogenesis, and anti-inflammatory pathways.',
      commonUses: ['Wound healing research', 'Cardiac repair studies', 'Tissue regeneration research', 'Anti-inflammatory research'],
      dosageRanges: 'Research protocols use 2-10mg weekly, administered subcutaneously.',
      researchFindings: 'Significant tissue repair and regenerative effects, particularly in cardiac and wound healing applications.',
      considerations: 'Generally well-tolerated. Long-term safety data still being compiled.',
      researchStatus: 'Extensive preclinical research with growing clinical trial activity.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'GHRP-6': {
      aliases: ['GHRP6', 'GROWTH HORMONE RELEASING PEPTIDE-6'],
      classification: 'Growth Hormone Releasing Peptide',
      mechanism: 'Stimulates growth hormone release from the pituitary gland through ghrelin receptor activation.',
      commonUses: ['Growth hormone research', 'Anti-aging studies', 'Muscle growth research', 'Recovery research'],
      dosageRanges: 'Research dosages typically range from 100-300mcg, 2-3 times daily.',
      researchFindings: 'Effective GH stimulation with additional effects on appetite and gastric motility.',
      considerations: 'May increase appetite and cortisol levels. Monitor for hypoglycemia.',
      researchStatus: 'Well-established research compound with extensive safety data.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'GHRP-2': {
      aliases: ['GHRP2', 'GROWTH HORMONE RELEASING PEPTIDE-2'],
      classification: 'Growth Hormone Releasing Peptide',
      mechanism: 'Potent growth hormone secretagogue that stimulates GH release with minimal impact on other hormones.',
      commonUses: ['Growth hormone research', 'Body composition studies', 'Anti-aging research', 'Recovery research'],
      dosageRanges: 'Research protocols use 100-300mcg, 2-3 times daily.',
      researchFindings: 'More potent than GHRP-6 with less impact on appetite and cortisol.',
      considerations: 'Generally well-tolerated. May cause transient increases in prolactin.',
      researchStatus: 'Extensively studied with established research protocols.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'HEXARELIN': {
      aliases: ['HEX', 'EXAMORELIN'],
      classification: 'Growth Hormone Releasing Peptide',
      mechanism: 'Synthetic hexapeptide that stimulates GH release through ghrelin receptor activation.',
      commonUses: ['Growth hormone research', 'Cardiac research', 'Neuroprotection studies', 'Anti-aging research'],
      dosageRanges: 'Research dosages range from 100-200mcg, 2-3 times daily.',
      researchFindings: 'Potent GH stimulation with additional cardioprotective and neuroprotective effects.',
      considerations: 'May cause receptor desensitization with prolonged use. Monitor cardiac function.',
      researchStatus: 'Investigational compound with growing clinical interest.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'SERMORELIN': {
      aliases: ['GRF 1-29', 'GROWTH HORMONE RELEASING FACTOR'],
      classification: 'Growth Hormone Releasing Hormone Analog',
      mechanism: 'Synthetic analog of naturally occurring GHRH that stimulates growth hormone release.',
      commonUses: ['Growth hormone deficiency research', 'Anti-aging studies', 'Sleep research', 'Body composition research'],
      dosageRanges: 'Research protocols typically use 100-500mcg daily, administered before sleep.',
      researchFindings: 'Effective for stimulating natural GH production with minimal side effects.',
      considerations: 'Generally well-tolerated. May improve sleep quality.',
      researchStatus: 'FDA-approved for growth hormone deficiency in children.',
      disclaimer: 'Prescription medication - research use must comply with applicable regulations.'
    },
    'TESAMORELIN': {
      aliases: ['TH9507', 'EGRIFTA'],
      classification: 'Growth Hormone Releasing Hormone Analog',
      mechanism: 'Synthetic analog of human GHRH that stimulates endogenous GH production.',
      commonUses: ['HIV lipodystrophy research', 'Body composition studies', 'Metabolic research'],
      dosageRanges: 'Research protocols use 2mg daily, administered subcutaneously.',
      researchFindings: 'Effective for reducing visceral adipose tissue in HIV patients.',
      considerations: 'May cause injection site reactions and joint pain.',
      researchStatus: 'FDA-approved for HIV-associated lipodystrophy.',
      disclaimer: 'Prescription medication - research use must comply with applicable regulations.'
    },
    'OXYTOCIN': {
      aliases: ['OT', 'LOVE HORMONE'],
      classification: 'Naturally Occurring Hormone',
      mechanism: 'Neuropeptide hormone that acts on oxytocin receptors to influence social bonding and reproductive behaviors.',
      commonUses: ['Social behavior research', 'Autism studies', 'Labor induction research', 'Bonding research'],
      dosageRanges: 'Intranasal research: 24-40 IU per dose. IV labor induction: 0.5-2 mU/min, max 20 mU/min. Social research: 20-40 IU intranasal single dose.',
      researchFindings: 'Significant effects on social cognition, empathy, and pair bonding behaviors. Effective for labor induction.',
      considerations: 'May cause uterine contractions. Contraindicated in pregnancy unless medically supervised.',
      researchStatus: 'FDA-approved for labor induction and postpartum bleeding.',
      disclaimer: 'Prescription medication - research use must comply with applicable regulations.'
    },
    'VASOPRESSIN': {
      aliases: ['ADH', 'ANTIDIURETIC HORMONE', 'AVP'],
      classification: 'Naturally Occurring Hormone',
      mechanism: 'Antidiuretic hormone that regulates water retention and blood pressure through V1 and V2 receptors.',
      commonUses: ['Diabetes insipidus research', 'Cardiovascular research', 'Memory research', 'Social behavior studies'],
      dosageRanges: 'Research dosages vary based on indication and route of administration.',
      researchFindings: 'Essential for water homeostasis with additional effects on memory and social behavior.',
      considerations: 'May cause water retention and hyponatremia. Monitor electrolyte levels.',
      researchStatus: 'FDA-approved for diabetes insipidus and certain bleeding disorders.',
      disclaimer: 'Prescription medication - research use must comply with applicable regulations.'
    },
    'DSIP': {
      aliases: ['DELTA SLEEP INDUCING PEPTIDE'],
      classification: 'Naturally Occurring Neuropeptide',
      mechanism: 'Neuromodulator peptide that influences sleep patterns and stress responses.',
      commonUses: ['Sleep research', 'Stress response studies', 'Circadian rhythm research', 'Neuroprotection research'],
      dosageRanges: 'Research protocols typically use 25-100mcg daily.',
      researchFindings: 'Promotes deep sleep and may have stress-protective effects.',
      considerations: 'Generally well-tolerated. May cause drowsiness.',
      researchStatus: 'Investigational compound with limited clinical data.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'EPITHALON': {
      aliases: ['EPITALON', 'EPITHALAMIN'],
      classification: 'Synthetic Tetrapeptide',
      mechanism: 'Telomerase activator that may influence cellular aging and circadian rhythms.',
      commonUses: ['Aging research', 'Longevity studies', 'Circadian rhythm research', 'Cellular research'],
      dosageRanges: 'Research protocols use 5-10mg in cycles, administered subcutaneously.',
      researchFindings: 'May influence telomerase activity and melatonin production.',
      considerations: 'Limited human safety data. Long-term effects unknown.',
      researchStatus: 'Investigational compound with limited clinical research.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'FOLLISTATIN-344': {
      aliases: ['FST-344', 'FOLLISTATIN'],
      classification: 'Myostatin Inhibitor',
      mechanism: 'Binds and neutralizes myostatin and other TGF-β family proteins, promoting muscle growth.',
      commonUses: ['Muscle growth research', 'Myostatin research', 'Muscular dystrophy studies', 'Athletic performance research'],
      dosageRanges: 'Research protocols vary widely based on study design.',
      researchFindings: 'Potent muscle growth promotion through myostatin inhibition.',
      considerations: 'Limited human safety data. Potential for significant muscle growth.',
      researchStatus: 'Investigational compound with growing research interest.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'THYMULIN': {
      aliases: ['FACTEUR THYMIQUE SERIQUE', 'FTS'],
      classification: 'Thymic Hormone',
      mechanism: 'Thymic peptide that modulates immune system function and T-cell development.',
      commonUses: ['Immunology research', 'Aging research', 'Autoimmune studies', 'T-cell research'],
      dosageRanges: 'Research dosages vary based on study design and application.',
      researchFindings: 'Important role in immune system regulation and T-cell maturation.',
      considerations: 'Limited human safety data. May affect immune responses.',
      researchStatus: 'Investigational compound with specialized research applications.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'THYMOSIN ALPHA-1': {
      aliases: ['TA1', 'THYMALFASIN', 'ZADAXIN'],
      classification: 'Thymic Peptide',
      mechanism: 'Immunomodulator that enhances T-cell function and immune response.',
      commonUses: ['Immunology research', 'Cancer research', 'Viral infection studies', 'Immune enhancement research'],
      dosageRanges: 'Research protocols typically use 1.6mg twice weekly.',
      researchFindings: 'Enhances immune function and may improve outcomes in certain cancers and infections.',
      considerations: 'Generally well-tolerated. May cause injection site reactions.',
      researchStatus: 'Approved in some countries for hepatitis B and certain cancers.',
      disclaimer: 'Regulatory status varies by country - research use must comply with local regulations.'
    },
    'LL-37': {
      aliases: ['CATHELICIDIN', 'CAMP'],
      classification: 'Antimicrobial Peptide',
      mechanism: 'Natural antimicrobial peptide with broad-spectrum activity against bacteria, viruses, and fungi.',
      commonUses: ['Antimicrobial research', 'Wound healing studies', 'Immune research', 'Skin research'],
      dosageRanges: 'Research applications vary widely based on study design.',
      researchFindings: 'Potent antimicrobial activity with additional wound healing properties.',
      considerations: 'Limited human safety data for systemic use.',
      researchStatus: 'Investigational compound with growing research interest.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'MOTS-C': {
      aliases: ['MITOCHONDRIAL ORF OF THE 12S RRNA TYPE-C'],
      classification: 'Mitochondrial-Derived Peptide',
      mechanism: 'Mitochondrial peptide that regulates metabolic homeostasis and cellular energy production.',
      commonUses: ['Metabolic research', 'Aging studies', 'Diabetes research', 'Exercise physiology research'],
      dosageRanges: 'Research protocols are still being established.',
      researchFindings: 'May improve glucose metabolism and exercise capacity.',
      considerations: 'Very limited human data. Novel research area.',
      researchStatus: 'Early-stage investigational compound.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'HUMANIN': {
      aliases: ['HN', 'MITOCHONDRIAL-DERIVED PEPTIDE'],
      classification: 'Mitochondrial-Derived Peptide',
      mechanism: 'Neuroprotective peptide that may protect against cellular stress and neurodegeneration.',
      commonUses: ['Neuroprotection research', 'Aging studies', 'Alzheimer research', 'Cellular stress research'],
      dosageRanges: 'Research protocols are still being developed.',
      researchFindings: 'Potential neuroprotective and anti-aging effects.',
      considerations: 'Very limited human data. Novel research compound.',
      researchStatus: 'Early-stage investigational compound.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'GHK-CU': {
      aliases: ['COPPER PEPTIDE', 'GHK-COPPER'],
      classification: 'Copper-Binding Peptide',
      mechanism: 'Copper-binding tripeptide that promotes wound healing, collagen synthesis, and tissue remodeling.',
      commonUses: ['Wound healing research', 'Anti-aging studies', 'Skin research', 'Hair growth research'],
      dosageRanges: 'Topical applications typically use 0.05-2% concentrations.',
      researchFindings: 'Promotes collagen synthesis, wound healing, and may have anti-inflammatory effects.',
      considerations: 'Generally well-tolerated topically. Limited systemic safety data.',
      researchStatus: 'Well-established in cosmetic applications, ongoing research for therapeutic uses.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'SNAP-8': {
      aliases: ['ACETYL OCTAPEPTIDE-3', 'ANTI-WRINKLE PEPTIDE'],
      classification: 'Cosmetic Peptide',
      mechanism: 'Synthetic octapeptide that reduces muscle contraction intensity, potentially reducing wrinkle formation.',
      commonUses: ['Cosmetic research', 'Anti-aging studies', 'Dermatology research', 'Muscle contraction studies'],
      dosageRanges: 'Topical formulations typically use 3-10% concentrations.',
      researchFindings: 'May reduce wrinkle depth and muscle contraction intensity.',
      considerations: 'Primarily studied for topical cosmetic applications.',
      researchStatus: 'Established cosmetic ingredient with ongoing research.',
      disclaimer: 'Cosmetic ingredient - research compound for other applications.'
    },
    'MATRIXYL': {
      aliases: ['PALMITOYL PENTAPEPTIDE-4', 'PAL-KTTKS'],
      classification: 'Cosmetic Peptide',
      mechanism: 'Synthetic peptide that stimulates collagen synthesis and skin repair mechanisms.',
      commonUses: ['Anti-aging research', 'Skin research', 'Collagen studies', 'Cosmetic research'],
      dosageRanges: 'Topical formulations typically use 2-8% concentrations.',
      researchFindings: 'Stimulates collagen production and may improve skin texture and firmness.',
      considerations: 'Well-established safety profile for topical use.',
      researchStatus: 'Widely used cosmetic ingredient with extensive research.',
      disclaimer: 'Cosmetic ingredient - research compound for therapeutic applications.'
    },
    'PENTOSAN POLYSULFATE': {
      aliases: ['PPS', 'ELMIRON'],
      classification: 'Glycosaminoglycan Analog',
      mechanism: 'Synthetic polysaccharide that may protect bladder lining and have anti-inflammatory effects.',
      commonUses: ['Interstitial cystitis research', 'Bladder research', 'Anti-inflammatory studies', 'Joint research'],
      dosageRanges: 'Clinical protocols typically use 100mg three times daily.',
      researchFindings: 'Effective for interstitial cystitis, potential benefits for joint health.',
      considerations: 'May cause gastrointestinal effects and bleeding risk.',
      researchStatus: 'FDA-approved for interstitial cystitis.',
      disclaimer: 'Prescription medication - research use must comply with applicable regulations.'
    },
    'CEREBROLYSIN': {
      aliases: ['BRAIN-DERIVED PEPTIDES', 'NEUROTROPHIC FACTORS'],
      classification: 'Neuropeptide Complex',
      mechanism: 'Mixture of low molecular weight peptides and amino acids that may support neuroplasticity.',
      commonUses: ['Stroke research', 'Dementia studies', 'Traumatic brain injury research', 'Neuroprotection studies'],
      dosageRanges: 'Clinical protocols typically use 10-30ml daily intravenously.',
      researchFindings: 'May improve cognitive function and neurological outcomes in certain conditions.',
      considerations: 'Requires medical supervision. May cause allergic reactions.',
      researchStatus: 'Approved in some countries for neurological conditions.',
      disclaimer: 'Regulatory status varies by country - research use must comply with local regulations.'
    },
    'DIHEXA': {
      aliases: ['N-HEXANOIC-TYR-ILE-(6) AMINOHEXANOIC AMIDE'],
      classification: 'Cognitive Enhancement Peptide',
      mechanism: 'Small molecule that may enhance cognitive function through HGF/c-Met pathway activation.',
      commonUses: ['Cognitive research', 'Alzheimer studies', 'Memory research', 'Neuroplasticity studies'],
      dosageRanges: 'Research protocols are still being established.',
      researchFindings: 'Potential cognitive enhancement and neuroprotective effects in preclinical studies.',
      considerations: 'Very limited human safety data. Novel research compound.',
      researchStatus: 'Early-stage investigational compound.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'NOOPEPT': {
      aliases: ['GVS-111', 'N-PHENYLACETYL-L-PROLYLGLYCINE ETHYL ESTER'],
      classification: 'Nootropic Peptide',
      mechanism: 'Synthetic nootropic that may enhance cognitive function through AMPA receptor modulation.',
      commonUses: ['Cognitive research', 'Memory studies', 'Neuroprotection research', 'Learning studies'],
      dosageRanges: 'Research protocols typically use 10-30mg daily.',
      researchFindings: 'May improve memory, learning, and neuroprotection in preclinical studies.',
      considerations: 'Limited human safety data. May interact with other medications.',
      researchStatus: 'Investigational compound with limited clinical data.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'P21': {
      aliases: ['CYCLIN-DEPENDENT KINASE INHIBITOR'],
      classification: 'Cell Cycle Regulator',
      mechanism: 'Protein that regulates cell cycle progression and may have neuroprotective effects.',
      commonUses: ['Cancer research', 'Cell cycle studies', 'Neuroprotection research', 'Aging studies'],
      dosageRanges: 'Research applications vary based on study design.',
      researchFindings: 'Important role in cell cycle regulation and potential therapeutic target.',
      considerations: 'Research-grade compound with specialized applications.',
      researchStatus: 'Established research target with ongoing studies.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'ADAMTS': {
      aliases: ['A DISINTEGRIN AND METALLOPROTEINASE'],
      classification: 'Metalloproteinase',
      mechanism: 'Family of enzymes involved in extracellular matrix remodeling and various physiological processes.',
      commonUses: ['Matrix biology research', 'Cardiovascular research', 'Cancer research', 'Developmental studies'],
      dosageRanges: 'Research applications vary based on specific ADAMTS variant and study design.',
      researchFindings: 'Critical roles in development, disease, and tissue homeostasis.',
      considerations: 'Specialized research applications requiring expertise.',
      researchStatus: 'Active area of research with therapeutic potential.',
      disclaimer: 'Research compounds - not approved for therapeutic use.'
    },
    'LIRAGLUTIDE': {
      aliases: ['VICTOZA', 'SAXENDA', 'GLP-1 ANALOG'],
      classification: 'GLP-1 Receptor Agonist',
      mechanism: 'Long-acting GLP-1 analog that regulates blood glucose and slows gastric emptying.',
      commonUses: ['Diabetes research', 'Weight management studies', 'Cardiovascular research', 'Metabolic studies'],
      dosageRanges: 'Clinical protocols range from 0.6-3.0mg daily depending on indication.',
      researchFindings: 'Effective for diabetes management and weight loss with cardiovascular benefits.',
      considerations: 'May cause gastrointestinal effects and pancreatitis risk.',
      researchStatus: 'FDA-approved for diabetes and weight management.',
      disclaimer: 'Prescription medication - research use must comply with applicable regulations.'
    },
    'DULAGLUTIDE': {
      aliases: ['TRULICITY', 'LY2189265'],
      classification: 'GLP-1 Receptor Agonist',
      mechanism: 'Weekly GLP-1 receptor agonist that improves glycemic control and promotes weight loss.',
      commonUses: ['Diabetes research', 'Cardiovascular studies', 'Weight management research', 'Metabolic research'],
      dosageRanges: 'Clinical protocols typically use 0.75-4.5mg weekly.',
      researchFindings: 'Effective glucose control with cardiovascular benefits and weight loss.',
      considerations: 'May cause gastrointestinal effects and injection site reactions.',
      researchStatus: 'FDA-approved for type 2 diabetes.',
      disclaimer: 'Prescription medication - research use must comply with applicable regulations.'
    },
    'EXENATIDE': {
      aliases: ['BYETTA', 'BYDUREON', 'EXENDIN-4'],
      classification: 'GLP-1 Receptor Agonist',
      mechanism: 'Incretin mimetic that enhances glucose-dependent insulin secretion and slows gastric emptying.',
      commonUses: ['Diabetes research', 'Weight management studies', 'Neuroprotection research', 'Metabolic studies'],
      dosageRanges: 'Clinical protocols range from 5-10mcg twice daily or 2mg weekly for extended-release.',
      researchFindings: 'Effective for diabetes management with potential neuroprotective effects.',
      considerations: 'May cause nausea and pancreatitis risk.',
      researchStatus: 'FDA-approved for type 2 diabetes.',
      disclaimer: 'Prescription medication - research use must comply with applicable regulations.'
    },
    'PRAMLINTIDE': {
      aliases: ['SYMLIN', 'AMYLIN ANALOG'],
      classification: 'Amylin Analog',
      mechanism: 'Synthetic analog of amylin that slows gastric emptying and promotes satiety.',
      commonUses: ['Diabetes research', 'Weight management studies', 'Gastric motility research', 'Metabolic studies'],
      dosageRanges: 'Clinical protocols typically use 15-120mcg with meals.',
      researchFindings: 'Effective as adjunct therapy for diabetes with weight loss benefits.',
      considerations: 'Risk of severe hypoglycemia when combined with insulin.',
      researchStatus: 'FDA-approved for diabetes as adjunct to insulin.',
      disclaimer: 'Prescription medication - research use must comply with applicable regulations.'
    },
    'TERLIPRESSIN': {
      aliases: ['GLYPRESSIN', 'TRIGLYCYL-LYSINE VASOPRESSIN'],
      classification: 'Vasopressin Analog',
      mechanism: 'Synthetic vasopressin analog with prolonged duration and selective V1 receptor activity.',
      commonUses: ['Portal hypertension research', 'Bleeding studies', 'Shock research', 'Cardiovascular research'],
      dosageRanges: 'Clinical protocols vary based on indication, typically 1-2mg every 4-6 hours.',
      researchFindings: 'Effective for esophageal variceal bleeding and hepatorenal syndrome.',
      considerations: 'May cause ischemic complications and hypertension.',
      researchStatus: 'Approved in many countries for specific indications.',
      disclaimer: 'Prescription medication - research use must comply with applicable regulations.'
    },
    'NICOTINAMIDE RIBOSIDE': {
      aliases: ['NR', 'NIAGEN', 'NAD+ PRECURSOR'],
      classification: 'Vitamin B3 Derivative',
      mechanism: 'NAD+ precursor that supports cellular energy metabolism and may promote longevity.',
      commonUses: ['Anti-aging research', 'Metabolic studies', 'Mitochondrial research', 'Longevity research'],
      dosageRanges: 'Research protocols typically use 250-1000mg daily.',
      researchFindings: 'May increase NAD+ levels and support cellular energy production.',
      considerations: 'Generally well-tolerated. May cause mild gastrointestinal effects.',
      researchStatus: 'Dietary supplement with growing research interest.',
      disclaimer: 'Dietary supplement - research applications under investigation.'
    },
    'NMN': {
      aliases: ['NICOTINAMIDE MONONUCLEOTIDE', 'β-NICOTINAMIDE MONONUCLEOTIDE'],
      classification: 'NAD+ Precursor',
      mechanism: 'Direct NAD+ precursor that may support cellular energy metabolism and longevity pathways.',
      commonUses: ['Anti-aging research', 'Metabolic studies', 'Cardiovascular research', 'Neurological research'],
      dosageRanges: 'Research protocols typically use 250-1000mg daily.',
      researchFindings: 'May increase NAD+ levels and support various aspects of healthy aging.',
      considerations: 'Generally well-tolerated. Limited long-term human safety data.',
      researchStatus: 'Investigational compound with growing clinical interest.',
      disclaimer: 'Research compound - regulatory status varies by jurisdiction.'
    },
    'RESVERATROL': {
      aliases: ['TRANS-RESVERATROL', 'RED WINE EXTRACT'],
      classification: 'Polyphenol Antioxidant',
      mechanism: 'Polyphenolic compound that may activate sirtuins and provide antioxidant effects.',
      commonUses: ['Anti-aging research', 'Cardiovascular studies', 'Cancer research', 'Metabolic research'],
      dosageRanges: 'Research protocols typically use 150-1000mg daily.',
      researchFindings: 'May provide cardiovascular benefits and activate longevity pathways.',
      considerations: 'May interact with blood thinning medications. Bioavailability concerns.',
      researchStatus: 'Extensively studied dietary supplement.',
      disclaimer: 'Dietary supplement - research applications continue.'
    },
    'PTEROSTILBENE': {
      aliases: ['TRANS-PTEROSTILBENE', 'DIMETHYLRESVERATROL'],
      classification: 'Polyphenol Antioxidant',
      mechanism: 'Methylated analog of resveratrol with improved bioavailability and similar biological activities.',
      commonUses: ['Anti-aging research', 'Cognitive studies', 'Metabolic research', 'Cardiovascular research'],
      dosageRanges: 'Research protocols typically use 50-250mg daily.',
      researchFindings: 'May provide cognitive and metabolic benefits with better bioavailability than resveratrol.',
      considerations: 'Generally well-tolerated. Limited long-term safety data.',
      researchStatus: 'Emerging research compound with promising preclinical data.',
      disclaimer: 'Research compound - dietary supplement applications under investigation.'
    },
    'BERBERINE': {
      aliases: ['BERBERINE HCL', 'BERBERINE HYDROCHLORIDE'],
      classification: 'Plant Alkaloid',
      mechanism: 'Isoquinoline alkaloid that activates AMPK and may improve glucose and lipid metabolism.',
      commonUses: ['Diabetes research', 'Metabolic studies', 'Cardiovascular research', 'Weight management research'],
      dosageRanges: 'Research protocols typically use 500-1500mg daily in divided doses.',
      researchFindings: 'May improve glucose metabolism, lipid profiles, and weight management.',
      considerations: 'May cause gastrointestinal effects. Drug interactions possible.',
      researchStatus: 'Well-established dietary supplement with extensive research.',
      disclaimer: 'Dietary supplement - research applications continue.'
    },
    'METFORMIN': {
      aliases: ['GLUCOPHAGE', 'DIMETHYLBIGUANIDE'],
      classification: 'Biguanide Antidiabetic',
      mechanism: 'Activates AMPK, reduces hepatic glucose production, and improves insulin sensitivity.',
      commonUses: ['Diabetes research', 'Anti-aging studies', 'Cancer research', 'Longevity research'],
      dosageRanges: 'Clinical protocols typically use 500-2000mg daily in divided doses.',
      researchFindings: 'Effective for diabetes management with potential anti-aging and longevity benefits.',
      considerations: 'May cause gastrointestinal effects and lactic acidosis risk.',
      researchStatus: 'FDA-approved for diabetes with extensive off-label research.',
      disclaimer: 'Prescription medication - research use must comply with applicable regulations.'
    },
    'RAPAMYCIN': {
      aliases: ['SIROLIMUS', 'MTOR INHIBITOR'],
      classification: 'mTOR Inhibitor',
      mechanism: 'Inhibits mTOR pathway, which regulates cell growth, proliferation, and autophagy.',
      commonUses: ['Longevity research', 'Cancer studies', 'Immunosuppression research', 'Aging research'],
      dosageRanges: 'Research protocols vary widely based on application.',
      researchFindings: 'May extend lifespan and healthspan through mTOR inhibition.',
      considerations: 'Immunosuppressive effects. Requires careful medical supervision.',
      researchStatus: 'FDA-approved for organ transplant rejection, research for aging applications.',
      disclaimer: 'Prescription medication - research use must comply with applicable regulations.'
    },
    'SPERMIDINE': {
      aliases: ['POLYAMINE', 'AUTOPHAGY INDUCER'],
      classification: 'Polyamine',
      mechanism: 'Natural polyamine that may induce autophagy and support cellular health.',
      commonUses: ['Longevity research', 'Autophagy studies', 'Cardiovascular research', 'Neurological research'],
      dosageRanges: 'Research protocols typically use 1-10mg daily.',
      researchFindings: 'May promote autophagy and support healthy aging processes.',
      considerations: 'Generally well-tolerated. Limited long-term human data.',
      researchStatus: 'Emerging research compound with promising preclinical data.',
      disclaimer: 'Research compound - dietary supplement applications under investigation.'
    },
    'FISETIN': {
      aliases: ['SENOLYTIC COMPOUND', 'FLAVONOID'],
      classification: 'Flavonoid Senolytic',
      mechanism: 'Flavonoid compound that may selectively eliminate senescent cells and provide neuroprotective effects.',
      commonUses: ['Senescence research', 'Anti-aging studies', 'Neurological research', 'Cancer research'],
      dosageRanges: 'Research protocols typically use 100-500mg daily.',
      researchFindings: 'May eliminate senescent cells and provide cognitive benefits.',
      considerations: 'Generally well-tolerated. Limited human safety data.',
      researchStatus: 'Investigational senolytic compound with growing interest.',
      disclaimer: 'Research compound - dietary supplement applications under investigation.'
    },
    'QUERCETIN': {
      aliases: ['FLAVONOID', 'ANTIOXIDANT'],
      classification: 'Flavonoid Antioxidant',
      mechanism: 'Flavonoid with antioxidant, anti-inflammatory, and potential senolytic properties.',
      commonUses: ['Anti-inflammatory research', 'Cardiovascular studies', 'Immune research', 'Senescence research'],
      dosageRanges: 'Research protocols typically use 500-1000mg daily.',
      researchFindings: 'May provide anti-inflammatory and cardiovascular benefits.',
      considerations: 'Generally well-tolerated. May interact with certain medications.',
      researchStatus: 'Well-established dietary supplement with extensive research.',
      disclaimer: 'Dietary supplement - research applications continue.'
    },
    'CURCUMIN': {
      aliases: ['TURMERIC EXTRACT', 'DIFERULOYLMETHANE'],
      classification: 'Polyphenol Anti-inflammatory',
      mechanism: 'Active compound in turmeric with potent anti-inflammatory and antioxidant properties.',
      commonUses: ['Anti-inflammatory research', 'Cancer studies', 'Neurological research', 'Joint health research'],
      dosageRanges: 'Research protocols typically use 500-1000mg daily with bioavailability enhancers.',
      researchFindings: 'May provide anti-inflammatory, neuroprotective, and joint health benefits.',
      considerations: 'Poor bioavailability without enhancers. May interact with blood thinners.',
      researchStatus: 'Extensively studied dietary supplement.',
      disclaimer: 'Dietary supplement - research applications continue.'
    },
    'OMEGA-3': {
      aliases: ['EPA', 'DHA', 'FISH OIL'],
      classification: 'Essential Fatty Acids',
      mechanism: 'Essential fatty acids that support cardiovascular health, brain function, and inflammation resolution.',
      commonUses: ['Cardiovascular research', 'Neurological studies', 'Anti-inflammatory research', 'Cognitive research'],
      dosageRanges: 'Research protocols typically use 1-3g daily of combined EPA/DHA.',
      researchFindings: 'Well-established benefits for cardiovascular health, brain function, and inflammation.',
      considerations: 'Generally safe. May interact with blood thinning medications.',
      researchStatus: 'Extensively researched essential nutrients.',
      disclaimer: 'Essential nutrients - research applications continue.'
    },
    'COENZYME Q10': {
      aliases: ['COQ10', 'UBIQUINONE', 'UBIQUINOL'],
      classification: 'Mitochondrial Cofactor',
      mechanism: 'Essential cofactor in mitochondrial energy production and potent antioxidant.',
      commonUses: ['Cardiovascular research', 'Mitochondrial studies', 'Anti-aging research', 'Neurological research'],
      dosageRanges: 'Research protocols typically use 100-300mg daily.',
      researchFindings: 'May support cardiovascular health, energy production, and provide antioxidant benefits.',
      considerations: 'Generally well-tolerated. Ubiquinol form may have better absorption.',
      researchStatus: 'Well-established dietary supplement with extensive research.',
      disclaimer: 'Dietary supplement - research applications continue.'
    },
    'ADIPOTIDE': {
      aliases: ['FTPP', 'FAT-TARGETING PEPTIDE'],
      classification: 'Vascular-Targeting Peptide',
      mechanism: 'Peptide that targets blood vessels in adipose tissue, potentially causing fat cell death.',
      commonUses: ['Obesity research', 'Fat metabolism studies', 'Vascular research', 'Weight management research'],
      dosageRanges: 'Research protocols vary, typically administered subcutaneously.',
      researchFindings: 'Experimental compound showing potential for targeted fat reduction in preclinical studies.',
      considerations: 'Highly experimental. Significant safety concerns and limited human data.',
      researchStatus: 'Early-stage investigational compound with serious safety considerations.',
      disclaimer: 'Research compound - not approved for therapeutic use. Significant safety risks.'
    },
    'AICAR': {
      aliases: ['5-AMINOIMIDAZOLE-4-CARBOXAMIDE RIBONUCLEOTIDE'],
      classification: 'AMPK Activator',
      mechanism: 'Activates AMPK pathway, mimicking effects of exercise on cellular metabolism.',
      commonUses: ['Exercise mimetic research', 'Metabolic studies', 'Diabetes research', 'Endurance research'],
      dosageRanges: 'Research protocols vary widely based on study design.',
      researchFindings: 'May mimic exercise effects on metabolism and improve glucose uptake.',
      considerations: 'Limited human safety data. Potential cardiovascular risks.',
      researchStatus: 'Investigational compound with limited clinical data.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'ARA-290': {
      aliases: ['CIBINETIDE', 'EPO ANALOG'],
      classification: 'Erythropoietin Analog',
      mechanism: 'Non-hematopoietic EPO analog that may provide tissue protection without affecting red blood cell production.',
      commonUses: ['Neuroprotection research', 'Tissue protection studies', 'Diabetic neuropathy research', 'Wound healing research'],
      dosageRanges: 'Research protocols typically use subcutaneous administration.',
      researchFindings: 'May provide neuroprotective and tissue-protective effects without hematopoietic activity.',
      considerations: 'Limited human safety data. Novel mechanism requires careful study.',
      researchStatus: 'Investigational compound in clinical development.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'CAGRILINTIDE': {
      aliases: ['AMYLIN/CALCITONIN DUAL AGONIST', 'CAG', 'AM833'],
      classification: 'Dual Hormone Agonist',
      mechanism: 'Dual agonist of amylin and calcitonin receptors for enhanced metabolic effects and appetite suppression.',
      commonUses: ['Obesity research', 'Diabetes research', 'Weight management studies', 'Metabolic research'],
      dosageRanges: 'Clinical trials: 0.3-2.4mg weekly subcutaneous injection. Phase 2 studies used 1.2mg and 2.4mg weekly. Titration typically starts at 0.3mg weekly, increasing by 0.3mg weekly to target dose.',
      researchFindings: 'Phase 2 trials showed 15.6% weight loss at 2.4mg weekly dose. Superior efficacy when combined with semaglutide.',
      considerations: 'GI side effects common during titration. Novel dual mechanism. Requires slow dose escalation.',
      researchStatus: 'Phase 3 clinical trials ongoing (Novo Nordisk).',
      disclaimer: 'Investigational compound - not approved for therapeutic use.'
    },
    'FOX04-DRI': {
      aliases: ['FOXO4-DRI', 'SENOLYTIC PEPTIDE'],
      classification: 'Senolytic Peptide',
      mechanism: 'Interferes with FOXO4-p53 interaction, potentially inducing senescent cell death.',
      commonUses: ['Senescence research', 'Anti-aging studies', 'Longevity research', 'Cancer research'],
      dosageRanges: 'Research protocols are still being established.',
      researchFindings: 'May selectively eliminate senescent cells and improve healthspan.',
      considerations: 'Very limited human data. Novel senolytic mechanism.',
      researchStatus: 'Early-stage investigational compound.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'HCG': {
      aliases: ['HUMAN CHORIONIC GONADOTROPIN', 'PREGNANCY HORMONE'],
      classification: 'Glycoprotein Hormone',
      mechanism: 'Mimics LH activity, stimulating testosterone production and supporting fertility.',
      commonUses: ['Fertility research', 'Hypogonadism studies', 'Weight management research', 'Hormone research'],
      dosageRanges: 'Clinical protocols vary widely based on indication.',
      researchFindings: 'Effective for fertility treatments and testosterone restoration.',
      considerations: 'May cause hormonal side effects. Requires medical supervision.',
      researchStatus: 'FDA-approved for specific fertility and hormonal indications.',
      disclaimer: 'Prescription medication - research use must comply with applicable regulations.'
    },
    'HMG': {
      aliases: ['HUMAN MENOPAUSAL GONADOTROPIN', 'MENOTROPIN'],
      classification: 'Gonadotropin Hormone',
      mechanism: 'Contains FSH and LH activity, stimulating gonadal function and gamete production.',
      commonUses: ['Fertility research', 'Reproductive studies', 'Hormone research', 'Ovulation studies'],
      dosageRanges: 'Clinical protocols vary based on indication and patient response.',
      researchFindings: 'Effective for ovulation induction and male fertility enhancement.',
      considerations: 'Risk of ovarian hyperstimulation syndrome. Requires monitoring.',
      researchStatus: 'FDA-approved for fertility treatments.',
      disclaimer: 'Prescription medication - research use must comply with applicable regulations.'
    },
    'IGF-1 LR3': {
      aliases: ['LONG R3 IGF-1', 'INSULIN-LIKE GROWTH FACTOR-1 LR3'],
      classification: 'Growth Factor Analog',
      mechanism: 'Modified IGF-1 with extended half-life and reduced binding protein affinity.',
      commonUses: ['Growth research', 'Muscle development studies', 'Anti-aging research', 'Metabolic research'],
      dosageRanges: 'Research protocols vary widely based on study design.',
      researchFindings: 'May promote muscle growth and tissue repair with extended activity.',
      considerations: 'Potent growth factor. Risk of hypoglycemia and other growth-related effects.',
      researchStatus: 'Investigational compound with specialized research applications.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'KISSPEPTIN': {
      aliases: ['METASTIN', 'KP-54'],
      classification: 'Neuropeptide Hormone',
      mechanism: 'Regulates GnRH release and reproductive hormone cascade.',
      commonUses: ['Reproductive research', 'Puberty studies', 'Fertility research', 'Neuroendocrine research'],
      dosageRanges: 'Research protocols typically use intravenous administration.',
      researchFindings: 'Critical regulator of reproductive function and puberty onset.',
      considerations: 'Specialized research applications. Limited human safety data.',
      researchStatus: 'Investigational compound with growing research interest.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'MAZDUTIDE': {
      aliases: ['GLP-1/GLUCAGON DUAL AGONIST'],
      classification: 'Dual Incretin Agonist',
      mechanism: 'Dual agonist of GLP-1 and glucagon receptors for enhanced metabolic effects.',
      commonUses: ['Obesity research', 'Diabetes research', 'Weight management studies', 'Metabolic research'],
      dosageRanges: 'Research protocols are being established in clinical trials.',
      researchFindings: 'Potential for significant weight loss and metabolic improvements.',
      considerations: 'Novel dual mechanism. Limited human safety data.',
      researchStatus: 'Clinical-stage investigational compound.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'NAD+': {
      aliases: ['NICOTINAMIDE ADENINE DINUCLEOTIDE', 'COENZYME'],
      classification: 'Cellular Coenzyme',
      mechanism: 'Essential coenzyme in cellular energy metabolism and DNA repair processes.',
      commonUses: ['Anti-aging research', 'Metabolic studies', 'Mitochondrial research', 'Longevity research'],
      dosageRanges: 'IV protocols vary, typically administered under medical supervision.',
      researchFindings: 'May support cellular energy production and DNA repair mechanisms.',
      considerations: 'Direct NAD+ has limited oral bioavailability. IV administration requires medical supervision.',
      researchStatus: 'Research applications growing, precursor supplements more common.',
      disclaimer: 'Research compound - direct NAD+ administration requires medical supervision.'
    },
    'PEG-MGF': {
      aliases: ['PEGYLATED MECHANO GROWTH FACTOR', 'IGF-1EC'],
      classification: 'Growth Factor Analog',
      mechanism: 'Pegylated form of mechano growth factor with extended half-life for muscle repair.',
      commonUses: ['Muscle research', 'Tissue repair studies', 'Athletic recovery research', 'Wound healing research'],
      dosageRanges: 'Research protocols vary based on study design.',
      researchFindings: 'May promote muscle repair and tissue regeneration.',
      considerations: 'Limited human safety data. Potent growth factor effects.',
      researchStatus: 'Investigational compound with specialized research applications.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'RETATRUTIDE': {
      aliases: ['TRIPLE AGONIST', 'GLP-1/GIP/GLUCAGON AGONIST'],
      classification: 'Triple Incretin Agonist',
      mechanism: 'Triple agonist of GLP-1, GIP, and glucagon receptors for comprehensive metabolic effects.',
      commonUses: ['Obesity research', 'Diabetes research', 'Weight management studies', 'Advanced metabolic research'],
      dosageRanges: 'Clinical protocols are being established in ongoing trials.',
      researchFindings: 'Potential for superior weight loss and metabolic improvements compared to dual agonists.',
      considerations: 'Novel triple mechanism. Very limited human data.',
      researchStatus: 'Advanced clinical-stage investigational compound.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'SS-31': {
      aliases: ['ELAMIPRETIDE', 'MITOCHONDRIAL PEPTIDE'],
      classification: 'Mitochondrial-Targeting Peptide',
      mechanism: 'Targets mitochondrial inner membrane to improve mitochondrial function and reduce oxidative stress.',
      commonUses: ['Mitochondrial research', 'Aging studies', 'Cardiovascular research', 'Neurodegenerative research'],
      dosageRanges: 'Research protocols typically use subcutaneous administration.',
      researchFindings: 'May improve mitochondrial function and reduce cellular aging.',
      considerations: 'Generally well-tolerated. Limited long-term human data.',
      researchStatus: 'Clinical-stage investigational compound.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'SURVIVUTIDE': {
      aliases: ['SURVIVAL PEPTIDE', 'NEUROPROTECTIVE PEPTIDE'],
      classification: 'Neuroprotective Peptide',
      mechanism: 'May provide neuroprotective effects through multiple cellular pathways.',
      commonUses: ['Neuroprotection research', 'Stroke studies', 'Neurodegenerative research', 'Brain injury research'],
      dosageRanges: 'Research protocols are being established.',
      researchFindings: 'Potential neuroprotective effects in preclinical studies.',
      considerations: 'Very limited human data. Novel neuroprotective mechanism.',
      researchStatus: 'Early-stage investigational compound.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'AA-031': {
      aliases: ['AA WATER', 'AA-031 WATER'],
      classification: 'Amino Acid Complex',
      mechanism: 'Amino acid formulation that may support cellular processes and recovery.',
      commonUses: ['Recovery research', 'Cellular support studies', 'Amino acid research', 'Nutritional research'],
      dosageRanges: 'Research protocols vary based on study design.',
      researchFindings: 'May provide amino acid supplementation for various research applications.',
      considerations: 'Generally well-tolerated. Composition may vary by manufacturer.',
      researchStatus: 'Nutritional research compound.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'BPC-157+TB-500': {
      aliases: ['BPC157/TB500 BLEND', 'HEALING BLEND', 'RECOVERY STACK'],
      classification: 'Peptide Combination',
      mechanism: 'Combines BPC-157 tissue repair properties with TB-500 regenerative effects for enhanced healing.',
      commonUses: ['Enhanced tissue repair research', 'Combined healing studies', 'Accelerated recovery research', 'Multi-pathway repair research'],
      dosageRanges: 'Research protocols typically combine standard dosages of each peptide.',
      researchFindings: 'May provide synergistic tissue repair and regenerative effects.',
      considerations: 'Combines effects and considerations of both individual peptides.',
      researchStatus: 'Combination research compound with established individual components.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'CJC-1295 DAC': {
      aliases: ['CJC1295 WITH DAC', 'CJC-1295+DAC', 'MODIFIED GRF 1-29 DAC'],
      classification: 'Growth Hormone Releasing Hormone Analog',
      mechanism: 'Extended half-life GHRH analog with Drug Affinity Complex for prolonged GH stimulation.',
      commonUses: ['Extended GH research', 'Long-acting growth studies', 'Anti-aging research', 'Body composition research'],
      dosageRanges: 'Research protocols typically use 1-2mg weekly due to extended half-life.',
      researchFindings: 'Provides sustained GH elevation with less frequent dosing compared to standard CJC-1295.',
      considerations: 'Longer duration of action. May cause injection site reactions.',
      researchStatus: 'Well-established research compound with extended activity profile.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'IGF-DES': {
      aliases: ['IGF-1 DES', 'DES(1-3)IGF-1', 'TRUNCATED IGF-1'],
      classification: 'Growth Factor Analog',
      mechanism: 'Truncated IGF-1 variant with higher potency and reduced binding protein affinity.',
      commonUses: ['Localized growth research', 'Muscle research', 'Tissue-specific studies', 'Enhanced IGF research'],
      dosageRanges: 'Research protocols typically use lower doses due to increased potency.',
      researchFindings: 'More potent than regular IGF-1 with enhanced local tissue effects.',
      considerations: 'Higher potency requires careful dosing. Risk of hypoglycemia.',
      researchStatus: 'Specialized research compound with enhanced activity profile.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'MELANOTAN': {
      aliases: ['MELANOTAN I', 'MT-I', 'AFAMELANOTIDE'],
      classification: 'Melanocortin Receptor Agonist',
      mechanism: 'Selective melanocortin-1 receptor agonist that stimulates melanogenesis for photoprotection.',
      commonUses: ['Photoprotection research', 'Melanogenesis studies', 'Skin pigmentation research', 'UV protection research'],
      dosageRanges: 'Research protocols typically use 0.25-1mg daily with controlled UV exposure.',
      researchFindings: 'Effective for photoprotection and skin darkening with less systemic effects than MT-II.',
      considerations: 'Requires UV exposure for effect. May cause nausea and appetite changes.',
      researchStatus: 'FDA-approved as Scenesse for erythropoietic protoporphyria.',
      disclaimer: 'Prescription medication - research use must comply with applicable regulations.'
    },
    'MGF': {
      aliases: ['MECHANO GROWTH FACTOR', 'IGF-1EC', 'MECHANICAL GROWTH FACTOR'],
      classification: 'Growth Factor Splice Variant',
      mechanism: 'Splice variant of IGF-1 that responds to mechanical stress and promotes muscle repair.',
      commonUses: ['Muscle repair research', 'Mechanical stress studies', 'Exercise response research', 'Tissue regeneration research'],
      dosageRanges: 'Research protocols vary based on study design and administration route.',
      researchFindings: 'May enhance muscle repair and adaptation to mechanical stress.',
      considerations: 'Short half-life. Limited human safety data.',
      researchStatus: 'Investigational compound with specialized muscle research applications.',
      disclaimer: 'Research compound - not approved for therapeutic use.'
    },
    'NICOTINAMIDE': {
      aliases: ['NIACINAMIDE', 'VITAMIN B3', 'NICOTINIC ACID AMIDE'],
      classification: 'B-Vitamin',
      mechanism: 'Precursor to NAD+ that supports cellular energy metabolism and DNA repair.',
      commonUses: ['NAD+ research', 'Cellular energy studies', 'Skin research', 'Metabolic research'],
      dosageRanges: 'Research protocols typically use 500-2000mg daily.',
      researchFindings: 'May support NAD+ levels and provide various cellular benefits.',
      considerations: 'Generally well-tolerated. High doses may cause flushing.',
      researchStatus: 'Well-established vitamin with extensive research applications.',
      disclaimer: 'Vitamin supplement - research applications continue.'
    },
    'GLUTATHIONE': {
      aliases: ['GSH', 'L-GLUTATHIONE', 'REDUCED GLUTATHIONE'],
      classification: 'Antioxidant Tripeptide',
      mechanism: 'Master antioxidant that protects cells from oxidative stress and supports detoxification.',
      commonUses: ['Antioxidant research', 'Detoxification studies', 'Liver research', 'Aging research'],
      dosageRanges: 'Research protocols vary widely based on administration route.',
      researchFindings: 'Critical for cellular antioxidant defense and detoxification processes.',
      considerations: 'Poor oral bioavailability. IV administration more effective.',
      researchStatus: 'Well-established antioxidant with extensive research.',
      disclaimer: 'Research compound - IV administration requires medical supervision.'
    },
    'CARNOSINE': {
      aliases: ['L-CARNOSINE', 'BETA-ALANYL-L-HISTIDINE'],
      classification: 'Dipeptide Antioxidant',
      mechanism: 'Dipeptide with antioxidant and anti-glycation properties that may support cellular health.',
      commonUses: ['Anti-aging research', 'Antioxidant studies', 'Neuroprotection research', 'Muscle research'],
      dosageRanges: 'Research protocols typically use 500-1500mg daily.',
      researchFindings: 'May provide antioxidant benefits and support healthy aging processes.',
      considerations: 'Generally well-tolerated. May have metallic taste.',
      researchStatus: 'Established research compound with anti-aging applications.',
      disclaimer: 'Research compound - dietary supplement applications under investigation.'
    },
    'TAURINE': {
      aliases: ['2-AMINOETHANESULFONIC ACID', 'L-TAURINE'],
      classification: 'Amino Sulfonic Acid',
      mechanism: 'Semi-essential amino acid that supports cardiovascular, neurological, and cellular functions.',
      commonUses: ['Cardiovascular research', 'Neurological studies', 'Exercise research', 'Cellular research'],
      dosageRanges: 'Research protocols typically use 1-3g daily.',
      researchFindings: 'May support cardiovascular health, exercise performance, and cellular function.',
      considerations: 'Generally well-tolerated with minimal side effects.',
      researchStatus: 'Well-established amino acid with extensive research.',
      disclaimer: 'Amino acid supplement - research applications continue.'
    },
    'L-CARNITINE': {
      aliases: ['ACETYL-L-CARNITINE', 'ALCAR', 'L-CARNITINE TARTRATE'],
      classification: 'Amino Acid Derivative',
      mechanism: 'Facilitates fatty acid transport into mitochondria for energy production.',
      commonUses: ['Metabolic research', 'Exercise studies', 'Cognitive research', 'Cardiovascular research'],
      dosageRanges: 'Research protocols typically use 1-3g daily depending on form.',
      researchFindings: 'May support fat metabolism, exercise performance, and cognitive function.',
      considerations: 'Generally well-tolerated. May cause mild gastrointestinal effects.',
      researchStatus: 'Well-established supplement with extensive research.',
      disclaimer: 'Dietary supplement - research applications continue.'
    },
    'SUPER SHIELD': {
      aliases: ['ANTIOXIDANT BLEND', 'PROTECTIVE COMPLEX'],
      classification: 'Antioxidant Combination',
      mechanism: 'Multi-component antioxidant formula designed to provide comprehensive cellular protection.',
      commonUses: ['Antioxidant research', 'Cellular protection studies', 'Anti-aging research', 'Oxidative stress research'],
      dosageRanges: 'Research protocols vary based on specific formulation.',
      researchFindings: 'May provide enhanced antioxidant protection through multiple pathways.',
      considerations: 'Effects depend on specific ingredients and concentrations.',
      researchStatus: 'Proprietary research formulation.',
      disclaimer: 'Research compound - specific formulation may vary by manufacturer.'
    },
    'HEALTHY HAIR SKIN NAILS BLEND': {
      aliases: ['BEAUTY BLEND', 'HSN COMPLEX', 'COSMETIC SUPPORT'],
      classification: 'Nutritional Complex',
      mechanism: 'Combination of nutrients that may support hair, skin, and nail health.',
      commonUses: ['Cosmetic research', 'Dermatological studies', 'Hair research', 'Nail health research'],
      dosageRanges: 'Research protocols vary based on specific formulation.',
      researchFindings: 'May support structural protein synthesis and cellular health.',
      considerations: 'Effects depend on specific ingredients and individual response.',
      researchStatus: 'Nutritional research formulation.',
      disclaimer: 'Nutritional supplement - research applications under investigation.'
    },
    'LIPO MINUS MEALS': {
      aliases: ['LIPOTROPIC BLEND', 'FAT METABOLISM SUPPORT'],
      classification: 'Metabolic Support Complex',
      mechanism: 'Combination designed to support fat metabolism and weight management.',
      commonUses: ['Weight management research', 'Metabolic studies', 'Fat oxidation research', 'Body composition research'],
      dosageRanges: 'Research protocols vary based on specific formulation.',
      researchFindings: 'May support metabolic processes related to fat utilization.',
      considerations: 'Effects depend on specific ingredients and lifestyle factors.',
      researchStatus: 'Metabolic research formulation.',
      disclaimer: 'Research compound - not approved for weight loss claims.'
    },
    'IMMUNOLOGICAL ENHANCEMENT': {
      aliases: ['IMMUNE SUPPORT', 'IMMUNE BOOSTER', 'IMMUNITY COMPLEX'],
      classification: 'Immune Support Complex',
      mechanism: 'Multi-component formula designed to support immune system function.',
      commonUses: ['Immune research', 'Immunology studies', 'Health support research', 'Wellness research'],
      dosageRanges: 'Research protocols vary based on specific formulation.',
      researchFindings: 'May support various aspects of immune system function.',
      considerations: 'Effects depend on specific ingredients and individual immune status.',
      researchStatus: 'Immune research formulation.',
      disclaimer: 'Research compound - not approved for medical claims.'
    },
    'SUPER SHRED': {
      aliases: ['SHRED BLEND', 'FAT BURNER COMPLEX', 'CUTTING BLEND'],
      classification: 'Thermogenic Peptide Blend',
      mechanism: 'Combination of CJC-1295 (2mg), Ipamorelin (2mg), and L-Carnitine (500mg) for enhanced fat oxidation and growth hormone release.',
      commonUses: ['Fat oxidation research', 'Growth hormone studies', 'Body composition research', 'Metabolic enhancement research'],
      dosageRanges: 'Typical research protocol: 0.25-0.5ml (250-500mcg total peptides) subcutaneous injection before bed, 5 days on/2 days off.',
      researchFindings: 'Synergistic effects of growth hormone releasing peptides with L-Carnitine for enhanced fat metabolism.',
      considerations: 'Contains growth hormone releasing peptides. Monitor for typical GHRP side effects.',
      researchStatus: 'Peptide blend for metabolic research.',
      disclaimer: 'Research peptide blend - not approved for weight loss claims.'
    },
    'WOLVERINE': {
      aliases: ['HEALING BLEND', 'RECOVERY BLEND', 'REPAIR COMPLEX'],
      classification: 'Healing Peptide Blend',
      mechanism: 'Combination of BPC-157 (500mcg), TB-500 (2mg), and IGF-1 LR3 (100mcg) for enhanced tissue repair and recovery.',
      commonUses: ['Tissue repair research', 'Wound healing studies', 'Recovery research', 'Injury rehabilitation research'],
      dosageRanges: 'Research protocol: 0.5ml subcutaneous injection daily for acute injuries, or 3x weekly for maintenance research.',
      researchFindings: 'Synergistic healing effects combining gastric peptide repair, thymosin healing, and growth factor activity.',
      considerations: 'Powerful healing blend. Monitor injection sites for reactions.',
      researchStatus: 'Multi-peptide healing research formulation.',
      disclaimer: 'Research peptide blend - not approved for medical treatment.'
    },
    'GLOW': {
      aliases: ['BEAUTY BLEND', 'SKIN COMPLEX', 'ANTI-AGING BLEND'],
      classification: 'Cosmetic Peptide Blend',
      mechanism: 'Combination of GHK-Cu (2mg), Epitalon (10mg), and Melanotan II (2mg) for skin health and anti-aging research.',
      commonUses: ['Skin health research', 'Anti-aging studies', 'Collagen research', 'Pigmentation research'],
      dosageRanges: 'Research protocol: 0.25ml subcutaneous injection 2-3x weekly. Start with lower doses due to MT-II content.',
      researchFindings: 'Combines copper peptide skin repair, telomere research, and controlled pigmentation effects.',
      considerations: 'Contains Melanotan II - monitor for nausea, flushing, and pigmentation changes.',
      researchStatus: 'Cosmetic peptide research blend.',
      disclaimer: 'Research peptide blend - not approved for cosmetic use.'
    },
    'KLOW': {
      aliases: ['SLEEP BLEND', 'RECOVERY SLEEP', 'NIGHT COMPLEX'],
      classification: 'Sleep/Recovery Peptide Blend',
      mechanism: 'Combination of DSIP (2mg), Ipamorelin (2mg), and GABA (100mg) for enhanced sleep quality and recovery.',
      commonUses: ['Sleep research', 'Recovery studies', 'Growth hormone research', 'Circadian rhythm research'],
      dosageRanges: 'Research protocol: 0.25-0.5ml subcutaneous injection 30 minutes before desired sleep time.',
      researchFindings: 'Synergistic effects on sleep quality and growth hormone release during sleep cycles.',
      considerations: 'Take only when ready for 7-8 hours of uninterrupted sleep. May cause drowsiness.',
      researchStatus: 'Sleep enhancement research blend.',
      disclaimer: 'Research peptide blend - not approved for sleep disorders.'
    },
    'LIPO-C': {
      aliases: ['LIPOTROPIC-C', 'LIPO C', 'MIC INJECTION', 'LIPOTROPIC COMPLEX'],
      classification: 'Lipotropic Amino Acid Complex',
      mechanism: 'Combination of methionine, inositol, choline, and cyanocobalamin (B12) that may support fat metabolism and liver function.',
      commonUses: ['Fat metabolism research', 'Liver function studies', 'Weight management research', 'Metabolic support research'],
      dosageRanges: 'Research protocols typically use 1-2ml intramuscular injections, 1-3 times weekly. Oral formulations vary by composition.',
      researchFindings: 'May support lipid metabolism and liver detoxification processes through methyl donor pathways.',
      considerations: 'Generally well-tolerated. May cause injection site reactions with IM administration.',
      researchStatus: 'Established lipotropic formulation used in metabolic research.',
      disclaimer: 'Research compound - not approved for weight loss claims.'
    },
    'TREN A': {
      aliases: ['TRENBOLONE ACETATE', 'TREN ACETATE', 'TREN-A'],
      classification: 'Anabolic Steroid',
      mechanism: 'Potent synthetic anabolic steroid with strong androgenic properties.',
      commonUses: ['Anabolic research', 'Muscle growth studies', 'Performance research', 'Veterinary research'],
      dosageRanges: 'Research protocols vary widely. Veterinary studies typically use 200-400mg weekly.',
      researchFindings: 'Extremely potent anabolic effects with significant androgenic activity.',
      considerations: 'Highly potent with significant side effects. Controlled substance in many jurisdictions.',
      researchStatus: 'Controlled anabolic steroid - research restricted.',
      disclaimer: 'Controlled substance - research use must comply with applicable regulations and licensing.'
    },
    'TREN E': {
      aliases: ['TRENBOLONE ENANTHATE', 'TREN ENANTHATE', 'TREN-E'],
      classification: 'Anabolic Steroid',
      mechanism: 'Long-acting ester of trenbolone with extended release profile.',
      commonUses: ['Extended anabolic research', 'Long-term studies', 'Veterinary research', 'Pharmacokinetic research'],
      dosageRanges: 'Research protocols typically use longer dosing intervals due to extended half-life.',
      researchFindings: 'Similar anabolic potency to acetate ester with longer duration of action.',
      considerations: 'Extended half-life requires careful study design. Controlled substance.',
      researchStatus: 'Controlled anabolic steroid - research restricted.',
      disclaimer: 'Controlled substance - research use must comply with applicable regulations and licensing.'
    },
    'TREN H': {
      aliases: ['TRENBOLONE HEXAHYDROBENZYLCARBONATE', 'PARABOLAN', 'TREN-H'],
      classification: 'Anabolic Steroid',
      mechanism: 'Long-acting trenbolone ester with unique pharmacokinetic profile.',
      commonUses: ['Pharmacokinetic research', 'Extended anabolic studies', 'Veterinary research', 'Ester comparison studies'],
      dosageRanges: 'Research protocols account for extended half-life and unique release pattern.',
      researchFindings: 'Longest-acting trenbolone ester with sustained anabolic activity.',
      considerations: 'Longest half-life of trenbolone esters. Controlled substance.',
      researchStatus: 'Controlled anabolic steroid - research restricted.',
      disclaimer: 'Controlled substance - research use must comply with applicable regulations and licensing.'
    },
    'TEST P': {
      aliases: ['TESTOSTERONE PROPIONATE', 'TEST PROP', 'TESTOSTERONE-P'],
      classification: 'Anabolic Steroid Hormone',
      mechanism: 'Short-acting testosterone ester for hormone replacement and anabolic research.',
      commonUses: ['Hormone research', 'Anabolic studies', 'TRT research', 'Endocrine research'],
      dosageRanges: 'Research protocols typically use 25-100mg every other day due to short half-life.',
      researchFindings: 'Rapid onset testosterone replacement with frequent dosing requirements.',
      considerations: 'Requires frequent administration. Standard testosterone side effect profile.',
      researchStatus: 'Controlled anabolic steroid - medical and research applications.',
      disclaimer: 'Controlled substance - research use must comply with applicable regulations and licensing.'
    },
    'MASTERON': {
      aliases: ['DROSTANOLONE PROPIONATE', 'MAST P', 'DROSTANOLONE'],
      classification: 'Anabolic Steroid',
      mechanism: 'DHT-derived anabolic steroid with anti-estrogenic properties.',
      commonUses: ['Anti-estrogenic research', 'Body composition studies', 'DHT research', 'Cutting research'],
      dosageRanges: 'Research protocols typically use 200-400mg weekly.',
      researchFindings: 'Moderate anabolic effects with strong anti-estrogenic activity.',
      considerations: 'DHT-derived compound with associated androgenic effects. Controlled substance.',
      researchStatus: 'Controlled anabolic steroid - research restricted.',
      disclaimer: 'Controlled substance - research use must comply with applicable regulations and licensing.'
    },
    'WINSTROL': {
      aliases: ['STANOZOLOL', 'WINNY', 'STROMBA'],
      classification: 'Anabolic Steroid',
      mechanism: 'Modified DHT with enhanced anabolic properties and reduced androgenic effects.',
      commonUses: ['Performance research', 'Lean mass studies', 'Strength research', 'Athletic research'],
      dosageRanges: 'Research protocols typically use 25-50mg daily (oral) or 50mg every other day (injectable).',
      researchFindings: 'Enhanced protein synthesis with favorable anabolic to androgenic ratio.',
      considerations: 'Hepatotoxic in oral form. May affect lipid profiles. Controlled substance.',
      researchStatus: 'Controlled anabolic steroid - research restricted.',
      disclaimer: 'Controlled substance - research use must comply with applicable regulations and licensing.'
    },
    'ANAVAR': {
      aliases: ['OXANDROLONE', 'VAR', 'OXANDRIN'],
      classification: 'Anabolic Steroid',
      mechanism: 'Mild anabolic steroid with low androgenic activity and favorable safety profile.',
      commonUses: ['Muscle wasting research', 'Burn recovery studies', 'Pediatric research', 'Women\'s health research'],
      dosageRanges: 'Research protocols typically use 5-20mg daily, with higher doses in specific clinical studies.',
      researchFindings: 'Mild anabolic effects with relatively low side effect profile.',
      considerations: 'Generally well-tolerated but may affect liver function. Controlled substance.',
      researchStatus: 'FDA-approved for specific medical conditions, controlled substance.',
      disclaimer: 'Controlled substance - research use must comply with applicable regulations and licensing.'
    },
    'PRIMO': {
      aliases: ['PRIMOBOLAN', 'METHENOLONE', 'PRIMO E', 'METHENOLONE ENANTHATE'],
      classification: 'Anabolic Steroid',
      mechanism: 'Mild DHT-derived anabolic steroid with low androgenic activity.',
      commonUses: ['Lean mass research', 'Cutting studies', 'Mild anabolic research', 'Women\'s research'],
      dosageRanges: 'Research protocols typically use 200-600mg weekly (injectable) or 50-100mg daily (oral).',
      researchFindings: 'Mild anabolic effects with minimal side effects and low hepatotoxicity.',
      considerations: 'Generally well-tolerated with minimal side effects. Controlled substance.',
      researchStatus: 'Controlled anabolic steroid - research restricted.',
      disclaimer: 'Controlled substance - research use must comply with applicable regulations and licensing.'
    },
    'RIPPED TEST P': {
      aliases: ['RIPPED TEST PROP', 'TEST P BLEND', 'CUTTING TEST'],
      classification: 'Anabolic Steroid Blend',
      mechanism: 'Testosterone propionate blend designed for cutting and lean mass research.',
      commonUses: ['Cutting research', 'Body composition studies', 'Lean mass research', 'Performance research'],
      dosageRanges: 'Research protocols vary based on specific blend composition and study objectives.',
      researchFindings: 'Combines testosterone effects with cutting-specific additives.',
      considerations: 'Blend effects depend on additional components. Controlled substance.',
      researchStatus: 'Controlled anabolic steroid blend - research restricted.',
      disclaimer: 'Controlled substance - research use must comply with applicable regulations and licensing.'
    },
    'DECA': {
      aliases: ['NANDROLONE DECANOATE', 'NPP', 'DECA-DURABOLIN', 'NANDROLONE'],
      classification: 'Anabolic Steroid',
      mechanism: '19-nortestosterone derivative with strong anabolic and moderate androgenic effects.',
      commonUses: ['Joint research', 'Muscle wasting studies', 'Bone density research', 'Anabolic research'],
      dosageRanges: 'Research protocols typically use 200-600mg weekly due to long half-life.',
      researchFindings: 'Strong anabolic effects with joint-protective properties and collagen synthesis.',
      considerations: 'Long half-life requires extended study periods. May suppress natural testosterone.',
      researchStatus: 'Controlled anabolic steroid - medical and research applications.',
      disclaimer: 'Controlled substance - research use must comply with applicable regulations and licensing.'
    },
    'EQ': {
      aliases: ['EQUIPOISE', 'BOLDENONE UNDECYLENATE', 'BOLD'],
      classification: 'Anabolic Steroid',
      mechanism: 'Testosterone derivative with enhanced anabolic properties and appetite stimulation.',
      commonUses: ['Appetite research', 'Lean mass studies', 'Endurance research', 'Veterinary research'],
      dosageRanges: 'Research protocols typically use 200-800mg weekly due to long half-life.',
      researchFindings: 'Moderate anabolic effects with significant appetite stimulation and endurance enhancement.',
      considerations: 'Very long half-life. May increase red blood cell production. Controlled substance.',
      researchStatus: 'Controlled anabolic steroid - primarily veterinary use.',
      disclaimer: 'Controlled substance - research use must comply with applicable regulations and licensing.'
    },
    'SUSTANON': {
      aliases: ['SUST', 'TESTOSTERONE BLEND', 'TEST BLEND', 'OMNADREN'],
      classification: 'Testosterone Ester Blend',
      mechanism: 'Blend of four testosterone esters providing both immediate and sustained release.',
      commonUses: ['TRT research', 'Hormone research', 'Pharmacokinetic studies', 'Sustained release research'],
      dosageRanges: 'Research protocols typically use 250-500mg weekly with extended dosing intervals.',
      researchFindings: 'Provides both rapid onset and sustained testosterone levels.',
      considerations: 'Complex pharmacokinetics due to multiple esters. Controlled substance.',
      researchStatus: 'Controlled anabolic steroid - medical and research applications.',
      disclaimer: 'Controlled substance - research use must comply with applicable regulations and licensing.'
    },
    'CYTOMEL': {
      aliases: ['T3', 'LIOTHYRONINE', 'TRIIODOTHYRONINE'],
      classification: 'Thyroid Hormone',
      mechanism: 'Active thyroid hormone that regulates metabolic rate and protein synthesis.',
      commonUses: ['Metabolic research', 'Thyroid studies', 'Weight management research', 'Endocrine research'],
      dosageRanges: 'Research protocols typically use 25-100mcg daily with careful titration.',
      researchFindings: 'Potent metabolic effects with rapid onset and short half-life.',
      considerations: 'Requires careful monitoring. May cause hyperthyroid symptoms. Prescription medication.',
      researchStatus: 'FDA-approved thyroid medication.',
      disclaimer: 'Prescription medication - research use must comply with applicable regulations.'
    },
    'CLENBUTEROL': {
      aliases: ['CLEN', 'SPIROPENT', 'VENTIPULMIN'],
      classification: 'Beta-2 Agonist',
      mechanism: 'Selective beta-2 adrenergic agonist with bronchodilator and thermogenic properties.',
      commonUses: ['Thermogenesis research', 'Bronchodilator studies', 'Fat loss research', 'Performance research'],
      dosageRanges: 'Research protocols typically use 20-120mcg daily with cycling protocols.',
      researchFindings: 'Significant thermogenic and anti-catabolic effects with bronchodilation.',
      considerations: 'May cause cardiovascular side effects. Banned in many sports. Prescription medication.',
      researchStatus: 'Prescription bronchodilator - research applications.',
      disclaimer: 'Prescription medication - research use must comply with applicable regulations.'
    },
    'CARDARINE': {
      aliases: ['GW-501516', 'GW501516', 'ENDUROBOL'],
      classification: 'PPAR Delta Agonist',
      mechanism: 'Selective PPAR delta receptor agonist that enhances fat oxidation and endurance.',
      commonUses: ['Endurance research', 'Fat oxidation studies', 'Metabolic research', 'PPAR research'],
      dosageRanges: 'Research protocols typically use 10-20mg daily.',
      researchFindings: 'Significant enhancement of fat oxidation and endurance capacity.',
      considerations: 'Discontinued clinical development due to cancer concerns in animal studies.',
      researchStatus: 'Investigational compound - development discontinued.',
      disclaimer: 'Research compound - not approved for human use. Potential safety concerns.'
    },
    'OSTARINE': {
      aliases: ['MK-2866', 'ENOBOSARM', 'GTX-024'],
      classification: 'Selective Androgen Receptor Modulator',
      mechanism: 'Selective androgen receptor modulator with tissue-selective anabolic effects.',
      commonUses: ['Muscle wasting research', 'Bone density studies', 'SARM research', 'Selective anabolic research'],
      dosageRanges: 'Research protocols typically use 10-25mg daily.',
      researchFindings: 'Moderate anabolic effects with reduced androgenic side effects.',
      considerations: 'May suppress natural testosterone production. Not approved for human use.',
      researchStatus: 'Investigational SARM - clinical trials discontinued.',
      disclaimer: 'Research compound - not approved for human use.'
    },
    'RAD-140': {
      aliases: ['TESTOLONE', 'RAD140'],
      classification: 'Selective Androgen Receptor Modulator',
      mechanism: 'Potent SARM with strong anabolic activity and neuroprotective properties.',
      commonUses: ['Anabolic research', 'Neuroprotection studies', 'SARM research', 'Muscle research'],
      dosageRanges: 'Research protocols typically use 10-30mg daily.',
      researchFindings: 'Strong anabolic effects with potential neuroprotective benefits.',
      considerations: 'May suppress testosterone production. Limited human safety data.',
      researchStatus: 'Investigational SARM - early clinical development.',
      disclaimer: 'Research compound - not approved for human use.'
    },
    'LGD-4033': {
      aliases: ['LIGANDROL', 'VK5211'],
      classification: 'Selective Androgen Receptor Modulator',
      mechanism: 'Selective androgen receptor modulator with strong anabolic activity.',
      commonUses: ['Muscle wasting research', 'Anabolic studies', 'SARM research', 'Cachexia research'],
      dosageRanges: 'Research protocols typically use 1-10mg daily.',
      researchFindings: 'Potent anabolic effects with dose-dependent muscle mass increases.',
      considerations: 'May suppress testosterone production. Potential liver effects.',
      researchStatus: 'Investigational SARM - clinical trials ongoing.',
      disclaimer: 'Research compound - not approved for human use.'
    },
    'YK-11': {
      aliases: ['YK11', 'MYOSTATIN INHIBITOR'],
      classification: 'Myostatin Inhibitor/SARM Hybrid',
      mechanism: 'Selective androgen receptor modulator with myostatin inhibition properties.',
      commonUses: ['Myostatin research', 'Muscle growth studies', 'SARM research', 'Follistatin research'],
      dosageRanges: 'Research protocols typically use 5-15mg daily.',
      researchFindings: 'Unique mechanism combining SARM activity with myostatin inhibition.',
      considerations: 'Limited research data. Potential for significant muscle growth.',
      researchStatus: 'Investigational compound - very limited clinical data.',
      disclaimer: 'Research compound - not approved for human use.'
    }
  };

// Curated peptide research database - reliable, accurate information
async function getCuratedPeptideResearch(peptideName) {
  // Simulate loading time for better UX
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Basic input validation
  const cleanName = peptideName.trim();
  if (cleanName.length < 2) {
    throw new Error('Please enter at least 2 characters for search.');
  }
  
  if (!/[a-zA-Z]/.test(cleanName)) {
    throw new Error('Please enter a valid peptide name.');
  }

  // Check if we have curated data for this peptide
  const match = findPeptideMatch(cleanName, PEPTIDE_DATABASE);
  
  if (match) {
    // We have curated data - use it
    let displayName = match.key;
    let resultData = match.data;
    
    // Handle fuzzy matches with suggestions
    if (match.matchType === 'fuzzy') {
      const suggestion = match.matchedAlias || match.key;
      displayName = `${suggestion} (corrected from "${cleanName}")`;
    }
    
    return {
      name: displayName,
      ...resultData,
      researchStatus: resultData.researchStatus || 'Investigational compound - research and development ongoing. Not approved for therapeutic use.',
      disclaimer: resultData.disclaimer || 'This information is compiled from available research and is for educational purposes only. Always consult current scientific literature and follow proper research protocols.'
    };
  }
  
  // No curated data found - return null to show "Request Research" option
  return null;
}

export default function GlossaryWidget({ widget, theme }) {
  const [favoriteEntries, setFavoriteEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('search'); // 'search', 'browse'
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [expandedCategories, setExpandedCategories] = useState(new Set(['Popular']));
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  
  // AI Research state
  const [aiResearch, setAiResearch] = useState({ loading: false, data: null, error: null, query: '' });

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem('tpprover_research_favorites');
      if (savedFavorites) {
        setFavoriteEntries(JSON.parse(savedFavorites));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  }, []);

  const handleAIResearch = async (term = searchTerm) => {
    if (!term.trim()) return;

    setAiResearch({ loading: true, data: null, error: null, query: term });

    try {
      const data = await getCuratedPeptideResearch(term);
      setAiResearch({ loading: false, data, error: null, query: term });
      setActiveTab('search'); // Switch to search tab to show results
    } catch (error) {
      console.log('Research error:', error.message);
      setAiResearch({ loading: false, data: null, error: error.message || 'Failed to compile research', query: term });
    }
  };

  const handleRequestResearch = (peptideName) => {
    // Store the request in localStorage for admin review
    const requests = JSON.parse(localStorage.getItem('tpprover_research_requests') || '[]');
    const newRequest = {
      id: Date.now(),
      peptide: peptideName.trim(),
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    
    requests.push(newRequest);
    localStorage.setItem('tpprover_research_requests', JSON.stringify(requests));
    
    // Show success message
    setAiResearch({ 
      loading: false, 
      data: null, 
      error: null, 
      query: '',
      requestSent: peptideName 
    });
    
    // Clear the success message after 3 seconds
    setTimeout(() => {
      setAiResearch({ loading: false, data: null, error: null, query: '' });
    }, 3000);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Auto-search after 2 characters with debouncing
    if (value.length >= 2) {
      clearTimeout(window.glossarySearchTimeout);
      window.glossarySearchTimeout = setTimeout(() => {
        handleAIResearch(value);
      }, 800);
    }
  };

  const toggleFavorite = (peptideName) => {
    const newFavorites = favoriteEntries.includes(peptideName)
      ? favoriteEntries.filter(f => f !== peptideName)
      : [...favoriteEntries, peptideName];
    
    setFavoriteEntries(newFavorites);
    localStorage.setItem('tpprover_research_favorites', JSON.stringify(newFavorites));
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


  const popularPeptides = [
    'Semaglutide',
    'Tirzepatide', 
    'BPC-157',
    'TB-500',
    'Ipamorelin',
    'CJC-1295'
  ];

  const peptideCategories = {
    'Popular': ['Semaglutide', 'Tirzepatide', 'BPC-157', 'TB-500', 'Ipamorelin', 'CJC-1295'],
    'Growth Hormone': ['Ipamorelin', 'CJC-1295', 'GHRP-6', 'GHRP-2', 'Hexarelin', 'MK-677'],
    'Healing & Recovery': ['BPC-157', 'TB-500', 'Thymosin Beta-4', 'GHK-Cu', 'Epitalon'],
    'Weight Loss': ['Semaglutide', 'Tirzepatide', 'AOD-9604', 'Tesamorelin', 'CJC-1295'],
    'Cognitive & Brain': ['Noopept', 'Cerebrolysin', 'Selank', 'Semax', 'Dihexa'],
    'Anti-Aging': ['Epitalon', 'GHK-Cu', 'Thymulin', 'FOXO4-DRI', 'Humanin'],
    'Nasal Sprays': ['Selank', 'Semax', 'Oxytocin', 'PT-141', 'Kisspeptin'],
    'Blends & Combos': ['CJC-1295 + Ipamorelin', 'BPC-157 + TB-500', 'Tesamorelin + Ipamorelin'],
    'Tanning & Libido': ['Melanotan II', 'PT-141', 'Kisspeptin', 'Oxytocin'],
    'Liver & Detox': ['Liver Blend', 'NAC', 'Glutathione', 'Taurine']
  };

  const getCategoryColors = (category) => {
    const colors = {
      'Popular': { bg: '#FDF6E3', border: '#D4A574', text: '#8B4513', icon: '#D2691E' },
      'Growth Hormone': { bg: '#EBF8FF', border: '#3182CE', text: '#2C5282', icon: '#4299E1' },
      'Healing & Recovery': { bg: '#FDF2F8', border: '#E53E3E', text: '#C53030', icon: '#F56565' },
      'Weight Loss': { bg: '#F0FDF4', border: '#38A169', text: '#2F855A', icon: '#68D391' },
      'Cognitive & Brain': { bg: '#FAF5FF', border: '#805AD5', text: '#553C9A', icon: '#9F7AEA' },
      'Anti-Aging': { bg: '#FFFBEB', border: '#D69E2E', text: '#B7791F', icon: '#F6E05E' },
      'Nasal Sprays': { bg: '#E6FFFA', border: '#319795', text: '#2C7A7B', icon: '#4FD1C7' },
      'Blends & Combos': { bg: '#F7FAFC', border: '#4A5568', text: '#2D3748', icon: '#718096' },
      'Tanning & Libido': { bg: '#FFF5F5', border: '#E53E3E', text: '#C53030', icon: '#FC8181' },
      'Liver & Detox': { bg: '#F0FDF4', border: '#059669', text: '#047857', icon: '#34D399' }
    };
    return colors[category] || { bg: '#F7FAFC', border: '#E2E8F0', text: '#4A5568', icon: '#A0AEC0' };
  };

  const renderPeptideCard = (peptideName, showCategory = false, categoryColors = null) => {
    const isFavorite = favoriteEntries.includes(peptideName);
    const cardColors = categoryColors || { bg: theme?.cardBackground, border: theme?.border, text: theme?.text };
    
    return (
      <div key={peptideName} className="flex items-center justify-between p-2 border rounded hover:shadow-sm transition-all duration-200" 
           style={{ 
             borderColor: cardColors.border || theme?.border, 
             backgroundColor: cardColors.bg || theme?.cardBackground 
           }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAIResearch(peptideName)}
              className="font-medium text-left hover:underline transition-colors text-sm truncate"
              style={{ color: cardColors.text || theme?.text }}
            >
              {peptideName}
            </button>
            {showCategory && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0" 
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
          className="p-1 rounded hover:bg-opacity-20 hover:bg-gray-500 transition-all duration-200 flex-shrink-0"
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          {isFavorite ? (
            <Star size={12} className="fill-current" style={{ color: theme?.warning || '#F59E0B' }} />
          ) : (
            <StarOff size={12} style={{ color: cardColors.icon || theme?.textLight }} />
          )}
        </button>
      </div>
    );
  };

  const renderSearchTab = () => (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyPress={(e) => e.key === 'Enter' && handleAIResearch()}
          placeholder="Search peptides..."
          className="flex-1 px-2 py-1.5 text-sm border rounded-md"
          style={{ borderColor: theme.border }}
        />
        <button
          onClick={() => handleAIResearch()}
          disabled={aiResearch.loading}
          className="px-2 py-1.5 rounded-md transition-colors flex items-center justify-center"
          style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
        >
          {aiResearch.loading ? <Loader size={12} className="animate-spin" /> : <Search size={12} />}
        </button>
      </div>

      {/* AI Research Results */}
      {aiResearch.loading && (
        <div className="flex items-center justify-center py-4">
          <Loader size={20} className="animate-spin mr-2" style={{ color: theme.primary }} />
          <span className="text-sm" style={{ color: theme.text }}>Compiling research...</span>
        </div>
      )}

      {aiResearch.error && (
        <div className="p-3 rounded-lg border" style={{ borderColor: theme.error, backgroundColor: theme.error + '10' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} style={{ color: theme.error }} />
            <span className="text-sm" style={{ color: theme.error }}>{aiResearch.error}</span>
          </div>
        </div>
      )}

      {aiResearch.data && (
        <div className="space-y-3">
          <div className="p-3 rounded-lg border" style={{ borderColor: theme.primary, backgroundColor: theme.primary + '10' }}>
            <div className="flex items-center gap-2 mb-2">
              <Brain size={16} style={{ color: theme.primary }} />
              <h3 className="font-semibold text-sm" style={{ color: theme.text }}>{aiResearch.data.name}</h3>
              <span className="px-2 py-0.5 text-xs rounded-full" style={{ 
                backgroundColor: theme.success + '20', 
                color: theme.success,
                border: `1px solid ${theme.success}40`
              }}>
                Curated Data
              </span>
              <button
                onClick={() => toggleFavorite(aiResearch.data.name)}
                className="p-1 rounded hover:bg-opacity-20 hover:bg-gray-500 transition-all duration-200 ml-auto"
              >
                {favoriteEntries.includes(aiResearch.data.name) ? (
                  <Star size={14} className="fill-current" style={{ color: theme?.warning || '#F59E0B' }} />
                ) : (
                  <StarOff size={14} style={{ color: theme?.textLight }} />
                )}
              </button>
            </div>
            
            <div className="space-y-3 text-xs">
              {/* PRIMARY FOCUS: Research Applications & Effects */}
              <div className="p-2 rounded" style={{ backgroundColor: theme.primary + '08', border: `1px solid ${theme.primary}30` }}>
                <div className="font-semibold mb-1" style={{ color: theme.primary }}>🎯 Research Applications & Effects:</div>
                <div style={{ color: theme.text }}>{aiResearch.data.commonUses?.join(', ')}</div>
                {aiResearch.data.researchFindings && (
                  <div className="mt-1" style={{ color: theme.textLight }}>{aiResearch.data.researchFindings}</div>
                )}
              </div>

              {/* PRIMARY FOCUS: Research Dosages with Warning */}
              <div className="p-2 rounded" style={{ backgroundColor: theme.warning + '08', border: `1px solid ${theme.warning}30` }}>
                <div className="font-semibold mb-1" style={{ color: theme.warning }}>⚗️ Research Dosages:</div>
                <div style={{ color: theme.text }}>{aiResearch.data.dosageRanges}</div>
                <div className="mt-1 px-2 py-1 rounded text-xs font-medium" style={{ 
                  backgroundColor: theme.error + '15', 
                  color: theme.error,
                  border: `1px solid ${theme.error}40`
                }}>
                  ⚠️ RESEARCH DATA ONLY - NOT FOR HUMAN USE
                </div>
              </div>

              {/* SECONDARY INFO: Mechanism & Classification */}
              <div className="space-y-1 pt-1 border-t" style={{ borderColor: theme.border }}>
                <div>
                  <span className="font-medium" style={{ color: theme.text }}>Classification: </span>
                  <span style={{ color: theme.textLight }}>{aiResearch.data.classification}</span>
                </div>
                
                <div>
                  <span className="font-medium" style={{ color: theme.text }}>Mechanism: </span>
                  <span style={{ color: theme.textLight }}>{aiResearch.data.mechanism}</span>
                </div>
                
                {aiResearch.data.considerations && (
                  <div>
                    <span className="font-medium" style={{ color: theme.text }}>Safety Considerations: </span>
                    <span style={{ color: theme.textLight }}>{aiResearch.data.considerations}</span>
                  </div>
                )}
              </div>
              
              {/* FOOTER: Legal Disclaimer */}
              <div className="pt-2 mt-2 border-t text-xs" style={{ borderColor: theme.border, color: theme.textLight }}>
                {aiResearch.data.disclaimer}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Research Success Message */}
      {aiResearch.requestSent && (
        <div className="space-y-3">
          <div className="p-3 rounded-lg border" style={{ borderColor: theme.success, backgroundColor: theme.success + '10' }}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={16} style={{ color: theme.success }} />
              <h3 className="font-semibold text-sm" style={{ color: theme.text }}>Research Request Submitted</h3>
            </div>
            
            <div className="text-xs" style={{ color: theme.textLight }}>
              <p>Your request for research on "{aiResearch.requestSent}" has been submitted successfully.</p>
              <p className="mt-1">We'll add this peptide to our curated database and notify users when it's available.</p>
            </div>
          </div>
        </div>
      )}

      {/* No curated data found - Request Research feature */}
      {!aiResearch.loading && !aiResearch.data && aiResearch.query && !aiResearch.requestSent && (
        <div className="space-y-3">
          <div className="p-3 rounded-lg border" style={{ borderColor: theme.warning, backgroundColor: theme.warning + '10' }}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} style={{ color: theme.warning }} />
              <h3 className="font-semibold text-sm" style={{ color: theme.text }}>"{aiResearch.query}" not found</h3>
            </div>
            
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => handleRequestResearch(aiResearch.query)}
                className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
                style={{ 
                  backgroundColor: theme.primary,
                  color: 'white'
                }}
              >
                Request Research
              </button>
              <button
                onClick={() => setAiResearch({ loading: false, data: null, error: null, query: '' })}
                className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
                style={{ 
                  backgroundColor: theme.secondary,
                  color: theme.text
                }}
              >
                Clear Search
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popular Peptides */}
      {!aiResearch.data && !aiResearch.loading && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold" style={{ color: theme.textLight }}>Popular Research</h4>
          <div className="grid grid-cols-1 gap-1">
            {popularPeptides.slice(0, 4).map(peptide => renderPeptideCard(peptide))}
          </div>
        </div>
      )}
    </div>
  );

  const renderBrowseTab = () => (
    <div className="space-y-2">
      {Object.entries(peptideCategories).map(([category, peptides]) => {
        const isExpanded = expandedCategories.has(category);
        const categoryColors = getCategoryColors(category);
        
        return (
          <div key={category} className="border rounded-lg overflow-hidden" style={{ borderColor: categoryColors.border }}>
            <button
              onClick={() => toggleCategory(category)}
              className="w-full p-2 flex items-center justify-between hover:opacity-80 transition-opacity"
              style={{ backgroundColor: categoryColors.bg }}
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: categoryColors.border }}></div>
                <span className="font-medium text-sm" style={{ color: categoryColors.text }}>{category}</span>
                <span className="text-xs opacity-75" style={{ color: categoryColors.text }}>({peptides.length})</span>
              </div>
              {isExpanded ? 
                <ChevronDown size={14} style={{ color: categoryColors.text }} /> : 
                <ChevronRight size={14} style={{ color: categoryColors.text }} />
              }
            </button>
            
            {isExpanded && (
              <div className="p-2 space-y-1" style={{ backgroundColor: theme.background }}>
                {peptides.slice(0, 4).map(peptide => renderPeptideCard(peptide, false, categoryColors))}
                {peptides.length > 4 && (
                  <div className="text-xs text-center pt-1" style={{ color: theme.textLight }}>
                    +{peptides.length - 4} more peptides
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderNotesTab = () => (
    <div className="space-y-3">
      {/* Add Note Form */}
      {!showAddNoteForm ? (
        <button
          onClick={() => setShowAddNoteForm(true)}
          className="w-full p-2 border-2 border-dashed rounded-lg hover:border-solid transition-all duration-200 group"
          style={{ borderColor: theme.border }}
        >
          <div className="flex items-center justify-center gap-2" style={{ color: theme.textLight }}>
            <Plus size={14} className="group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">Add research note</span>
          </div>
        </button>
      ) : (
        <div className="p-2 border-2 rounded-lg" style={{ borderColor: theme.primary, backgroundColor: theme.cardBackground }}>
          <div className="space-y-2">
            <input
              type="text"
              value={noteForm.title}
              onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
              placeholder="Note title (optional)"
              className="w-full text-sm font-medium bg-transparent border-none focus:outline-none"
              style={{ color: theme.text }}
              autoFocus
            />
            <textarea
              value={noteForm.content}
              onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
              placeholder="Research observations..."
              rows={3}
              className="w-full text-sm bg-transparent border-none focus:outline-none resize-none"
              style={{ color: theme.text }}
            />
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleAddNote}
                className="px-2 py-1 rounded text-xs font-medium"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
              >
                Save
              </button>
              <button
                onClick={() => setShowAddNoteForm(false)}
                className="px-2 py-1 rounded text-xs"
                style={{ color: theme.text }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes List */}
      {userNotes.length > 0 ? (
        <div className="space-y-2">
          {userNotes.slice(0, 3).map((note) => (
            <div key={note.id} className="group p-2 rounded border hover:shadow-sm transition-all duration-200" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {note.title && note.title !== 'Research Note' && (
                    <h5 className="text-sm font-medium mb-1 truncate" style={{ color: theme.text }}>
                      {note.title}
                    </h5>
                  )}
                  <p className="text-xs line-clamp-2 mb-1" style={{ color: theme.textLight }}>
                    {note.content}
                  </p>
                  <div className="text-xs" style={{ color: theme.textLight, opacity: 0.7 }}>
                    {new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="p-1 rounded hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                  style={{ color: theme.textLight }}
                  title="Delete note"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
          {userNotes.length > 3 && (
            <div className="text-xs text-center" style={{ color: theme.textLight }}>
              +{userNotes.length - 3} more notes
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <FileText size={24} className="mx-auto mb-2 opacity-50" style={{ color: theme.textLight }} />
          <p className="text-sm" style={{ color: theme.textLight }}>No research notes yet</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b" style={{ borderColor: theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
            Research Glossary
          </h3>
          <div className="flex items-center gap-2">
            {/* Work in Progress Badge */}
            <div className="px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 border shadow-sm" 
                 style={{ 
                   backgroundColor: theme.warning + '25', 
                   borderColor: theme.warning,
                   color: theme.text 
                 }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" 
                   style={{ backgroundColor: theme.warning }}></div>
              Work in Progress
            </div>
            <BookOpen size={20} style={{ color: theme.primary }} />
          </div>
        </div>
      </div>
      {/* Content - Direct Search */}
      <div className="flex-1 p-4 overflow-y-auto">
        {renderSearchTab()}
      </div>
    </div>
  );
}