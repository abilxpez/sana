# sana

Meal tracking website built with Next.js.

## Storage architecture
- Food catalog (editable): `data/foods.jsonl`
- Meal logs (source of truth): PostgreSQL via Prisma
- Batch cooks (saved recipes): PostgreSQL via Prisma

## Tech
- Next.js (App Router)
- React
- Prisma ORM
- PostgreSQL

## Setup
1. Install dependencies:
   `npm install`
2. Copy env file:
   `cp .env.example .env`
3. Start PostgreSQL (Docker):
   `docker compose up -d`
4. Generate Prisma client:
   `npm run prisma:generate`
5. Create/update database tables:
   `npm run prisma:push`
6. Sync food dataset into database:
   `npm run foods:sync`
7. Run locally:
   `npm run dev`
8. Open:
   `http://localhost:3000`

## Data files
- `data/foods.jsonl`: one JSON object per line.

Example:
`{"name":"Banana","caloriesPer100g":89,"proteinPer100g":1.1,"carbsPer100g":22.8,"fatPer100g":0.3}`

After editing `data/foods.jsonl`, run:
`npm run foods:sync`

## API routes
- `GET /api/foods?q=banana&limit=10`
- `GET /api/meals?date=YYYY-MM-DD`
- `GET /api/meals/history?start=YYYY-MM-DD&end=YYYY-MM-DD`
- `POST /api/meals`
- `GET /api/batches`
- `POST /api/batches`

### POST /api/meals body
`{"foodName":"Banana","weightGrams":120,"category":"snacks","date":"2026-02-12","caloriesOverride":105}`

`caloriesOverride` is optional. If provided, it overrides automatic calorie calculation for that meal entry.
If omitted, calories are automatically calculated when `foodName` matches an item in `foods.jsonl` (after syncing).

For batch meals, use:
`{"entryType":"batch","batchCookId":"<batch_id>","weightGrams":180,"category":"dinner","date":"2026-02-12"}`

Batch entry calories are calculated from batch totals:
`portionCalories = weightGrams * (batch.totalCalories / batch.totalWeightGrams)`

### POST /api/batches body
`{"name":"Chicken soup","servings":6,"items":[{"foodName":"Chicken breast, cooked","weightGrams":800},{"foodName":"Carrot","weightGrams":250,"caloriesOverride":100}]}`

`items` are always persisted in Postgres. Calories are computed per item from dataset match unless `caloriesOverride` is provided.
