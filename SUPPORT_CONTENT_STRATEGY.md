# Support Content Strategy for ONES AI

## Overview
This document outlines the strategy for creating, managing, and maintaining help articles and FAQs in the ONES AI support system.

---

## Current Support System Architecture

### Database Schema
- **Help Articles Table** (`help_articles`)
  - `id` - Unique identifier
  - `category` - Article category (Getting Started, Formula & Health, etc.)
  - `title` - Article title
  - `content` - Full article content (markdown/text)
  - `displayOrder` - Order within category
  - `viewCount` - Track article popularity
  - `isPublished` - Visibility toggle
  - `createdAt`, `updatedAt` - Timestamps

- **FAQ Items Table** (`faq_items`)
  - `id` - Unique identifier
  - `category` - FAQ category
  - `question` - Question text
  - `answer` - Answer text
  - `displayOrder` - Display order
  - `createdAt`, `updatedAt` - Timestamps

### Content Categories
1. **Getting Started** - Onboarding, account setup, profile creation
2. **Formula & Health** - Understanding formulas, ingredients, dosing
3. **Billing & Subscription** - Payments, subscription management, refunds
4. **Technical Support** - Troubleshooting, browser issues, uploads

---

## Content Creation Workflow

### 1. Identifying Content Needs

**Data Sources:**
- Support ticket patterns (track frequent issues via `/api/support/tickets`)
- User feedback from AI consultations
- Missing documentation gaps
- Product updates requiring documentation

**Analytics to Monitor:**
- Most viewed articles (`viewCount` field)
- Search queries with no results
- Tickets that could be prevented by documentation
- User drop-off points in onboarding

### 2. Article Creation Process

**Step 1: Research & Planning**
- Review 5-10 similar support tickets
- Identify common pain points
- Note specific user language/terminology
- List all edge cases to cover

**Step 2: Writing Guidelines**

**Structure:**
```
# Title (Clear, action-oriented)

Brief intro explaining what this article covers (1-2 sentences)

## SECTION 1: [KEY CONCEPT]
Clear explanation with examples

## SECTION 2: [STEP-BY-STEP]
1. First step
2. Second step
3. etc.

## COMMON ISSUES
- Problem: Solution
- Problem: Solution

## NEED HELP?
Contact support@ones.ai if [specific scenario]
```

**Writing Style:**
- Use second person ("you", "your")
- Short paragraphs (2-3 sentences max)
- Action-oriented language
- Include examples from real scenarios
- Use bullet points for lists
- Bold important warnings or notes

**Length Guidelines:**
- Quick reference: 200-400 words
- How-to guide: 400-800 words
- Comprehensive guide: 800-1500 words

### 3. Content Review Checklist

Before publishing, verify:
- [ ] Tested all steps in article
- [ ] Includes screenshots (if visual process)
- [ ] Links to related articles work
- [ ] No medical/legal claims without disclaimers
- [ ] Follows brand voice
- [ ] Technical terms explained
- [ ] Mobile-friendly formatting
- [ ] Search keywords included naturally

---

## FAQ Creation Strategy

### FAQ vs Help Article Decision Tree

**Create a FAQ if:**
- Answer is < 150 words
- Question is asked frequently (5+ tickets/month)
- Answer is straightforward, no complex steps
- Commonly searched term

**Create a Help Article if:**
- Requires multiple steps
- Needs visual aids
- Complex topic requiring explanation
- Relates to a major feature

### FAQ Writing Format

```typescript
{
  category: 'Category Name',
  question: 'Clear, natural question as users ask it?',
  answer: 'Concise answer (2-4 sentences). Include link to full article if needed. Example: "For detailed steps, see our [Formula Creation Guide](/support?article=123)"',
  displayOrder: 1
}
```

**FAQ Best Practices:**
- Questions should match user language (not internal terms)
- Front-load the answer (key info first)
- Link to detailed articles for "learn more"
- Update answers when product changes
- Keep answers scannable (use bold for key points)

---

## Content Management Scripts

### Adding New Articles

**File:** `server/seed-support-api.ts` or create new seed files

