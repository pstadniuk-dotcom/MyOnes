import type { HealthProfile, Formula, LabAnalysis } from "../../shared/schema";

export type OptimizePlanType = "nutrition" | "workout" | "lifestyle";

export interface OptimizePreferences {
  caloriesTarget?: number;
  daysPerWeek?: number;
  experienceLevel?: "beginner" | "intermediate" | "advanced";
  dietaryRestrictions?: string[];
  goals?: string;
  avoidIngredients?: string[];
  equipmentAccess?: string;
  [key: string]: unknown;
}

export interface OptimizeContext {
  user: {
    id: string;
    name: string;
    email: string;
  };
  healthProfile?: HealthProfile;
  activeFormula?: Formula;
  labData?: {
    reports: LabAnalysis[];
    summary: string;
  };
  biometrics?: {
    recentSleep?: number;
    recentHRV?: number;
    recentSteps?: number;
    recentRHR?: number;
  };
  preferences: OptimizePreferences;
}

export interface PersonalizationSnapshot {
  healthProfileFacts: string[];
  lifestyleFlags: string[];
  labFindings: Array<{
    marker: string;
    status?: string;
    value?: string;
    insight: string;
  }>;
  supplementHighlights: string[];
  goals: string[];
  dietaryFlags: string[];
}

const DEFAULT_FALLBACK_FACT = "General wellness optimization";

export function buildPersonalizationSnapshot(context: OptimizeContext): PersonalizationSnapshot {
  const { healthProfile, activeFormula, labData, preferences } = context;

  const healthProfileFacts: string[] = [];
  if (healthProfile?.age) healthProfileFacts.push(`Age ${healthProfile.age}`);
  if (healthProfile?.sex) healthProfileFacts.push(`Sex ${healthProfile.sex}`);
  if (healthProfile?.exerciseDaysPerWeek) {
    healthProfileFacts.push(`Exercises ${healthProfile.exerciseDaysPerWeek} days/week`);
  }
  if (healthProfile?.sleepHoursPerNight) {
    healthProfileFacts.push(`Sleeps ${healthProfile.sleepHoursPerNight} hrs/night`);
  }
  if (healthProfile?.stressLevel) {
    healthProfileFacts.push(`Stress level ${healthProfile.stressLevel}/10`);
  }
  if (healthProfile?.bloodPressureSystolic && healthProfile?.bloodPressureDiastolic) {
    healthProfileFacts.push(`Blood pressure ${healthProfile.bloodPressureSystolic}/${healthProfile.bloodPressureDiastolic}`);
  }

  const lifestyleFlags: string[] = [];
  if (Array.isArray(healthProfile?.conditions) && healthProfile.conditions.length > 0) {
    lifestyleFlags.push(`Conditions: ${healthProfile.conditions.join(", ")}`);
  }
  if (Array.isArray(healthProfile?.medications) && healthProfile.medications.length > 0) {
    lifestyleFlags.push(`Medications: ${healthProfile.medications.join(", ")}`);
  }
  if (Array.isArray(healthProfile?.allergies) && healthProfile.allergies.length > 0) {
    lifestyleFlags.push(`Allergies: ${healthProfile.allergies.join(", ")}`);
  }

  const labFindings: PersonalizationSnapshot["labFindings"] = [];
  if (labData?.reports?.length) {
    labData.reports.forEach((report) => {
      (report.extractedMarkers ?? []).forEach((marker) => {
        if (marker.status && marker.status !== "normal") {
          const valueText = marker.value ? `${marker.value} ${marker.unit}` : undefined;
          labFindings.push({
            marker: marker.name,
            status: marker.status,
            value: valueText,
            insight: `${marker.name} is ${marker.status}${valueText ? ` at ${valueText}` : ""}`,
          });
        }
      });
    });
  }
  if (!labFindings.length && labData?.summary) {
    labFindings.push({ marker: "summary", insight: labData.summary });
  }

  const supplementHighlights: string[] = [];
  if (activeFormula?.bases?.length) {
    activeFormula.bases.forEach((base) => {
      supplementHighlights.push(`${base.ingredient}: ${base.amount}${base.unit}`);
    });
  }
  if (activeFormula?.additions?.length) {
    activeFormula.additions.forEach((add) => {
      supplementHighlights.push(`${add.ingredient}: ${add.amount}${add.unit}`);
    });
  }

  const goals: string[] = [];
  if (preferences?.goals) goals.push(preferences.goals);
  if (labData?.reports?.length) {
    labData.reports.forEach((report) => {
      report.aiInsights?.recommendations?.forEach((rec) => goals.push(rec));
    });
  }

  const dietaryFlags = [
    ...(preferences?.dietaryRestrictions ?? []),
    ...(Array.isArray(healthProfile?.allergies) ? healthProfile.allergies : []),
  ];

  return {
    healthProfileFacts,
    lifestyleFlags,
    labFindings,
    supplementHighlights,
    goals,
    dietaryFlags,
  };
}

export function formatPersonalizationSnapshot(snapshot: PersonalizationSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

export function summarizeSnapshotForRationale(snapshot: PersonalizationSnapshot): string {
  const highlights = [
    snapshot.healthProfileFacts.slice(0, 2).join("; "),
    snapshot.labFindings.slice(0, 2).map((finding) => finding.insight).join("; "),
    snapshot.goals.slice(0, 1).join("; "),
  ].filter(Boolean);
  return highlights.length ? highlights.join(" | ") : DEFAULT_FALLBACK_FACT;
}

export function buildDefaultPersonalizationNotes(snapshot: PersonalizationSnapshot) {
  return {
    healthProfileInsights: snapshot.healthProfileFacts.slice(0, 3),
    labInsightsAddressed: snapshot.labFindings.slice(0, 3).map((finding) => finding.insight),
    supplementCoordination:
      snapshot.supplementHighlights.slice(0, 3).join("; ") || "Coordinated with current supplement routine to avoid nutrient overlap.",
    goalAlignment: snapshot.goals.slice(0, 2).join("; ") || DEFAULT_FALLBACK_FACT,
  };
}
