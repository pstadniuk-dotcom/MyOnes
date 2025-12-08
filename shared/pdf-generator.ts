import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { SYSTEM_SUPPORT_DETAILS } from './ingredients';

export interface FormulaForPDF {
  id: string;
  version: number;
  name?: string;
  createdAt: string;
  totalMg: number;
  bases: Array<{ ingredient: string; amount: number; unit: string; purpose?: string }>;
  additions: Array<{ ingredient: string; amount: number; unit: string; purpose?: string }>;
  userCustomizations?: {
    addedBases?: Array<{ ingredient: string; amount: number; unit: string }>;
    addedIndividuals?: Array<{ ingredient: string; amount: number; unit: string }>;
  };
  warnings?: string[];
  userCreated?: boolean;
}

export interface PDFGeneratorOptions {
  userName: string;
  userEmail: string;
}

const BRAND_COLORS = {
  primary: '#1B5E20',
  primaryLight: '#4CAF50',
  accent: '#C5D5A8',
  dark: '#0D3B0D',
  gray: '#666666',
  lightGray: '#F5F5F5',
  white: '#FFFFFF',
};

export function generateFormulaPDF(
  formula: FormulaForPDF,
  options: PDFGeneratorOptions
): TDocumentDefinitions {
  const dosage = calculateDosage(formula.totalMg);
  const createdDate = new Date(formula.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const content: Content[] = [
    {
      columns: [
        {
          width: '*',
          stack: [
            {
              text: 'ONES',
              style: 'logo',
              color: BRAND_COLORS.primary,
              fontSize: 32,
              bold: true,
            },
            {
              text: 'Personalized Supplement Formula',
              style: 'tagline',
              color: BRAND_COLORS.gray,
              fontSize: 10,
              margin: [0, 2, 0, 0],
            },
          ],
        },
        {
          width: 'auto',
          stack: [
            {
              text: `Version ${formula.version}`,
              style: 'versionBadge',
              alignment: 'right',
              fontSize: 11,
              bold: true,
              color: BRAND_COLORS.primary,
            },
            {
              text: createdDate,
              style: 'date',
              alignment: 'right',
              fontSize: 9,
              color: BRAND_COLORS.gray,
              margin: [0, 2, 0, 0],
            },
          ],
        },
      ],
      margin: [0, 0, 0, 25],
    },

    {
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 515,
          y2: 0,
          lineWidth: 2,
          lineColor: BRAND_COLORS.primary,
        },
      ],
      margin: [0, 0, 0, 20],
    },

    {
      text: formula.name || `Formula Version ${formula.version}`,
      style: 'formulaTitle',
      fontSize: 20,
      bold: true,
      color: BRAND_COLORS.dark,
      margin: [0, 0, 0, 5],
    },

    formula.userCreated
      ? {
          text: '✦ Custom Built Formula',
          style: 'customBadge',
          color: '#7E22CE',
          fontSize: 10,
          bold: true,
          margin: [0, 0, 0, 20],
        }
      : { text: '', margin: [0, 0, 0, 15] },

    {
      columns: [
        {
          width: '50%',
          stack: [
            {
              text: 'Patient Information',
              style: 'sectionHeader',
              fontSize: 12,
              bold: true,
              color: BRAND_COLORS.primary,
              margin: [0, 0, 0, 8],
            },
            {
              table: {
                widths: ['auto', '*'],
                body: [
                  [
                    { text: 'Name:', bold: true, fontSize: 9, color: BRAND_COLORS.gray },
                    { text: options.userName, fontSize: 9 },
                  ],
                  [
                    { text: 'Email:', bold: true, fontSize: 9, color: BRAND_COLORS.gray },
                    { text: options.userEmail, fontSize: 9 },
                  ],
                  [
                    { text: 'Created:', bold: true, fontSize: 9, color: BRAND_COLORS.gray },
                    { text: createdDate, fontSize: 9 },
                  ],
                ],
              },
              layout: 'noBorders',
            },
          ],
        },
        {
          width: '50%',
          stack: [
            {
              text: 'Formula Summary',
              style: 'sectionHeader',
              fontSize: 12,
              bold: true,
              color: BRAND_COLORS.primary,
              margin: [0, 0, 0, 8],
            },
            {
              table: {
                widths: ['auto', '*'],
                body: [
                  [
                    { text: 'Total Dose:', bold: true, fontSize: 9, color: BRAND_COLORS.gray },
                    { text: `${formula.totalMg}mg`, fontSize: 9 },
                  ],
                  [
                    { text: 'Ingredients:', bold: true, fontSize: 9, color: BRAND_COLORS.gray },
                    {
                      text: `${
                        formula.bases.length +
                        formula.additions.length +
                        (formula.userCustomizations?.addedBases?.length || 0) +
                        (formula.userCustomizations?.addedIndividuals?.length || 0)
                      }`,
                      fontSize: 9,
                    },
                  ],
                  [
                    { text: 'Daily Capsules:', bold: true, fontSize: 9, color: BRAND_COLORS.gray },
                    { text: `${dosage.total} capsules/day`, fontSize: 9 },
                  ],
                ],
              },
              layout: 'noBorders',
            },
          ],
        },
      ],
      margin: [0, 0, 0, 25],
    },

    {
      canvas: [
        {
          type: 'rect',
          x: 0,
          y: 0,
          w: 515,
          h: 60,
          r: 4,
          color: BRAND_COLORS.lightGray,
        },
      ],
      margin: [0, 0, 0, 0],
    },
    {
      stack: [
        {
          text: '💊  Daily Dosage Instructions',
          fontSize: 13,
          bold: true,
          color: BRAND_COLORS.dark,
          margin: [0, -50, 0, 8],
        },
        {
          text: `Take ${dosage.perMeal} capsules with each meal (morning, lunch, dinner)`,
          fontSize: 10,
          color: BRAND_COLORS.gray,
          margin: [0, 0, 0, 3],
        },
        {
          text: `Total: ${dosage.total} capsules per day`,
          fontSize: 10,
          bold: true,
          color: BRAND_COLORS.primary,
        },
      ],
      margin: [15, 0, 0, 25],
    },

    {
      text: 'Formula Ingredients',
      style: 'sectionHeader',
      fontSize: 16,
      bold: true,
      color: BRAND_COLORS.primary,
      margin: [0, 10, 0, 15],
    },
  ];

  if (formula.bases.length > 0) {
    content.push({
      text: `🧪  System Supports (${formula.bases.length})`,
      fontSize: 13,
      bold: true,
      color: BRAND_COLORS.dark,
      margin: [0, 0, 0, 10],
    });

    formula.bases.forEach((base, idx) => {
      const systemSupport = SYSTEM_SUPPORT_DETAILS.find(
        (f) => f.name === base.ingredient
      );

      const baseContent: Content[] = [
        {
          columns: [
            {
              width: '*',
              text: base.ingredient,
              bold: true,
              fontSize: 10,
              color: BRAND_COLORS.dark,
            },
            {
              width: 'auto',
              text: `${base.amount} ${base.unit}`,
              fontSize: 10,
              color: BRAND_COLORS.primary,
              bold: true,
            },
          ],
        },
      ];

      if (base.purpose) {
        baseContent.push({
          text: base.purpose,
          fontSize: 9,
          color: BRAND_COLORS.gray,
          italics: true,
          margin: [0, 3, 0, 0],
        });
      }

      if (systemSupport?.activeIngredients && systemSupport.activeIngredients.length > 0) {
        baseContent.push({
          text: 'Contains:',
          fontSize: 8,
          bold: true,
          color: BRAND_COLORS.gray,
          margin: [0, 6, 0, 3],
        });

        const ingredientsList = systemSupport.activeIngredients.map((ing) => {
          const ingName = typeof ing === 'string' ? ing : ing.name;
          const ingAmount = typeof ing === 'string' ? '' : ` (${ing.amount || 'various'})`;
          return `• ${ingName}${ingAmount}`;
        });

        baseContent.push({
          text: ingredientsList.join('\n'),
          fontSize: 8,
          color: BRAND_COLORS.gray,
          margin: [10, 0, 0, 0],
          lineHeight: 1.3,
        });
      }

      content.push({
        stack: baseContent,
        margin: [0, 0, 0, idx < formula.bases.length - 1 ? 15 : 0],
      });
    });

    content.push({ text: '', margin: [0, 0, 0, 20] });
  }

  if (formula.additions.length > 0) {
    content.push({
      text: `✨  Individual Ingredients (${formula.additions.length})`,
      fontSize: 13,
      bold: true,
      color: BRAND_COLORS.dark,
      margin: [0, 0, 0, 10],
    });

    formula.additions.forEach((addition, idx) => {
      const additionContent: Content[] = [
        {
          columns: [
            {
              width: '*',
              text: addition.ingredient,
              bold: true,
              fontSize: 10,
              color: BRAND_COLORS.dark,
            },
            {
              width: 'auto',
              text: `${addition.amount} ${addition.unit}`,
              fontSize: 10,
              color: BRAND_COLORS.primary,
              bold: true,
            },
          ],
        },
      ];

      if (addition.purpose) {
        additionContent.push({
          text: addition.purpose,
          fontSize: 9,
          color: BRAND_COLORS.gray,
          italics: true,
          margin: [0, 3, 0, 0],
        });
      }

      content.push({
        stack: additionContent,
        margin: [0, 0, 0, idx < formula.additions.length - 1 ? 12 : 0],
      });
    });

    content.push({ text: '', margin: [0, 0, 0, 20] });
  }

  const hasCustomizations =
    (formula.userCustomizations?.addedBases?.length || 0) > 0 ||
    (formula.userCustomizations?.addedIndividuals?.length || 0) > 0;

  if (hasCustomizations) {
    content.push({
      text: `👤  Your Customizations (${
        (formula.userCustomizations?.addedBases?.length || 0) +
        (formula.userCustomizations?.addedIndividuals?.length || 0)
      })`,
      fontSize: 13,
      bold: true,
      color: '#7E22CE',
      margin: [0, 0, 0, 10],
    });

    formula.userCustomizations?.addedBases?.forEach((base, idx) => {
      content.push({
        columns: [
          {
            width: '*',
            text: base.ingredient,
            bold: true,
            fontSize: 10,
            color: '#7E22CE',
          },
          {
            width: 'auto',
            text: `${base.amount}${base.unit}`,
            fontSize: 10,
            color: '#7E22CE',
            bold: true,
          },
        ],
        margin: [0, 0, 0, 12],
      });
    });

    formula.userCustomizations?.addedIndividuals?.forEach((ind, idx) => {
      content.push({
        columns: [
          {
            width: '*',
            text: ind.ingredient,
            bold: true,
            fontSize: 10,
            color: '#7E22CE',
          },
          {
            width: 'auto',
            text: `${ind.amount}${ind.unit}`,
            fontSize: 10,
            color: '#7E22CE',
            bold: true,
          },
        ],
        margin: [0, 0, 0, 12],
      });
    });

    content.push({ text: '', margin: [0, 0, 0, 20] });
  }

  if (formula.warnings && formula.warnings.length > 0) {
    content.push({
      canvas: [
        {
          type: 'rect',
          x: 0,
          y: 0,
          w: 515,
          h: 60,
          r: 4,
          color: '#FFF3E0',
        },
      ],
      margin: [0, 0, 0, 0],
    });

    content.push({
      stack: [
        {
          text: '⚠️  Important Warnings',
          fontSize: 12,
          bold: true,
          color: '#E65100',
          margin: [0, -20, 0, 8],
        },
        {
          ul: formula.warnings.map((warning) => ({
            text: warning,
            fontSize: 9,
            color: '#E65100',
          })),
          margin: [0, 0, 0, 0],
        },
      ],
      margin: [15, 0, 0, 25],
    });
  }

  content.push(
    { text: '', pageBreak: 'before' as const },

    {
      text: 'Medical Disclaimer',
      fontSize: 16,
      bold: true,
      color: BRAND_COLORS.primary,
      margin: [0, 0, 0, 15],
    },

    {
      canvas: [
        {
          type: 'rect',
          x: 0,
          y: 0,
          w: 515,
          h: 200,
          r: 4,
          color: '#FFF8E1',
        },
      ],
    },

    {
      stack: [
        {
          text: '⚕️  Professional Medical Advice Required',
          fontSize: 12,
          bold: true,
          color: '#F57C00',
          margin: [0, -15, 0, 10],
        },
        {
          text: [
            'This personalized formula is a supplement recommendation generated through AI analysis of your health profile. ',
            'It is ',
            { text: 'NOT', bold: true },
            ' a substitute for professional medical advice, diagnosis, or treatment.\n\n',
            'Before starting this or any supplement regimen, you ',
            { text: 'MUST', bold: true },
            ' consult with a qualified healthcare provider, especially if you:\n',
          ],
          fontSize: 9,
          color: '#5D4037',
          lineHeight: 1.4,
          margin: [0, 0, 0, 8],
        },
        {
          ul: [
            'Have any medical conditions or chronic health issues',
            'Are currently taking prescription medications',
            'Are pregnant, nursing, or planning to become pregnant',
            'Have allergies to any ingredients',
            'Are under 18 years of age or over 65',
            'Are scheduled for surgery within the next 2 weeks',
          ],
          fontSize: 9,
          color: '#5D4037',
          lineHeight: 1.4,
          margin: [0, 0, 0, 10],
        },
        {
          text: [
            'By using this formula, you acknowledge that ONES provides educational and informational services only. ',
            'The effectiveness and safety of supplements can vary based on individual health conditions, medications, and biochemistry. ',
            'Always inform your healthcare provider about all supplements you are taking.\n\n',
            { text: 'Quality Assurance: ', bold: true },
            'All ingredients in ONES formulas are third-party tested for purity and potency. However, dietary supplements are not FDA-approved to diagnose, treat, cure, or prevent any disease.',
          ],
          fontSize: 8,
          color: '#5D4037',
          lineHeight: 1.4,
        },
      ],
      margin: [15, 0, 15, 15],
    },

    {
      text: 'Important Safety Information',
      fontSize: 14,
      bold: true,
      color: BRAND_COLORS.primary,
      margin: [0, 25, 0, 12],
    },

    {
      stack: [
        {
          text: 'Storage & Handling',
          fontSize: 11,
          bold: true,
          color: BRAND_COLORS.dark,
          margin: [0, 0, 0, 6],
        },
        {
          ul: [
            'Store in a cool, dry place away from direct sunlight',
            'Keep bottle tightly closed when not in use',
            'Keep out of reach of children and pets',
            'Do not use if safety seal is broken or missing',
            'Check expiration date before use',
          ],
          fontSize: 9,
          color: BRAND_COLORS.gray,
          lineHeight: 1.3,
          margin: [0, 0, 0, 15],
        },
        {
          text: 'When to Contact Your Healthcare Provider',
          fontSize: 11,
          bold: true,
          color: BRAND_COLORS.dark,
          margin: [0, 0, 0, 6],
        },
        {
          ul: [
            'If you experience any adverse reactions or side effects',
            'Before changing the dosage or stopping the supplement',
            'If your health condition changes',
            'If you start new medications',
            'For questions about interactions with other supplements or medications',
          ],
          fontSize: 9,
          color: BRAND_COLORS.gray,
          lineHeight: 1.3,
        },
      ],
    }
  );

  content.push(
    { text: '', margin: [0, 0, 0, 30] },

    {
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 515,
          y2: 0,
          lineWidth: 1,
          lineColor: BRAND_COLORS.accent,
        },
      ],
      margin: [0, 0, 0, 15],
    },

    {
      columns: [
        {
          width: '*',
          stack: [
            {
              text: 'ONES',
              fontSize: 10,
              bold: true,
              color: BRAND_COLORS.primary,
            },
            {
              text: 'Personalized AI Supplement Platform',
              fontSize: 8,
              color: BRAND_COLORS.gray,
              margin: [0, 2, 0, 0],
            },
          ],
        },
        {
          width: 'auto',
          text: 'myones.ai',
          fontSize: 8,
          color: BRAND_COLORS.gray,
          alignment: 'right',
        },
      ],
    }
  );

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'LETTER',
    pageMargins: [40, 50, 40, 50],
    content,
    defaultStyle: {
      fontSize: 10,
    },
    styles: {
      logo: {
        fontSize: 32,
        bold: true,
      },
      tagline: {
        fontSize: 10,
      },
      versionBadge: {
        fontSize: 11,
        bold: true,
      },
      date: {
        fontSize: 9,
      },
      formulaTitle: {
        fontSize: 20,
        bold: true,
      },
      customBadge: {
        fontSize: 10,
        bold: true,
      },
      sectionHeader: {
        fontSize: 16,
        bold: true,
      },
    },
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        {
          text: `Page ${currentPage} of ${pageCount}`,
          alignment: 'center',
          fontSize: 8,
          color: BRAND_COLORS.gray,
        },
      ],
      margin: [40, 20],
    }),
  };

  return docDefinition;
}

function calculateDosage(totalMg: number): {
  perMeal: number;
  total: number;
  display: string;
} {
  const capsPerMeal = Math.ceil(totalMg / 550 / 3);
  const total = capsPerMeal * 3;

  return {
    perMeal: capsPerMeal,
    total,
    display: `${capsPerMeal} caps × 3 meals`,
  };
}