```typescript
const newArticle = {
  category: 'Getting Started', // or Formula & Health, etc.
  title: 'How to Update Your Health Profile',
  content: `Your full markdown content here...`,
  displayOrder: 5, // Where it appears in category
  isPublished: true
};

// Add to helpArticlesData array, then run:
// npx tsx server/seed-support-api.ts
```

### Batch Update Process

```bash
# 1. Edit seed file with new content
# 2. Run seed script to update database
npx tsx server/seed-support-api.ts

# 3. Verify in UI
# Navigate to /dashboard/support and check new content
```

### Admin Interface (Future Enhancement)

**Recommended additions:**
```typescript
// Admin route for content management
app.post('/api/admin/help-articles', requireAdmin, async (req, res) => {
  const { category, title, content, displayOrder } = req.body;
  const article = await storage.createHelpArticle({
    category,
    title,
    content,
    displayOrder,
    isPublished: true
  });
  res.json({ article });
});

app.patch('/api/admin/help-articles/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const article = await storage.updateHelpArticle(id, updates);
  res.json({ article });
});
```

---

## Content Templates

### Template 1: Getting Started Guide
```markdown
# [Feature Name]: Getting Started

Welcome! This guide will help you [achieve goal] in just a few minutes.

## WHAT YOU'LL NEED
- [Prerequisite 1]
- [Prerequisite 2]

## STEP-BY-STEP INSTRUCTIONS

### Step 1: [Action]
[Clear instruction with expected outcome]

### Step 2: [Action]
[Clear instruction with expected outcome]

## COMMON QUESTIONS

**Q: [Question]?**
A: [Answer]

## TROUBLESHOOTING
- **Issue:** [Problem]  
  **Solution:** [Fix]

## NEXT STEPS
Now that you've [completed task], you can:
- [Related action 1]
- [Related action 2]

Need help? Contact support@ones.ai
```

### Template 2: Troubleshooting Guide
```markdown
# Fixing [Problem]

Having trouble with [feature]? Here are solutions to common issues.

## QUICK FIXES (TRY THESE FIRST)
1. [Simple fix 1]
2. [Simple fix 2]
3. [Simple fix 3]

## DETAILED SOLUTIONS

### Problem: [Specific Issue]
**Symptoms:**
- [What user sees]

**Solution:**
1. [Step to fix]
2. [Step to fix]

**Why this works:**
[Brief explanation]

### Problem: [Another Issue]
[Same structure]

## STILL NOT WORKING?
If you've tried these solutions and still experiencing issues:
1. Note the error message (screenshot if possible)
2. Contact support@ones.ai with:
   - Description of issue
   - Steps you've tried
   - Browser/device info

We typically respond within 24 hours.
```

### Template 3: Feature Explanation
```markdown
# Understanding [Feature Name]

[Feature] helps you [core benefit]. This guide explains how it works and how to get the most out of it.

## HOW IT WORKS
[2-3 paragraph explanation in simple terms]

## KEY BENEFITS
- **[Benefit 1]:** [Why it matters]
- **[Benefit 2]:** [Why it matters]
- **[Benefit 3]:** [Why it matters]

## USING [FEATURE]

### Basic Usage
[Step-by-step for common use case]

### Advanced Options
[Optional advanced features]

## BEST PRACTICES
- [Tip 1]
- [Tip 2]
- [Tip 3]

## EXAMPLES
**Scenario:** [User situation]
**How to use [Feature]:** [Application]

## RELATED ARTICLES
- [Link to related topic 1]
- [Link to related topic 2]
```

---

## Content Maintenance Schedule

### Monthly Tasks
- Review top 10 most-viewed articles for accuracy
- Check for outdated screenshots/instructions
- Update any articles affected by product changes
- Review support tickets to identify new article needs

### Quarterly Tasks
- Analyze search terms with zero results
- Survey support team for content gaps
- Review all articles in one category for consistency
- Update FAQ answers based on product evolution

### Annual Tasks
- Complete content audit of all articles
- Reorganize categories if needed
- Archive outdated content
- Refresh writing style for brand consistency

---

## Analytics & Optimization

