export function normalizeFoodName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function calculateCalories(weightGrams, caloriesPer100g) {
  return Number(((weightGrams * caloriesPer100g) / 100).toFixed(2));
}

export function getUtcDayRange(dateString) {
  const start = new Date(`${dateString}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}
