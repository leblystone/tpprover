import {
    TrendingDown, Brain, Heart, Zap, Shield, Activity,
    Dumbbell, Eye, Bone, Wind, Flame, Leaf, Moon, Sun,
    Target, Microscope, Stethoscope, Baby, Clock, Star,
} from 'lucide-react';

export const PURPOSE_ICON_OPTIONS = [
    { id: 'weight-loss',    label: 'Weight Loss',    keywords: ['weight', 'loss', 'fat', 'slim', 'lean', 'cut'],            Icon: TrendingDown },
    { id: 'brain',          label: 'Cognitive',      keywords: ['brain', 'cognit', 'focus', 'mental', 'memory', 'neuro'],   Icon: Brain },
    { id: 'heart',          label: 'Heart Health',   keywords: ['heart', 'cardio', 'cardiovascular', 'blood'],              Icon: Heart },
    { id: 'energy',         label: 'Energy',         keywords: ['energy', 'fatigue', 'tired', 'vitality', 'stamina'],       Icon: Zap },
    { id: 'immune',         label: 'Immune',         keywords: ['immune', 'immunity', 'infection', 'defense'],              Icon: Shield },
    { id: 'recovery',       label: 'Recovery',       keywords: ['recover', 'heal', 'repair', 'injury', 'rehab'],            Icon: Activity },
    { id: 'muscle',         label: 'Muscle',         keywords: ['muscle', 'strength', 'bulk', 'mass', 'hypertrophy'],       Icon: Dumbbell },
    { id: 'vision',         label: 'Vision',         keywords: ['vision', 'eye', 'sight', 'retina'],                        Icon: Eye },
    { id: 'bone',           label: 'Bone Health',    keywords: ['bone', 'joint', 'osteo', 'skeletal'],                      Icon: Bone },
    { id: 'lung',           label: 'Respiratory',    keywords: ['lung', 'breath', 'respir', 'airway', 'pulmon'],            Icon: Wind },
    { id: 'metabolism',     label: 'Metabolism',     keywords: ['metabol', 'thyroid', 'insulin', 'glucose', 'diabetic'],    Icon: Flame },
    { id: 'longevity',      label: 'Longevity',      keywords: ['longev', 'aging', 'anti-age', 'lifespan', 'senesc'],       Icon: Leaf },
    { id: 'sleep',          label: 'Sleep',          keywords: ['sleep', 'insomn', 'rest', 'circad', 'melatonin'],          Icon: Moon },
    { id: 'hormones',       label: 'Hormones',       keywords: ['hormon', 'testosterone', 'estrogen', 'hgh', 'thyroid'],   Icon: Sun },
    { id: 'goal',           label: 'General Goal',   keywords: ['goal', 'general', 'protocol', 'research'],                 Icon: Target },
    { id: 'research',       label: 'Research',       keywords: ['research', 'study', 'experiment', 'trial'],                Icon: Microscope },
    { id: 'health',         label: 'General Health', keywords: ['health', 'wellness', 'wellbeing', 'overall'],              Icon: Stethoscope },
    { id: 'fertility',      label: 'Fertility',      keywords: ['fertil', 'reproductive', 'hormone', 'pregnan'],            Icon: Baby },
    { id: 'maintenance',    label: 'Maintenance',    keywords: ['mainten', 'sustain', 'ongoing', 'stable'],                 Icon: Clock },
    { id: 'performance',    label: 'Performance',    keywords: ['perform', 'sport', 'athlet', 'compete', 'endurance'],      Icon: Star },
];

export function inferPurposeIconId(text) {
    if (!text) return null;
    const lower = text.toLowerCase();
    for (const opt of PURPOSE_ICON_OPTIONS) {
        if (opt.keywords.some(kw => lower.includes(kw))) return opt.id;
    }
    return null;
}

export function getPurposeIconComponent(id) {
    const match = PURPOSE_ICON_OPTIONS.find(o => o.id === id);
    return match ? match.Icon : Target;
}
