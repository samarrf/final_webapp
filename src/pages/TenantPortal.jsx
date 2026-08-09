import { useEffect, useRef, useState } from 'react';
import { fetchTenantLease, payRent, fetchTenantMaintenance, submitMaintenanceRequest } from '../api/client';

const MAX_PHOTOS = 4;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function TenantPortal() {
  const [lease, setLease] = useState(null);
  const [requests, setRequests] = useState([]);
  const [mongoUnavailable, setMongoUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [payStatus, setPayStatus] = useState('');
  const [issue, setIssue] = useState('');
  const [priority, setPriority] = useState('medium');
  const [photos, setPhotos] = useState([]);
  const [submitStatus, setSubmitStatus] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cardholder, setCardholder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiration, setExpiration] = useState('');
  const [cvv, setCvv] = useState('');
  const photoInputRef = useRef(null);

  useEffect(() => {
    loadLease();
    loadRequests();
  }, []);

  async function loadLease() {
    try {
      const data = await fetchTenantLease();
      setLease(data);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadRequests() {
    try {
      const data = await fetchTenantMaintenance();
      setRequests(data);
      setMongoUnavailable(false);
    } catch {
      setRequests([]);
      setMongoUnavailable(true);
    }
  }

  async function handlePayRent(e) {
    e.preventDefault();

    const cleanCardNumber = cardNumber.replace(/\s/g, '');

    if (!cardholder.trim()) {
      setPayStatus('Enter the cardholder name.');
      return;
    }

    if (!/^\d{16}$/.test(cleanCardNumber)) {
      setPayStatus('Enter a valid 16-digit card number.');
      return;
    }

    if (!/^\d{2}\/\d{2}$/.test(expiration)) {
      setPayStatus("Enter the expiration date as MM/YY.");
      return;
    }

    const [month, year] = expiration.split("/").map(Number);

    if (month < 1 || month > 12) {
      setPayStatus("Enter a valid expiration month.");
      return;
    }

    const currentMonth = 8;
    const currentYear = 26;

    if (
      year < currentYear ||
      (year === currentYear && month < currentMonth)
    ) {
      setPayStatus("Card has expired.");
      return;
    }

    if (!/^\d{3,4}$/.test(cvv)) {
      setPayStatus('Enter a valid CVV.');
      return;
    }

    setPayStatus('Processing…');

    try {
      await payRent();
      setPayStatus('Payment recorded.');
      setShowPaymentModal(false);

      setCardholder('');
      setCardNumber('');
      setExpiration('');
      setCvv('');

      await loadLease();
    } catch (err) {
      setPayStatus(err.message);
    }
  }

  function handlePhotoChange(e) {
    const selected = Array.from(e.target.files || []);

    if (selected.length > MAX_PHOTOS) {
      setSubmitStatus(`You can attach up to ${MAX_PHOTOS} photos.`);
      e.target.value = '';
      setPhotos([]);
      return;
    }

    const oversized = selected.find((f) => f.size > MAX_PHOTO_BYTES);
    if (oversized) {
      setSubmitStatus(`"${oversized.name}" is larger than 5MB.`);
      e.target.value = '';
      setPhotos([]);
      return;
    }

    const unsupported = selected.find((f) => !ALLOWED_PHOTO_TYPES.includes(f.type));
    if (unsupported) {
      setSubmitStatus(`"${unsupported.name}" isn't a supported image type (use JPG, PNG, or WEBP).`);
      e.target.value = '';
      setPhotos([]);
      return;
    }

    setSubmitStatus('');
    setPhotos(selected);
  }

  async function handleSubmitRequest(e) {
    e.preventDefault();
    if (!issue.trim()) return;
    setSubmitStatus('Submitting…');
    try {
      await submitMaintenanceRequest(issue, priority, photos);
      setSubmitStatus('Request submitted.');
      setIssue('');
      setPriority('medium');
      setPhotos([]);
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
      await loadRequests();
    } catch (err) {
      setSubmitStatus(`Couldn't submit: ${err.message}`);
    }
  }

  if (loading) {
    return <main><div className="page-head"><h1>Loading your account…</h1></div></main>;
  }

  if (loadError || !lease) {
    return (
      <main>
        <div className="page-head">
          <h1>Tenant portal</h1>
          <p style={{ color: 'var(--clay)' }}>{loadError || 'No active lease found for this account.'}</p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="page-head">
        <h1>Welcome back, {lease.tenantName}</h1>
        <p>{lease.unit} · Lease ends {lease.leaseEnd}</p>
      </div>

      <div className="grid grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <p className="section-label">Rent</p>
          {lease.currentPayment ? (
            <>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 600 }}>
                ${lease.currentPayment.amount.toLocaleString()}
              </div>
              <p style={{ color: 'var(--ink-soft)', margin: '0.35rem 0 1rem' }}>
                Due {lease.currentPayment.dueDate} ·{' '}
                <span className={`ledger-status ${lease.currentPayment.status}`}>{lease.currentPayment.status}</span>
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setPayStatus('');
                  setShowPaymentModal(true);
                }}
                disabled={lease.currentPayment.status === 'paid'}
              >
                {lease.currentPayment.status === 'paid' ? 'Paid' : 'Pay rent'}
              </button>
            </>
          ) : (
            <p style={{ color: 'var(--ink-soft)' }}>No payment on record yet.</p>
          )}
          {payStatus && <p style={{ fontSize: '0.85rem', marginTop: '0.6rem', color: 'var(--ink-soft)' }}>{payStatus}</p>}
        </div>

        <div className="card">
          <p className="section-label">Submit a maintenance request</p>
          <form onSubmit={handleSubmitRequest}>
            <div className="field">
              <label htmlFor="issue">Describe the issue</label>
              <textarea
                id="issue"
                rows="3"
                placeholder="write a brief description of the problem"
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="priority">Priority</label>
              <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="photos">Photos (optional, up to {MAX_PHOTOS})</label>
              <input
                id="photos"
                ref={photoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={handlePhotoChange}
              />
              {photos.length > 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginTop: '0.35rem' }}>
                  {photos.map((f) => f.name).join(', ')}
                </p>
              )}
            </div>
            <button type="submit" className="btn btn-outline">Submit request</button>
          </form>
          {submitStatus && <p style={{ fontSize: '0.85rem', marginTop: '0.6rem', color: 'var(--ink-soft)' }}>{submitStatus}</p>}
        </div>
      </div>

      <p className="section-label">
        Your maintenance requests
        {mongoUnavailable && (
          <span style={{ color: 'var(--clay)', textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-body)' }}>
            {' '}— couldn't reach the maintenance request database
          </span>
        )}
      </p>
      <div className="card">
        {requests.length === 0 && !mongoUnavailable && (
          <p style={{ color: 'var(--ink-soft)', margin: 0 }}>No requests yet.</p>
        )}
      {requests.map((m) => (
        <div className="maint-request-row" key={m._id}>
          <div className="maint-row">
            <span>{m.issue}</span>
            <span className={`priority ${m.priority}`}>{m.priority}</span>
            <span>{m.submittedAt}</span>
            <span style={{ textTransform: 'capitalize' }}>{m.status}</span>
          </div>
          {Array.isArray(m.photos) && m.photos.length > 0 && (
            <div className="maint-photos">
              {m.photos.map((photo, idx) => (
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
      ))}
      </div>
      {showPaymentModal && (
  <div className="modal-backdrop">
    <div className="payment-modal">
      <div className="modal-header">
        <div>
          <h2>Pay rent</h2>
          <p>This is a simulated payment for the class project.</p>
        </div>

        <button
          type="button"
          className="modal-close"
          onClick={() => setShowPaymentModal(false)}
        >
          ×
        </button>
      </div>

      <div className="payment-summary">
        <span>Amount due</span>
        <strong>
          ${lease.currentPayment.amount.toLocaleString()}
        </strong>
      </div>

      <form onSubmit={handlePayRent}>
        <div className="field">
          <label htmlFor="cardholder">Cardholder name</label>
          <input
            id="cardholder"
            type="text"
            value={cardholder}
            onChange={(e) => setCardholder(e.target.value)}
            placeholder="Name on card"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="card-number">Card number</label>
          <input
            id="card-number"
            type="text"
            inputMode="numeric"
            value={cardNumber}
            onChange={(e) =>
              setCardNumber(
                e.target.value
                  .replace(/\D/g, '')
                  .slice(0, 16)
                  .replace(/(\d{4})(?=\d)/g, '$1 ')
              )
            }
            placeholder="1234 5678 9012 3456"
            maxLength="19"
            required
          />
        </div>

        <div className="payment-field-row">
          <div className="field">
            <label htmlFor="expiration">Expiration</label>
            <input
              id="expiration"
              type="text"
              inputMode="numeric"
              value={expiration}
              onChange={(e) => {
                const digits = e.target.value
                  .replace(/\D/g, '')
                  .slice(0, 4);

                setExpiration(
                  digits.length > 2
                    ? `${digits.slice(0, 2)}/${digits.slice(2)}`
                    : digits
                );
              }}
              placeholder="MM/YY"
              maxLength="5"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="cvv">CVV</label>
            <input
              id="cvv"
              type="password"
              inputMode="numeric"
              value={cvv}
              onChange={(e) =>
                setCvv(
                  e.target.value
                    .replace(/\D/g, '')
                    .slice(0, 4)
                )
              }
              placeholder="123"
              maxLength="4"
              required
            />
          </div>
        </div>

        {payStatus && (
          <p className="payment-message">{payStatus}</p>
        )}

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setShowPaymentModal(false)}
          >
            Cancel
          </button>

          <button type="submit" className="btn btn-primary">
            Pay ${lease.currentPayment.amount.toLocaleString()}
          </button>
        </div>
      </form>
      </div>
    </div>
  )}
    </main>
  );
}