PS 1 — "LevelUp": Gamified Learning Platform
Build an edtech web app that makes learning a subject feel like playing a game.
Core Requirements (must-have)
Topic selection — user picks a subject/topic (e.g. "DBMS Normalization", "Photosynthesis", "React Hooks").
LLM-generated content — call an LLM API to generate:
A short lesson/explainer for the topic
A quiz (5 MCQs) based on that lesson
Gamification layer — at minimum three of:
XP points per correct answer
Streak counter
Levels / progress bar
Badges on milestones
Leaderboard (can be local/mock users)
Polished UI — animations, consistent theme, responsive. This PS is UI-weighted.
Progress persistence — XP/streak/badges survive a page refresh.
Bonus (if time permits)
LLM-powered "explain why my answer was wrong"
Difficulty adapts based on accuracy
Daily challenge / timed mode
 
PS 2 — "SpendSense": AI Expense Tracker
Build an expense tracker with a real database and an AI analyst layer.
Core Requirements (must-have)
Database is mandatory — SQLite (via sql.js / better-sqlite3 / Prisma-lite / any in-browser SQLite). Must have at least:
transactions (id, amount, category, description, date, type)
categories or budgets table
Working CRUD — add, edit, delete, list
Manual data input is mandatory — the app must have a working "Add Expense" form where the user enters amount, category, description, date and type. On submit, the record must be written to the DB and immediately reflected in the table, the charts and the LLM analysis. Requirements:
Basic validation (no empty amount, no negative values, valid date, category required)
Categories selectable from a dropdown sourced from the DB, not a hardcoded array in the JSX
Newly added entries must survive a page refresh
Edit and delete must work on user-entered rows, not just seeded ones
Seed with mock data — pre-load 50–100 realistic transactions across ≥6 categories spanning ≥3 months (a seed script is fine). Judges should see a populated app on load, then be able to add their own entry on top of it.
Filtering & querying — filter by date range, category, and type via actual SQL queries (not JS array filtering).
Visualizations — at least 2 charts (category pie/donut, monthly spend trend).
LLM analysis — feed aggregated data (not raw dumps) to the LLM to produce:
A natural-language spending summary
2–3 actionable saving suggestions
Ask-your-data: user types "How much did I spend on food in June?" → LLM answers using the queried data
Bonus (if time permits)
LLM auto-categorizes a new expense from its description
Bulk input — paste multiple expenses as text, LLM parses them into rows
Budget alerts / overspend warnings
Anomaly detection ("this month's travel is 3x your average")
Export to CSV