### Key Metrics to Track

**Article Performance:**
```sql
-- Most viewed articles
SELECT title, category, view_count 
FROM help_articles 
ORDER BY view_count DESC 
LIMIT 10;

-- Low-performing articles (may need improvement)
SELECT title, category, view_count 
FROM help_articles 
WHERE view_count < 10 
AND created_at < NOW() - INTERVAL '30 days';
```

**Support Ticket Deflection:**
- Track tickets with "I read article X but..." comments
- Measure ticket volume before/after new articles
- Identify topics with high ticket:article ratio

### User Feedback Integration

**Add to help articles:**
```tsx
// At bottom of each article
<div className="mt-8 p-4 border rounded-lg">
  <p className="font-medium mb-2">Was this article helpful?</p>
  <div className="flex gap-2">
    <Button onClick={() => trackFeedback(articleId, 'helpful')}>
      👍 Yes
    </Button>
    <Button onClick={() => trackFeedback(articleId, 'not-helpful')}>
      👎 No
    </Button>
  </div>
</div>
```

---

## Priority Article Topics (Recommended)

### High Priority (Create First)
1. **"What's in my formula and why?"**
   - Breakdown of base formulas vs additions
   - How AI selects ingredients
   - Reading your formula PDF

2. **"How to interpret my lab results"**
   - What biomarkers mean
   - Normal ranges explained
   - How labs influence formula

3. **"Updating my formula after new labs"**
   - When to request updates
   - What to tell the AI
   - Version history explained

4. **"Subscription management guide"**
   - Changing delivery frequency
   - Pausing subscription
   - Cancellation policy

5. **"Taking your supplements correctly"**
   - Best time of day
   - With/without food
   - Storage tips

### Medium Priority
6. **"Understanding ingredient dosages"**
7. **"How AI consultation works"**
8. **"Privacy and data security"**
9. **"Shipping and delivery FAQ"**
10. **"Wearable device integration"**

### Future Expansion
11. **"Optimize feature explained"** (nutrition/workout plans)
12. **"Blood work recommendations"**
13. **"Ingredient interactions guide"**
14. **"Travel with supplements"**
15. **"Formula cost breakdown"**

---

## SEO Optimization

### Article Titles
- Include primary keyword naturally
- Keep under 60 characters
- Make it benefit-oriented
- Examples:
  - ❌ "Formula Information"
  - ✅ "Understanding Your Personalized Supplement Formula"

### Content Keywords
Include naturally throughout:
- Primary: supplement formula, personalized supplements, AI health
- Secondary: biomarkers, blood work, ingredient dosage
- Long-tail: "how to read supplement formula", "AI supplement recommendations"

### Meta Descriptions (if implementing)
- 155-160 characters
- Include primary keyword
- Call to action
- Example: "Learn how ONES AI creates your personalized supplement formula based on lab results, health goals, and lifestyle. Get started today."

---

## Quality Assurance Process

### Pre-Publication Checklist
1. **Accuracy**
   - Medical facts verified
   - Product info current
   - Links functional
   - Code examples tested

2. **Clarity**
   - No jargon without explanation
   - Logical flow
   - Adequate examples
   - Clear headings

3. **Completeness**
   - All edge cases covered
   - Troubleshooting included
   - Related articles linked
   - Contact info provided

4. **Consistency**
   - Matches brand voice
   - Follows template structure
   - Terminology consistent
   - Formatting uniform

### Post-Publication Review
- Check article displays correctly on mobile
- Test all links
- Monitor feedback for first 7 days
- Update if confusion reported

---

## Integration with AI Assistant

### Auto-Suggest Articles in Chat
```typescript
// In AI consultation, detect help topics
if (userMessage.includes('how to change') || userMessage.includes('update formula')) {
  suggestArticle('updating-your-formula');
}

// Provide article links in AI responses
"I can help with that! For detailed steps, check out our guide: 
[How to Update Your Formula](/support?article=update-formula)"
```

### Article Recommendations
```typescript
// After formula creation
showArticle('understanding-your-formula');

// After lab upload
showArticle('interpreting-lab-results');

// On first login
showArticle('getting-started-guide');
```

