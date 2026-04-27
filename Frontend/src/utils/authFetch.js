import { buildApiUrl } from "./apiConfig";


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

function getAccessToken() {
  return localStorage.getItem("access_token");
}

function setAccessToken(token) {
  localStorage.setItem("access_token", token);
}

function getRefreshToken() {
  return localStorage.getItem("refresh_token");
}



async function refreshAccessToken() {
  const refresh = getRefreshToken();

  if (!refresh) return false;

  try {
    const response = await fetch(buildApiUrl("/tenant/token/refresh/"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh }),
    });

    if (!response.ok) return false;

    const data = await response.json();

    if (data.access) {
      setAccessToken(data.access); 
      return true;
    }

    return false;
  } catch {
    return false;
  }
}



export async function authFetch(url, options = {}) {
  const method = (options.method || "GET").toUpperCase();

  const accessToken = getAccessToken(); 
  const csrftoken = getCookie("csrftoken"); 

  const headers = {
    ...(options.headers || {}),
  };

 
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  
  if (csrftoken && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    headers["X-CSRFToken"] = csrftoken;
  }

  const doFetch = () =>
    fetch(buildApiUrl(url), {
      ...options,
      headers,
    });

  let response = await doFetch();

  // 🔁 Auto refresh on 401
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      const newAccessToken = getAccessToken();

      if (newAccessToken) {
        headers["Authorization"] = `Bearer ${newAccessToken}`;
      }

      response = await doFetch(); // retry
    }
  }

  return response;
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