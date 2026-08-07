import { createElement } from 'react';
import {
    Scales,
    Brain,
    Heart,
    Lightning,
    Shield,
    Pulse,
    Barbell,
    Eye,
    Bone,
    Wind,
    Flame,
    Leaf,
    Moon,
    Sun,
    Target,
    Microscope,
    Stethoscope,
    Baby,
    Clock,
    Speedometer,
    Syringe,
    Flask,
    Dna,
    Nut,
    Pill,
} from '@phosphor-icons/react';

export const PURPOSE_ICON_WEIGHT = 'duotone';

/** Phosphor duotone icons for protocol purpose chips and editor. */
export const PURPOSE_ICON_OPTIONS = [
    { id: 'weight-loss', label: 'Weight Loss', color: '#8eb5a0', keywords: ['weight', 'loss', 'fat', 'slim', 'lean', 'cut'], Icon: Scales },
    { id: 'brain',       label: 'Cognitive',   color: '#9b8ec4', keywords: ['brain', 'cognit', 'focus', 'mental', 'memory', 'neuro'], Icon: Brain },
    { id: 'heart',       label: 'Heart Health', color: '#c47a7a', keywords: ['heart', 'cardio', 'cardiovascular', 'blood'], Icon: Heart },
    { id: 'energy',      label: 'Energy',       color: '#c4a84f', keywords: ['energy', 'fatigue', 'tired', 'vitality', 'stamina'], Icon: Lightning },
    { id: 'immune',      label: 'Immune',        color: '#7a9fc4', keywords: ['immune', 'immunity', 'infection', 'defense'], Icon: Shield },
    { id: 'recovery',   label: 'Recovery',      color: '#c4887a', keywords: ['recover', 'heal', 'repair', 'injury', 'rehab', 'bpc', 'tb-500', 'tb500', 'thymosin', 'tissue'], Icon: Pulse },
    { id: 'muscle',     label: 'Muscle',        color: '#7aab7a', keywords: ['muscle', 'strength', 'bulk', 'mass', 'hypertrophy'], Icon: Barbell },
    { id: 'vision',     label: 'Vision',        color: '#7ab4c4', keywords: ['vision', 'eye', 'sight', 'retina'], Icon: Eye },
    { id: 'bone',       label: 'Bone Health',   color: '#b4a07a', keywords: ['bone', 'joint', 'osteo', 'skeletal'], Icon: Bone },
    { id: 'lung',       label: 'Respiratory',   color: '#8ab4c4', keywords: ['lung', 'breath', 'respir', 'airway', 'pulmon'], Icon: Wind },
    { id: 'metabolism', label: 'Metabolism',    color: '#c47a3d', keywords: ['metabol', 'thyroid', 'insulin', 'glucose', 'diabetic'], Icon: Flame },
    { id: 'longevity',  label: 'Longevity',     color: '#7aab68', keywords: ['longev', 'aging', 'anti-age', 'lifespan', 'senesc'], Icon: Leaf },
    { id: 'sleep',      label: 'Sleep',         color: '#7a87c4', keywords: ['sleep', 'insomn', 'rest', 'circad', 'melatonin'], Icon: Moon },
    { id: 'hormones',   label: 'Hormones',      color: '#c4a040', keywords: ['hormon', 'testosterone', 'estrogen', 'hgh', 'thyroid'], Icon: Sun },
    { id: 'goal',       label: 'General Goal',  color: '#c47a88', keywords: ['goal', 'general', 'protocol', 'research'], Icon: Target },
    { id: 'research',   label: 'Research',      color: '#8a9cb4', keywords: ['research', 'study', 'experiment', 'trial'], Icon: Microscope },
    { id: 'health',     label: 'General Health', color: '#7ab498', keywords: ['health', 'wellness', 'wellbeing', 'overall'], Icon: Stethoscope },
    { id: 'fertility',  label: 'Fertility',     color: '#c494aa', keywords: ['fertil', 'reproductive', 'hormone', 'pregnan'], Icon: Baby },
    { id: 'maintenance', label: 'Maintenance',  color: '#9aab8a', keywords: ['mainten', 'sustain', 'ongoing', 'stable'], Icon: Clock },
    { id: 'performance', label: 'Performance',  color: '#c46e5a', keywords: ['perform', 'sport', 'athlet', 'compete', 'endurance'], Icon: Speedometer },
    { id: 'injection',  label: 'Injection',     color: '#8ea5a0', keywords: ['inject', 'subq', 'im ', 'subcutan', 'pin'], Icon: Syringe },
    { id: 'compound',   label: 'Compound',      color: '#8dab98', keywords: ['compound', 'blend', 'stack', 'formula', 'mix'], Icon: Flask },
    { id: 'cellular',   label: 'Cellular',      color: '#9d8ec4', keywords: ['cell', 'dna', 'genetic', 'peptide', 'telomer', 'epigen'], Icon: Dna },
    { id: 'nutrition',  label: 'Nutrition',     color: '#b4955a', keywords: ['nutrit', 'diet', 'food', 'vitamin', 'mineral', 'suppl'], Icon: Nut },
    { id: 'oral',       label: 'Oral',          color: '#c4888a', keywords: ['oral', 'pill', 'tablet', 'capsule', 'sublingual'], Icon: Pill },
];

export function inferPurposeIconId(text) {
    if (!text) return null;
    const lower = text.toLowerCase();
    for (const opt of PURPOSE_ICON_OPTIONS) {
        if (opt.keywords.some((kw) => lower.includes(kw))) return opt.id;
    }
    return null;
}

