const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;

  const res = await fetch(`${API_BASE}/${path}`, {
    credentials: 'include',

    headers: isFormData ? {} : { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `Request to ${path} failed (${res.status})`);
  }
  return body;
}

export function updateMaintenanceRequest(
  requestId,
  changes
) {
  return request("maintenance.php", {
    method: "PATCH",
    body: JSON.stringify({
      requestId,
      ...changes,
    }),
  });
}

export function login(email, password, role) {
  return request('auth/login.php', {
    method: 'POST',
    body: JSON.stringify({ email, password, role }),
  });
}

export function fetchListings() {
  return request("listings.php");
}

export function createTenant(data) {
  return request("tenants.php", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function createProperty(data) {
  return request("properties.php", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function logout() {
  return request('auth/logout.php', { method: 'POST' });
}

export function fetchMe() {
  return request('auth/me.php');
}

export function fetchProperties() {
  return request('properties.php');
}

export function fetchRentLedger() {
  return request('rent_ledger.php');
}

export function fetchDashboardSummary() {
  return request('dashboard_summary.php');
}

export function fetchRentReminders() {
  return request('rent_reminders.php');
}

export function fetchLandlordMaintenance() {
  return request('maintenance.php');
}

export function fetchTenantLease() {
  return request('tenant/lease.php');
}

export function payRent() {
  return request('tenant/pay_rent.php', { method: 'POST' });
}

export function fetchTenantMaintenance() {
  return request('tenant/maintenance.php');
}


export function submitMaintenanceRequest(issue, priority, photos = []) {
  if (photos && photos.length > 0) {
    const formData = new FormData();
    formData.append('issue', issue);
    formData.append('priority', priority);
    photos.forEach((file) => {
      formData.append('photos[]', file, file.name);
    });

    return request('tenant/maintenance.php', {
      method: 'POST',
      body: formData,
    });
  }

  return request('tenant/maintenance.php', {
    method: 'POST',
    body: JSON.stringify({ issue, priority }),
  });
}