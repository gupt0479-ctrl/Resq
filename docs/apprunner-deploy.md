# AWS App Runner Deploy Path

This is the smallest AWS path that adds hackathon deploy credibility without
pulling focus away from the hero flow.

## What is in scope

- AWS App Runner for a source-based web deployment
- CloudWatch logs through the App Runner console
- Optional private S3 artifact storage via `src/lib/aws/s3.ts`

## What is out of scope

- Terraform or CDK
- ECS/Fargate
- queues, workers, or multi-service topology
- public S3 buckets for evidence artifacts

AWS remains secondary to hero-flow stability. If the survival scan is not
solid locally, do not spend time expanding AWS.

## Why App Runner

AWS documents App Runner as a fast way to turn source code or a container image
into a running web service. It also supports automatic deployment from a source
repository and streams service logs to CloudWatch.

Important date:

- AWS App Runner documentation now states that the service will no longer be
  open to new customers starting **April 30, 2026**. As of **April 18, 2026**,
  this path is still viable if your team sets it up before that date.

## Repo support

This repo now includes:

- `apprunner.yaml` for source-based deployment
- AWS env placeholders in `.env.example`
- optional S3 upload helper at `src/lib/aws/s3.ts`

## Source deployment recipe

1. Push the repo to GitHub.
2. In AWS App Runner, create a new service from a source code repository.
3. Connect your GitHub account if needed.
4. Select this repository and branch.
5. Keep the source directory at the repository root.
6. Choose **Use a configuration file** so App Runner reads `apprunner.yaml`.
7. Add runtime environment variables in the App Runner console:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DEMO_ORG_ID`
   - `DEMO_MODE`
   - TinyFish vars only if you have already verified live mode locally
8. Deploy.

## Runtime posture

- Demo-safe default: keep TinyFish in mock mode until local live verification is done.
- App Runner should deploy the existing Next.js app shell, not a second backend.
- If you enable automatic deployment, every new commit to the configured source
  directory can trigger a redeploy.

## Logs and debugging

App Runner exposes:

- event logs
- deployment logs
- application logs

Use those first for deploy debugging.

## Optional S3 evidence path

The existing helper can store private JSON or text artifacts:

- `src/lib/aws/s3.ts`

Current repo status:

- private upload helper exists
- no public artifact route is implemented

If you expose artifacts for judges or teammates, use presigned URLs rather than
public buckets. AWS S3 documentation describes presigned URLs as time-limited
access to private objects.

## Team guidance

- Person 4 owns this path.
- Treat AWS as credibility and backup-demo support.
- Do not let AWS work delay `/api/tinyfish/demo-run` or the rescue queue.
