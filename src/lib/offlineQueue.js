const queue = [];
const listeners = new Set();
let processing = false;
let hasWindow = typeof window !== "undefined";

function notify(event) {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.error("Toast listener error", error);
    }
  });
}

async function processQueue() {
  if (processing) return;
  if (!hasWindow || !navigator.onLine) return;
  processing = true;
  while (queue.length > 0) {
    const job = queue[0];
    try {
      const result = await job.action();
      notify({ type: "synced", description: job.description, result });
      queue.shift();
    } catch (error) {
      job.attempts += 1;
      if (job.attempts >= job.maxAttempts) {
        notify({ type: "sync-error", description: job.description });
        queue.shift();
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
  }
  processing = false;
}

if (hasWindow) {
  window.addEventListener("online", () => {
    processQueue();
  });
}

export function subscribeToOfflineQueue(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function enqueueOfflineMutation({ description, action, maxAttempts = 3 }) {
  queue.push({ description, action, maxAttempts, attempts: 0 });
  notify({ type: "queued", description });
  if (hasWindow && navigator.onLine) {
    processQueue();
  }
}

export async function executeWithOfflineSupport(action, { description }) {
  if (!hasWindow) {
    return action();
  }

  try {
    if (!navigator.onLine) {
      enqueueOfflineMutation({ description, action });
      return { data: null, error: null, queued: true };
    }

    const result = await action();
    if (result?.error && /Failed to fetch|NetworkError/i.test(String(result.error.message || ""))) {
      enqueueOfflineMutation({ description, action });
      return { ...result, queued: true };
    }
    return result;
  } catch (error) {
    if (!navigator.onLine) {
      enqueueOfflineMutation({ description, action });
      return { data: null, error: null, queued: true };
    }
    throw error;
  }
}
