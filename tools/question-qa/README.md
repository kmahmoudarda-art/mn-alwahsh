# Question QA tools

Python scripts used to audit, rewrite and top up the Supabase question tables.

- `validate.py` – rules: no empty/duplicate options, word counts within 1 of each other and the correct answer never the longest option, an answer word found in the question must appear in every option.
- `fill.py` – `replace_invalid(table, cat, newqs, target=180)` keeps valid rows, adds new validated ones, deletes only as many invalid rows as it adds.
- `status.py` – `status(table, cat)` -> (rows, valid).
- `newcat.py` – `insert_new(cat, list)` for brand-new categories.
- `retier.py` – re-ranks points: 200 easy, 400 medium, 600 hard (applied so far only to عواصم ودول and عملات العالم).
- Other files are question batches (`list of (question, [correct, wrong, wrong, wrong])`).

Auth: requests send header `apikey` (set via the environment credential). Never commit keys.

## Remaining work (target 180 valid questions per category)
New: رمضان، الكويت، عُمان، سوريا، لبنان، السعودية، فلسطين (~40 each), كائنات البحر 49، أرقام قياسية 43, شعر عربي، أمثال شعبية، أكلات العالم، حقائق مجنونة، جسم الإنسان، اختراعات، الفضاء، لغة عربية.
Old: WildRift, رياضة, أكل عربي, الإمارات, دبي, الأردن, بريكينج باد, Friends, بيكي بلايندرز, نتفليكس, عمرو دياب, تامر حسني, عبد الحليم, أم كلثوم, بريزون بريك, حمو بيكا, مسلسلات تركية, أفلام, أغاني, مسرحيات, Arab Idol, Arab Got Talent, سبيستون, Dubai Bling, فلسفة, فنانون عرب, أعلام العالم.
Then re-tier difficulty everywhere.
