export interface WaitOptions {
  timeout?: number;
  interval?: number;
  message?: string;
}

const falsy = (v: unknown): boolean => v === undefined || v === null || v === false;

export function tick(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitFor<T>(predicate: () => T, options: WaitOptions = {}): Promise<NonNullable<T>> {
  const { timeout = 2000, interval = 5, message = 'condition not met' } = options;
  const deadline = Date.now() + timeout;
  let current: T = predicate();
  while (falsy(current)) {
    if (Date.now() > deadline) {
      throw new Error(`waitFor timed out after ${timeout}ms: ${message}`);
    }
    await tick(interval);
    current = predicate();
  }
  return current as NonNullable<T>;
}

export async function waitForEvent(
  emitter: NodeJS.EventEmitter,
  event: string,
  options: WaitOptions = {}
): Promise<unknown[]> {
  const { timeout = 2000, message } = options;
  const received = new Promise<unknown[]>((resolve, reject) => {
    const timer = setTimeout(() => {
      emitter.removeListener(event, onEvent);
      reject(new Error(message ?? `event "${event}" not emitted within ${timeout}ms`));
    }, timeout);
    const onEvent = (...args: unknown[]) => {
      clearTimeout(timer);
      resolve(args);
    };
    emitter.once(event, onEvent);
  });
  return received;
}
