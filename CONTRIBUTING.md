# Contributing to MezonHook

Thank you for helping improve MezonHook.

## Workflow

1. Create a focused branch from the current `main` branch.
2. Make a small, reviewable change and add or update tests first where practical. Changes to behavior should be test-first: write the failing test, implement the smallest change, then refactor.
3. Run the required checks:

   ```bash
   npm test
   npm run build --workspace @mezonhook/web
   ```

4. Open a pull request against `main`. Explain the user-facing change, testing performed, and any follow-up work. Keep unrelated formatting or refactors out of the PR.

## Security and test data

Never commit secrets or real Channel Webhook URLs. Do not include them in tests, fixtures, screenshots, logs, pull requests, or issues. Use clearly non-sensitive placeholder values in examples. If a webhook URL is exposed, rotate it in Mezon and follow [SECURITY.md](SECURITY.md) for confidential vulnerability reporting.