/** Infer from purpose/goal first, then protocol name and peptide names (for compact cards and list views). */
export function inferPurposeIconIdFromProtocol(protocol) {
    if (!protocol) return null;
    const fromPurpose = inferPurposeIconId(protocol.purpose || '');
    if (fromPurpose) return fromPurpose;
    const nameBlob = [
        protocol.protocolName,
        protocol.name,
        ...(Array.isArray(protocol.peptides) ? protocol.peptides.map((x) => x?.name) : []),
    ]
        .filter(Boolean)
        .join(' ');
    return inferPurposeIconId(nameBlob);
}

export function getPurposeIconLabel(id) {
    const match = PURPOSE_ICON_OPTIONS.find((o) => o.id === id);
    return match ? match.label : 'Research';
}

export function getPurposeIconColor(id) {
    const match = PURPOSE_ICON_OPTIONS.find((o) => o.id === id);
    return match?.color ?? '#8a9cb4';
}

export function getPurposeIconComponent(id) {
    const match = PURPOSE_ICON_OPTIONS.find((o) => o.id === id);
    return match ? match.Icon : Target;
}

/**
 * Compound/peptide-name-aware inference.
 * Maps well-known peptide & compound names to purpose icon IDs so the
 * Stockpile page can show a visual category badge without the user needing
 * to type a protocol purpose sentence.
 */
const COMPOUND_KEYWORDS = [
    // Recovery / Healing
    { id: 'recovery', terms: ['bpc', 'bpc-157', 'tb-500', 'tb500', 'tb 500', 'ghk', 'ghk-cu', 'kpv', 'pentadeca', 'pda', 'thymosin beta', 'tb4', 'tb-4'] },
    // Weight Loss / GLP-1
    { id: 'weight-loss', terms: ['semaglutide', 'tirzepatide', 'ozempic', 'wegovy', 'mounjaro', 'aod-9604', 'aod9604', 'aod 9604', 'liraglutide', 'saxenda', 'glp-1', 'glp1'] },
    // Cognitive / Brain
    { id: 'brain', terms: ['semax', 'selank', 'dihexa', 'noopept', 'cerebrolysin', 'p21', 'nsi-189', 'cortexin', 'na-semax', 'n-acetyl semax', 'adamax', 'semaxamide'] },
    // Muscle / Growth
    { id: 'muscle', terms: ['ipamorelin', 'sermorelin', 'ghrp-2', 'ghrp-6', 'ghrp2', 'ghrp6', 'hexarelin', 'tesamorelin', 'cjc-1295', 'cjc1295', 'mod grf', 'mod-grf', 'igf-1', 'igf1', 'igf-lr3', 'mgf', 'peg-mgf', 'mk-677', 'mk677', 'lgd-4033', 'lgd4033', 'rad-140', 'rad140', 'ostarine', 'mk-2866', 'yk-11', 's23', 'sr9009', 'cardarine', 'gw501516', 'somatropin'] },
    // Immune System
    { id: 'immune', terms: ['thymosin alpha', 'ta-1', 'ta1', 'thymostimulin', 'll-37', 'll37', 'mots-c', 'motsc', 'mots c', 'ss-31', 'ss31', 'humanin'] },
    // Longevity / Anti-aging
    { id: 'longevity', terms: ['epithalon', 'epitalon', 'klotho', 'foxo4', 'foxo4-dri', 'nmn', 'nr ', 'nicotinamide riboside', 'rapamycin', 'metformin'] },
    // Energy / Metabolism
    { id: 'energy', terms: ['nad+', 'nad ', 'nmn', 'nicotinamide mononucleotide', 'aicar', 'coq10', 'pqq'] },
    // Hormones / Fertility
    { id: 'hormones', terms: ['pt-141', 'pt141', 'bremelanotide', 'kisspeptin', 'gonadorelin', 'gnrh', 'triptorelin', 'testosterone', 'estradiol', 'progesterone', 'dhea', 'hcg', 'hgh'] },
    // Heart / Cardiovascular
    { id: 'heart', terms: ['ss-31', 'ss31', 'humanin', 'mots-c', 'motsc'] },
    // Metabolism / Blood Sugar
    { id: 'metabolism', terms: ['insulin', 'glucagon', 'glp-2', 'gcg', 'berberine'] },
    // Sleep
    { id: 'sleep', terms: ['dsip', 'delta sleep inducing', 'epitalon'] },
    // Skin / General
    { id: 'health', terms: ['melanotan', 'mt-2', 'mt2', 'gdf-11', 'gdf11'] },
];

export function inferPurposeIconFromCompound(compoundName) {
    if (!compoundName) return null;
    const lower = compoundName.toLowerCase();
    for (const { id, terms } of COMPOUND_KEYWORDS) {
        if (terms.some((t) => lower.includes(t))) return id;
    }
    // Fall back to the generic purpose keyword inference against the compound name
    return inferPurposeIconId(lower);
}

/** Resolved icon component when reading protocol data elsewhere. */
export function resolveProtocolPurposeIcon(protocol) {
    const explicit = protocol?.purposeIcon;
    if (explicit && PURPOSE_ICON_OPTIONS.some((o) => o.id === explicit)) {
        return getPurposeIconComponent(explicit);
    }
    const inferred = inferPurposeIconIdFromProtocol(protocol);
    if (inferred) return getPurposeIconComponent(inferred);
    return Microscope;
}

export function ProtocolPurposeGlyph({ protocol, size = 20, weight = PURPOSE_ICON_WEIGHT, className, style, ...rest }) {
    const Icon = resolveProtocolPurposeIcon(protocol);
    return createElement(Icon, { size, weight, className, style, ...rest });
}
