# Initial Eligibility Letter Generator

A static, browser-based JavaScript application that fills the Portland Public Schools two-page initial eligibility form from an intake CSV and downloads all student letters as one combined PDF. It is designed to deploy to GitHub Pages. The CSV and generated letters stay in the user's browser; the app has no server or upload service.

## Features

- Select an intake CSV with the file picker.
- Fill the bundled two-page PDF template once for each student in the CSV.
- Expand the listed school codes to their full school names.
- Apply eligibility and assessment checkboxes and scores from the CSV.
- Add each student's ID to the top-right of page 2.
- Download all completed forms as one PDF.
- Show validation errors for missing fields, unsupported school codes, invalid dates, or unsupported service values.

## Use the app

1. Choose an intake CSV.
2. Confirm the year used for appointment dates that do not include a year. The app uses a four-digit year in the CSV filename when present, otherwise the current year.
3. Choose **Create and download PDF**.

The app interprets `ML Service` as the eligibility decision: `IELD`, `CALS`, or `NOT ML`. Grade `PK` also selects the Pre-Kindergarten option. Assessment results independently determine which assessment criteria are checked and which scores are printed. Family and Educational History is checked for each student.

The following school abbreviations are expanded: ACR/CMDN, CBHS, DHS, EST, KMS, LGF, LYS, OCN, PATHS, PHS, PRS, RCH, TAL, YFO, SPP ACR, SPP LGF, SPP PRS, and SPP TAL.

## Privacy

- The selected CSV is read locally in the browser and is not sent to a server.
- The PDF template is downloaded from this site's own static files.
- The app does not save student data to browser storage. The combined PDF is generated in memory and downloaded to the user's device.
- Do not use shared computers for confidential student records unless the downloaded file and browser session are handled according to district policy.

## Local development

Requirements: Node.js 26 LTS and npm. The deployment workflow also uses Node.js 26.

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. Run the tests and create a production build with:

```sh
npm test
npm run build
npm run preview
```

The static production site is written to `dist/`.

## GitHub Pages deployment

The `.github/workflows/deploy.yml` workflow tests and builds the app, then deploys it to GitHub Pages when changes are pushed to `main`.

1. Push the repository to GitHub.
2. In **Settings → Pages**, set the source to **GitHub Actions**.
3. Push to `main` or start **Deploy to GitHub Pages** from the Actions tab.
4. Open the Pages URL shown on the successful workflow run.

The template is bundled at `public/templates/initial-eligibility-template.pdf`. Keep that file in the repository when deploying.
