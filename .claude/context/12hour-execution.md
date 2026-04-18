# 12-Hour Execution Plan

## Final pitch

**OpsPilot Rescue** is an auditable survival copilot for a small business under
cash pressure. It runs one-button investigation across receivables, financing,
and cost pressure, then returns ranked rescue actions with a visible audit
trail.

## Hero flow

1. dashboard shows cash stress
2. operator opens rescue queue
3. operator runs survival scan
4. financing options appear with source links, confidence, and mode badge
5. vendor or insurance proof supports the case
6. workflow timeline proves the agent did real multi-step work

## The only things that must work by demo

- rescue queue reads as the main working surface
- financing scout returns understandable offer cards
- TinyFish clearly reports mock vs misconfigured vs live/degraded
- workflow page shows an auditable run
- integrations page explains system truth clearly

## Team split

### Person 1: truth layer and rescue data
- dashboard aggregates
- rescue queue query shape
- demo seed alignment

### Person 2: TinyFish financing lane
- `src/lib/tinyfish/*`
- `/api/tinyfish/*`
- financing normalization and warnings

### Person 3: product UI and demo flow
- landing
- dashboard
- rescue page
- workflow page
- integrations messaging

### Person 4: Kiro, `.claude`, AWS, demo ops
- `.claude`
- `.kiro/steering`
- Kiro setup
- AWS/App Runner story
- backup demo assets

## Stop rules

Stop adding features when:

- financing scout is unstable
- workflow timeline is unclear
- rescue queue does not feel like the main product
- live/mock/degraded truth is hard to explain

Switch to polish when:

- the hero flow works once end to end
- the dashboard and rescue queue tell the same story
- the 90-second pitch feels obvious

## Out of scope

- real underwriting
- real lending submission
- deep authenticated browser automation
- broad integration suite expansion
- complex AWS architecture

## Verification rhythm

Run after every meaningful batch:

```bash
npm run lint
npx tsc --noEmit
npm run test
npm run build
```
