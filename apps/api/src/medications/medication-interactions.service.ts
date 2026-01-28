import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../system/module/cache';

export interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  description: string;
  mechanism?: string;
  clinicalEffects?: string;
  management?: string;
}

export interface InteractionCheckResult {
  hasInteractions: boolean;
  totalInteractions: number;
  bySeverity: {
    contraindicated: DrugInteraction[];
    major: DrugInteraction[];
    moderate: DrugInteraction[];
    minor: DrugInteraction[];
  };
  checkedMedications: string[];
  timestamp: string;
}

/**
 * Known drug interactions database
 * In production, this would be backed by a proper drug interaction API (e.g., DrugBank, RxNorm, OpenFDA)
 * This is a curated list of common interactions for demonstration
 */
const KNOWN_INTERACTIONS: DrugInteraction[] = [
  // Blood thinners
  {
    drug1: 'warfarin',
    drug2: 'aspirin',
    severity: 'major',
    description: 'Increased risk of bleeding when used together.',
    mechanism: 'Both medications affect blood clotting through different mechanisms.',
    clinicalEffects: 'May cause serious bleeding, including GI bleeding or intracranial hemorrhage.',
    management: 'Avoid combination if possible. If necessary, use lowest effective aspirin dose and monitor closely.',
  },
  {
    drug1: 'warfarin',
    drug2: 'ibuprofen',
    severity: 'major',
    description: 'NSAIDs increase the risk of bleeding with warfarin.',
    mechanism: 'NSAIDs inhibit platelet function and may cause GI irritation.',
    clinicalEffects: 'Significantly increased bleeding risk, particularly GI bleeding.',
    management: 'Avoid NSAIDs. Use acetaminophen for pain if needed.',
  },
  {
    drug1: 'warfarin',
    drug2: 'vitamin k',
    severity: 'major',
    description: 'Vitamin K reduces the effectiveness of warfarin.',
    mechanism: 'Vitamin K is the antidote to warfarin and promotes clotting.',
    clinicalEffects: 'May cause treatment failure and increase risk of blood clots.',
    management: 'Maintain consistent vitamin K intake. Avoid large changes in diet.',
  },

  // ACE Inhibitors
  {
    drug1: 'lisinopril',
    drug2: 'potassium',
    severity: 'major',
    description: 'Risk of dangerously high potassium levels.',
    mechanism: 'ACE inhibitors reduce potassium excretion.',
    clinicalEffects: 'Hyperkalemia can cause life-threatening cardiac arrhythmias.',
    management: 'Monitor potassium levels closely. Avoid potassium supplements unless prescribed.',
  },
  {
    drug1: 'lisinopril',
    drug2: 'spironolactone',
    severity: 'major',
    description: 'Both medications can increase potassium levels.',
    mechanism: 'Additive potassium-sparing effects.',
    clinicalEffects: 'Hyperkalemia risk, particularly in patients with renal impairment.',
    management: 'Monitor potassium and renal function. Use with caution.',
  },

  // Statins
  {
    drug1: 'atorvastatin',
    drug2: 'grapefruit',
    severity: 'moderate',
    description: 'Grapefruit can increase statin levels in blood.',
    mechanism: 'Grapefruit inhibits CYP3A4 enzyme that metabolizes atorvastatin.',
    clinicalEffects: 'Increased risk of muscle pain and rhabdomyolysis.',
    management: 'Limit grapefruit consumption or consider alternative statin.',
  },
  {
    drug1: 'simvastatin',
    drug2: 'amiodarone',
    severity: 'contraindicated',
    description: 'Significantly increased risk of muscle damage.',
    mechanism: 'Amiodarone inhibits statin metabolism.',
    clinicalEffects: 'High risk of rhabdomyolysis (severe muscle breakdown).',
    management: 'Do not exceed simvastatin 10mg/day or use alternative statin.',
  },

  // Diabetes medications
  {
    drug1: 'metformin',
    drug2: 'contrast dye',
    severity: 'major',
    description: 'Risk of lactic acidosis with iodinated contrast.',
    mechanism: 'Contrast-induced nephropathy may reduce metformin clearance.',
    clinicalEffects: 'Lactic acidosis can be life-threatening.',
    management: 'Hold metformin before/after contrast procedures. Resume after 48 hours if kidney function normal.',
  },
  {
    drug1: 'insulin',
    drug2: 'metformin',
    severity: 'moderate',
    description: 'Increased risk of hypoglycemia.',
    mechanism: 'Additive blood sugar lowering effects.',
    clinicalEffects: 'Low blood sugar symptoms: shakiness, confusion, sweating.',
    management: 'Monitor blood sugar closely. May need dose adjustments.',
  },

  // Antidepressants
  {
    drug1: 'sertraline',
    drug2: 'tramadol',
    severity: 'major',
    description: 'Risk of serotonin syndrome.',
    mechanism: 'Both medications increase serotonin levels.',
    clinicalEffects: 'Serotonin syndrome: agitation, tremor, rapid heartbeat, high temperature.',
    management: 'Avoid combination if possible. Monitor for serotonin syndrome symptoms.',
  },
  {
    drug1: 'fluoxetine',
    drug2: 'mao inhibitors',
    severity: 'contraindicated',
    description: 'Life-threatening serotonin syndrome.',
    mechanism: 'Dangerous accumulation of serotonin.',
    clinicalEffects: 'Severe serotonin syndrome, potentially fatal.',
    management: 'Absolutely contraindicated. Allow 5-week washout period.',
  },

  // Blood pressure medications
  {
    drug1: 'amlodipine',
    drug2: 'simvastatin',
    severity: 'moderate',
    description: 'Amlodipine may increase simvastatin levels.',
    mechanism: 'CYP3A4 interaction.',
    clinicalEffects: 'Increased risk of muscle problems.',
    management: 'Limit simvastatin to 20mg/day when used with amlodipine.',
  },
  {
    drug1: 'metoprolol',
    drug2: 'verapamil',
    severity: 'major',
    description: 'Additive effects on heart rate and conduction.',
    mechanism: 'Both slow heart rate and affect cardiac conduction.',
    clinicalEffects: 'Severe bradycardia, heart block, heart failure.',
    management: 'Avoid combination. Use with extreme caution if necessary.',
  },

  // Pain medications
  {
    drug1: 'oxycodone',
    drug2: 'benzodiazepine',
    severity: 'contraindicated',
    description: 'Life-threatening respiratory depression.',
    mechanism: 'Both are CNS depressants.',
    clinicalEffects: 'Respiratory depression, sedation, coma, death.',
    management: 'FDA black box warning. Avoid combination.',
  },
  {
    drug1: 'acetaminophen',
    drug2: 'alcohol',
    severity: 'major',
    description: 'Increased risk of liver damage.',
    mechanism: 'Both are metabolized by the liver.',
    clinicalEffects: 'Hepatotoxicity, especially with chronic use.',
    management: 'Limit acetaminophen dose. Avoid chronic alcohol use.',
  },

  // Thyroid
  {
    drug1: 'levothyroxine',
    drug2: 'calcium',
    severity: 'moderate',
    description: 'Calcium reduces levothyroxine absorption.',
    mechanism: 'Calcium binds to levothyroxine in the GI tract.',
    clinicalEffects: 'Subtherapeutic thyroid levels.',
    management: 'Take levothyroxine 4 hours apart from calcium.',
  },
  {
    drug1: 'levothyroxine',
    drug2: 'iron',
    severity: 'moderate',
    description: 'Iron reduces levothyroxine absorption.',
    mechanism: 'Iron forms complexes with levothyroxine.',
    clinicalEffects: 'Subtherapeutic thyroid levels.',
    management: 'Take levothyroxine 4 hours apart from iron supplements.',
  },

  // Antibiotics
  {
    drug1: 'ciprofloxacin',
    drug2: 'antacids',
    severity: 'moderate',
    description: 'Antacids reduce ciprofloxacin absorption.',
    mechanism: 'Metal cations bind to fluoroquinolones.',
    clinicalEffects: 'Reduced antibiotic effectiveness.',
    management: 'Take ciprofloxacin 2 hours before or 6 hours after antacids.',
  },
  {
    drug1: 'metronidazole',
    drug2: 'alcohol',
    severity: 'major',
    description: 'Disulfiram-like reaction with alcohol.',
    mechanism: 'Metronidazole inhibits alcohol metabolism.',
    clinicalEffects: 'Severe nausea, vomiting, flushing, headache.',
    management: 'Avoid alcohol during and 3 days after treatment.',
  },
];

