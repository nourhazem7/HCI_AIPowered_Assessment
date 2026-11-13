'use strict';
// Demo data for GradeBuddy. Everything lives in the browser (localStorage) so the
// prototype works without a backend. "Reset demo data" in Settings restores this.
// Demo "today" is Friday 10 Oct.

/* ---------- Fractions Test template used by the teacher screens ---------- */
const FRACTIONS_QS = [
  { n: 1, text: 'Multiply 6 × 7', max: 2, topic: 'Multiplication',
    scheme: ['2 marks: correct product 42'],
    ans: { 2: '6 × 7 = 42', 1: '6 × 7 = 4?  (second digit unclear)', 0: '6 × 7 = 36' },
    why: { 2: 'Correct product (criterion 1).', 1: 'The first digit is right but the second digit can’t be read clearly.', 0: 'Wrong product.' } },
  { n: 2, text: 'Word problem: apples', max: 3, topic: 'Word problems',
    scheme: ['1 mark: correct operation (×)', '1 mark: correct working', '1 mark: answer 15 apples'],
    ans: { 3: '5 bags × 3 apples = 15 apples', 2: '5 × 3 = 15', 1: '5 + 3 = 8 apples', 0: '8' },
    why: { 3: 'Correct operation, working and answer with units.', 2: 'Correct working and answer, but no unit (criterion 3 asks for “15 apples”).', 1: 'Wrote the working out but used + instead of ×.', 0: 'Wrong operation and answer.' } },
  { n: 3, text: 'Which is bigger: 3/4 or 2/3?', max: 3, topic: 'Fractions: compare',
    scheme: ['1 mark: common denominator', '1 mark: correct comparison', '1 mark: correct answer 3/4'],
    ans: { 3: '3/4 = 9/12 and 2/3 = 8/12, so 3/4 is bigger', 2: '9/12 and 8/12 … so 2/3', 1: 'The bigger one is 2/3 because 3 > 2', 0: '2/3' },
    why: { 3: 'Used a common denominator, compared correctly, right answer.', 2: 'Found the common denominator and compared, but wrote the wrong final answer (criterion 3).', 1: 'Tried to compare (1 mark, criterion 2), but compared only the numerators and never used a common denominator (criterion 1). Final answer is wrong (criterion 3).', 0: 'No working and wrong answer.' } },
  { n: 4, text: 'Shade half of the circle', max: 2, topic: 'Fractions: halves',
    scheme: ['1 mark: shades 2 of 4 parts', '1 mark: writes 2/4 = 1/2'],
    ans: { 2: '[drawing] half shaded · 2/4 = 1/2', 1: '[drawing] half shaded', 0: '[drawing] one quarter shaded' },
    why: { 2: 'Shaded correctly and wrote the equivalent fraction.', 1: 'Shaded correctly but did not write 2/4 = 1/2 (criterion 2).', 0: 'Shaded the wrong amount.' } },
  { n: 5, text: 'Order: 1/2, 1/4, 3/4', max: 2, topic: 'Fractions: order',
    scheme: ['2 marks: correct order 1/4, 1/2, 3/4', '1 mark if only one pair is swapped'],
    ans: { 2: '1/4, 1/2, 3/4', 1: '1/4, 3/4, 1/2', 0: '3/4, 1/2, 1/4' },
    why: { 2: 'Correct order.', 1: 'Put 1/4 first correctly, but swapped 1/2 and 3/4 (one pair swapped = 1 mark).', 0: 'Ordered by the top number only.' } },
];

