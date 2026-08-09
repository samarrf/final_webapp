import { useEffect, useState } from "react";
import { maintenanceRequests as mockMaintenance } from "../data/mockData";
import {
  fetchProperties,
  fetchRentLedger,
  fetchDashboardSummary,
  fetchRentReminders,
  fetchLandlordMaintenance,
  updateMaintenanceRequest,
  createTenant,
  createProperty,
} from "../api/client";

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function statusClass(value = "") {
  return value.toLowerCase().replaceAll(" ", "-");
}

const emptyTenantForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  startDate: "",
  endDate: "",
  monthlyRent: "",
};

const emptyPropertyForm = {
  streetAddress: "",
  city: "",
  state: "",
  zipCode: "",
  unitLabel: "",
  bedrooms: "",
  bathrooms: "",
  monthlyRent: "",
};

export default function LandlordDashboard() {
  const [properties, setProperties] = useState([]);
  const [rentLedger, setRentLedger] = useState([]);
  const [summary, setSummary] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [maintenanceFallback, setMaintenanceFallback] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [selectedUnit, setSelectedUnit] = useState(null);
  const [tenantForm, setTenantForm] = useState(emptyTenantForm);
  const [tenantMessage, setTenantMessage] = useState("");
  const [creatingTenant, setCreatingTenant] = useState(false);

  const [showPropertyModal, setShowPropertyModal] =
    useState(false);
  const [propertyForm, setPropertyForm] =
    useState(emptyPropertyForm);
  const [propertyMessage, setPropertyMessage] = useState("");
  const [creatingProperty, setCreatingProperty] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const [
          propertyData,
          ledgerData,
          summaryData,
          reminderData,
        ] = await Promise.all([
          fetchProperties(),
          fetchRentLedger(),
          fetchDashboardSummary(),
          fetchRentReminders(),
        ]);

        if (cancelled) return;

        setProperties(
          propertyData.map((property) => ({
            ...property,
            id: property.unit_id,
          }))
        );

        setRentLedger(
          ledgerData.map((payment) => ({
            ...payment,
            id: payment.payment_id,
            dueDate: payment.due_date,
          }))
        );

        setSummary(summaryData);
        setReminders(reminderData.reminders || []);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error.message);
        }
      }

      try {
        const maintenanceData =
          await fetchLandlordMaintenance();

        if (!cancelled) {
          setMaintenance(maintenanceData);
          setMaintenanceFallback(false);
        }
      } catch {
        if (!cancelled) {
          setMaintenance(mockMaintenance);
          setMaintenanceFallback(true);
        }
      }

      if (!cancelled) {
        setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshDashboardData() {
    const [
      propertyData,
      ledgerData,
      summaryData,
      reminderData,
    ] = await Promise.all([
      fetchProperties(),
      fetchRentLedger(),
      fetchDashboardSummary(),
      fetchRentReminders(),
    ]);

    setProperties(
      propertyData.map((property) => ({
        ...property,
        id: property.unit_id,
      }))
    );

    setRentLedger(
      ledgerData.map((payment) => ({
        ...payment,
        id: payment.payment_id,
        dueDate: payment.due_date,
      }))
    );

    setSummary(summaryData);
    setReminders(reminderData.reminders || []);
  }

  async function handleMaintenanceUpdate(
    requestId,
    changes
  ) {
    if (maintenanceFallback || !requestId) {
      return;
    }

    try {
      await updateMaintenanceRequest(requestId, changes);

      setMaintenance((currentRequests) =>
        currentRequests.map((request) =>
          request._id === requestId
            ? { ...request, ...changes }
            : request
        )
      );
    } catch (error) {
      window.alert(
        `Could not update the maintenance request: ${error.message}`
      );
    }
  }

  function openTenantModal(property) {
    setSelectedUnit(property);

    setTenantForm({
      ...emptyTenantForm,
      monthlyRent: String(property.rent || ""),
    });

    setTenantMessage("");
  }

  function closeTenantModal() {
    if (creatingTenant) return;

    setSelectedUnit(null);
    setTenantForm(emptyTenantForm);
    setTenantMessage("");
  }

  function updateTenantField(event) {
    const { name, value } = event.target;

    setTenantForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleCreateTenant(event) {
    event.preventDefault();
    setTenantMessage("");

    if (!selectedUnit) {
      setTenantMessage("No unit was selected.");
      return;
    }

    if (
      !tenantForm.firstName.trim() ||
      !tenantForm.lastName.trim()
    ) {
      setTenantMessage(
        "Enter the tenant's first and last name."
      );
      return;
    }

    if (!tenantForm.email.trim()) {
      setTenantMessage("Enter the tenant's email.");
      return;
    }

    const cleanPhone = tenantForm.phone.trim();

    if (!cleanPhone) {
      setTenantMessage("Enter the tenant's phone number.");
      return;
    }
    
    if (!/^[\d\s()+-]{7,20}$/.test(cleanPhone) || cleanPhone.replace(/\D/g, '').length < 10) {
      setTenantMessage("Enter a valid phone number.");
      return;
    }

    if (tenantForm.password.length < 8) {
      setTenantMessage(
        "The temporary password must contain at least 8 characters."
      );
      return;
    }

    if (
      !tenantForm.startDate ||
      !tenantForm.endDate ||
      tenantForm.endDate <= tenantForm.startDate
    ) {
      setTenantMessage(
        "The lease end date must be after the start date."
      );
      return;
    }

    if (Number(tenantForm.monthlyRent) <= 0) {
      setTenantMessage(
        "Enter a valid monthly rent amount."
      );
      return;
    }

    setCreatingTenant(true);

    try {
      await createTenant({
        unitId: selectedUnit.id,
        firstName: tenantForm.firstName.trim(),
        lastName: tenantForm.lastName.trim(),
        email: tenantForm.email.trim(),
        phone: tenantForm.phone.trim(),
        password: tenantForm.password,
        startDate: tenantForm.startDate,
        endDate: tenantForm.endDate,
        monthlyRent: Number(tenantForm.monthlyRent),
      });

      await refreshDashboardData();

      setSelectedUnit(null);
      setTenantForm(emptyTenantForm);
      setTenantMessage("");
    } catch (error) {
      setTenantMessage(error.message);
    } finally {
      setCreatingTenant(false);
    }
  }

  function openPropertyModal() {
    setPropertyMessage("");
    setPropertyForm(emptyPropertyForm);
    setShowPropertyModal(true);
  }

  function closePropertyModal() {
    if (creatingProperty) return;

    setShowPropertyModal(false);
    setPropertyForm(emptyPropertyForm);
    setPropertyMessage("");
  }

  function updatePropertyField(event) {
    const { name, value } = event.target;

    setPropertyForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleCreateProperty(event) {
    event.preventDefault();
    setPropertyMessage("");

    if (
      !propertyForm.streetAddress.trim() ||
      !propertyForm.city.trim() ||
      !propertyForm.state.trim() ||
      !propertyForm.zipCode.trim() ||
      !propertyForm.unitLabel.trim()
    ) {
      setPropertyMessage(
        "Complete all required property fields."
      );
      return;
    }

    if (propertyForm.state.trim().length !== 2) {
      setPropertyMessage(
        "Enter a two-letter state abbreviation."
      );
      return;
    }

    if (Number(propertyForm.bedrooms) < 0) {
      setPropertyMessage(
        "Enter a valid number of bedrooms."
      );
      return;
    }

    if (Number(propertyForm.bathrooms) <= 0) {
      setPropertyMessage(
        "Enter a valid number of bathrooms."
      );
      return;
    }

    if (Number(propertyForm.monthlyRent) <= 0) {
      setPropertyMessage(
        "Enter a valid monthly rent amount."
      );
      return;
    }

    setCreatingProperty(true);

    try {
      await createProperty({
        streetAddress:
          propertyForm.streetAddress.trim(),
        city: propertyForm.city.trim(),
        state: propertyForm.state.trim().toUpperCase(),
        zipCode: propertyForm.zipCode.trim(),
        unitLabel: propertyForm.unitLabel.trim(),
        bedrooms: Number(propertyForm.bedrooms),
        bathrooms: Number(propertyForm.bathrooms),
        monthlyRent: Number(propertyForm.monthlyRent),
      });

      await refreshDashboardData();

      setShowPropertyModal(false);
      setPropertyForm(emptyPropertyForm);
      setPropertyMessage("");
    } catch (error) {
      setPropertyMessage(error.message);
    } finally {
      setCreatingProperty(false);
    }
  }

  if (loading) {
    return (
      <main>
        <div className="page-head">
          <h1>Landlord dashboard</h1>
          <p>
            Loading your properties and rent information…
          </p>
        </div>
      </main>
    );
  }

  if (loadError || !summary) {
    return (
      <main>
        <div className="page-head">
          <h1>Landlord dashboard</h1>

          <p className="error-message">
            Could not load your dashboard:{" "}
            {loadError || "Dashboard data is unavailable."}
          </p>
        </div>
      </main>
    );
  }

  const openIssues = maintenance.filter(
    (request) => request.status !== "resolved"
  ).length;

  return (
    <main className="dashboard-page">
      <div className="page-head">
        <h1>Landlord dashboard</h1>

        <p>
          Review your properties, rent collection, and
          maintenance requests.
        </p>
      </div>

      <section
        className="grid grid-3 dashboard-summary"
        aria-label="Dashboard summary"
      >
        <article className="card summary-card">
          <span className="summary-label">
            Units occupied
          </span>

          <strong className="summary-value">
            {summary.occupiedUnits} / {summary.totalUnits}
          </strong>
        </article>

        <article className="card summary-card">
          <div className="summary-label-row">
            <span className="summary-label">
              Monthly rent roll
            </span>

            {summary.fromCache && (
              <span
                className="cache-badge"
                title="This value was served from Redis"
              >
                Redis cache
              </span>
            )}
          </div>

          <strong className="summary-value">
            {formatMoney(summary.monthlyTotal)}
          </strong>
        </article>

        <article className="card summary-card">
          <span className="summary-label">
            Open maintenance issues
          </span>

          <strong className="summary-value">
            {openIssues}
          </strong>
        </article>
      </section>

      {reminders.length > 0 && (
        <section className="dashboard-section">
          <div className="section-title-row">
            <div>
              <h2 className="section-heading">
                Rent reminders
              </h2>

              <p className="section-description">
                Payments that are due soon or already
                overdue.
              </p>
            </div>
          </div>

          <div className="card table-card">
            <div className="data-table-header reminder-grid">
              <span>Tenant</span>
              <span>Property</span>
              <span>Amount</span>
              <span>Due date</span>
              <span>Status</span>
            </div>

            <div className="data-table-body">
              {reminders.map((reminder, index) => (
                <div
                  className="data-table-row reminder-grid"
                  key={
                    reminder.paymentId ||
                    `${reminder.tenant}-${index}`
                  }
                >
                  <span className="data-primary">
                    {reminder.tenant}
                  </span>

                  <span className="data-secondary">
                    {reminder.unit}
                  </span>

                  <span className="data-money">
                    {formatMoney(reminder.amount)}
                  </span>

                  <span className="data-date">
                    {reminder.dueDate}
                  </span>

                  <span
                    className={`status-tag ${
                      reminder.status === "overdue"
                        ? "overdue"
                        : "due"
                    }`}
                  >
                    {reminder.status === "overdue"
                      ? "Overdue"
                      : reminder.daysUntilDue === 0
                        ? "Due today"
                        : `Due in ${reminder.daysUntilDue} days`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="dashboard-section">
        <div className="section-title-row">
          <div>
            <h2 className="section-heading">
              Rent ledger
            </h2>

            <p className="section-description">
              Payment status for the current billing
              cycle.
            </p>
          </div>
        </div>

        <div className="card table-card">
          <div className="data-table-header ledger-grid">
            <span>Tenant</span>
            <span>Property</span>
            <span>Amount</span>
            <span>Due date</span>
            <span>Status</span>
          </div>

          <div className="data-table-body">
            {rentLedger.length === 0 ? (
              <div className="empty-state">
                No rent payments are available.
              </div>
            ) : (
              rentLedger.map((payment) => (
                <div
                  className="data-table-row ledger-grid"
                  key={payment.id}
                >
                  <span className="data-primary">
                    {payment.tenant}
                  </span>

                  <span className="data-secondary">
                    {payment.unit}
                  </span>

                  <span className="data-money">
                    {formatMoney(payment.amount)}
                  </span>

                  <span className="data-date">
                    {payment.dueDate}
                  </span>

                  <span
                    className={`status-tag ${statusClass(
                      payment.status
                    )}`}
                  >
                    {payment.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>


      <section className="dashboard-section">
        <div className="section-title-row">
          <div>
            <h2 className="section-heading">
              Maintenance requests
            </h2>

            <p className="section-description">
              Current repair and service requests from
              tenants.
            </p>
          </div>

          {maintenanceFallback && (
            <span className="warning-badge">
              Showing sample data — MongoDB unavailable
            </span>
          )}
        </div>

        <div className="card table-card">
          <div className="data-table-header maintenance-grid">
            <span>Issue</span>
            <span>Property</span>
            <span>Priority</span>
            <span>Submitted</span>
            <span>Status</span>
          </div>

          <div className="data-table-body">
            {maintenance.length === 0 ? (
              <div className="empty-state">
                No maintenance requests are available.
              </div>
            ) : (
              maintenance.map((request, index) => (
                <div
                  className="data-table-row maintenance-grid"
                  key={
                    request._id ||
                    request.id ||
                    `${request.issue}-${index}`
                  }
                >
                  <span className="data-primary">
                    {request.issue}
                  </span>

                  <span className="data-secondary">
                    {request.unit}
                  </span>

                  <span
                    className={`status-tag ${statusClass(
                      request.priority
                    )}`}
                  >
                    {request.priority}
                  </span>

                  <span className="data-date">
                    {request.submittedAt ||
                      request.submitted}
                  </span>

                  <select
                    className={`maintenance-select ${statusClass(
                      request.status
                    )}`}
                    value={request.status}
                    disabled={
                      maintenanceFallback || !request._id
                    }
                    onChange={(event) =>
                      handleMaintenanceUpdate(
                        request._id,
                        {
                          status: event.target.value,
                        }
                      )
                    }
                    aria-label={`Status for ${request.issue}`}
                  >
                    <option value="open">Open</option>
                    <option value="in progress">
                      In progress
                    </option>
                    <option value="resolved">
                      Resolved
                    </option>
                  </select>
                  {Array.isArray(request.photos) && request.photos.length > 0 && (
                    <div className="maint-photos" style={{ gridColumn: '1 / -1' }}>
                      {request.photos.map((photo, idx) => (
                        <a key={photo.storage_url || idx} href={photo.storage_url} target="_blank" rel="noreferrer">
                          <img
                            src={photo.storage_url}
                            alt={photo.file_name || `Maintenance photo ${idx + 1}`}
                            className="maint-photo-thumb"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-title-row">
          <div>
            <h2 className="section-heading">
              Properties
            </h2>

            <p className="section-description">
              Units, occupancy, and assigned tenants.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={openPropertyModal}
          >
            Add property
          </button>
        </div>

        <div className="grid grid-2 property-list">
          {properties.map((property) => (
            <article
              className="card property-card"
              key={property.id}
            >
              <div>
                <div className="addr">
                  {property.address}
                </div>

                <div className="city">
                  {property.city}
                </div>
              </div>

              <div className="property-meta">
                <span>
                  <strong>{property.bedrooms}</strong>{" "}
                  bed
                </span>

                <span>
                  <strong>{property.bathrooms}</strong>{" "}
                  bath
                </span>

                <span>
                  {property.tenant
                    ? `Tenant: ${property.tenant}`
                    : "No tenant assigned"}
                </span>
              </div>

              <div className="property-card-footer">
                <span
                  className={`status-tag ${statusClass(
                    property.status
                  )}`}
                >
                  {property.status}
                </span>

                {property.status === "vacant" && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() =>
                      openTenantModal(property)
                    }
                  >
                    Add tenant
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {selectedUnit && (
        <div
          className="modal-backdrop"
          onMouseDown={closeTenantModal}
        >
          <div
            className="tenant-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tenant-modal-title"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <h2 id="tenant-modal-title">
                  Add tenant
                </h2>

                <p>
                  Assign a tenant to{" "}
                  {selectedUnit.address}.
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeTenantModal}
                disabled={creatingTenant}
                aria-label="Close tenant form"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateTenant}>
              <div className="tenant-form-grid">
                <div className="field">
                  <label htmlFor="firstName">
                    First name
                  </label>

                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={tenantForm.firstName}
                    onChange={updateTenantField}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="lastName">
                    Last name
                  </label>

                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={tenantForm.lastName}
                    onChange={updateTenantField}
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="tenantEmail">
                  Email
                </label>

                <input
                  id="tenantEmail"
                  name="email"
                  type="email"
                  value={tenantForm.email}
                  onChange={updateTenantField}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="tenantPhone">
                  Phone
                </label>

                <input
                  id="tenantPhone"
                  name="phone"
                  type="tel"
                  value={tenantForm.phone}
                  onChange={updateTenantField}
                />
              </div>

              <div className="field">
                <label htmlFor="tenantPassword">
                  Temporary password
                </label>

                <input
                  id="tenantPassword"
                  name="password"
                  type="password"
                  value={tenantForm.password}
                  onChange={updateTenantField}
                  minLength={8}
                  required
                />
              </div>

              <div className="tenant-form-grid">
                <div className="field">
                  <label htmlFor="startDate">
                    Lease start
                  </label>

                  <input
                    id="startDate"
                    name="startDate"
                    type="date"
                    value={tenantForm.startDate}
                    onChange={updateTenantField}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="endDate">
                    Lease end
                  </label>

                  <input
                    id="endDate"
                    name="endDate"
                    type="date"
                    value={tenantForm.endDate}
                    onChange={updateTenantField}
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="monthlyRent">
                  Monthly rent
                </label>

                <input
                  id="monthlyRent"
                  name="monthlyRent"
                  type="number"
                  min="1"
                  step="0.01"
                  value={tenantForm.monthlyRent}
                  onChange={updateTenantField}
                  required
                />
              </div>

              {tenantMessage && (
                <p
                  className="tenant-form-message"
                  role="alert"
                >
                  {tenantMessage}
                </p>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={closeTenantModal}
                  disabled={creatingTenant}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creatingTenant}
                >
                  {creatingTenant
                    ? "Creating tenant..."
                    : "Create tenant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPropertyModal && (
        <div
          className="modal-backdrop"
          onMouseDown={closePropertyModal}
        >
          <div
            className="tenant-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="property-modal-title"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <h2 id="property-modal-title">
                  Add property
                </h2>

                <p>
                  Create a new vacant rental unit.
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closePropertyModal}
                disabled={creatingProperty}
                aria-label="Close property form"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateProperty}>
              <div className="field">
                <label htmlFor="streetAddress">
                  Street address
                </label>

                <input
                  id="streetAddress"
                  name="streetAddress"
                  type="text"
                  value={propertyForm.streetAddress}
                  onChange={updatePropertyField}
                  required
                />
              </div>

              <div className="tenant-form-grid">
                <div className="field">
                  <label htmlFor="propertyCity">
                    City
                  </label>

                  <input
                    id="propertyCity"
                    name="city"
                    type="text"
                    value={propertyForm.city}
                    onChange={updatePropertyField}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="propertyState">
                    State
                  </label>

                  <input
                    id="propertyState"
                    name="state"
                    type="text"
                    maxLength={2}
                    placeholder="VA"
                    value={propertyForm.state}
                    onChange={updatePropertyField}
                    required
                  />
                </div>
              </div>

              <div className="tenant-form-grid">
                <div className="field">
                  <label htmlFor="zipCode">
                    ZIP code
                  </label>

                  <input
                    id="zipCode"
                    name="zipCode"
                    type="text"
                    value={propertyForm.zipCode}
                    onChange={updatePropertyField}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="unitLabel">
                    Unit label
                  </label>

                  <input
                    id="unitLabel"
                    name="unitLabel"
                    type="text"
                    placeholder="Unit A or Main House"
                    value={propertyForm.unitLabel}
                    onChange={updatePropertyField}
                    required
                  />
                </div>
              </div>

              <div className="tenant-form-grid">
                <div className="field">
                  <label htmlFor="bedrooms">
                    Bedrooms
                  </label>

                  <input
                    id="bedrooms"
                    name="bedrooms"
                    type="number"
                    min="0"
                    value={propertyForm.bedrooms}
                    onChange={updatePropertyField}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="bathrooms">
                    Bathrooms
                  </label>

                  <input
                    id="bathrooms"
                    name="bathrooms"
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={propertyForm.bathrooms}
                    onChange={updatePropertyField}
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="propertyRent">
                  Monthly rent
                </label>

                <input
                  id="propertyRent"
                  name="monthlyRent"
                  type="number"
                  min="1"
                  step="0.01"
                  value={propertyForm.monthlyRent}
                  onChange={updatePropertyField}
                  required
                />
              </div>

              {propertyMessage && (
                <p
                  className="tenant-form-message"
                  role="alert"
                >
                  {propertyMessage}
                </p>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={closePropertyModal}
                  disabled={creatingProperty}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creatingProperty}
                >
                  {creatingProperty
                    ? "Creating property..."
                    : "Create property"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}