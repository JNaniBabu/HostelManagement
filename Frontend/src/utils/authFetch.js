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