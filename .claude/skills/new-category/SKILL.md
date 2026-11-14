---
name: new-category
description: Build, verify and add a new trivia question category (or rebuild an existing one) to the Mn Alwahsh game. Use when asked to add, fix, expand or unhide a question category.
---

# Add or fix a question category

## 1. Rules every question must follow
- Clear wording, no hints.
- Four options of about the same length (differ by at most one word).
- The correct answer is never the longest option and is never copied from the question.
- Every fact is correct and comes from more than one source. Drop anything you can't confirm.
- No duplicate questions inside a category.

## 2. Data format (Supabase, tools in tools/question-qa/)
- Table `Sin-Jim1` (question column `question`). The `kids` table uses `questions`.
- Row: category, points, slot, question, option_a..option_d, correct_answer, used, report_count.
- `correct_answer` is always `A`; the app shuffles the options.
- Points: 200 easy, 400 medium, 600 hard. Aim for 60 per tier and 180 total.
- Slot alternates `A` and `B` within each tier.

## 3. Steps
1. Research. Fetch at least two sources (for example Wikipedia plus a second site). Note which facts are single-source.
2. Write the questions in a Python file as `(question, [correct, wrong, wrong, wrong])`, grouped by tier.
   - Pick distractors that are plausible but clearly wrong.
   - Do not use a distractor that could also be correct.
3. Run `validate.py` (`problems(q, options)`) on every question and fix each failure.
4. Apply to the database with the helper scripts:
   - Back up the old rows to `tools/question-qa/backups/` (gitignored).
   - Delete the old rows and insert the new ones. For a new category the template row comes from an existing one.
5. Re-read the live rows, validate them again, and check the counts and duplicates.
6. Register it in the app:
   - Add the name to a group in `src/components/game/CategoryPicker.jsx`.
   - Add an icon in `src/utils/categoryIcons.js`.
   - Leave it out of `premiumConfig.js` and `hiddenCategories.js` if it should be free and visible.
7. Commit the scripts and the app changes, push, and open a pull request.

## 4. Honesty rules
- If you can't verify enough facts for 180, stop at the verified count and report the number and the reason. Never pad with unchecked questions.
- Current-state facts (a player's current club, for example) can go stale. Confirm them with a news source and state the date.
- Say which questions are single-source or from general knowledge.
