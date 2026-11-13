# GradeBuddy (CSEN 909 prototype)

Front-end prototype of the GradeBuddy wireframes: OCR + AI-assisted grading with the teacher in the loop,
explainable results for students, and a parent view.

It is a static website in `public/`: plain HTML, CSS and JavaScript with no dependencies and no backend.
All data is demo data stored in the browser (`localStorage`), and the "AI" steps (OCR, grading, red flags) are simulated.

## Live demo
Live demo: **[link coming soon](https://example.github.io/gradebuddy/)** (GitHub Pages)

## Run locally
Pick one:
- **No install:** open `public/index.html` in Chrome, Edge or Firefox.
- **Local server:** `npx serve public` (or `npm start`, which runs `npx serve public -l 3000`), then open http://localhost:3000

Sign in as a **student** (Younis), **teacher** (Ms. Mona) or **parent** (Ms. Marwa). Any password works.

**Reset demo data** (student: Help & settings; teacher and parent: Settings) clears everything GradeBuddy saved in the browser
(progress, messages, points, language, sign-in) and reloads the app from a clean start.

## Publish on GitHub Pages
All paths are relative, so the app works from a sub-path such as `https://<user>.github.io/<repo>/`.
In the repository settings choose Pages → "Deploy from a branch" and serve the `public/` folder
(or copy its contents to a `docs/` folder or a `gh-pages` branch).

## Structure
- `public/index.html`: the single page, with hash routing (`#/student/home`, `#/teacher/dashboard`, `#/parent/overview`, …)
- `public/css/app.css`: all styles
- `public/js/data.js`: demo data (exams, OCR text, AI grades, flags, messages)
- `public/js/core.js`: state, router, app shell (top bar, sidebar, bell, language), charts, avatar, modals
- `public/js/auth.js`: sign-in screens and settings
- `public/js/student.js`: student screens and the Buddy helper panel
- `public/js/games.js`: the five practice games
- `public/js/teacher.js`: teacher screens (verify OCR, review AI grades, flags, class view, messages, posts)
- `public/js/parent.js`: parent screens
- `public/js/i18n.js`: German text (EN | DE switch)

## Demo order
One exam, Younis's Math **Fractions Test**, goes through the whole flow. Start from a clean state ("Reset demo data").
1. **Student (Younis):** Home shows the Fractions Test as "Needs upload". Upload my exam → Fractions Test → add 4 pages (the 3rd comes out blurry, take it again) → tick the check box → Send to teacher (+5 points). Home now shows it as "Teacher checking".
2. **Teacher (Ms. Mona):** To verify → Younis H. · Math · Fractions Test → fix the unclear words → confirm each page → Send to AI grading. After a few seconds the paper moves to To review, and a red flag for fractions appears.
   (Optional: "Ask for a new photo" on the verify screen sends a page back to Younis. He retakes it on his exam page and the paper returns to To verify.)
3. **Teacher:** To review → Younis H. → accept or change each AI score → confirm the red flag → Publish to student.
4. **Student:** My Results shows the new Fractions Test grade with a message from Ms. Mona; My Progress has a new Math point.
5. **Parent (Ms. Marwa):** Overview, Exams → Completed and Progress show the same grade, plus the teacher's feedback and the red-flag alert.