/* What the student sees for each wrong Fractions Test answer: FRAC_KID.why[question][marks got] */
const FRAC_KID = {
  why: {
    1: { 1: 'In question 1 one digit of 6 × 7 was hard to read.', 0: 'In question 1 the answer to 6 × 7 was not right.' },
    2: { 2: 'In question 2 you forgot to write “apples” after 15.', 1: 'In question 2 you added instead of multiplying.', 0: 'In question 2 you added instead of multiplying.' },
    3: { 2: 'In question 3 you did the working but picked the wrong answer.', 1: 'In question 3 you compared the fractions by the top number only.', 0: 'In question 3 you compared the fractions by the top number only.' },
    4: { 1: 'In question 4 you shaded half but did not write 2/4 = 1/2.', 0: 'In question 4 you shaded the wrong part of the circle.' },
    5: { 1: 'In question 5 you swapped 1/2 and 3/4.', 0: 'In question 5 you put the fractions in order by the top number only.' },
  },
  improve: {
    1: 'The 6 and 7 times tables.', 2: 'Writing the unit in word problems.', 3: 'Comparing fractions with different bottom numbers.',
    4: 'Writing equal fractions like 2/4 = 1/2.', 5: 'Putting fractions in order from smallest to biggest.',
  },
};
/* Added to the red flags when Younis's paper has been AI graded */
const YOUNIS_FLAG = { id: 'f1', sid: 's1', topic: 'Fractions: comparing', reason: 'same mistake in 3 of the last 4 exams', evidence: ['Fractions Test Q3', 'Unit 1 Q4', 'Quiz 1 Q2'], status: 'pending', isNew: true,
  also: { practice: true, parent: true, support: false } };

/* Review items: score per question; confidence per question ('high'|'medium'|'low') */
function reviewItem(id, sid, sent, scores, conf, flag) {
  return {
    id, sid, sent, exam: 'Fractions Test', subject: 'Math', flag: flag || null,
    qs: FRACTIONS_QS.map((q, i) => ({
      n: q.n, ai: scores[i], score: null, conf: conf[i],
      answer: q.ans[scores[i]], why: q.why[scores[i]],
    })),
    feedback: '', feedbackDraft: '', flagDecision: null, edited: false, status: 'review',
  };
}

/* Verify items: OCR text per page. Unclear words are written as [[word|alt1|alt2]] */
function verifyPages(name, v) {
  return [
    { n: 1, verified: v === 'omar', qs: [
      { n: 1, prompt: 'Multiply 6 × 7', text: '6 × 7 = 42' },
      { n: 2, prompt: 'Word problem: 5 bags with 3 apples each', text: v === 'omar' ? '5 × 3 = 15 apples' : '5 × 3 = [[15|16|13]] apples' },
    ] },
    { n: 2, verified: false, qs: v === 'omar' ? [
      { n: 3, prompt: 'Which is bigger: 3/4 or 2/3?', text: 'The bigger one is [[2/3|7/3|2/5]] because [[3 > 2|3 > 7|8 > 2]]' },
      { n: 4, prompt: 'Shade half of the circle', text: 'half shaded', drawing: true },
      { n: 5, prompt: 'Order: 1/2, 1/4, 3/4', text: '1/4, 1/2, 3/4' },
    ] : [
      { n: 3, prompt: 'Which is bigger: 3/4 or 2/3?', text: '3/4 is bigger because 9/12 > [[8/12|6/12|3/12]]' },
      { n: 4, prompt: 'Shade half of the circle', text: 'half shaded', drawing: true },
      { n: 5, prompt: 'Order: 1/2, 1/4, 3/4', text: '1/4, 1/2, 3/4' },
    ] },
    { n: 3, verified: false, qs: [
      { n: 6, prompt: 'Write a fraction equal to 1/2', text: '[[2/4|2/9|7/4]]' },
      { n: 7, prompt: 'What fraction of 8 sweets is 2 sweets?', text: '2/8 = 1/4' },
    ] },
    { n: 4, verified: false, qs: [
      { n: 8, prompt: 'Explain how you know 3/6 = 1/2', text: 'because 3 is half of 6' },
    ] },
  ];
}

