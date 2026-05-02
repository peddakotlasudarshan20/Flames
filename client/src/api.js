const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
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
