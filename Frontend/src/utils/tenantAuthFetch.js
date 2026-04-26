import { buildApiUrl } from "./apiConfig";

async function refreshTenantAccessToken() {
  const response = await fetch(buildApiUrl("/tenant/token/refresh/"), {
    method: "POST",
    credentials: "include",
  });
  return response.ok;
}

export async function tenantAuthFetch(url, options = {}) {
  const opts = {
    credentials: "include",
    ...options,
    headers: {
      ...(options.headers || {}),
    },
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
