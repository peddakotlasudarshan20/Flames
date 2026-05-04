const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      },
      ...options
    });
  } catch {
    throw new Error("Connection issue. Please check the backend URL and try again.");
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
