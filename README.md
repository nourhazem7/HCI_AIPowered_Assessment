# GradeBuddy

A front-end prototype of an AI-assisted grading app for Grades 1–5 (CSEN 909, Milestone 3).
A teacher checks the scanned text and the AI's marks before anything reaches the student. Students get results they can understand, and parents can follow progress.

## Run it

No install and no backend. Use either option:

1. Open `public/index.html` in a browser, or
2. Run `npx serve public` and open the address it prints.

## Sign in

Choose **Student**, **Teacher** or **Parent** on the first screen. The demo account details are already filled in, so just press **Sign in**. Any password works.

The app is available in English and German (EN | DE, top right).

## Demo walkthrough

One exam goes through the whole flow:

1. **Student (Younis)** uploads the Math Fractions Test.
2. **Teacher (Ms. Mona)** opens **To verify** and checks the text read from the scan.
3. The AI grades the paper. It then appears in **To review**.
4. **Teacher** reviews the marks, confirms the learning gap and red flag, and publishes.
5. **Student** sees the grade, why marks were lost and what to practise. **Parent** sees the result and the teacher's feedback.

To start again from a clean state, use **Reset demo** in Help & settings.

## Good to know

- Plain HTML, CSS and JavaScript. No dependencies.
- OCR, AI grading and red flags are simulated with demo data.

## Project structure

```
public/
  index.html   the single page (hash routes)
  css/         styles
  js/          data, core, sign-in, student, games, teacher, parent, EN/DE text
```
