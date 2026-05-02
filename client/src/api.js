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

export function getHistory() {
  return request("/api/flames/history");
}

export function getResult(id) {
  return request(`/api/flames/${id}`);
}

export function deleteHistoryItem(id) {
  return request(`/api/history/${id}`, {
    method: "DELETE"
  });
}

export function clearHistory() {
  return request("/api/history", {
    method: "DELETE"
  });
}
