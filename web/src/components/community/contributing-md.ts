/**
 * `.github/CONTRIBUTING.md` from the source repo, ported verbatim.
 *
 * Kept as a string rather than read from disk at build time: the site is a
 * static export and the source repo is a sibling directory, not a package, so
 * a filesystem read would tie the build to a checkout layout that will not
 * exist on a CI runner.
 *
 * The only edit is the decorative emoji on four headings, dropped because
 * this site uses `lucide-react` for iconography. Every word is the source's.
 * The canonical file lives at:
 * https://github.com/projectamazonph/ppc-tools-for-va/blob/main/.github/CONTRIBUTING.md
 */

export const CONTRIBUTING_MARKDOWN = `## How to Contribute

### Report Issues

- Found a bug in the Excel template?
- Incorrect information in a quiz or case study?
- Open an issue with details and screenshots

### Suggest Improvements

- Better workflow diagrams
- Additional quiz questions
- New case study templates
- Automation script improvements

### Add Content

- **New case studies:** Share your optimization wins (anonymized if needed)
- **Quiz questions:** Add questions from real interviews or training
- **SOP improvements:** Share process refinements from your workflow
- **Template enhancements:** Add columns, formulas, or new templates

### Fix Bugs

1. Fork the repository
2. Create a feature branch (\`git checkout -b improve-quiz-questions\`)
3. Make your changes
4. Test thoroughly (especially Excel formulas)
5. Submit a pull request

## Content Guidelines

### Case Studies

- Include real metrics (before/after)
- Describe the strategy clearly
- Note what worked and what didn't
- Anonymize client names if needed

### Quiz Questions

- Include the correct answer
- Add explanation for why it's correct
- Note the difficulty level
- Reference source if from Amazon documentation

### SOPs

- Include step-by-step instructions
- Add decision rules (when to do what)
- Include escalation criteria
- Keep it actionable — no theory without practice

### Templates

- Test all formulas before submitting
- Include instructions for use
- Note any dependencies (specific tools, etc.)

## Code of Conduct

- Be respectful and constructive
- Focus on helping VAs succeed
- No gatekeeping — share knowledge freely
- Credit original sources

## Questions?

Open an issue or reach out on LinkedIn:
[linkedin.com/in/ryan-roland-dabao-55416187](https://linkedin.com/in/ryan-roland-dabao-55416187)
`;

/** Published growth targets from `EXPANSION-PLAN.md` — "Target Metrics (6 Months)". */
export const GROWTH_TARGETS: {
  metric: string;
  current: string;
  threeMonths: string;
  sixMonths: string;
}[] = [
  { metric: "Contributors", current: "1", threeMonths: "5", sixMonths: "15+" },
  { metric: "GitHub stars", current: "0", threeMonths: "50", sixMonths: "200+" },
  { metric: "Forks", current: "0", threeMonths: "15", sixMonths: "50+" },
  { metric: "Total files", current: "12", threeMonths: "35", sixMonths: "54+" },
  { metric: "Total lines", current: "2,659", threeMonths: "8,000", sixMonths: "15,000+" },
];
