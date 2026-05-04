const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");
const REQUEST_TIMEOUT_MS = 15000;

async function request(path, options = {}) {
  let response;
  const { timeout, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeout || REQUEST_TIMEOUT_MS);

  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions.headers
      },
      ...fetchOptions,
      signal: fetchOptions.signal || controller.signal
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("The request took too long. Please retry.");
    }
    throw new Error("Connection issue. Please check the backend URL and try again.");
  } finally {
    window.clearTimeout(timeoutId);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (data.error === "Database not connected") {
      throw new Error("Database connection is warming up. Please retry.");
    }
    throw new Error(data.message || "Something went wrong");
  }
  return data;
}

export function calculateFlames(payload) {
  return request("/api/flames", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

function toQueryString(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

export function getHistory(params = {}) {
  return request(`/api/results${toQueryString(params)}`);
}

export function getDeletedResults(params = {}) {
  return request(`/api/deleted-results${toQueryString(params)}`);
}

export function getResult(id) {
  return request(`/api/flames/${id}`);
}

export function deleteHistoryItem(id) {
  return request(`/api/history/${id}`, {
    method: "DELETE"
  });
}

export function restoreHistoryItem(id) {
  return request(`/api/results/${id}/restore`, {
    method: "PATCH"
  });
}

export function clearHistory() {
  return request("/api/history", {
    method: "DELETE"
  });
}

export function sendChatMessage(message) {
  return request("/api/chat", {
    method: "POST",
    body: JSON.stringify({ message }),
    timeout: 18000
  });
}
