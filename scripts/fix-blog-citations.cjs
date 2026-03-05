/**
 * Fix citation errors and add verified PubMed references to seed blog articles.
 *
 * Corrections made (all verified by opening actual PubMed pages):
 *   1. ashwagandha article: Journal for Chandrasekhar 2012 was "Medicine" → correct is
 *      "Indian Journal of Psychological Medicine" (PMID: 23439798)
 *   2. ashwagandha article: Journal for Langade sleep study was "PLOS One" → correct is
 *      "Cureus" (PMID: 31728244)
 *   3. vitamin-d3-k2 article: Rotterdam Study outcome was "cardiovascular mortality" →
 *      correct is "all-cause mortality" (57% reduction was CHD mortality) (PMID: 15514282)
 *
 * Verified PMIDs used in References sections:
 *   Ashwagandha:
 *     23439798 — Chandrasekhar et al. 2012, Indian J Psychol Med (stress/cortisol)
 *     26609282 — Wankhede et al. 2015, J Int Soc Sports Nutr (muscle strength)
 *     31728244 — Langade et al. 2019, Cureus (insomnia/sleep)
 *   Vitamin D3 + K2:
 *     15514282 — Geleijnse et al. 2004, J Nutr (Rotterdam Study, K2 + cardiovascular)
 *   Omega-3:
 *     30415628 — Bhatt et al. 2018, N Engl J Med (REDUCE-IT trial, EPA cardiovascular)
 *   CoQ10:
 *     25282031 — Mortensen et al. 2014, JACC Heart Fail (Q-SYMBIO trial)
 *
 * Unverified citations (journal/year given in articles but no PMID confirmed):
 *   - Lopresti 2019 testosterone trial
 *   - 2015 Fertility & Sterility ashwagandha testosterone (Ambiye et al.)
 *   - Pratte 2021 meta-analysis ashwagandha
 *   - Hemingway 2022 magnesium L-threonate
 *   - Multiple thyroid, liver, adrenal citations
 *   These are flagged with "(citation pending verification)" in the References sections.
 */

require('dotenv').config({ path: 'server/.env' });
const { Client } = require('pg');

async function getClient() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  return client;
}

// ─── Verified References blocks ──────────────────────────────────────────────

const ASHWAGANDHA_REFS = `

---

## References

1. Chandrasekhar K, Kapoor J, Anishetty S. "A prospective, randomized double-blind, placebo-controlled study of safety and efficacy of a high-concentration full-spectrum extract of ashwagandha root in reducing stress and anxiety in adults." *Indian Journal of Psychological Medicine.* 2012 Jul;34(3):255–62. [PMID: 23439798](https://pubmed.ncbi.nlm.nih.gov/23439798/)

2. Wankhede S, Langade D, Joshi K, Sinha SR, Bhattacharyya S. "Examining the effect of Withania somnifera supplementation on muscle strength and recovery: a randomized controlled trial." *Journal of the International Society of Sports Nutrition.* 2015 Nov 25;12:43. [PMID: 26609282](https://pubmed.ncbi.nlm.nih.gov/26609282/)

3. Langade D, Kanchi S, Salve J, Debnath K, Ambegaokar D. "Efficacy and Safety of Ashwagandha (Withania somnifera) Root Extract in Insomnia and Anxiety: A Double-blind, Randomized, Placebo-controlled Study." *Cureus.* 2019 Sep 28;11(9):e5797. [PMID: 31728244](https://pubmed.ncbi.nlm.nih.gov/31728244/)

4. Lopresti AL, Drummond PD, Smith SJ. "A Randomized, Double-Blind, Placebo-Controlled, Crossover Study Examining the Hormonal and Vitality Effects of Ashwagandha in Aging, Overweight Males." *American Journal of Men's Health.* 2019 Mar–Apr;13(2). *(citation pending full PMID verification)*

5. Ambiye VR et al. "Clinical Evaluation of the Spermatogenic Activity of the Root Extract of Ashwagandha in Oligospermic Males: A Pilot Study." *Evidence-Based Complementary and Alternative Medicine.* 2013. *(citation pending full PMID verification — Fertility & Sterility reference in article requires further review)*

6. Pratte MA et al. "An alternative treatment for anxiety: a systematic review of human trial results reported for the Ayurvedic herb ashwagandha (Withania somnifera)." *Journal of Alternative and Complementary Medicine.* *(meta-analysis figure; citation pending full verification)*

*Note: All doses and outcomes stated in this article reflect the specific trials cited. Individual responses vary. This is not medical advice.*`;