@Injectable()
export class MedicationInteractionsService {
  private readonly logger = new Logger(MedicationInteractionsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private cacheService: CacheService,
  ) {}

  /**
   * Check for interactions between a list of medications
   */
  async checkInteractions(medicationNames: string[]): Promise<InteractionCheckResult> {
    const normalizedNames = medicationNames.map(name => this.normalizeDrugName(name));
    const interactions = this.findInteractions(normalizedNames);

    // Group by severity
    const bySeverity = {
      contraindicated: interactions.filter(i => i.severity === 'contraindicated'),
      major: interactions.filter(i => i.severity === 'major'),
      moderate: interactions.filter(i => i.severity === 'moderate'),
      minor: interactions.filter(i => i.severity === 'minor'),
    };

    return {
      hasInteractions: interactions.length > 0,
      totalInteractions: interactions.length,
      bySeverity,
      checkedMedications: medicationNames,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check interactions for a care recipient's current medications
   */
  async checkCareRecipientMedications(careRecipientId: string): Promise<InteractionCheckResult> {
    // Get active medications
    const medications = await this.prisma.medication.findMany({
      where: {
        careRecipientId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        genericName: true,
      },
    });

    // Use both brand and generic names for comprehensive checking
    const medicationNames: string[] = [];
    medications.forEach(med => {
      medicationNames.push(med.name);
      if (med.genericName) {
        medicationNames.push(med.genericName);
      }
    });

    return this.checkInteractions(medicationNames);
  }

  /**
   * Check if adding a new medication would cause interactions
   */
  async checkNewMedicationInteractions(
    careRecipientId: string,
    newMedicationName: string,
    newMedicationGenericName?: string,
  ): Promise<InteractionCheckResult & { warnings: string[] }> {
    // Get existing active medications
    const existingMeds = await this.prisma.medication.findMany({
      where: {
        careRecipientId,
        isActive: true,
      },
      select: {
        name: true,
        genericName: true,
      },
    });

    const medicationNames: string[] = [newMedicationName];
    if (newMedicationGenericName) {
      medicationNames.push(newMedicationGenericName);
    }

    existingMeds.forEach(med => {
      medicationNames.push(med.name);
      if (med.genericName) {
        medicationNames.push(med.genericName);
      }
    });

    const result = await this.checkInteractions(medicationNames);

    // Generate warnings for the new medication specifically
    const warnings: string[] = [];
    const normalizedNew = this.normalizeDrugName(newMedicationName);
    const normalizedNewGeneric = newMedicationGenericName 
      ? this.normalizeDrugName(newMedicationGenericName) 
      : null;

    [...result.bySeverity.contraindicated, ...result.bySeverity.major].forEach(interaction => {
      const drug1Normalized = this.normalizeDrugName(interaction.drug1);
      const drug2Normalized = this.normalizeDrugName(interaction.drug2);

      if (
        drug1Normalized === normalizedNew || 
        drug2Normalized === normalizedNew ||
        (normalizedNewGeneric && (drug1Normalized === normalizedNewGeneric || drug2Normalized === normalizedNewGeneric))
      ) {
        const otherDrug = drug1Normalized === normalizedNew || drug1Normalized === normalizedNewGeneric
          ? interaction.drug2
          : interaction.drug1;
        warnings.push(
          `⚠️ ${interaction.severity.toUpperCase()}: ${newMedicationName} may interact with ${otherDrug}. ${interaction.description}`
        );
      }
    });

    return {
      ...result,
      warnings,
    };
  }

  /**
   * Get detailed information about a specific interaction
   */
  getInteractionDetails(drug1: string, drug2: string): DrugInteraction | null {
    const normalized1 = this.normalizeDrugName(drug1);
    const normalized2 = this.normalizeDrugName(drug2);

    return KNOWN_INTERACTIONS.find(interaction => {
      const interactionDrug1 = this.normalizeDrugName(interaction.drug1);
      const interactionDrug2 = this.normalizeDrugName(interaction.drug2);

      return (
        (interactionDrug1.includes(normalized1) || normalized1.includes(interactionDrug1)) &&
        (interactionDrug2.includes(normalized2) || normalized2.includes(interactionDrug2))
      ) || (
        (interactionDrug1.includes(normalized2) || normalized2.includes(interactionDrug1)) &&
        (interactionDrug2.includes(normalized1) || normalized1.includes(interactionDrug2))
      );
    }) || null;
  }

  /**
   * Normalize drug name for comparison
   */
  private normalizeDrugName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  /**
   * Find all interactions between a list of medications
   */
  private findInteractions(normalizedNames: string[]): DrugInteraction[] {
    const interactions: DrugInteraction[] = [];
    const uniqueNames = [...new Set(normalizedNames)];

    // Check each pair of medications
    for (let i = 0; i < uniqueNames.length; i++) {
      for (let j = i + 1; j < uniqueNames.length; j++) {
        const name1 = uniqueNames[i];
        const name2 = uniqueNames[j];

        // Check against known interactions
        for (const knownInteraction of KNOWN_INTERACTIONS) {
          const knownDrug1 = this.normalizeDrugName(knownInteraction.drug1);
          const knownDrug2 = this.normalizeDrugName(knownInteraction.drug2);

          // Check if either medication matches either drug in the interaction
          const match1 = name1.includes(knownDrug1) || knownDrug1.includes(name1);
          const match2 = name2.includes(knownDrug2) || knownDrug2.includes(name2);
          const match1Alt = name1.includes(knownDrug2) || knownDrug2.includes(name1);
          const match2Alt = name2.includes(knownDrug1) || knownDrug1.includes(name2);

          if ((match1 && match2) || (match1Alt && match2Alt)) {
            // Avoid duplicates
            const exists = interactions.some(
              i => 
                (i.drug1 === knownInteraction.drug1 && i.drug2 === knownInteraction.drug2) ||
                (i.drug1 === knownInteraction.drug2 && i.drug2 === knownInteraction.drug1)
            );
            if (!exists) {
              interactions.push(knownInteraction);
            }
          }
        }
      }
    }

    // Sort by severity
    const severityOrder = { contraindicated: 0, major: 1, moderate: 2, minor: 3 };
    interactions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return interactions;
  }

  /**
   * Get list of all known interactions (for admin/reference)
   */
  getAllKnownInteractions(): DrugInteraction[] {
    return [...KNOWN_INTERACTIONS];
  }
}

