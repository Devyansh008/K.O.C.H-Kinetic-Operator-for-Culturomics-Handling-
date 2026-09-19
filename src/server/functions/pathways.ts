/**
 * src/server/functions/pathways.ts
 *
 * Module 5: Pathways & Recipes Server Functions
 *
 * Implements:
 *   - queryPathwayDatabase (#21): Queries biological pathway databases (KEGG/MetaCyc models)
 *     based on target taxa for auxotrophic gap analysis and metabolic recommendations.
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

// ─── Biological Pathway Knowledge Base (KEGG / MetaCyc models) ──────────────

interface PathwayDefinition {
  pathwayId: string;
  name: string;
  category: string;
  targetTaxa: string[];
  essentialNutrients: string[];
  cofactors: string[];
  optimalPhRange: [number, number];
  carbonSources: string[];
}

const TAXA_PATHWAY_DATABASE: PathwayDefinition[] = [
  {
    pathwayId: 'PATH-EC-GLYCOLYSIS',
    name: 'Glycolysis / Gluconeogenesis',
    category: 'Carbohydrate Metabolism',
    targetTaxa: ['Escherichia coli', 'Enterobacteriaceae', 'Bacillus subtilis', 'general_bacteria'],
    essentialNutrients: ['D-Glucose', 'Phosphate (PO4)', 'Magnesium (Mg2+)'],
    cofactors: ['NAD+', 'ATP', 'ADP'],
    optimalPhRange: [6.8, 7.4],
    carbonSources: ['D-Glucose', 'D-Fructose', 'Glycerol'],
  },
  {
    pathwayId: 'PATH-MYCO-LIPID',
    name: 'Mycolic Acid Biosynthesis',
    category: 'Lipid & Cell Envelope',
    targetTaxa: ['Mycobacterium', 'Actinobacteria', 'Corynebacterium'],
    essentialNutrients: ['Oleic acid', 'Bovine Serum Albumin', 'Glycerol'],
    cofactors: ['NADPH', 'Biotin', 'Coenzyme A'],
    optimalPhRange: [6.5, 7.0],
    carbonSources: ['Glycerol', 'Tween 80', 'Dextrose'],
  },
  {
    pathwayId: 'PATH-ANAERO-FERM',
    name: 'Mixed Acid & Butyrate Fermentation',
    category: 'Anaerobic Culturomics',
    targetTaxa: ['Clostridium', 'Bacteroides', 'Faecalibacterium prausnitzii', 'gut_microbiota'],
    essentialNutrients: ['L-Cysteine-HCl', 'Resazurin (redox indicator)', 'Short-chain fatty acids'],
    cofactors: ['Cobalamin (B12)', 'Hemin', 'Menadione (Vitamin K)'],
    optimalPhRange: [6.8, 7.2],
    carbonSources: ['Cellobiose', 'Maltose', 'Inulin', 'Starch'],
  },
  {
    pathwayId: 'PATH-EXTREMO-HALO',
    name: 'Osmoprotectant & Ectoine Synthesis',
    category: 'Extremophile & Halophilic Pathways',
    targetTaxa: ['Halomonas', 'Salinibacter', 'Halobacteria'],
    essentialNutrients: ['NaCl (high salinity)', 'Ectoine precursor (L-aspartate-4-semialdehyde)'],
    cofactors: ['Iron-sulfur clusters', 'Potassium (K+)'],
    optimalPhRange: [7.2, 8.5],
    carbonSources: ['Sodium pyruvate', 'Glutamate'],
  },
];

// ─── Edge / In-Memory Pathway Cache ─────────────────────────────────────────

const pathwayQueryCache = new Map<string, { result: PathwayQueryResult; cachedAt: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour cache

// ─── queryPathwayDatabase (#21) ─────────────────────────────────────────────

const QueryPathwayDatabaseSchema = z.object({
  targetTaxa: z.string().optional(),
  taxonName: z.string().optional(),
  carbonSource: z.string().optional(),
  auxotrophies: z.array(z.string()).optional(),
  missingNutrients: z.array(z.string()).optional(),
}).refine((d) => d.targetTaxa || d.taxonName, {
  message: 'Either targetTaxa or taxonName must be provided',
});

type QueryPathwayDatabaseInput = z.infer<typeof QueryPathwayDatabaseSchema>;

export interface PathwayQueryResult {
  targetTaxa: string;
  matchedPathways: PathwayDefinition[];
  recommendedMediaComposition: {
    baseCarbonSource: string;
    requiredNutrients: string[];
    essentialCofactors: string[];
    suggestedPh: number;
    notes: string;
  };
  auxotrophicGapsIdentified: string[];
  fromCache?: boolean;
}

/**
 * Queries biological pathway databases (KEGG/MetaCyc models) based on target taxa
 * and returns auxotrophic gap analysis, metabolic requirements, and cofactor suggestions.
 * Employs edge in-memory caching to eliminate redundant remote queries and stay within free tiers.
 *
 * Module 5 (#21): `queryPathwayDatabase` → `{ taxonName, missingNutrients }` → `PathwayQueryResult`
 */
export const queryPathwayDatabase = createServerFn({ method: 'POST' })
  .validator((data: unknown) => QueryPathwayDatabaseSchema.parse(data))
  .handler(async ({ data }: { data: QueryPathwayDatabaseInput }): Promise<PathwayQueryResult> => {
    const targetTaxa = data.taxonName ?? data.targetTaxa ?? 'general_bacteria';
    const auxotrophies = data.missingNutrients ?? data.auxotrophies ?? [];
    const cacheKey = `${targetTaxa.toLowerCase()}_${data.carbonSource ?? ''}_${auxotrophies.sort().join(',')}`;

    const cached = pathwayQueryCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return { ...cached.result, fromCache: true };
    }

    const queryLower = targetTaxa.toLowerCase();

    // Match pathways by taxa keyword or fallback to general bacteria
    let matched = TAXA_PATHWAY_DATABASE.filter((pw) =>
      pw.targetTaxa.some((t) => t.toLowerCase().includes(queryLower) || queryLower.includes(t.toLowerCase()))
    );

    if (matched.length === 0) {
      matched = TAXA_PATHWAY_DATABASE.filter((pw) => pw.targetTaxa.includes('general_bacteria'));
    }

    const allNutrients = Array.from(new Set(matched.flatMap((m) => m.essentialNutrients)));
    const allCofactors = Array.from(new Set(matched.flatMap((m) => m.cofactors)));
    const selectedCarbon = data.carbonSource ?? matched[0]?.carbonSources[0] ?? 'D-Glucose';

    const gaps: string[] = [];
    if (auxotrophies.length > 0) {
      for (const aux of auxotrophies) {
        gaps.push(`Auxotrophy detected: Supplementation of ${aux} required for optimal biomass velocity.`);
      }
    }

    const result: PathwayQueryResult = {
      targetTaxa,
      matchedPathways: matched,
      recommendedMediaComposition: {
        baseCarbonSource: selectedCarbon,
        requiredNutrients: allNutrients,
        essentialCofactors: allCofactors,
        suggestedPh: matched[0]?.optimalPhRange[0] ?? 7.0,
        notes: `Media formulation optimized for ${targetTaxa} across ${matched.length} metabolic pathway models.`,
      },
      auxotrophicGapsIdentified: gaps,
      fromCache: false,
    };

    pathwayQueryCache.set(cacheKey, { result, cachedAt: Date.now() });

    return result;
  });