const VIT_D3_K2_REFS = `

---

## References

1. Geleijnse JM, Vermeer C, Grobbee DE, Schurgers LJ, Knapen MH, van der Meer IM, Hofman A, Witteman JC. "Dietary intake of menaquinone is associated with a reduced risk of coronary heart disease: the Rotterdam Study." *Journal of Nutrition.* 2004 Nov;134(11):3100–5. [PMID: 15514282](https://pubmed.ncbi.nlm.nih.gov/15514282/)
   → *Note: This population study (n=4,807) found high dietary K2 intake associated with 57% reduction in CHD mortality (RR=0.43) and 52% reduction in severe aortic calcification (OR=0.48), and 26% reduction in all-cause mortality (RR=0.74), compared to the lowest intake tertile.*

2. Holick MF. "Vitamin D deficiency." *New England Journal of Medicine.* 2007;357:266–281. *(referenced for deficiency prevalence statistics; citation pending full PMID confirmation)*

3. Theuwissen E, Smit E, Vermeer C. "The role of vitamin K in soft-tissue calcification." *Advances in Nutrition.* 2012;3(2):166–73. *(referenced for MGP mechanism; citation pending full PMID confirmation)*

*Note: All doses and outcomes stated in this article reflect the specific trials or observational studies cited. Individual responses vary. This is not medical advice.*`;

const OMEGA3_REFS = `

---

## References

1. Bhatt DL, Steg PG, Miller M, et al. (REDUCE-IT Investigators). "Cardiovascular Risk Reduction with Icosapent Ethyl for Hypertriglyceridemia." *New England Journal of Medicine.* 2019 Jan 3;380(1):11–22. [PMID: 30415628](https://pubmed.ncbi.nlm.nih.gov/30415628/)
   → *8,179 patients on statins with elevated triglycerides. EPA 4g/day (icosapent ethyl) vs. placebo. Primary endpoint occurred in 17.2% vs. 22.0% (HR 0.75; 25% relative risk reduction, p<0.001) over median 4.9 years.*

2. Omega-3 fatty acids and cardiovascular outcomes — AHA advisory and supporting meta-analyses. *(General omega-3 triglyceride data well-established; specific meta-analysis citations for 25–30% triglyceride reduction and depression outcomes pending individual PMID verification)*

3. Sublette ME et al. "Meta-analysis of the effects of eicosapentaenoic acid (EPA) in clinical trials in depression." *Journal of Clinical Psychiatry.* 2011;72(12):1577–84. *(referenced for EPA and depression; citation pending full PMID confirmation)*

*Note: The REDUCE-IT trial used a pharmaceutical-grade preparation of pure EPA (icosapent ethyl), not standard fish oil. Results may not fully generalize to over-the-counter omega-3 supplements. This is not medical advice.*`;

const COQ10_REFS = `

---

## References

1. Mortensen SA, Rosenfeldt F, Kumar A, et al. (Q-SYMBIO Study Investigators). "The Effect of Coenzyme Q10 on Morbidity and Mortality in Chronic Heart Failure: Results From Q-SYMBIO — A Randomized Double-Blind Trial." *JACC Heart Failure.* 2014 Dec;2(6):641–9. [PMID: 25282031](https://pubmed.ncbi.nlm.nih.gov/25282031/)
   → *420 patients with moderate-to-severe heart failure. CoQ10 100mg 3× daily (300mg/day total) vs. placebo for 2 years. Primary long-term endpoint reached by 15% (CoQ10) vs. 26% (placebo), HR 0.50, p=0.003. Cardiovascular mortality: 9% vs. 16%, p=0.026.*

2. Statin-induced CoQ10 depletion via mevalonate pathway — mechanistic reviews available; specific meta-analysis on myopathy reduction pending individual PMID verification.

3. Blood pressure meta-analysis, CoQ10. *(2019 meta-analysis referenced for BP reduction; specific PMID pending full verification)*

4. CoQ10 and athletic performance. *(2020 RCT referenced; specific PMID pending full verification)*

*Note: All efficacy data stated reflects specific trials cited. CoQ10 is not a substitute for guideline-directed medical therapy in heart failure. This is not medical advice.*`;

// ─── Article corrections ──────────────────────────────────────────────────────

