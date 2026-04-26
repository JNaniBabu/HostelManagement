export async function authFetch(url, options = {}) {
  const method = (options.method || "GET").toUpperCase(); 
  const csrftoken = getCookie("csrftoken");

  const headers = {
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    headers["X-CSRFToken"] = csrftoken;
  }

  const opts = {
    credentials: "include",
    ...options,
    headers,
  };

  const doFetch = () => fetch(buildApiUrl(url), opts);

  let response = await doFetch();

  if (response.status === 401) {
    const refreshed = await refreshTenantAccessToken();
    if (refreshed) {
      response = await doFetch();
    }
  }

  return response;
}


export function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.startsWith(name + "=")) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}


export async function parseResponse(response) {
  const contentType = response.headers.get("content-type");

  if (!response.ok) {
    const text = await response.text();
    console.error("Server error:", text);
    throw new Error("Request failed");
  }

  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}