const SEED = {
  v: 11,
  student: {
    id: 's1', name: 'Younis', full: 'Younis Hassan', short: 'Younis H.', grade: 'Grade 4', cls: '4B',
    email: 'younis@school.edu', points: 120,
    avatar: { face: 0, hair: 0, clothes: 0, hats: 0, background: 0 },
    pointsLog: [{ pts: 5, text: 'Uploaded exam on time' }, { pts: 10, text: 'Finished Fraction Pizza' }],
  },
  subjects: [
    { id: 'math', name: 'Math', teacher: 'Ms. Mona', icon: 'calc' },
    { id: 'english', name: 'English', teacher: 'Mr. Sami', icon: 'book' },
    { id: 'deutsch', name: 'Deutsch', teacher: 'Frau Weber', icon: 'chat' },
    { id: 'science', name: 'Science', teacher: 'Ms. Nada', icon: 'leaf' },
  ],
  exams: [
    { id: 'math-fractions', subject: 'math', title: 'Fractions Test', pages: 4, written: '9 Oct', status: 'upload', sendBy: 'Fri' },
    { id: 'math-decimals', subject: 'math', title: 'Decimals Test', status: 'upcoming', date: 'Fri 24 Oct', iso: '2025-10-24', days: 14, teacher: 'Ms. Mona',
      topics: 'tenths and hundredths, comparing decimals', prep: ['Find prices in a shop leaflet and say which is cheaper', 'Read the decimals on a ruler together'] },
    { id: 'math-unit2', subject: 'math', title: 'Unit 2 Quiz', pages: 4, written: '26 Sep', sent: '28 Sep', status: 'rescan', rescanPage: 3,
      note: 'Page 3 is too dark and I can’t read question 5. Please take a new photo of page 3 only.' },
    { id: 'math-mult', subject: 'math', title: 'Multiplication Test', pages: 3, written: '15 Sep', status: 'graded', score: 85, checked: '16 Sep', change: 21 },
    { id: 'math-shapes', subject: 'math', title: 'Shapes Quiz', status: 'upcoming', date: 'Mon 20 Oct', iso: '2025-10-20', days: 10, teacher: 'Ms. Mona',
      topics: '2D shapes, sides and corners, lines of symmetry', prep: ['Find 5 shapes around the house and count their corners', 'Fold a paper square to find its lines of symmetry'] },
    { id: 'en-reading', subject: 'english', title: 'Reading', pages: 2, written: '26 Sep', status: 'graded', score: 88, checked: '29 Sep', change: 3 },
    { id: 'de-woerter', subject: 'deutsch', title: 'Wörter', pages: 2, written: '23 Sep', status: 'graded', score: 64, checked: '25 Sep', change: -6 },
    { id: 'de-diktat3', subject: 'deutsch', title: 'Diktat 3', pages: 2, written: '3 Oct', status: 'upload', sendBy: 'Mon' },
    { id: 'sci-quiz2', subject: 'science', title: 'Quiz 2', pages: 2, written: '3 Oct', sent: '4 Oct', status: 'checking' },
    { id: 'sci-quiz1', subject: 'science', title: 'Quiz 1', pages: 2, written: '19 Sep', status: 'graded', score: 80, checked: '22 Sep', change: 8 },
    { id: 'sci-plants', subject: 'science', title: 'Plants', status: 'upcoming', date: 'Thu 16 Oct', iso: '2025-10-16', days: 6, teacher: 'Ms. Nada',
      topics: 'parts of a plant, what plants need, the water cycle', prep: ['Play Plant Parts (3 min) together', 'Look at a plant at home and name its parts'] },
  ],
  details: {
    'math-fractions': {
      auto: true, total: 12, got: 0, headline: '',
      next: { text: 'Play Fraction Pizza (5 min)', game: 'fraction-pizza' },
      teacherSays: 'Great work on multiplication! Next, let’s practise comparing fractions that have different bottom numbers.',
      workOn: { topic: 'Fractions: comparing', times: 3 },
      improveParent: 'Comparing fractions with different denominators',
      questions: [
        { q: 1, text: 'Multiply 6 × 7', got: 2, max: 2, your: '42', right: '42' },
        { q: 2, text: 'Word problem: apples', got: 3, max: 3, your: '15 apples', right: '15 apples' },
        { q: 3, text: 'Which is bigger: 3/4 or 2/3?', got: 1, max: 3, your: '2/3', right: '3/4 (9/12 > 8/12)',
          explain: 'You picked 2/3, but 3/4 is bigger. Make the bottom numbers the same: 3/4 = <b>9</b>/12 and 2/3 = <b>8</b>/12. 9 is more than 8!' },
        { q: 4, text: 'Shade half of the circle', got: 2, max: 2, your: '2/4 = 1/2', right: '2/4 = 1/2' },
        { q: 5, text: 'Order the fractions', got: 1, max: 2, your: '1/4, 3/4, 1/2', right: '1/4, 1/2, 3/4',
          explain: 'You put 1/4 first, well done! But you swapped 1/2 and 3/4. Half a pizza is less than three quarters, so 1/2 comes before 3/4.' },
      ],
    },
    'math-mult': {
      total: 20, got: 17, headline: 'Great job!',
      happened: 'You got 17 of 20 marks. All the times tables up to 5 were right.',
      why: 'In Q8 and Q9 you mixed up 7 × 8 and 6 × 8.',
      improve: 'The 7 and 8 times tables.', next: { text: 'Play Times Table Race (5 min)', game: 'times-race' },
      teacherSays: 'Super times tables, Younis! Keep practising the 7s and 8s.', improveParent: 'The 7 and 8 times tables',
      questions: [
        { q: 1, text: 'Times tables 2–5', got: 10, max: 10, your: 'all correct', right: 'all correct' },
        { q: 8, text: '7 × 8', got: 0, max: 2, your: '54', right: '56', explain: '7 × 8 = 56. A trick: 5, 6, 7, 8 → 56 = 7 × 8.' },
        { q: 9, text: '6 × 8', got: 1, max: 2, your: '46', right: '48', explain: '6 × 8 = 48. Double 3 × 8 (24) to get 48.' },
        { q: 10, text: 'Word problem: 4 boxes of 9 pens', got: 6, max: 6, your: '36 pens', right: '36 pens' },
      ],
    },
    'en-reading': {
      total: 25, got: 22, headline: 'Great job!',
      happened: 'You got 22 of 25 marks. You found the main idea of the story.',
      why: 'In Q4 you didn’t use words from the text to support your answer.',
      improve: 'Using evidence from the text.', next: { text: 'Play Word Builder (4 min)', game: 'word-builder' },
      teacherSays: 'Lovely reading, Younis. Remember to quote the text when you explain.', improveParent: 'Using evidence from the text',
      questions: [
        { q: 1, text: 'What is the story about?', got: 5, max: 5, your: 'A boy who finds a lost dog', right: 'A boy who finds a lost dog' },
        { q: 4, text: 'How does Sam feel? How do you know?', got: 2, max: 5, your: 'He is happy', right: 'Happy: “Sam smiled from ear to ear”',
          explain: 'You were right that Sam is happy! To get full marks, copy the words from the story that show it.' },
      ],
    },
    'de-woerter': {
      total: 25, got: 16, headline: 'Keep going!',
      happened: 'Du hast 16 von 25 Punkten. You spelled the short words well.',
      why: 'You mixed up “ie” and “ei” in 4 words.',
      improve: 'Spelling words with ie / ei.', next: { text: 'Play Wörter-Memo (5 min)', game: 'woerter-memo' },
      teacherSays: 'Gut gemacht beim Vorlesen! Übe bitte die Wörter mit ie und ei.', improveParent: 'German spelling: ie / ei',
      questions: [
        { q: 1, text: 'Schreibe: Biene', got: 0, max: 2, your: 'Beine', right: 'Biene', explain: '“Biene” (bee) has “ie”. “Beine” means legs!' },
        { q: 2, text: 'Schreibe: Haus', got: 2, max: 2, your: 'Haus', right: 'Haus' },
      ],
    },
    'sci-quiz1': {
      total: 10, got: 8, headline: 'Great job!',
      happened: 'You got 8 of 10 marks. You named all the parts of a plant.',
      why: 'In Q5 you forgot that plants need light.',
      improve: 'What plants need to grow.', next: { text: 'Play Plant Parts (3 min)', game: 'plant-parts' },
      teacherSays: 'Well done on the plant parts!', improveParent: 'What plants need to grow',
      questions: [
        { q: 1, text: 'Label the plant', got: 4, max: 4, your: 'roots, stem, leaf, flower', right: 'roots, stem, leaf, flower' },
        { q: 5, text: 'What do plants need?', got: 1, max: 3, your: 'water, soil', right: 'water, light, air', explain: 'Plants also need light (and air) to make their food.' },
      ],
    },
  },
  history: {
    math: [{ label: 'Addition', date: '1 Sep', v: 63 }, { label: 'Shapes', date: '8 Sep', v: 64 }, { label: 'Multiply', date: '15 Sep', v: 85 }, { label: 'Unit 1', date: '22 Sep', v: 70 }],
    english: [{ label: 'Spelling', date: '5 Sep', v: 78 }, { label: 'Reading 1', date: '12 Sep', v: 85 }, { label: 'Reading', date: '26 Sep', v: 88 }],
    deutsch: [{ label: 'Wörter 1', date: '4 Sep', v: 70 }, { label: 'Diktat 2', date: '12 Sep', v: 70 }, { label: 'Wörter', date: '23 Sep', v: 64 }],
    science: [{ label: 'Living things', date: '8 Sep', v: 72 }, { label: 'Quiz 1', date: '19 Sep', v: 80 }],
  },
  strengths: {
    math: ['Multiplication', 'Word problems', 'Halves'], english: ['Reading aloud', 'Finding the main idea'],
    deutsch: ['Reading aloud'], science: ['Parts of a plant'],
  },
  practise: {
    math: ['Comparing fractions', 'Ordering fractions'], english: ['Using evidence from the text'],
    deutsch: ['Spelling with ie / ei'], science: ['What plants need'],
  },
  mistakes: [
    { id: 'm1', subject: 'math', times: 2, text: 'Looking only at the top number when comparing fractions', where: 'Unit 1 · Quiz 1', game: 'fraction-pizza',
      parentText: 'He looks only at the top number when comparing fractions (e.g. thinks 2/3 > 3/4).',
      help: ['Cut a paper “pizza” into 4 and another into 3. Which is bigger: 3 of the 4 pieces, or 2 of the 3?', 'Play Fraction Pizza together (5 min). It is in Younis’s Games.', 'Ask him to explain which fraction is bigger, and why, in his own words.'] },
    { id: 'm2', subject: 'math', times: 2, text: 'Forgetting to carry the 1 in addition', where: 'Addition · Unit 1',
      explain: 'When a column adds up to 10 or more, write the ones and carry the 1 to the next column. Example: 27 + 15 → 7 + 5 = 12, write 2, carry 1 → 2 + 1 + 1 = 4 → 42.',
      parentText: 'He sometimes forgets to carry the 1 in column addition.', help: ['Do 3 column additions together each evening and say “carry the one” out loud.'] },
    { id: 'm3', subject: 'deutsch', times: 2, text: 'Mixing up “ie” and “ei”', where: 'Wörter · Diktat 2', game: 'woerter-memo',
      parentText: 'He mixes up “ie” and “ei” in German spelling.', help: ['Say the word slowly: “ie” sounds like a long “i”, “ei” sounds like “eye”.', 'Play Wörter-Memo together.'] },
  ],
  games: [
    { id: 'fraction-pizza', title: 'Fraction Pizza', subject: 'math', mins: 5, pts: 10, helps: 'comparing fractions', played: 1, picked: true },
    { id: 'times-race', title: 'Times Table Race', subject: 'math', mins: 5, pts: 10, helps: 'times tables', played: 3 },
    { id: 'word-builder', title: 'Word Builder', subject: 'english', mins: 4, pts: 10, helps: 'spelling', played: 0 },
    { id: 'woerter-memo', title: 'Wörter-Memo', subject: 'deutsch', mins: 5, pts: 10, helps: 'German words', played: 0 },
    { id: 'plant-parts', title: 'Plant Parts', subject: 'science', mins: 3, pts: 10, helps: 'parts of a plant', played: 1 },
  ],
  inbox: [
    { id: 'n2', kind: 'teacher', icon: 'target', html: '<b>Ms. Mona</b> sent you practice: <b>Comparing fractions</b>', sub: '“Try Fraction Pizza before Friday!”', short: 'New practice: Comparing fractions', time: '9:12', day: 'today', when: 'Today', unread: true, action: { label: 'Practise', href: '/student/play/fraction-pizza' } },
    { id: 'n3', kind: 'reward', icon: 'star', html: 'You got <b>+5 points</b> for uploading on time!', day: 'today', unread: true },
    { id: 'n4', kind: 'teacher', icon: 'camera', html: '<b>Ms. Mona</b> needs a new photo of page 3 of your <b>Unit 2 Quiz</b>.', short: 'Unit 2 Quiz: please retake page 3', time: 'Wed', day: 'earlier', when: 'Wednesday', unread: false, action: { label: 'Take photo', href: '/student/exam/math-unit2' } },
    { id: 'n5', kind: 'teacher', icon: 'calendar', html: 'Science exam on <b>Thursday</b> · Ms. Nada', short: 'Science exam on Thursday', day: 'earlier', when: 'Tuesday', unread: false },
  ],
  classmates: [
    { name: 'Youssef', pts: 160, avatar: { face: 1, hair: 2, clothes: 1, hats: 1, background: 1 } },
    { name: 'Lina', pts: 140, avatar: { face: 0, hair: 1, clothes: 2, hats: 0, background: 2 } },
    { name: 'Omar', pts: 110, avatar: { face: 2, hair: 0, clothes: 1, hats: 2, background: 0 } },
    { name: 'Sara', pts: 95, avatar: { face: 1, hair: 1, clothes: 0, hats: 0, background: 1 } },
  ],
  intro: {},
  star: { name: 'Youssef', reason: 'Most practice this week', week: '6 Oct' },

  /* ---------------- Teacher ---------------- */
  teacher: {
    name: 'Ms. Mona', full: 'Mona Aly', email: 'mona@school.edu', cls: '4B',
    roster: [
      { id: 's1', short: 'Younis H.', parent: 'Ms. Marwa', m: [90, 45, 85, 80], exams: 6 },
      { id: 's2', short: 'Omar K.', parent: 'Mr. Karim', m: [80, 60, 55, 95], exams: 6 },
      { id: 's3', short: 'Lina S.', parent: 'Ms. Dina', m: [95, 75, 80, 85], exams: 6 },
      { id: 's4', short: 'Youssef M.', parent: 'Mr. Tarek', m: [100, 58, 78, 92], exams: 6 },
      { id: 's5', short: 'Sara H.', parent: 'Ms. Rania', m: [92, 88, 90, 86], exams: 6 },
      { id: 's6', short: 'Mariam T.', parent: 'Ms. Heba', m: [85, 52, 70, 88], exams: 5 },
      { id: 's7', short: 'Karim N.', parent: 'Mr. Adel', m: [70, 48, 62, 75], exams: 6 },
      { id: 's8', short: 'Nour E.', parent: 'Ms. Salma', m: [88, 55, 82, 90], exams: 6 },
      { id: 's9', short: 'Ziad W.', parent: 'Mr. Hany', m: [76, 50, 58, 80], exams: 6 },
      { id: 's10', short: 'Hana B.', parent: 'Ms. Nermine', m: [94, 62, 88, 93], exams: 6 },
    ],
    topics: ['Multiply', 'Fractions', 'Word prob.', 'Shapes'],
    termAvg: [{ label: 'Addition', v: 74 }, { label: 'Shapes', v: 80 }, { label: 'Multiply', v: 86 }, { label: 'Unit 1', v: 76 }, { label: 'Fractions', v: 59 }],
    verify: [
      { id: 'v-omar', sid: 's2', sent: '2 Oct', pages: verifyPages('Omar', 'omar'), status: 'verify' },
      { id: 'v-lina', sid: 's3', sent: '3 Oct', pages: verifyPages('Lina'), status: 'verify' },
      { id: 'v-mariam', sid: 's6', sent: '3 Oct', pages: verifyPages('Mariam'), status: 'verify' },
      { id: 'v-ziad', sid: 's9', sent: '4 Oct', pages: verifyPages('Ziad'), status: 'verify' },
    ],
    review: [
      reviewItem('r-karim', 's7', '2 Oct', [2, 2, 1, 2, 1], ['high', 'high', 'medium', 'high', 'high']),
      reviewItem('r-youssef', 's4', '3 Oct', [2, 3, 2, 2, 2], ['high', 'high', 'high', 'high', 'high']),
      reviewItem('r-nour', 's8', '3 Oct', [2, 3, 2, 2, 1], ['high', 'high', 'high', 'high', 'high']),
      reviewItem('r-hana', 's10', '3 Oct', [2, 3, 3, 2, 2], ['high', 'high', 'high', 'high', 'high']),
    ],
    grading: [],
    published: [{ sid: 's5', sent: '1 Oct', score: 92 }],
    publishedWeek: 40, examsWeek: 52,
    flags: [
      { id: 'f2', sid: 's2', topic: 'Reading (Deutsch)', reason: 'score dropped 20%', evidence: ['Wörter Q2', 'Diktat 2 Q1'], status: 'pending',
        also: { practice: true, parent: true, support: false } },
      { id: 'f3', sid: 's7', topic: 'Word problems', reason: 'skipped units in 4 of the last 5 exams', evidence: ['Fractions Test Q2', 'Unit 1 Q6'], status: 'pending',
        also: { practice: true, parent: false, support: false } },
      { id: 'f4', sid: 's1', topic: 'Fractions: ordering', reason: 'same mistake in 2 exams', evidence: ['Unit 1 Q5'], status: 'confirmed', date: '2 Oct', note: 'practice sent · after-school support suggested' },
      { id: 'f5', sid: 's9', topic: 'Fractions: comparing', reason: 'score below 50% twice', evidence: ['Unit 1 Q4'], status: 'confirmed', date: '30 Sep', note: 'practice sent' },
      { id: 'f6', sid: 's6', topic: 'Addition: carrying', reason: 'same mistake in 3 exams', evidence: ['Addition Q3'], status: 'confirmed', date: '24 Sep', note: 'practice sent' },
      { id: 'f7', sid: 's4', topic: 'Word problems', reason: 'score dropped 15%', evidence: ['Unit 1 Q6'], status: 'confirmed', date: '22 Sep', note: 'parent notified' },
      { id: 'f8', sid: 's8', topic: 'Shapes', reason: 'low score once', evidence: ['Shapes Q2'], status: 'confirmed', date: '15 Sep', note: 'practice sent' },
      { id: 'f9', sid: 's5', topic: 'Multiplication', reason: 'score dropped 12%', evidence: ['Multiply Q4'], status: 'dismissed', date: '18 Sep', note: 'Careless mistake, not a gap' },
      { id: 'f10', sid: 's3', topic: 'Halves', reason: 'one wrong answer', evidence: ['Fractions Q4'], status: 'dismissed', date: '12 Sep', note: 'AI is wrong' },
    ],
    gaps: {
      s1: [{ topic: 'Fractions: compare', status: 'confirmed' }, { topic: 'Fractions: order', status: 'suggested' }],
    },
    notes: { s1: 'Responds well to visual explanations (pizza / paper strips). Mum is very involved.' },
    conversations: [
      { id: 'c1', title: 'Younis H.', to: ['s1'], kind: 'student', preview: 'Seen · practice sent', unread: 0,
        thread: [{ me: true, type: 'Practice', text: 'Let’s practise comparing fractions! Try Fraction Pizza before Friday.', attach: 'Fraction Pizza', time: 'Today 9:12' }] },
      { id: 'c2', title: 'Mr. Karim', kind: 'parent', sub: '(parent)', to: ['s2'], preview: 'Thank you, we’ll…', unread: 1,
        thread: [{ me: true, type: 'Comment', text: 'Omar’s Deutsch reading score dropped this week. Could you read with him for 10 minutes a day?', time: 'Mon 14:30' },
          { me: false, text: 'Thank you, we’ll read together every evening this week.', time: 'Mon 19:02' }] },
      { id: 'c3', title: 'Fractions group', kind: 'group', count: 7, to: ['s1', 's2', 's4', 's6', 's7', 's8', 's9'], preview: 'Reminder sent', unread: 0,
        thread: [{ me: true, type: 'Reminder', text: 'Don’t forget to send your Fractions Test photos by Friday!', time: 'Wed 8:00' }] },
    ],
    posts: [
      { id: 'p1', author: 'Ms. Mona', when: 'Yesterday', date: '9 Oct', audience: 'Students + parents', text: 'Our science trip to the garden is on Monday! Please bring a cap.', photo: 'garden', likes: 6, liked: false,
        comments: [{ who: 'Ms. Marwa', text: 'Thank you! Younis is very excited.' }, { who: 'Mr. Karim', text: 'Do they need to bring lunch?' }, { who: 'Ms. Mona', text: 'Yes please, a small packed lunch.' }] },
      { id: 'p2', author: 'Ms. Mona', when: 'Mon', date: '6 Oct', week: '6 Oct', audience: 'Students + parents', text: 'Star of the Week: Youssef! He practised every day this week.', star: 'Youssef', likes: 11, liked: false, comments: [] },
    ],
    schemes: [
      { id: 'ex1', subject: 'Math', cls: '4B', lang: 'English', title: 'Fractions Test', pages: 4, sendBy: '2025-10-10', status: 'open',
        qs: FRACTIONS_QS.map((q) => ({ n: q.n, marks: q.max, criteria: q.scheme.join(' · '), topic: q.topic })) },
      { id: 'ex2', subject: 'Math', cls: '4B', lang: 'English', title: 'Decimals Test', pages: 4, sendBy: '2025-10-17', status: 'open',
        qs: [{ n: 1, marks: 2, criteria: 'Correct place value (2)', topic: 'Decimals' }] },
      { id: 'ex3', subject: 'Math', cls: '4B', lang: 'English', title: 'Unit 2 Quiz', pages: 4, sendBy: '2025-09-28', status: 'closed',
        qs: [{ n: 1, marks: 3, criteria: 'Correct answer (3)', topic: 'Multiplication' }] },
      { id: 'ex4', subject: 'Math', cls: '4A', lang: 'Deutsch', title: 'Brüche Test', pages: 3, sendBy: '2025-10-14', status: 'draft',
        qs: [{ n: 1, marks: 2, criteria: 'Richtiger Vergleich (2)', topic: 'Fractions: compare' }] },
    ],
    notifs: [
      { id: 't1', text: 'Grading finished for 3 Fractions Test papers', unread: true, href: '/teacher/review' },
      { id: 't2', text: 'Mr. Karim replied to your message', unread: true, href: '/teacher/messages/c2' },
      { id: 't4', text: 'Ziad W. uploaded the Fractions Test', unread: true, href: '/teacher/verify' },
      { id: 't5', text: 'Lina S. uploaded the Fractions Test', unread: true, href: '/teacher/verify' },
    ],
  },

  /* ---------------- Parent ---------------- */
  parent: {
    name: 'Ms. Marwa', full: 'Marwa Mostafa', email: 'marwa@family.com',
    children: [{ id: 's1', name: 'Younis', grade: 'Grade 4' }, { id: 'k2', name: 'Adam', grade: 'Grade 2' }],
    alerts: [],
    notes: [
      { id: 'pn2', child: 's1', teacher: 'Frau Weber', subject: 'deutsch', date: '26 Sep', type: 'Comment', text: 'Younis reads aloud much more confidently now.', replies: [] },
      { id: 'pn3', child: 'k2', teacher: 'Ms. Laila', subject: 'english', date: '1 Oct', type: 'Comment', text: 'Adam loves story time and always shares ideas.', replies: [] },
    ],
    notifs: [],
    adam: {
      exams: [
        { id: 'a1', subject: 'math', title: 'Adding to 20', status: 'graded', score: 90, checked: '2 Oct', change: 4, teacher: 'Ms. Laila', feedback: 'Adam adds quickly and neatly.', improve: 'Counting on past 10' },
        { id: 'a2', subject: 'english', title: 'Phonics', status: 'graded', score: 82, checked: '29 Sep', change: 2, teacher: 'Ms. Laila', feedback: 'Great sounding out!', improve: 'Tricky words: “said”, “they”' },
        { id: 'a3', subject: 'deutsch', title: 'Buchstaben', status: 'graded', score: 76, checked: '25 Sep', change: -3, teacher: 'Frau Weber', feedback: 'Schöne Schrift!', improve: 'Capital letters' },
        { id: 'a4', subject: 'science', title: 'My body', status: 'upcoming', date: 'Wed 15 Oct', iso: '2025-10-15', days: 5, teacher: 'Ms. Laila', topics: 'body parts, the five senses', prep: ['Name the five senses at dinner', 'Draw and label a body together'] },
      ],
      history: { math: [{ label: 'Counting', date: '3 Sep', v: 82 }, { label: 'Number bonds', date: '17 Sep', v: 86 }, { label: 'Adding to 20', date: '2 Oct', v: 90 }],
        english: [{ label: 'Letters', date: '10 Sep', v: 80 }, { label: 'Phonics', date: '29 Sep', v: 82 }],
        deutsch: [{ label: 'Laute', date: '11 Sep', v: 79 }, { label: 'Buchstaben', date: '25 Sep', v: 76 }], science: [{ label: 'Seasons', date: '20 Sep', v: 85 }] },
      strong: ['adding', 'story time'], needs: ['capital letters', 'tricky words'],
      mistakes: [{ times: 2, subject: 'deutsch', parentText: 'He starts nouns with a small letter in German.', help: ['In German every noun starts with a capital letter. Point out nouns on shop signs together.'] }],
    },
  },
};
