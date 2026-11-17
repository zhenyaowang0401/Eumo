# Eumo presentation: evidence and source ledger

Updated **17 November 2026**. Selected sources were retrieved and checked for the revised English presentation. This replaces the 16 November access-blocked reading list for the sources below; it is a focused evidence review, not a systematic literature review or an evaluation of Eumo.

## Main-stage findings

| Slide / theme | Verified finding | Study context | Product connection |
| --- | --- | --- | --- |
| Overview | **30%** reported distraction from using digital devices in most or every mathematics lesson. | PISA 2022; 15-year-old students; OECD average; self-report. | Frame distraction as a concrete study-context problem. |
| Community & accountability | **138 randomized studies**, N = 19,951; progress monitoring improved goal attainment, **d = 0.40**. Effects were larger when progress was reported or made public. | Harkin et al., 2016; goal-monitoring interventions across contexts. | Optional friend visibility and study records. |
| AI learning support | **More than twice the median learning gains** with a purpose-built AI tutor versus in-class active learning. | Kestin et al., 2025; 194 undergraduate physics students; two-lesson counterbalanced randomized trial. | Explore structured questions, task breakdown and feedback in AI chat. |
| AI companionship | Users described companionship and emotional support. | Ta et al., 2020; 1,854 Replika reviews plus a separate qualitative study of 66 users. | Optional conversation and a persistent character. |
| Rewards & motivation | **Hedges’ g = 0.36** for motivational outcomes. | Sailer & Homner, 2020; 16 studies, 2,246 participants; learning gamification. | Make effort visible through discoveries and personalization. |

These findings concern other interventions. They do not establish Eumo’s effectiveness. The target **learners aged 8–35** is the project’s requested product direction; the research populations do not validate benefits across that entire range.

## 1. Digital distraction: OECD

