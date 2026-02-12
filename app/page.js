"use client";

import { useEffect, useMemo, useState } from "react";

const CATEGORIES = [
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snacks", label: "Snacks" },
];

function getDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(date) {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateKeyFull(dateKey) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  return date.toLocaleDateString(undefined, {
    timeZone: "UTC",
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateKeyLabel(dateKey) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  return date.toLocaleDateString(undefined, {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function normalizeName(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function calculateCalories(weightGrams, caloriesPer100g) {
  return Number(((weightGrams * caloriesPer100g) / 100).toFixed(2));
}

function startOfWeekUtc(date) {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay();
  utc.setUTCDate(utc.getUTCDate() - day);
  return utc;
}

function addUtcDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("meals");
  const [selectedDate] = useState(new Date());
  const [mealDateKey, setMealDateKey] = useState(() => getDateKey(new Date()));

  const [mealForm, setMealForm] = useState({
    entryType: "food",
    name: "",
    batchCookId: "",
    weight: "",
    calories: "",
    category: "lunch",
  });
  const [mealEntries, setMealEntries] = useState([]);
  const [isLoadingMeals, setIsLoadingMeals] = useState(true);
  const [mealError, setMealError] = useState("");

  const [batchMeta, setBatchMeta] = useState({
    name: "",
    servings: "",
  });
  const [batchForm, setBatchForm] = useState({
    name: "",
    weight: "",
    calories: "",
  });
  const [batchItems, setBatchItems] = useState([]);
  const [batchError, setBatchError] = useState("");
  const [batchMessage, setBatchMessage] = useState("");
  const [savedBatches, setSavedBatches] = useState([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(true);

  const [historyWeekOffset, setHistoryWeekOffset] = useState(0);
  const [historyDays, setHistoryDays] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const mealTotalWeight = mealEntries.reduce((sum, item) => sum + item.weightGrams, 0);
  const mealTotalCalories = mealEntries.reduce((sum, item) => sum + (item.calories || 0), 0);

  const batchTotalWeight = batchItems.reduce((sum, item) => sum + item.weightGrams, 0);
  const batchTotalCalories = batchItems.reduce((sum, item) => sum + (item.calories || 0), 0);
  const parsedServings = Number(batchMeta.servings);
  const caloriesPerServing = Number.isFinite(parsedServings) && parsedServings > 0 ? batchTotalCalories / parsedServings : null;

  const historyWeekStart = useMemo(() => {
    const weekStart = startOfWeekUtc(selectedDate);
    return addUtcDays(weekStart, historyWeekOffset * -7);
  }, [selectedDate, historyWeekOffset]);
  const historyWeekEnd = useMemo(() => addUtcDays(historyWeekStart, 6), [historyWeekStart]);
  const historyStartKey = useMemo(() => getDateKey(historyWeekStart), [historyWeekStart]);
  const historyEndKey = useMemo(() => getDateKey(historyWeekEnd), [historyWeekEnd]);

  const weeklyCalories = historyDays.reduce((sum, day) => sum + (day.totalCalories || 0), 0);
  const weeklyWeight = historyDays.reduce((sum, day) => sum + (day.totalWeight || 0), 0);

  useEffect(() => {
    let isMounted = true;

    async function run() {
      setIsLoadingMeals(true);
      setMealError("");

      try {
        const response = await fetch(`/api/meals?date=${mealDateKey}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to fetch entries");
        }

        const data = await response.json();
        if (isMounted) {
          setMealEntries(data.entries || []);
        }
      } catch {
        if (isMounted) {
          setMealError("Could not load meals.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingMeals(false);
        }
      }
    }

    run();

    return () => {
      isMounted = false;
    };
  }, [mealDateKey]);

  useEffect(() => {
    let isMounted = true;

    async function run() {
      setIsLoadingBatches(true);
      try {
        const response = await fetch("/api/batches", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to fetch batches");
        }
        const data = await response.json();
        if (isMounted) {
          setSavedBatches(data.batches || []);
        }
      } catch {
        if (isMounted) {
          setBatchError("Could not load saved batches.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingBatches(false);
        }
      }
    }

    run();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (activeTab !== "history") {
      return;
    }

    let isMounted = true;

    async function run() {
      setIsLoadingHistory(true);
      setHistoryError("");

      try {
        const response = await fetch(`/api/meals/history?start=${historyStartKey}&end=${historyEndKey}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to fetch history");
        }

        const data = await response.json();
        if (isMounted) {
          setHistoryDays(data.days || []);
        }
      } catch {
        if (isMounted) {
          setHistoryError("Could not load weekly history.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingHistory(false);
        }
      }
    }

    run();

    return () => {
      isMounted = false;
    };
  }, [activeTab, historyStartKey, historyEndKey]);

  function onMealFormChange(event) {
    const { name, value } = event.target;
    setMealForm((prev) => {
      if (name === "entryType") {
        return {
          ...prev,
          entryType: value,
          name: "",
          batchCookId: "",
          calories: "",
        };
      }
      return { ...prev, [name]: value };
    });
  }

  async function onMealSubmit(event) {
    event.preventDefault();
    setMealError("");

    const trimmedName = mealForm.name.trim();
    const parsedWeight = Number(mealForm.weight);
    const isBatchEntry = mealForm.entryType === "batch";
    const hasCaloriesOverride = mealForm.calories.trim() !== "";
    const parsedCalories = hasCaloriesOverride ? Number(mealForm.calories) : null;

    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setMealError("Please enter a valid positive weight.");
      return;
    }
    if (!isBatchEntry && !trimmedName) {
      setMealError("Please enter a food name.");
      return;
    }
    if (!isBatchEntry && hasCaloriesOverride && (!Number.isFinite(parsedCalories) || parsedCalories < 0)) {
      setMealError("Calories override must be a non-negative number.");
      return;
    }
    if (isBatchEntry && !mealForm.batchCookId) {
      setMealError("Please select a batch cook.");
      return;
    }
    if (isBatchEntry && savedBatches.length === 0) {
      setMealError("No saved batches found. Create one in the Batch Cook tab first.");
      return;
    }

    try {
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entryType: isBatchEntry ? "batch" : "food",
          foodName: isBatchEntry ? null : trimmedName,
          batchCookId: isBatchEntry ? mealForm.batchCookId : null,
          weightGrams: parsedWeight,
          category: mealForm.category,
          date: mealDateKey,
          caloriesOverride: !isBatchEntry && hasCaloriesOverride ? parsedCalories : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save entry");
      }

      const data = await response.json();
      setMealEntries((prev) => [...prev, data.entry]);
      setMealForm((prev) => ({ ...prev, name: "", batchCookId: "", weight: "", calories: "" }));
    } catch {
      setMealError("Could not save this entry.");
    }
  }

  function onBatchMetaChange(event) {
    const { name, value } = event.target;
    setBatchMeta((prev) => ({ ...prev, [name]: value }));
    setBatchMessage("");
  }

  function onBatchFormChange(event) {
    const { name, value } = event.target;
    setBatchForm((prev) => ({ ...prev, [name]: value }));
    setBatchMessage("");
  }

  async function onBatchSubmit(event) {
    event.preventDefault();
    setBatchError("");
    setBatchMessage("");

    const trimmedName = batchForm.name.trim();
    const parsedWeight = Number(batchForm.weight);
    const hasCaloriesOverride = batchForm.calories.trim() !== "";
    const parsedOverrideCalories = hasCaloriesOverride ? Number(batchForm.calories) : null;

    if (!trimmedName || !Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setBatchError("Ingredient name and a positive weight are required.");
      return;
    }

    if (hasCaloriesOverride && (!Number.isFinite(parsedOverrideCalories) || parsedOverrideCalories < 0)) {
      setBatchError("Calories override must be a non-negative number.");
      return;
    }

    let resolvedCalories = parsedOverrideCalories;
    let source = "override";

    if (!hasCaloriesOverride) {
      try {
        const response = await fetch(`/api/foods?q=${encodeURIComponent(trimmedName)}&limit=20`, { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          const matchedFood = (data.foods || []).find((food) => normalizeName(food.name) === normalizeName(trimmedName));
          resolvedCalories = matchedFood ? calculateCalories(parsedWeight, matchedFood.caloriesPer100g) : null;
          source = matchedFood ? "dataset" : "unmatched";
        } else {
          resolvedCalories = null;
          source = "unmatched";
        }
      } catch {
        resolvedCalories = null;
        source = "unmatched";
      }
    }

    const nextItem = {
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      foodName: trimmedName,
      weightGrams: parsedWeight,
      calories: resolvedCalories,
      source,
      caloriesOverride: hasCaloriesOverride ? parsedOverrideCalories : null,
    };

    setBatchItems((prev) => [...prev, nextItem]);
    setBatchForm((prev) => ({ ...prev, name: "", weight: "", calories: "" }));
  }

  function removeBatchItem(itemId) {
    setBatchItems((prev) => prev.filter((item) => item.id !== itemId));
    setBatchMessage("");
  }

  function clearCurrentBatch() {
    setBatchItems([]);
    setBatchMeta({ name: "", servings: "" });
    setBatchForm({ name: "", weight: "", calories: "" });
    setBatchError("");
    setBatchMessage("Batch builder cleared.");
  }

  async function saveCurrentBatch() {
    setBatchError("");
    setBatchMessage("");

    if (batchItems.length === 0) {
      setBatchError("Add at least one ingredient before saving.");
      return;
    }

    const batchName = batchMeta.name.trim() || `Batch ${savedBatches.length + 1}`;
    const servings = Number(batchMeta.servings);
    const normalizedServings = Number.isFinite(servings) && servings > 0 ? servings : null;

    try {
      const response = await fetch("/api/batches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: batchName,
          servings: normalizedServings,
          items: batchItems.map((item) => ({
            foodName: item.foodName,
            weightGrams: item.weightGrams,
            caloriesOverride: item.caloriesOverride,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save batch");
      }

      const data = await response.json();
      setSavedBatches((prev) => [data.batch, ...prev]);
      clearCurrentBatch();
      setBatchMessage(`Saved "${batchName}" to Postgres.`);
    } catch {
      setBatchError("Could not save batch.");
    }
  }

  async function deleteHistoryEntry(entryId, dayDate) {
    setHistoryError("");

    try {
      const response = await fetch(`/api/meals/${entryId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete history entry");
      }

      setHistoryDays((prev) =>
        prev.map((day) => {
          if (day.date !== dayDate) {
            return day;
          }

          const nextEntries = (day.entries || []).filter((entry) => entry.id !== entryId);
          const totalWeight = nextEntries.reduce((sum, item) => sum + item.weightGrams, 0);
          const totalCalories = nextEntries.reduce((sum, item) => sum + (item.calories || 0), 0);

          return {
            ...day,
            entries: nextEntries,
            totalWeight,
            totalCalories,
          };
        })
      );

      if (dayDate === mealDateKey) {
        setMealEntries((prev) => prev.filter((entry) => entry.id !== entryId));
      }
    } catch {
      setHistoryError("Could not delete history entry.");
    }
  }

  function renderHistoryDay(day) {
    return (
      <article className="history-day-card" key={day.date}>
        <div className="panel-head history-day-head">
          <h3>{formatDateKeyLabel(day.date)}</h3>
          <p className="total">{Math.round(day.totalCalories || 0)} kcal</p>
        </div>
        <p className="kcal">{Math.round(day.totalWeight || 0)} g total</p>

        <div className="history-category-grid">
          {CATEGORIES.map((category) => {
            const categoryItems = (day.entries || []).filter((item) => item.category === category.key);
            const categoryCalories = categoryItems.reduce((sum, item) => sum + (item.calories || 0), 0);

            return (
              <section className="history-category-card" key={`${day.date}-${category.key}`}>
                <div className="category-head">
                  <h4>{category.label}</h4>
                  <span>{Math.round(categoryCalories)} kcal</span>
                </div>
                {categoryItems.length > 0 ? (
                  <ul className="history-item-list">
                    {categoryItems.map((item) => (
                      <li key={item.id}>
                        <span>{item.foodName}</span>
                        <div className="history-item-actions">
                          <span>{Math.round(item.weightGrams)} g</span>
                          <button type="button" className="delete-btn" onClick={() => deleteHistoryEntry(item.id, day.date)}>
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty">No items.</p>
                )}
              </section>
            );
          })}
        </div>
      </article>
    );
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Daily Nutrition</p>
          <h1>Meal Tracker</h1>
        </div>
        <p className="today">{formatDate(selectedDate)}</p>
      </header>

      <section className="tab-bar" aria-label="Home sections">
        <button type="button" className={activeTab === "meals" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("meals")}>Meals</button>
        <button type="button" className={activeTab === "batch" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("batch")}>Batch Cook</button>
        <button type="button" className={activeTab === "history" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("history")}>History</button>
      </section>

      {activeTab === "meals" ? (
        <>
          <section className="panel add-panel" aria-labelledby="addMealHeading">
            <h2 id="addMealHeading">Add Meal Item</h2>
            <form className="meal-form" onSubmit={onMealSubmit}>
              <label>
                Entry type
                <select name="entryType" value={mealForm.entryType} onChange={onMealFormChange} required>
                  <option value="food">Single food</option>
                  <option value="batch">Batch cook</option>
                </select>
              </label>

              {mealForm.entryType === "food" ? (
                <label>
                  Item name
                  <input name="name" type="text" placeholder="e.g. Grilled chicken" value={mealForm.name} onChange={onMealFormChange} required />
                </label>
              ) : (
                <label>
                  Batch cook
                  <select name="batchCookId" value={mealForm.batchCookId} onChange={onMealFormChange} required disabled={savedBatches.length === 0}>
                    <option value="">Select batch</option>
                    {savedBatches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label>
                {mealForm.entryType === "batch" ? "Portion (g)" : "Weight (g)"}
                <input name="weight" type="number" min="1" step="1" placeholder={mealForm.entryType === "batch" ? "e.g. 180" : "e.g. 150"} value={mealForm.weight} onChange={onMealFormChange} required />
              </label>

              <label>
                Category
                <select name="category" value={mealForm.category} onChange={onMealFormChange} required>
                  {CATEGORIES.map((category) => (
                    <option key={category.key} value={category.key}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>

              {mealForm.entryType === "food" ? (
                <label>
                  Calories (kcal, optional)
                  <input name="calories" type="number" min="0" step="1" placeholder="Overrides auto-calc" value={mealForm.calories} onChange={onMealFormChange} />
                </label>
              ) : (
                <label>
                  Calories source
                  <input value="From selected batch total" readOnly />
                </label>
              )}

              <label>
                Date
                <input type="date" value={mealDateKey} onChange={(event) => setMealDateKey(event.target.value)} required />
              </label>

              <button type="submit">Add Item</button>
            </form>
            {mealForm.entryType === "batch" && savedBatches.length === 0 ? <p className="form-message">No batches yet. Create one in the Batch Cook tab.</p> : null}
            {mealError ? <p className="form-message error">{mealError}</p> : null}
          </section>

          <section className="panel track-panel" aria-labelledby="dailyTrackHeading">
            <div className="panel-head">
              <h2 id="dailyTrackHeading">Daily Meal Track</h2>
              <p className="total">{mealTotalWeight} g total</p>
            </div>
            <p className="calories-total">{formatDateKeyFull(mealDateKey)}</p>
            <p className="calories-total">{Math.round(mealTotalCalories)} kcal tracked</p>

            {isLoadingMeals ? <p className="empty">Loading entries...</p> : null}

            <div className="category-grid">
              {CATEGORIES.map((category) => {
                const categoryItems = mealEntries.filter((item) => item.category === category.key);
                const categoryTotal = categoryItems.reduce((sum, item) => sum + item.weightGrams, 0);

                return (
                  <article className="category-card" key={category.key}>
                    <div className="category-head">
                      <h3>{category.label}</h3>
                      <span>{Math.round(categoryTotal)} g</span>
                    </div>

                    {categoryItems.length > 0 ? (
                      <ul className="meal-list">
                        {categoryItems.map((item) => (
                          <li key={item.id}>
                            <div>
                              <span className="name">{item.foodName}</span>
                              <span className="kcal">{item.calories == null ? "No kcal match" : `${Math.round(item.calories)} kcal`}</span>
                            </div>
                            <span className="weight">{Math.round(item.weightGrams)} g</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="empty">No items yet.</p>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        </>
      ) : activeTab === "batch" ? (
        <>
          <section className="panel add-panel" aria-labelledby="batchHeading">
            <h2 id="batchHeading">Batch Cook Builder</h2>
            <div className="batch-meta">
              <label>
                Batch name
                <input name="name" type="text" placeholder="e.g. Chicken soup" value={batchMeta.name} onChange={onBatchMetaChange} />
              </label>
              <label>
                Planned servings (optional)
                <input name="servings" type="number" min="1" step="1" placeholder="e.g. 6" value={batchMeta.servings} onChange={onBatchMetaChange} />
              </label>
            </div>

            <form className="batch-form" onSubmit={onBatchSubmit}>
              <label>
                Ingredient name
                <input name="name" type="text" placeholder="e.g. Tomato" value={batchForm.name} onChange={onBatchFormChange} required />
              </label>
              <label>
                Weight (g)
                <input name="weight" type="number" min="1" step="1" placeholder="e.g. 300" value={batchForm.weight} onChange={onBatchFormChange} required />
              </label>
              <label>
                Calories (kcal, optional)
                <input name="calories" type="number" min="0" step="1" placeholder="Override dataset" value={batchForm.calories} onChange={onBatchFormChange} />
              </label>
              <button type="submit">Add Ingredient</button>
            </form>

            {batchError ? <p className="form-message error">{batchError}</p> : null}
          </section>

          <section className="panel track-panel" aria-labelledby="batchSummaryHeading">
            <div className="panel-head">
              <h2 id="batchSummaryHeading">Batch Summary</h2>
              <p className="total">{Math.round(batchTotalWeight)} g total</p>
            </div>
            <p className="calories-total">{Math.round(batchTotalCalories)} kcal total</p>
            <p className="calories-total">{caloriesPerServing == null ? "Add servings to see kcal per serving." : `${Math.round(caloriesPerServing)} kcal per serving`}</p>
            <p className="empty">{batchMeta.name ? `Current batch: ${batchMeta.name}` : "Unnamed batch"}</p>
            <div className="batch-actions">
              <button type="button" onClick={saveCurrentBatch}>
                Save Batch
              </button>
              <button type="button" className="delete-btn" onClick={clearCurrentBatch}>
                Clear Builder
              </button>
            </div>

            <ul className="meal-list batch-list">
              {batchItems.map((item) => (
                <li key={item.id}>
                  <div>
                    <span className="name">{item.foodName}</span>
                    <span className="kcal">
                      {item.calories == null ? "No kcal match" : `${Math.round(item.calories)} kcal`} · {item.source}
                    </span>
                  </div>
                  <div className="batch-row-actions">
                    <span className="weight">{Math.round(item.weightGrams)} g</span>
                    <button type="button" className="delete-btn" onClick={() => removeBatchItem(item.id)}>
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {batchMessage ? <p className="form-message success">{batchMessage}</p> : null}
            {batchItems.length === 0 ? <p className="empty">Add ingredients to build your first batch.</p> : null}
          </section>

          <section className="panel track-panel" aria-labelledby="savedBatchesHeading">
            <div className="panel-head">
              <h2 id="savedBatchesHeading">Saved Batches (Postgres)</h2>
              <p className="total">{savedBatches.length} saved</p>
            </div>

            {isLoadingBatches ? <p className="empty">Loading saved batches...</p> : null}
            {!isLoadingBatches && savedBatches.length === 0 ? <p className="empty">No saved batches yet.</p> : null}

            <div className="saved-batch-grid">
              {savedBatches.map((batch) => (
                <article className="saved-batch-card" key={batch.id}>
                  <div className="category-head">
                    <h3>{batch.name}</h3>
                    <span>{Math.round(batch.totalCalories)} kcal</span>
                  </div>
                  <p className="kcal">{Math.round(batch.totalWeightGrams)} g total</p>
                  <p className="kcal">
                    {batch.servings ? `${Math.round(batch.totalCalories / batch.servings)} kcal/serving` : "No servings set"}
                  </p>
                  <p className="kcal">{batch.items.length} ingredients</p>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="panel track-panel" aria-labelledby="historyHeading">
            <div className="panel-head history-week-head">
              <h2 id="historyHeading">History</h2>
              <div className="history-week-nav">
                <button type="button" onClick={() => setHistoryWeekOffset((prev) => prev + 1)}>Previous Week</button>
                <button type="button" onClick={() => setHistoryWeekOffset((prev) => Math.max(0, prev - 1))} disabled={historyWeekOffset === 0}>
                  Next Week
                </button>
              </div>
            </div>

            <p className="calories-total">Week: {formatDateKeyLabel(historyStartKey)} - {formatDateKeyLabel(historyEndKey)}</p>
            <p className="calories-total">{Math.round(weeklyCalories)} kcal this week</p>
            <p className="calories-total">{Math.round(weeklyWeight)} g this week</p>

            {isLoadingHistory ? <p className="empty">Loading weekly history...</p> : null}
            {historyError ? <p className="form-message error">{historyError}</p> : null}

            <div className="history-days-list">
              {!isLoadingHistory && !historyError ? historyDays.slice().reverse().map((day) => renderHistoryDay(day)) : null}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
