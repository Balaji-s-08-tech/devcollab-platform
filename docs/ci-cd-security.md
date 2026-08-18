# CI/CD and Production Security Notes

## Required GitHub Environments

Create two GitHub Environments:

- `staging`
- `production`

Enable required reviewers on `production` to make the production deploy job wait for manual approval.

## Required GitHub Secrets

Repository or environment secrets:

- `STAGING_MONGODB_URI`
- `STAGING_JWT_SECRET`
- `STAGING_APP_URL`
- `STAGING_HEALTHCHECK_URL`
- `STAGING_DEPLOY_WEBHOOK_URL`
- `STAGING_DEPLOY_WEBHOOK_TOKEN`
- `STAGING_ROLLBACK_WEBHOOK_URL`
- `STAGING_ROLLBACK_WEBHOOK_TOKEN`
- `PRODUCTION_MONGODB_URI`
- `PRODUCTION_JWT_SECRET`
- `PRODUCTION_APP_URL`
- `PRODUCTION_HEALTHCHECK_URL`
- `PRODUCTION_DEPLOY_WEBHOOK_URL`
- `PRODUCTION_DEPLOY_WEBHOOK_TOKEN`
- `PRODUCTION_ROLLBACK_WEBHOOK_URL`
- `PRODUCTION_ROLLBACK_WEBHOOK_TOKEN`

Application runtime secrets should live in the hosting platform secret store, not in git:

- `JWT_SECRET`
- `REFRESH_TOKEN_SECRET`
- `TOTP_ENCRYPTION_KEY`
- `TWO_FACTOR_CHALLENGE_SECRET`
- `MONGODB_URI`
- `REDIS_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_WEBHOOK_SECRET`
- `WEBHOOK_SECRET`

## Branch Protection

In GitHub branch protection for `main`, require these checks before merge:

- `Lint (server)`
- `Lint (client)`
- `Unit and Integration Tests`

The `E2E Tests` job runs on pushes to `main`, which covers the merge-to-main path before CD image deployment is promoted.
