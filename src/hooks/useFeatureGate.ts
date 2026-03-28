import { useAuthStore } from '../stores/authStore';

// Feature keys matching planos.features_permitidas JSONB array values
export type FeatureKey = 'agendamento' | 'torneio' | 'copy_ia' | 'moderacao' | 'voz_clonada';

// Maps feature keys to the minimum plan that includes them
const FEATURE_PLAN_MAP: Record<FeatureKey, string> = {
  agendamento: 'Basico',
  torneio: 'Pro',
  copy_ia: 'Pro',
  moderacao: 'Enterprise',
  voz_clonada: 'Enterprise',
};

// Maps sidebar paths to feature keys for gating
export const PATH_FEATURE_MAP: Record<string, FeatureKey> = {
  '/torneios': 'torneio',
  '/envios/gerar-copy': 'copy_ia',
  // agendamento is available on all plans, no gating needed
  // moderacao gates specific features within Grupos, not the page itself
  // voz_clonada gates a future page
};

interface FeatureGateResult {
  hasFeature: boolean;
  requiredPlan: string;
}

export function useFeatureGate(feature: FeatureKey): FeatureGateResult {
  const { user, impersonatedExpert } = useAuthStore();
  const expert = impersonatedExpert || user?.expert;

  if (!expert || !expert.plano) {
    return { hasFeature: false, requiredPlan: FEATURE_PLAN_MAP[feature] };
  }

  const features = expert.plano.features_permitidas;

  // null features_permitidas = all features (Enterprise with null means unlimited)
  if (!features) {
    return { hasFeature: true, requiredPlan: FEATURE_PLAN_MAP[feature] };
  }

  return {
    hasFeature: features.includes(feature),
    requiredPlan: FEATURE_PLAN_MAP[feature],
  };
}

// Convenience: check multiple features at once
export function useFeatureGates(features: FeatureKey[]): Record<FeatureKey, FeatureGateResult> {
  const { user, impersonatedExpert } = useAuthStore();
  const expert = impersonatedExpert || user?.expert;

  const result = {} as Record<FeatureKey, FeatureGateResult>;

  for (const feature of features) {
    if (!expert || !expert.plano) {
      result[feature] = { hasFeature: false, requiredPlan: FEATURE_PLAN_MAP[feature] };
      continue;
    }

    const allowed = expert.plano.features_permitidas;
    result[feature] = {
      hasFeature: !allowed || allowed.includes(feature),
      requiredPlan: FEATURE_PLAN_MAP[feature],
    };
  }

  return result;
}
