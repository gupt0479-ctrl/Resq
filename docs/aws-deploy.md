# AWS Deploy Notes

This document exists for hackathon deploy readiness and AWS prize eligibility.

## Goal

Make the app runnable on AWS-managed container infrastructure with minimal
operational overhead.

## Recommended path

Use one of:

- AWS App Runner
- ECS Fargate

The repo should remain deployable locally first. AWS is a packaging and prize
strategy, not the product story.

## Build assumptions

- Next.js uses standalone output
- most runtime env vars are injected at deploy time
- TinyFish and AWS secrets are never required at image build time
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` MUST be
  passed as Docker `--build-arg` values. Next.js inlines them into the
  browser bundle at build time; injecting them only at `docker run` time
  leaves the client with empty values. The Dockerfile fails the build if
  either is empty.

## Required build args

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key \
  -t opspilot .
```

## Required runtime env vars

- `NEXT_PUBLIC_SUPABASE_URL` (also still needed at runtime for server code)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEMO_ORG_ID`

Optional:

- TinyFish env vars
- AWS artifact env vars

## App Runner outline

1. Build Docker image locally.
2. Push image to ECR.
3. Create App Runner service from image.
4. Inject env vars.
5. Verify `/api/tinyfish/health` and the main app routes.

## ECS Fargate outline

1. Build and push Docker image.
2. Create task definition with env vars.
3. Run behind an ALB if public access is needed.
4. Verify health routes.

## Prize note

For the hackathon, “runs on AWS with at least one managed service” matters more
than elaborate infrastructure. Keep the deploy story simple and credible.
