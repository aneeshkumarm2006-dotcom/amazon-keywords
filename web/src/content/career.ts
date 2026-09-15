import { docRefs } from "@/components/doc/data";
import type { DocResource, ResourceRef } from "@/types/content";

/**
 * Career resources.
 *
 * Ported from `../ppc-tools-for-va/career/*.md`. Salary bands, timelines and
 * rate tables are the source's 2026 figures for Philippine-based VAs and
 * remote international employers.
 */

const UPDATED = "2026-06-29";

export const careerGuides: DocResource[] = [
  /* ---------------------------------------------------------------- 01 */
  {
    id: "va-to-ppc-specialist",
    kind: "career",
    title: "VA to PPC Specialist: the complete career guide",
    summary:
      "The four-level ladder from general VA to PPC manager, with the salary band, skills, responsibilities and advancement criteria at each level, plus certifications, portfolio strategy and where the jobs actually are.",
    tags: ["career", "salary", "skills", "job search"],
    minutes: 14,
    level: "beginner",
    meta: {
      Levels: "4",
      Timeline: "24+ months",
      From: "PHP 15-25k/mo",
      To: "PHP 80-150k+/mo",
    },
    body: `Your roadmap from general VA to Amazon PPC specialist. Built by Ryan Roland Dabao,
an Amazon PPC lead manager with more than ten years of experience.

## The career path

    General VA (PHP 15-25k/mo)
        |
        v  6-12 months
    PPC Junior / PPC Assistant (PHP 25-40k/mo)
        |
        v  12-18 months
    PPC Specialist (PHP 40-65k/mo)
        |
        v  18-24 months
    PPC Senior Specialist (PHP 65-100k/mo)
        |
        v  24+ months
    PPC Manager / Lead (PHP 80-150k+/mo)

The timelines are the fast version, and they assume you are working real accounts
while you learn. Nobody moves a level by finishing a course.

## Level 1: General VA to PPC Junior

**Timeline:** 6-12 months. **Salary range:** PHP 25,000 to PHP 40,000 per month.

### What you learn

- Amazon Seller Central navigation
- Basic product listing optimisation
- Amazon Advertising Console basics
- Sponsored Products fundamentals
- Keyword research basics with Helium 10 or Jungle Scout
- Search term report reading
- Basic bid adjustments
- Daily account monitoring

### Skills to develop

| Skill | How to learn | Time |
|-------|-------------|------|
| Amazon Console navigation | Free Amazon Seller University | 1 week |
| Sponsored Products basics | Helium 10 free training | 2 weeks |
| Keyword research | Cerebro and Magnet tutorials | 2 weeks |
| Excel basics | YouTube tutorials | 2 weeks |
| Search term reports | Amazon Ads documentation | 1 week |

### Your first tasks as a PPC Junior

1. Download and organise search term reports.
2. Flag keywords with 15+ clicks and 0 orders.
3. Monitor daily budget pacing.
4. Track campaign performance in a spreadsheet.
5. Assist the senior specialist with bid adjustments.

### How to get hired

- Complete the Amazon Ads certification, which is free.
- Complete a Helium 10 PPC course.
- Build a portfolio with two or three practice accounts.
- Apply to VA agencies: Project Amazon PH, OnlineJobs.ph.
- Start with $100-500 per month accounts to build experience.

## Level 2: PPC Junior to PPC Specialist

**Timeline:** 12-18 months. **Salary range:** PHP 40,000 to PHP 65,000 per month.

### What you learn

- Full campaign management across SP, SB and SD
- Advanced keyword research and harvesting
- Bid optimisation strategies
- Negative keyword management
- Budget allocation
- ACoS and ROAS optimisation
- Client reporting and communication
- Campaign restructuring
- A/B testing

### Skills to develop

| Skill | How to learn | Time |
|-------|-------------|------|
| Sponsored Brands | Amazon Ads Academy | 2 weeks |
| Sponsored Display | Amazon Ads documentation | 1 week |
| Advanced bid optimisation | Practice plus case studies | 3 months |
| Client communication | Real client work | Ongoing |
| Campaign restructuring | Case studies plus practice | 2 months |
| Helium 10 Adtomic | Tool documentation | 1 week |

### Your responsibilities

1. Manage three to five accounts independently.
2. Run weekly search term analysis.
3. Optimise bids two to three times per week.
4. Create and manage campaign structures.
5. Generate weekly client reports.
6. Communicate with clients directly.
7. Handle account launches.

### How to advance

- Manage accounts with $5K-20K of monthly ad spend.
- Document your results: ACoS improvements, sales growth.
- Build case studies from your own work.
- Get client testimonials.
- Mentor junior VAs.

## Level 3: PPC Specialist to Senior Specialist

**Timeline:** 18-24 months. **Salary range:** PHP 65,000 to PHP 100,000 per month.

### What you learn

- Complex account strategy
- Multi-product portfolio management
- Seasonal campaign planning for Q4 and Prime Day
- Advanced reporting and dashboards
- Client strategy sessions
- Team coordination
- Advanced automation with Adtomic and custom scripts
- Cross-channel advertising across Amazon and Walmart
- Competitive analysis

### Skills to develop

| Skill | How to learn | Time |
|-------|-------------|------|
| Advanced strategy | Industry blogs, conferences | Ongoing |
| Team leadership | Mentor juniors | 6 months |
| Custom automation | Google Sheets scripts, API | 3 months |
| Client strategy | Lead strategy calls | 6 months |
| Advanced reporting | Dashboard tools | 2 months |

### Your responsibilities

1. Manage five to ten accounts, $20K-100K of monthly spend.
2. Develop account strategies.
3. Lead client strategy calls.
4. Train and mentor junior VAs.
5. Create SOPs and processes.
6. Handle escalations.
7. Drive account growth.

### How to advance

- Manage accounts with $100K+ of monthly spend.
- Build a team of three to five junior VAs.
- Create training materials.
- Speak at VA and PPC events.
- Build your personal brand.

## Level 4: Senior Specialist to PPC Manager or Lead

**Timeline:** 24+ months. **Salary range:** PHP 80,000 to PHP 150,000+ per month.

### What you learn

- Business strategy alignment
- P&L management
- Team building and management
- Client acquisition and retention
- Agency operations
- Advanced analytics and forecasting
- Industry trend analysis
- Partnership development

### Skills to develop

| Skill | How to learn | Time |
|-------|-------------|------|
| Business strategy | Advanced courses, experience | Ongoing |
| Team management | Lead teams, read management books | 12 months |
| Client acquisition | Sales training, networking | 6 months |
| Financial modelling | Advanced Excel, forecasting | 3 months |

### Your responsibilities

1. Manage 10-20+ accounts, $200K-500K+ of monthly spend.
2. Lead a team of 5-15 PPC specialists.
3. Develop agency strategy and processes.
4. Handle top-tier client relationships.
5. Drive business growth.
6. Make hiring and firing decisions.
7. Set company direction.

### Career options at this level

- **Agency PPC Manager** — lead a team at an existing agency.
- **In-house PPC Lead** — join a brand as head of advertising.
- **Freelance PPC Consultant** — high-end consulting at $100-250 per hour.
- **PPC Agency Owner** — start your own agency.
- **Coach or Trainer** — teach others.

## Skills matrix by level

| Skill | Junior | Specialist | Senior | Manager |
|-------|--------|-----------|--------|---------|
| Amazon Console | Basic | Advanced | Expert | Expert |
| Sponsored Products | Basic | Full | Expert | Expert |
| Sponsored Brands | None | Basic | Full | Expert |
| Sponsored Display | None | Basic | Full | Expert |
| Keyword Research | Basic | Advanced | Expert | Expert |
| Bid Optimisation | Assist | Independent | Advanced | Strategic |
| Search Term Analysis | Read | Act | Strategic | Forecast |
| Campaign Structure | None | Build | Redesign | Architect |
| Client Reporting | None | Generate | Present | Strategy |
| Team Management | None | None | Mentor | Lead |
| SOPs and Processes | Follow | Improve | Create | Systematise |
| Automation Tools | None | Basic | Advanced | Custom |

## Certifications to get

### Free

1. **Amazon Ads Certification** — the Advertising Console certification.
2. **Amazon Seller University** — free courses on Seller Central.
3. **Google Analytics Certification** — GA4 fundamentals.

### Paid, and worth it

1. **Helium 10 Power User** — comprehensive Amazon selling.
2. **Jungle Scout Academy** — product research plus PPC.
3. **Amazon Ads Advanced Certification** — advanced advertising.

### Time investment

| Certification | Cost | Time | Value |
|--------------|------|------|-------|
| Amazon Ads Certification | Free | 4-6 hours | Essential |
| Helium 10 Power User | $79/mo | 20-30 hours | High |
| Google Analytics | Free | 5-10 hours | Medium |
| Amazon Ads Advanced | Free | 8-12 hours | High |

## Portfolio building strategy

### Phase 1: practice accounts, months 1-3

- Create your own Amazon account and sell a small product.
- Run $5-10 per day campaigns for 30 days.
- Document everything: screenshots, metrics, changes.
- Create a before and after case study.

### Phase 2: pro bono work, months 3-6

- Offer free PPC management to two or three friends or family with Amazon stores.
- Manage for three months minimum.
- Document results, with permission.
- Get testimonials.

### Phase 3: first paid client, month 6+

- Start with small accounts, $500-1000 of monthly spend.
- Charge below market rate initially, PHP 15-20k per month.
- Over-deliver on reporting and communication.
- Build a case study from the results.

### Portfolio pieces to include

1. Case study 1: practice account results, before and after.
2. Case study 2: pro bono client results.
3. Case study 3: first paid client results.
4. Certification badges.
5. Tool proficiency evidence.
6. Client testimonials, two or three quotes.
7. Sample reports, anonymised.

## Job search strategy

### Where the jobs are

1. **OnlineJobs.ph** — filter for "Amazon PPC" or "PPC Specialist".
2. **Upwork** — search "Amazon PPC management".
3. **Facebook groups** — Project Amazon.PH, Filipino VA Community, Amazon Sellers
   Philippines, PPC Specialists Network.
4. **LinkedIn** — connect with Amazon sellers and agencies.
5. **VA agencies** — Project Amazon PH, VAA Philippines, MyOutdesk, Belay, Boldly.

### Application tips

1. **Lead with metrics.** "I reduced ACoS from 45% to 22% in 60 days."
2. **Show certifications.** Attach the Amazon Ads and Helium 10 certificates.
3. **Include a portfolio.** Link to case studies.
4. **Customise every application.** Reference the specific company or client.
5. **Follow up.** Send a thank-you message within 24 hours.

### Interview preparation

- Work through the interview question bank.
- Practise explaining ACoS to a non-technical person.
- Prepare two or three case studies from your own experience.
- Know your numbers: "I manage X accounts with $Y of monthly spend."

## Daily routine of a PPC specialist

    8:00 AM   Check all accounts: budget pacing, anomalies
    8:30 AM   Search term review: harvest winners, negate losers
    9:30 AM   Bid adjustments based on yesterday's data
    10:30 AM  New keyword research and campaign setup
    11:30 AM  Client communication: emails, Slack
    1:00 PM   Reporting and documentation
    2:00 PM   Deep optimisation: A/B tests, restructuring
    3:00 PM   Learning and community engagement
    4:00 PM   Plan tomorrow's priorities

## Common mistakes to avoid

1. **Changing too much too fast.** Let data accumulate before optimising.
2. **Ignoring search term reports.** This is where the gold is.
3. **Not communicating with clients.** Silence creates anxiety.
4. **Focusing only on ACoS.** Think TACoS and total business impact.
5. **Not documenting changes.** When something works you need to know why.
6. **Automating without understanding.** Know the why before the how.
7. **Spreading too thin.** Better to dominate three products than weakly support ten.

## Resources for continued learning

### Blogs

- Amazon Ads Blog
- Helium 10 Blog
- Jungle Scout Blog
- PPC Entourage Blog

### YouTube channels

- ProjectAmazonPH
- Helium 10
- My Amazon Guy
- Seller Sessions

### Communities

- Reddit: r/AmazonPPC
- Reddit: r/FulfillmentByAmazon
- Facebook: Project Amazon.PH
- Facebook: Amazon Sellers Philippines

### Books

- *Amazon PPC Advertising* by Brian R. Johnson
- *The Amazon Advertising Playbook* by Pacvue

Your career path is clear. The question is how fast you want to move.`,
  },

  /* ---------------------------------------------------------------- 02 */
  {
    id: "resume-template",
    kind: "career",
    title: "PPC specialist resume template",
    summary:
      "A fill-in-the-blank resume built for Amazon PPC roles, with six before-and-after rewrites that turn vague duties into quantified achievements, the metrics worth quoting, and ATS formatting rules.",
    tags: ["resume", "job search", "ats", "template"],
    minutes: 8,
    level: "beginner",
    meta: {
      Length: "1-2 pages",
      Format: "PDF",
      Rule: "Quantify everything",
      Sections: "6",
    },
    body: `Generic resumes get ignored. Specific, quantified resumes get interviews. Every line
below exists to force a number onto the page.

## Instructions

1. Replace all bracketed text with your information.
2. Quantify everything: numbers, percentages, dollar amounts.
3. Keep to one or two pages maximum.
4. Save as PDF before sending.
5. Customise for each application.

## The template

    [YOUR FULL NAME]
    [City, Country] | [Phone] | [Email] | [LinkedIn URL]

    ---------------------------------------------------------------

    PROFESSIONAL SUMMARY

    [Role] with [X]+ years of experience in Amazon Advertising,
    specialising in [specific area, e.g. Sponsored Products, bid
    optimisation, campaign restructuring]. Managed ad budgets up to
    $[X] per month across [categories] categories. Proven track
    record of [key achievement, e.g. reducing ACoS by X%, increasing
    revenue by X%, scaling brands to X figures].

    ---------------------------------------------------------------

    CORE SKILLS

    Amazon PPC Strategy | Sponsored Products | Sponsored Brands
    Sponsored Display | Keyword Research | Bid Optimisation
    Search Term Analysis | Negative Keywords | ACoS/ROAS Optimisation
    Campaign Restructuring | Budget Management | Client Reporting
    Helium 10 | Amazon Advertising Console | Excel / Google Sheets

    ---------------------------------------------------------------

    PROFESSIONAL EXPERIENCE

    PPC Specialist | [Company] | [Start] - [End] | [Remote/On-site]
    - Managed Amazon PPC campaigns for [X] products across
      [categories], achieving [metric improvement, e.g. 30% ACoS
      reduction]
    - Conducted weekly search term analysis, harvesting [X]+
      converting keywords and negating [X]+ wasting terms, saving
      $[X] per month
    - Optimised bids across [X] campaigns, improving ROAS from [X]x
      to [X]x while maintaining [X]%+ sales growth
    - Built and restructured [X] campaigns, reducing CPA by [X]% and
      increasing conversion rate by [X]%
    - Created weekly and monthly performance reports for [X] clients,
      presenting data-driven recommendations

    PPC Junior / VA | [Company] | [Start] - [End] | [Remote/On-site]
    - Assisted the senior specialist with [X] Amazon accounts
      ($[X] per month of ad spend)
    - Downloaded and analysed search term reports, identifying [X]+
      optimisation opportunities
    - Monitored daily budget pacing across [X] campaigns, alerting
      the team to anomalies within [X] hours
    - Managed keyword lists and negative keyword strategies, reducing
      wasted spend by [X]%
    - Maintained campaign documentation and SOPs for team reference

    ---------------------------------------------------------------

    CERTIFICATIONS

    - Amazon Ads Console Certification - [Year]
    - Helium 10 Power User Certification - [Year]
    - Google Analytics Certification - [Year]

    ---------------------------------------------------------------

    EDUCATION

    [Degree] | [School] | [Year]

    ---------------------------------------------------------------

    TOOLS AND PLATFORMS

    Amazon Advertising Console | Helium 10 (Cerebro, Magnet, Adtomic)
    Jungle Scout | Advanced Excel | Google Sheets | Google Analytics

## Quantified achievement rewrites

| Instead of | Write |
|---|---|
| Managed PPC campaigns | Managed 15 Amazon PPC campaigns across 8 products with $25K of monthly ad spend |
| Improved ACoS | Reduced ACoS from 45% to 22% within 60 days through keyword harvesting and bid optimisation |
| Increased sales | Drove a 35% sales increase, $15K to $20K per month, while maintaining a 25% ACoS |
| Did keyword research | Conducted keyword research identifying 200+ opportunities, harvesting 45 high-converting terms into manual campaigns |
| Created reports | Generated weekly performance reports for 5 clients, with recommendations that led to 3 account expansions |
| Reduced waste | Negated 150+ underperforming keywords, cutting wasted ad spend by $3,200 per month, a 28% saving |

Read the right-hand column and notice what every line has: a count, a delta, and a
timeframe. If a bullet is missing one of the three, it is not finished.

## Metrics to include

| Metric | How to find it | What it shows |
|--------|---------------|---------------|
| ACoS reduction | Before and after comparison | Optimisation skill |
| ROAS improvement | Before and after comparison | Revenue impact |
| Revenue growth | Total sales change | Business impact |
| CPA reduction | Cost per acquisition change | Efficiency |
| CTR improvement | Click-through rate change | Ad relevance |
| CVR improvement | Conversion rate change | Listing quality |
| Budget managed | Total monthly ad spend | Scale |
| Accounts managed | Number of accounts | Breadth of experience |
| Keywords optimised | Count of changes | Work ethic |
| Client retention | How long clients stay | Relationship skill |

## ATS optimisation

### Keywords to include, matched to the job description

Amazon PPC, Sponsored Products, Sponsored Brands, Sponsored Display, ACoS, ROAS,
keyword research, bid optimisation, search term analysis, campaign management,
Helium 10, Amazon Advertising Console, budget management, client reporting.

### Formatting rules

- Use standard section headings.
- No tables or columns — applicant tracking systems cannot read them.
- No images or graphics.
- Save as PDF, which preserves formatting.
- Use standard fonts: Arial, Calibri, Times New Roman.

The no-tables rule applies to the resume file itself, not to the tables on this
page — those are here to help you write it.

## Cover letter

    Dear [Hiring Manager],

    I am writing to express my interest in the [Position] role at
    [Company]. With [X]+ years of Amazon PPC experience and a proven
    track record of [key achievement], I am confident I can [value
    you will bring].

    In my current role at [Company], I [specific accomplishment with
    numbers]. This experience has prepared me to [how it applies to
    this role].

    I am particularly drawn to [Company] because [specific reason].
    I would love to bring my skills in [specific skills] to help
    [their goal].

    I have attached my resume and would welcome the opportunity to
    discuss how my experience aligns with your needs.

    Best regards,
    [Your Name]
    [Phone] | [Email] | [LinkedIn]

## Portfolio link block

    PORTFOLIO
    View my work and case studies: [YOUR PORTFOLIO URL]`,
  },

  /* ---------------------------------------------------------------- 03 */
  {
    id: "portfolio-template",
    kind: "career",
    title: "PPC specialist portfolio template",
    summary:
      "An eight-to-twelve page portfolio structure with a reusable case study format and three fully worked examples: a product launch, an account restructure and a Q4 seasonal campaign.",
    tags: ["portfolio", "case studies", "job search", "template"],
    minutes: 11,
    level: "intermediate",
    meta: {
      Pages: "8-12",
      "Case studies": "3",
      Formats: "4 options",
      Rule: "Numbers or nothing",
    },
    body: `A portfolio without numbers is just words. A portfolio with numbers is proof.

## Portfolio structure

    Your portfolio (PDF or website)
      1. About me            1 page
      2. Skills overview     1 page
      3. Case study 1        1-2 pages
      4. Case study 2        1-2 pages
      5. Case study 3        1-2 pages
      6. Certifications      1 page
      7. Client testimonials 1 page
      8. Contact info        1 page

    Total: 8-12 pages

## Page 1: about me

    [YOUR NAME]
    Amazon PPC Specialist

    WHO I AM
    I am a data-driven Amazon PPC specialist with [X]+ years of
    experience helping sellers scale their advertising performance.
    I specialise in [specific area, e.g. campaign restructuring,
    ACoS optimisation, new product launches].

    MY MISSION
    To help Amazon sellers maximise their advertising ROI through
    strategic, data-backed PPC management. I believe in transparency,
    communication, and measurable results.

    BY THE NUMBERS
    - [X]+ years Amazon PPC experience
    - $[X]+ managed in ad spend
    - [X]+ accounts managed
    - [X]% average ACoS improvement
    - [X]% average revenue growth

## Page 2: skills overview

    CAMPAIGN MANAGEMENT
    Sponsored Products - full lifecycle management
    Sponsored Brands   - video, headline, store ads
    Sponsored Display  - retargeting, audience targeting
    Campaign structure - auto to manual harvest flow
    Budget allocation  - share-based allocation per campaign type

    OPTIMISATION
    Keyword research      - Cerebro, Magnet, manual research
    Bid optimisation      - dynamic, placement, rule-based
    Search term analysis  - four-quadrant framework
    Negative keywords     - shared lists, harvesting
    ACoS/ROAS management  - break-even analysis

    ANALYTICS AND REPORTING
    Performance dashboards - Excel, Google Sheets
    Client reporting       - weekly, monthly, strategic
    Data visualisation     - charts, trends, forecasts
    Competitive analysis   - market monitoring

    TOOLS
    Amazon Advertising Console            Expert
    Helium 10 (Cerebro, Magnet, Adtomic)  Expert
    Advanced Excel / Google Sheets        Expert
    Google Analytics                      Intermediate
    Jungle Scout                          Intermediate

## The case study format

Use the same five blocks for every case study. Consistency is what makes three case
studies read as a track record rather than three anecdotes.

    CASE STUDY [#]: [Client or product type]

    THE SITUATION
    - Product: [what]
    - Category: [category]
    - Monthly ad spend: $[X]
    - Starting ACoS: [X]%
    - Starting revenue: $[X] per month

    THE CHALLENGE
    - [Problem 1]
    - [Problem 2]
    - [Problem 3]

    MY APPROACH
    Week 1-2:  [actions]
    Week 3-4:  [actions]
    Week 5-8:  [actions]
    Week 9-12: [actions]

    THE RESULTS
    Metric      Before      After
    ACoS        [X]%        [X]%
    Revenue     $[X]/mo     $[X]/mo
    ROAS        [X]x        [X]x
    CTR         [X]%        [X]%
    CVR         [X]%        [X]%

    KEY TAKEAWAYS
    - [Lesson 1]
    - [Lesson 2]
    - [Lesson 3]

## Case study 1: new product launch

**Situation.** A silicone baking mat set in the Kitchen category, $1,500 of monthly ad
spend, no starting ACoS and no revenue because the product had just launched.

**Challenge.** Zero reviews and zero sales history, high competition in Kitchen, a
limited launch budget, and a need to build organic ranking quickly.

**Approach.**

| Weeks | Actions |
|---|---|
| 1-2 | Optimised the listing: 7 images, A+ Content, 5 bullets |
| 3-4 | Launched auto and manual exact campaigns at $50 per day |
| 5-8 | Harvested 25 converting terms, expanded into phrase match |
| 9-12 | Added Sponsored Brands video, scaled to $100 per day |

**Results.**

| Metric | Day 1 | Day 90 |
|---|---|---|
| ACoS | n/a | 28% |
| Revenue | $0 | $4,200/mo |
| Reviews | 0 | 45 |
| Organic rank | Page 5 | Page 1 |

**Takeaways.** Listing optimisation before ads is critical. Ninety days is the
minimum for meaningful organic improvement. Do not scale too fast — let the data
guide the decisions.

## Case study 2: account restructuring

**Situation.** A vitamin supplement brand in Health and Grocery, $8,000 of monthly ad
spend, a 75% starting ACoS and $10,500 of monthly revenue.

**Challenge.** ACoS well above the 40% break-even, more than 40 campaigns each capped
at $5 per day, no keyword segmentation, and overlapping campaigns competing against
each other.

**Approach.**

| Weeks | Actions |
|---|---|
| 1 | Full audit, identified 200+ waste keywords |
| 2 | Consolidated 40 campaigns into 12 focused campaigns |
| 3-4 | Built a proper auto-to-manual harvest structure |
| 5-8 | Aggressive bid optimisation, negated 150+ terms |
| 9-12 | Expanded into SB and SD while holding profitability |

**Results.**

| Metric | Before | After |
|---|---|---|
| ACoS | 75% | 28% |
| Revenue | $10,500/mo | $18,200/mo |
| ROAS | 1.3x | 3.6x |
| Campaigns | 40 | 12 |
| Time to manage | 20 hrs/wk | 8 hrs/wk |

**Takeaways.** More campaigns does not mean better performance. Consolidation improves
efficiency. Negative keywords matter as much as positive ones.

## Case study 3: Q4 seasonal campaign

**Situation.** An educational toy brand in Toys and Games, $5,000 of monthly ad spend
normally rising to $15,000 in Q4, a 32% starting ACoS and $15,000 of monthly revenue.

**Challenge.** Q4 represents 50% of annual sales, competitors were increasing spend
aggressively, and the budget was small relative to the big brands — so the plan had
to be strategic rather than a spending contest.

**Approach.**

| Period | Actions |
|---|---|
| October | Built 20 seasonal campaigns, set bid baselines |
| Nov 1-15 | Ramped spend 20% weekly, gathered data |
| Nov 16-24 | Aggressive bids, +50%, at $500 per day |
| Black Friday | Hourly monitoring, real-time adjustments |
| December | Maintained high bids, harvested winning terms |

**Results.**

| Metric | Q4 2025 | Q4 2026 |
|---|---|---|
| Revenue | $45,000 | $98,000 |
| ACoS | 35% | 22% |
| Ad spend | $15,750 | $21,560 |
| ROI | 2.86x | 4.54x |

**Takeaways.** Q4 preparation starts in October. Hourly monitoring on peak days is
essential. Brand defence during Q4 is critical.

## Page 7: certifications

List each certification with the year and a badge or screenshot: Amazon Ads Console
Certification, Helium 10 Power User Certification, Google Analytics Certification,
and any course completions.

## Page 8: client testimonials

Three quotes, each attributed to a named client and company. Pick one about your
work, one about results, and one about communication — clients hire for all three and
a portfolio that only proves results reads as incomplete.

    CLIENT RESULTS SUMMARY
    - [X] clients managed
    - Average ACoS improvement: [X]%
    - Average revenue growth: [X]%
    - Client retention rate: [X]%

## Portfolio formats

| Option | Cost | Best for |
|---|---|---|
| PDF via Google Docs or Canva | Free | Fastest to produce, easy to attach |
| Notion page | Free | Easy to update, modern, shareable link |
| Website via Carrd or GitHub Pages | $0-9/yr | Most professional, SEO-friendly |
| LinkedIn Featured section | Free | Visible to recruiters without a click |

## Portfolio checklist

- [ ] All numbers are accurate and verifiable
- [ ] Client names are anonymised, or permission is on file
- [ ] Before and after metrics are clear
- [ ] No spelling or grammar errors
- [ ] The PDF is under 5MB
- [ ] Contact info is current
- [ ] The LinkedIn URL works
- [ ] The portfolio is tailored to the specific job
- [ ] Case studies are relevant to the role
- [ ] Certifications are up to date`,
  },

  /* ---------------------------------------------------------------- 04 */
  {
    id: "salary-negotiation",
    kind: "career",
    title: "Salary and negotiation guide",
    summary:
      "2026 salary bands for Philippine VAs by level, arrangement and specialisation, remote US, AU and EU rates, the rate calculator, when to ask for a raise, and three negotiation scripts.",
    tags: ["salary", "negotiation", "freelance", "rates"],
    minutes: 12,
    level: "intermediate",
    meta: {
      Year: "2026",
      Markets: "PH, US, AU, EU",
      "Entry band": "PHP 15-25k/mo",
      "Manager band": "PHP 80-150k+/mo",
    },
    body: `Know your worth, then negotiate for it. Every figure below is a 2026 market range,
not a promise — but quoting a range you can source beats quoting a number you made
up.

## Philippine VA salary ranges

### By experience level

| Level | Experience | Monthly (PHP) | Monthly (USD) |
|-------|-----------|-------------------|---------------------|
| **Entry level** | 0-1 year | 15,000 - 25,000 | $270 - $450 |
| **Junior PPC** | 1-2 years | 25,000 - 40,000 | $450 - $720 |
| **PPC Specialist** | 2-4 years | 40,000 - 65,000 | $720 - $1,170 |
| **Senior PPC** | 4-6 years | 65,000 - 100,000 | $1,170 - $1,800 |
| **PPC Manager** | 6+ years | 80,000 - 150,000+ | $1,440 - $2,700+ |

### By work arrangement

| Arrangement | Typical range | Notes |
|-------------|--------------|-------|
| **Full-time, local** | PHP 20,000 - 50,000 | Philippine-based employer |
| **Full-time, remote** | PHP 30,000 - 80,000 | US, AU or EU employer |
| **Freelance, hourly** | $8 - $25 per hour | Upwork, OnlineJobs.ph |
| **Freelance, monthly** | PHP 25,000 - 80,000 | Direct client |
| **Agency, in-house** | PHP 25,000 - 60,000 | VA agency employee |

The gap between the local and remote rows is the single biggest lever in this
document. The same skill, sold to a US employer instead of a local one, is worth
roughly 50-60% more per month.

### By specialisation

| Specialisation | Premium versus general VA | Why |
|---------------|----------------------|-----|
| **PPC management** | +50-100% | Specialised skill, direct revenue impact |
| **PPC plus listing optimisation** | +75-125% | Full-stack Amazon skill |
| **PPC plus analytics** | +60-100% | Data-driven decision making |
| **PPC plus client management** | +80-130% | Retention value |

## Remote international rates

### US-based employers

| Level | Hourly | Monthly, full-time |
|-------|------------|-------------------|
| Junior | $12 - $18 | $2,080 - $3,120 |
| Specialist | $18 - $28 | $3,120 - $4,853 |
| Senior | $28 - $40 | $4,853 - $6,933 |
| Manager | $40 - $60 | $6,933 - $10,400 |

### AU-based employers

| Level | Hourly (AUD) | Monthly, full-time |
|-------|------------------|-------------------|
| Junior | $25 - $35 | $4,333 - $6,067 |
| Specialist | $35 - $55 | $6,067 - $9,533 |
| Senior | $55 - $75 | $9,533 - $13,000 |

### EU-based employers

| Level | Hourly (EUR) | Monthly, full-time |
|-------|------------------|-------------------|
| Junior | 10 - 16 | 1,733 - 2,773 |
| Specialist | 16 - 25 | 2,773 - 4,333 |
| Senior | 25 - 40 | 4,333 - 6,933 |

## Freelance rate calculator

### Hourly to monthly

    Monthly = Hourly rate x Hours per week x 4.33

    Example: $20 x 40 x 4.33 = $3,464 per month

### Monthly to hourly

    Hourly = Monthly salary / (Hours per week x 4.33)

    Example: PHP 50,000 / (40 x 4.33) = PHP 289 per hour

The 4.33 is 52 weeks divided by 12 months. Using 4 instead of 4.33 undercharges you
by about 7.6%: a rate that should bill PHP 50,000 a month bills PHP 46,200 instead,
so the shortcut costs roughly PHP 3,800 every month, or PHP 45,600 a year.

### Project-based pricing

| Service | Price range | Notes |
|---------|------------|-------|
| Account audit | $200 - $500 | One-time, 2-4 hours |
| Campaign setup | $300 - $800 | Per product line |
| Monthly management | $500 - $2,000/mo | Per account |
| Strategy session | $100 - $250/hr | Consulting |
| Training or coaching | $50 - $150/hr | Per session |

## When to ask for a raise

### Ask when

1. You have been in the role six months or more.
2. You have documented results: ACoS improvement, revenue growth.
3. You have taken on more responsibility.
4. Market rates have increased.
5. The client's business has grown, and you helped grow it.
6. You have a competing offer.

### Do not ask when

1. You just started, under three months.
2. You made a recent mistake.
3. The client is in financial trouble.
4. You have not documented your value.
5. You are emotional or desperate.

## How to ask

### Step 1: document your value

    MY CONTRIBUTIONS (last 6 months)

    1. ACoS improvement
       Before: [X]%   After: [X]%   Savings: $[X]/month

    2. Revenue growth
       Before: $[X]/mo   After: $[X]/mo   Increase: [X]%

    3. Time savings
       Automated [X] tasks, saved [X] hours per week
       Value: $[X]/month

    4. Additional responsibilities
       [Task you took on]
       [Task you took on]

    5. Client satisfaction
       [Testimonial or positive feedback]
       [Retention period]

### Step 2: research the market rate

Check OnlineJobs.ph for current rates, search Upwork for similar roles, and ask peers
in VA communities. Then you can say, truthfully, "market rate for my skill level is
PHP [X]".

### Step 3: make the ask

    Subject: Performance review and compensation discussion

    Hi [Client Name],

    I wanted to schedule a brief call to discuss my performance and
    compensation. Over the past [X] months I have:

    - Reduced ACoS from [X]% to [X]%, saving $[X] per month
    - Increased revenue by [X]%, $[X] to $[X] per month
    - [Additional achievement]

    Based on these results and current market rates for PPC
    specialists at my experience level, I would like to discuss
    adjusting my rate from [current] to [proposed].

    I am committed to continuing to deliver strong results for
    [Company] and would love to discuss this further.

    Are you available for a quick call this week?

    Best,
    [Your Name]

### Step 4: handle the response

| Answer | What to do |
|---|---|
| Yes | Thank them, get the new rate in writing, keep delivering |
| No | Ask what you would need to do to earn it, set milestones, review in 3-6 months |
| Not now | Ask when to revisit, set a calendar reminder, document the conversation |

## Negotiation scripts

### A new client asks for your rate

Bad: "Whatever you think is fair."

Good: "My rate for PPC management is $[X] per month for accounts up to $[X] of
monthly ad spend. That includes weekly reporting, bid optimisation and search term
analysis. For larger accounts I offer custom pricing. What is your current ad spend?"

The closing question matters as much as the number. It moves the conversation from
your price to their scope.

### Asking for a rate increase

"I have been managing your account for [X] months now, and I wanted to share some
results: ACoS reduced from [X]% to [X]%, revenue increased by [X]%, plus [other
achievement]. Given these results and my growing expertise, I would like to adjust my
rate from [current] to [proposed], effective [date]. I believe this reflects the
value I am delivering and current market rates."

### Pricing a project

"My PPC audit includes a full account review covering campaigns, keywords, bids and
structure, search term analysis, a competitive landscape review, a detailed
recommendations report, and a 30-minute strategy call. The investment is $[X]. Most
clients see a return within 60 days of implementing the recommendations. Shall I
proceed?"

## Common pricing mistakes

### Do not

1. **Quote too low.** "I will do it for $200 a month" undermines your value.
2. **Bill hourly for ongoing work.** It creates an adversarial relationship where
   your efficiency costs you money.
3. **Work without a contract.** It leaves you unprotected.
4. **Offer a free trial period.** It attracts tire-kickers.
5. **Compete on price.** That is a race to the bottom you can only win by losing.

### Do

1. **Price on value.** Charge for the results you deliver.
2. **Use a monthly retainer.** Predictable income, predictable service.
3. **Write a clear scope of work.** Both parties know what is included.
4. **Use a contract with terms.** 30-day notice, payment terms.
5. **Compete on expertise.** "I reduce ACoS by 30%", not "I am cheap".

## Salary growth trajectory

A typical five-year path in the Philippines:

| Year | Level | Monthly (PHP) | Growth |
|------|-------|---------------|--------|
| 1 | Entry / Junior | 20,000 | -- |
| 2 | Junior PPC | 30,000 | +50% |
| 3 | PPC Specialist | 45,000 | +50% |
| 4 | Senior PPC | 65,000 | +44% |
| 5 | PPC Manager | 90,000+ | +38% |

That is a 4.5x increase over four years, which is only achievable because each level
adds a genuinely different skill rather than more of the same one.

### Accelerators

- Get certified: Amazon Ads plus Helium 10.
- Build a portfolio with case studies.
- Specialise in high-value categories such as supplements or electronics.
- Take on client management responsibilities.
- Start freelancing, where rates are higher than employment.

## Benefits worth negotiating beyond salary

1. **Tool access** — the client pays for Helium 10 and the rest.
2. **Training budget** — professional development.
3. **Flexible hours** — work-life balance.
4. **Performance bonus** — tied to ACoS or revenue targets.
5. **Paid time off** — vacation and sick leave.
6. **Equipment allowance** — computer, internet.
7. **Health insurance** — HMO coverage.
8. **Retirement contribution** — SSS, Pag-IBIG.

A PHP 5,000 monthly tool budget plus an HMO is worth more than a PHP 5,000 raise,
because neither is taxed as salary and both remove a cost you would otherwise carry.`,
  },
];

export function resourceRefs(): ResourceRef[] {
  return docRefs(careerGuides, "/career", UPDATED);
}

export function findCareerGuide(id: string): DocResource | undefined {
  return careerGuides.find((guide) => guide.id === id);
}
