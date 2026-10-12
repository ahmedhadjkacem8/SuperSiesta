type SchedulerWithYield = {
  yield?: () => Promise<void>;
};

const scheduler = (globalThis as typeof globalThis & {
  scheduler?: SchedulerWithYield;
}).scheduler;

export function yieldToMain(): Promise<void> {
  if (scheduler?.yield) return scheduler.yield();
  return new Promise((resolve) => setTimeout(resolve, 0));
}
