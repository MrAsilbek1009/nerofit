# E2E smoke tests (Maestro)

[Maestro](https://maestro.dev) drives the real app on a simulator/emulator or
device — black-box, no app code changes.

## Install Maestro (one-time, per machine)

```bash
curl -fsSL "https://get.maestro.mobile.dev" | bash
```

## Run

1. Build + install the dev client (`npx expo run:ios` or `run:android`) and make
   sure Metro is running.
2. From `nerofit/`:

```bash
npm run e2e          # = maestro test .maestro
```

## Flows

- `smoke.yaml` — launches the app and asserts the first screen renders. Guards
  against white-screen / native-module-missing crashes on launch.

## Notes

- Not wired into CI yet: GitHub Actions would need an emulator runner + a built
  app. Run locally for now (a CI E2E job is a follow-up).
- Add login/onboarding/log-a-meal flows here as coverage grows; keep credentials
  out of the repo (use Maestro `env` / `--env`).