---

## Content Governance

### Review Cycle
- **Owner:** Support Team Lead
- **Contributors:** Product, Clinical, Support
- **Review Frequency:** Monthly for popular articles
- **Update Process:** GitHub PR → Review → Seed script → Deploy

### Version Control
```bash
# Keep article history in git
git commit -m "Update: Formula Creation Guide - Add new screenshot for v2.0 UI"

# Tag major content updates
git tag -a content-update-2024-11 -m "November content refresh"
```

### Approval Process
1. Draft article in Google Doc
2. Clinical review (if health-related)
3. Support team test
4. Add to seed file
5. Deploy to staging
6. Final QA
7. Production deployment

---

## Tools & Resources

### Writing Tools
- **Grammarly** - Grammar and clarity
- **Hemingway App** - Readability scoring
- **Markdown Editor** - Preview formatting

### Screenshot Tools
- **CleanShot** (Mac) - Annotated screenshots
- **ShareX** (Windows) - Screen capture
- **CloudApp** - GIF creation for processes

### Analytics Tools
```typescript
// Track article views
app.post('/api/support/articles/:id/view', async (req, res) => {
  await storage.incrementHelpArticleViewCount(req.params.id);
  res.json({ success: true });
});

// Track search queries
app.post('/api/support/search-log', async (req, res) => {
  const { query, resultsCount } = req.body;
  // Log for analysis
  await logSearch(query, resultsCount);
});
```

---

## Success Metrics

### Target KPIs
- **Article Coverage:** 80%+ of support tickets have related article
- **Self-Service Rate:** 40%+ of users find answers without ticket
- **Article Satisfaction:** 75%+ "helpful" ratings
- **Search Success:** 90%+ searches return relevant results
- **Update Frequency:** All articles reviewed quarterly

### Monthly Report Template
```markdown
## Support Content Report - [Month Year]

**New Content:**
- Articles published: X
- FAQs added: Y
- Categories updated: Z

**Performance:**
- Total article views: X,XXX
- Top 5 articles: [list with view counts]
- Search success rate: XX%
- Ticket deflection rate: XX%

**User Feedback:**
- Helpful ratings: XX%
- Not helpful: XX%
- Top improvement requests: [list]

**Action Items:**
- [Update article X based on feedback]
- [Create new article on Y topic]
- [Reorganize Z category]
```

---

## Quick Reference: Adding Content

### 1. Add Help Article
```bash
# Edit server/seed-support-api.ts
# Add to helpArticlesData array:
{
  category: 'Getting Started',
  title: 'Your Article Title',
  content: `Your markdown content...`,
  displayOrder: 1,
  isPublished: true
}

# Run seed script
npx tsx server/seed-support-api.ts
```

### 2. Add FAQ
```bash
# Edit server/seed-support-api.ts
# Add to faqData array:
{
  category: 'Technical Support',
  question: 'Your question?',
  answer: 'Your answer...',
  displayOrder: 1
}

# Run seed script
npx tsx server/seed-support-api.ts
```

### 3. Update Existing Content
```bash
# Update in seed file
# Re-run seed script (it clears and recreates)
# Or use update API endpoint (if implemented)
```

---

## Next Steps

### Immediate Actions (Week 1)
1. Create 5 high-priority articles from list above
2. Set up analytics tracking for article views
3. Add helpful/not helpful buttons to articles
4. Document support ticket → article mapping

### Short-term (Month 1)
1. Build admin interface for content management
2. Implement search query logging
3. Create article suggestion system in AI chat
4. Launch monthly content review process

### Long-term (Quarter 1)
1. Video tutorials for complex processes
2. Interactive troubleshooting wizard
3. Community-contributed tips section
4. Multi-language support planning

---

## Contact & Governance

**Content Owner:** [Support Team Lead]
**Clinical Review:** [Medical Advisor]
**Technical Review:** [Engineering Lead]

**Questions or suggestions?**
- Email: support@ones.ai
- Slack: #support-content
- Documentation: This file

---

*Last Updated: November 2024*
*Next Review: December 2024*