**Citation:** OECD (2023), *PISA 2022 Results (Volume II): Learning During – and From – Disruption*. DOI [10.1787/a97db61c-en](https://doi.org/10.1787/a97db61c-en).

**Verified official sources:**

- [Publication](https://www.oecd.org/en/publications/pisa-2022-results-volume-ii_a97db61c-en.html)
- [Executive summary](https://www.oecd.org/en/publications/pisa-2022-results-volume-ii_a97db61c-en/full-report/component-5.html)
- [Official PDF](https://www.oecd.org/content/dam/oecd/en/publications/reports/2023/12/pisa-2022-results-volume-ii_222a5ef6/a97db61c-en.pdf)

> Some 30% of students, on average across OECD countries, reported that, in most or every mathematics lesson, they get distracted using digital devices; 25% of students reported that they get distracted by other students using these devices in class.

PISA assesses 15-year-olds. Keep the age group, OECD average and mathematics-lesson context visible beside the headline number. The result is self-reported distraction, not a causal experiment, a clinical diagnosis or a prevalence estimate across all Eumo users.

**Local extracts:** `oecd_5_retry.clean`, `oecd_volume.clean`, `oecd-pisa2022.pdf`, `oecd-pisa2022.txt`.

## 2. Social accountability: Harkin et al.

**Citation:** Harkin, B., Webb, T. L., Chang, B. P. I., Prestwich, A., Conner, M., Kellar, I., Benn, Y., & Sheeran, P. (2016). *Does monitoring goal progress promote goal attainment? A meta-analysis of the experimental evidence.* Psychological Bulletin, 142(2), 198–229. DOI [10.1037/bul0000025](https://doi.org/10.1037/bul0000025).

**Verified:** the primary-publication abstract indexed in [Europe PMC](https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&resultType=core&query=EXT_ID:26479070%20AND%20SRC:MED), PMID [26479070](https://pubmed.ncbi.nlm.nih.gov/26479070/), with [Crossref metadata](https://api.crossref.org/works/10.1037/bul0000025). This verification used the abstract, not the full article.

- 138 studies randomly allocated participants to a goal-progress-monitoring intervention or control; total N = 19,951.
- Goal attainment: d+ = 0.40, 95% CI [0.32, 0.48].
- Moderator analyses found larger effects when outcomes were reported or made public and when information was physically recorded.

Public reporting is a moderator of goal monitoring, not a stand-alone randomized test of online friends, Zoom co-study or body doubling. Use the study to motivate visible progress and accountability, not to promise that community alone causes the reported effect. **d = 0.40 does not mean 40% improvement.**

**Local extracts:** `harkin-epmc.json`, `harkin_crossref.txt`. The unrelated `harkin_white.clean` result is not evidence and was not used.

## 3. AI learning: Kestin et al.

**Citation:** Kestin, G., Miller, K., Klales, A., Milbourne, T., & Ponti, G. (2025). *AI tutoring outperforms in-class active learning: an RCT introducing a novel research-based design in an authentic educational setting.* Scientific Reports, 15, 17458. [Publisher full text](https://www.nature.com/articles/s41598-025-97652-6); DOI [10.1038/s41598-025-97652-6](https://doi.org/10.1038/s41598-025-97652-6).

The randomized, counterbalanced two-week study involved **194 Harvard undergraduate physics students**. A tailored tutor used established instructional practices; the comparator was in-class active learning. Students switched conditions for a second lesson.

The paper reports that median gains relative to the pre-test baseline were **over double** in the AI condition. Post-test score medians were 4.5 and 3.5. The 142 AI and 174 classroom post-test observations cover two lessons; they are not additional unique participants.

This supports investigating structured educational assistance. It does not establish the same benefit from generic chat, Eumo, every subject or the full 8–35 target. Median AI time was 49 minutes against an assumed 60-minute classroom learning period: **do not claim “half the time.”**

**Local extracts:** `kestin.html`, `kestin.txt`.

## 4. AI companionship: Ta et al.

**Citation:** Ta, V., Griffith, C., Boatfield, C., Wang, X., Civitello, M., Bader, H., DeCero, E., & Loggarakis, A. (2020). *User Experiences of Social Support From Companion Chatbots in Everyday Contexts: Thematic Analysis.* Journal of Medical Internet Research, 22(3), e16235. [Publisher full text](https://www.jmir.org/2020/3/e16235/); DOI [10.2196/16235](https://doi.org/10.2196/16235).

Study 1 analyzed **1,854 public Replika reviews**; Study 2 analyzed open-ended responses from **66 Replika users**. Thematic analysis identified companionship and emotional, informational and appraisal support.

The two datasets must remain distinct. They do not represent 1,920 interviewed participants. These self-selected reported experiences establish neither an efficacy percentage nor population demand, academic improvement or durable emotional benefit.

**Local extracts:** `ta.html`, `ta.txt`.

## 5. Gamification and motivation: Sailer & Homner

**Citation:** Sailer, M., & Homner, L. (2020). *The Gamification of Learning: a Meta-analysis.* Educational Psychology Review, 32, 77–112. [Publisher full text](https://link.springer.com/article/10.1007/s10648-019-09498-w); DOI [10.1007/s10648-019-09498-w](https://doi.org/10.1007/s10648-019-09498-w). First online in 2019; journal issue year 2020.

| Outcome | Hedges’ g | 95% CI | Studies | Participants |
| --- | --- | --- | --- | --- |
| Cognitive learning | 0.49 | [0.30, 0.69] | 19 | 1,686 |
| Motivational | **0.36** | **[0.18, 0.54]** | **16** | **2,246** |
| Behavioral learning | 0.25 | [0.04, 0.46] | 9 | 951 |

The presentation uses the motivational result. **g = 0.36 is a standardized effect size, not a 36% improvement.** Gamification combines elements; this does not isolate collectible rewards, prove rewards are always better than punishment or make addiction a product objective. Motivational and behavioral effects were less stable in a subset of more rigorous studies.

**Local extracts:** `sailer.html`, `sailer.txt`.

## Additional problem framing

Steel, P. (2007), *The nature of procrastination: a meta-analytic and theoretical review of quintessential self-regulatory failure*, Psychological Bulletin, 133(1), 65–94. DOI [10.1037/0033-2909.133.1.65](https://doi.org/10.1037/0033-2909.133.1.65); primary abstract retrieved through [Europe PMC](https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&resultType=core&query=EXT_ID:17201571%20AND%20SRC:MED), PMID 17201571.

The review covers 691 correlations and identifies task aversiveness, task delay, self-efficacy, impulsiveness and related self-regulation factors among consistent predictors. This supports framing the problem beyond simply studying alone. No frequently repeated student-procrastination prevalence figure is used because it was not verified in the retrieved abstract.

**Local extracts:** `steel-epmc.json`, `steel_crossref.txt`.

## Competitor descriptions checked

| Reference | Official description | Comparison boundary |
| --- | --- | --- |
| [Pomodoro technique](https://www.pomodorotechnique.com/) | Work/break structure, planning and reflection; the site calls it a gentler way to work with time. | The technique itself is not a punishment system. |
| [Forest](https://www.forestapp.cc/) | During strict sessions, leaving the app or using blocked apps may cause the tree to wither. | A documented product-specific penalty; Forest also offers group focus, so not all timer apps lack peers. |
| [Cat On Chair](https://apps.apple.com/us/app/cat-on-chair-pomodoro-timer/id6746562271) | Both Pomodoro and count-up timers, cat companionship, gifts, rewards, room decoration, app blocking and iCloud synchronization. Failed sessions may produce trash. | No live human peer-presence feature is listed. Absence from a listing is not proof of absence everywhere. |

The Cat On Chair publisher description was retrieved through [Apple’s public software API](https://itunes.apple.com/search?term=cat%20on%20chair&entity=software&limit=5), exact track ID **6746562271**. Describing it as “only a cat” or “no rewards” would be incorrect.

Eumo’s comparison statement is **AI chat + friends online + rewards**. This describes a feature combination, not unique market ownership or a measured superiority claim. The displayed competitor images remain reference illustrations based on presenter-supplied images.

**Local extracts:** `pomodoro.clean`, `forest.clean`, `cat_search.txt`.

## Feedback, persona and current product status

The project owner supplied qualitative feedback about clothing/rewards, computer use, friend visibility and simpler UI. Participant count, recruitment, ages and a formal protocol were not supplied. These are feedback themes rather than controlled outcome data. In particular, no measured battery advantage is claimed.

**Alex, 20:** illustrative profile informed by project feedback, not an interviewed participant.

**Current reward rule:** active Study / Work time earns progress. Pause and Break do not. Ending early preserves earned rewards. Timer activity cannot verify attention; a completion-only gate is not the current implementation.

**Canele:** four-digit cloud pairing and device-to-web settled-progress import are deployed, with explicit device confirmation. Updated firmware and a live physical pairing / synchronization test remain to be completed on the connected computer. This is not general account-based synchronization of independent browser saves.

## Commercial direction and next work

Next priorities are app UI, enclosure design, device UI, and commercial preparation: pricing tests, paid offerings and app-store submissions. No arbitrary release date or store approval is implied.

The proposed model retains a free core and considers optional subscriptions, digital collections and physical-product sales. Study communities, storefronts and direct sales are candidate acquisition channels. AI usage, hosting, original artwork, production, delivery and support are cost drivers. Pricing, conversion, margins and market size remain to be established.

## Retrieval record

The source files and two concise research reports are retained outside the distributable repository at:

`/workspace/scratch/presentation-v6-research/`

- `social.md`: source URLs, exact quotes and scope for OECD, Harkin, Steel and competitors.
- `ai-rewards.md`: source URLs, exact results and scope for Kestin, Ta and Sailer.

Verification date: **17 November 2026**. Publisher full text was available for Kestin, Ta and Sailer; the OECD executive summary/report and official competitor descriptions were available. Harkin and Steel used indexed primary-publication abstracts plus metadata. Other earlier reading candidates, including background-music claims, are not used as numerical evidence in this revision. Full source files remain research artifacts rather than bundled copyrighted article copies.