const FIXES = [
  {
    slug: 'ashwagandha-benefits-dosage-evidence',
    bodyReplacements: [
      {
        // Correct journal name: "Medicine" → "Indian Journal of Psychological Medicine"
        from: 'published in *Medicine* (Chandrasekhar et al., 2012)',
        to: 'published in the *Indian Journal of Psychological Medicine* (Chandrasekhar et al., 2012) [1]',
      },
      {
        // Add inline citation to cortisol stats
        from: '- Serum cortisol reduced by **27.9%** vs placebo\n- Perceived Stress Scale scores improved by **44%**\n- Self-reported anxiety reduced by **69.7%**',
        to: '- Serum cortisol reduced by **27.9%** vs placebo [1]\n- Perceived Stress Scale scores improved by **44%** [1]\n- Self-reported anxiety reduced by **69.7%** vs placebo [1]',
      },
      {
        // Add citation to Journal of International Society of Sports Nutrition study
        from: 'A 2015 RCT (*Journal of the International Society of Sports Nutrition*) gave resistance-trained men 600 mg KSM-66 or placebo for 8 weeks.',
        to: 'A 2015 RCT in the *Journal of the International Society of Sports Nutrition* (Wankhede et al.) [2] gave resistance-trained men 300 mg KSM-66 extract twice daily (600 mg/day) or placebo for 8 weeks.',
      },
      {
        // Correct sleep study journal: "PLOS One" → "Cureus"
        from: 'A 2019 study in *PLOS One* found 600 mg/day KSM-66 significantly improved sleep onset latency, total sleep time, and sleep efficiency in adults with insomnia.',
        to: 'A 2019 double-blind RCT published in *Cureus* (Langade et al.) [3] found 300 mg KSM-66 root extract twice daily (600 mg/day) significantly improved sleep onset latency, total sleep time, and sleep efficiency in patients with insomnia and anxiety over 10 weeks.',
      },
    ],
    referencesBlock: ASHWAGANDHA_REFS,
  },
  {
    slug: 'vitamin-d3-k2-optimal-levels-dosage',
    bodyReplacements: [
      {
        // Fix Rotterdam outcome: "cardiovascular mortality" → "all-cause mortality"
        // The 26% figure is all-cause mortality; CHD mortality was 57%
        from: 'The Rotterdam Study (13,000+ participants) found high dietary K2 intake was associated with a **57% reduction** in aortic calcification and **26% reduction** in cardiovascular mortality.',
        to: 'The Rotterdam Study (Geleijnse et al., 2004) [1] followed 4,807 participants and found high dietary K2 intake was associated with a **57% reduction** in CHD mortality and **52% reduction** in severe aortic calcification.',
      },
      {
        from: 'Men with the highest K2 intake had **52% lower** risk of severe aortic calcification vs those with lowest intake.',
        to: 'The highest K2 intake tertile also showed a **26% reduction in all-cause mortality** compared to the lowest tertile (RR=0.74).',
      },
    ],
    referencesBlock: VIT_D3_K2_REFS,
  },
  {
    slug: 'omega-3-fish-oil-benefits-epa-dha-ratio',
    bodyReplacements: [
      {
        from: '**The REDUCE-IT trial (8,000 patients)** found high-dose EPA (**4g/day Vascepa**) reduced major cardiovascular events by **25% vs placebo** in high-risk patients',
        to: '**The REDUCE-IT trial** (Bhatt et al., 2019) [1] enrolled 8,179 patients on statins with elevated triglycerides; high-dose EPA (**4g/day icosapent ethyl**) reduced major cardiovascular events by **25% relative risk vs placebo** (17.2% vs 22.0%, HR 0.75, p<0.001) over a median 4.9-year follow-up',
      },
    ],
    referencesBlock: OMEGA3_REFS,
  },
  {
    slug: 'coq10-ubiquinol-benefits-dosage-heart-energy',
    bodyReplacements: [
      {
        from: '**Heart failure**: A landmark 2014 study (Q-SYMBIO trial) found 300 mg/day CoQ10 reduced major adverse cardiovascular events by 43% and cardiovascular mortality by 42% vs placebo in heart failure patients over 2 years.',
        to: '**Heart failure**: The 2014 Q-SYMBIO trial (Mortensen et al.) [1] enrolled 420 patients with chronic heart failure receiving CoQ10 100 mg three times daily (300 mg/day total) or placebo for 2 years. The CoQ10 group had significantly fewer major adverse cardiovascular events (15% vs 26%, HR 0.50, p=0.003) and lower cardiovascular mortality (9% vs 16%, p=0.026).',
      },
    ],
    referencesBlock: COQ10_REFS,
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const client = await getClient();
  let updated = 0;
  let errors = 0;

  console.log('\n📚 Fixing citation errors and adding verified References sections...\n');

  for (const fix of FIXES) {
    try {
      // Fetch the current content
      const { rows } = await client.query(
        'SELECT id, content FROM blog_posts WHERE slug = $1',
        [fix.slug]
      );

      if (!rows.length) {
        console.log(`  ⚠️  Not found: ${fix.slug}`);
        errors++;
        continue;
      }

      let content = rows[0].content;
      const originalContent = content;

      // Apply body text corrections
      for (const { from, to } of fix.bodyReplacements) {
        if (content.includes(from)) {
          content = content.split(from).join(to);
          console.log(`  ✏️  [${fix.slug}] Replaced: "${from.substring(0, 60)}..."`);
        } else {
          console.log(`  ⚠️  [${fix.slug}] String NOT found (may already be fixed): "${from.substring(0, 60)}..."`);
        }
      }

      // Remove any existing References section before appending fresh one
      const existingRefsIdx = content.indexOf('\n---\n\n## References');
      if (existingRefsIdx !== -1) {
        content = content.substring(0, existingRefsIdx);
        console.log(`  🗑️  [${fix.slug}] Removed existing References section`);
      }

      // Find the ARTICLE_DISCLAIMER separator and insert references before it
      const disclaimerSeparator = '\n\n---\n\n*This article is for informational';
      const disclaimerIdx = content.indexOf(disclaimerSeparator);
      if (disclaimerIdx !== -1) {
        content = content.substring(0, disclaimerIdx) + fix.referencesBlock + content.substring(disclaimerIdx);
      } else {
        // No disclaimer found — append at end
        content = content.trimEnd() + fix.referencesBlock;
      }

      if (content === originalContent) {
        console.log(`  ℹ️  [${fix.slug}] No changes made.`);
        continue;
      }

      // Update the DB
      await client.query(
        'UPDATE blog_posts SET content = $1, updated_at = NOW() WHERE slug = $2',
        [content, fix.slug]
      );

      const wordCount = Math.round(content.split(/\s+/).length);
      await client.query(
        'UPDATE blog_posts SET word_count = $1, read_time_minutes = $2 WHERE slug = $3',
        [wordCount, Math.ceil(wordCount / 250), fix.slug]
      );

      console.log(`  ✅ Updated: ${fix.slug}`);
      updated++;
    } catch (err) {
      console.error(`  ❌ Error on ${fix.slug}:`, err.message);
      errors++;
    }
  }

  await client.end();

  console.log(`\n═══════════════════════════════════════`);
  console.log(`✅ Updated: ${updated}/${FIXES.length} articles`);
  if (errors > 0) console.log(`❌ Errors:  ${errors}`);
  console.log(`\nVerified PubMed links added:`);
  console.log(`  PMID 23439798 — Chandrasekhar 2012, Indian J Psychol Med (ashwagandha/stress)`);
  console.log(`  PMID 26609282 — Wankhede 2015, J Int Soc Sports Nutr (ashwagandha/muscle)`);
  console.log(`  PMID 31728244 — Langade 2019, Cureus (ashwagandha/insomnia)`);
  console.log(`  PMID 15514282 — Geleijnse 2004, J Nutr (Rotterdam Study, K2/cardiovascular)`);
  console.log(`  PMID 30415628 — Bhatt 2018, N Engl J Med (REDUCE-IT, EPA/cardiovascular)`);
  console.log(`  PMID 25282031 — Mortensen 2014, JACC Heart Fail (Q-SYMBIO, CoQ10/HF)`);
  console.log(`\nPending verification (cited as "citation pending" in References sections):`);
  console.log(`  Lopresti 2019 ashwagandha testosterone`);
  console.log(`  Ambiye/Fertility & Sterility 2015 ashwagandha sperm`);
  console.log(`  Pratte meta-analysis ashwagandha`);
  console.log(`  Magnesium, thyroid, liver, adrenal study citations`);
  console.log(`═══════════════════════════════════════\n`);
}

main().catch(console.error);
