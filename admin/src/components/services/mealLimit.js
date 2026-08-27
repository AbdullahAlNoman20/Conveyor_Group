
import { dataStore } from "./dataStore";

const KEY = "mealLimit";
const FILE = "meal-limit.json";
const todayISO = () => new Date().toISOString().slice(0, 10);

export async function getMealLimitStatus() {
  let data = await dataStore.load(KEY, FILE);
  if (!data || Array.isArray(data)) data = { dailyLimit: 300, date: todayISO(), served: 0 };
  if (data.date !== todayISO()) {
    data = { ...data, date: todayISO(), served: 0 };
    await dataStore.save(KEY, data);
  }
  return data;
}

/** Reserves one slot. Throws if today's limit has already been reached. */
export async function consumeMealSlot() {
  const status = await getMealLimitStatus();
  if (status.served >= status.dailyLimit) {
    throw new Error(`Today's meal limit (${status.dailyLimit}) has been reached. Please contact the Manager.`);
  }
  const next = { ...status, served: status.served + 1 };
  await dataStore.save(KEY, next);
  return next;
}