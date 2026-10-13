import { useEffect, useRef, useState } from 'react';

export default function App() {
  const [pincode, setPincode] = useState('');
  const [offices, setOffices] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [result, setResult] = useState(null);
  const request = useRef(null);

  useEffect(() => () => request.current?.abort(), []);

  async function lookup(event) {
    event.preventDefault();
    const code = pincode.trim();
    if (!/^\d{6}$/.test(code)) {
      setValidationError('Please enter a valid 6-digit Indian postal code.');
      return;
    }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setValidationError('');
    setError('');
    setOffices([]);
    setResult(null);
    setFilter('');
    setLoading(true);
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 20000);
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${code}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`Unable to fetch postal data (HTTP ${response.status}). Please try again.`);
      const payload = await response.json();
      const data = Array.isArray(payload) ? payload[0] : null;
      if (!data || typeof data.Status !== 'string') throw new Error('The postal service returned an unexpected response. Please try again.');
      if (data.Status !== 'Success') throw new Error(data.Message || 'No postal data found for this pincode.');
      if (!Array.isArray(data.PostOffice) || data.PostOffice.length === 0) throw new Error('No postal data found for this pincode.');
      if (request.current !== controller) return;
      setOffices(data.PostOffice);
      setResult({ pincode: code, message: data.Message || `Number of pincode(s) found: ${data.PostOffice.length}` });
    } catch (failure) {
      if (request.current !== controller) return;
      if (timedOut) setError('The request timed out. Please try again.');
      else if (failure.name !== 'AbortError') setError(failure instanceof TypeError ? 'Unable to connect to the postal service. Check your connection and try again.' : failure.message || 'Something went wrong. Please try again.');
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) setLoading(false);
    }
  }

  const visibleOffices = offices.filter(office => (office.Name || '').toLowerCase().includes(filter.trim().toLowerCase()));

  return (
    <main>
      <header><span className="eyebrow">INDIAN POSTAL DIRECTORY</span><h1>Pincode Lookup</h1><p className="intro">Find post offices, districts, and states by postal code.</p></header>
      <form onSubmit={lookup} noValidate className="lookup-form">
        <label htmlFor="pincode">Enter Pincode</label>
        <input id="pincode" type="text" inputMode="numeric" autoComplete="postal-code" placeholder="Enter a 6-digit pincode" value={pincode} onChange={event => { setPincode(event.target.value); setValidationError(''); }} aria-invalid={Boolean(validationError)} aria-describedby={validationError ? 'validation-error' : 'pincode-hint'} />
        <small id="pincode-hint">For example, 110001</small>
        {validationError && <p id="validation-error" className="error" role="alert">{validationError}</p>}
        <button type="submit" disabled={loading}>{loading ? 'Looking up…' : 'Lookup'}</button>
      </form>
      {loading && <div className="loading" role="status"><span className="spinner" aria-hidden="true" />Fetching postal data…</div>}
      {error && <p className="error api-error" role="alert">{error}</p>}
      {result && <section className="results" aria-labelledby="results-heading">
        <h2 id="results-heading">Pincode: <span>{result.pincode}</span></h2>
        <p className="message"><strong>Message:</strong> {result.message}</p>
        <label htmlFor="filter">Filter by post office name</label>
        <input id="filter" type="search" placeholder="Filter by post office name" value={filter} onChange={event => setFilter(event.target.value)} />
        <p className="result-count" role="status">Showing {visibleOffices.length} of {offices.length} post offices</p>
        {visibleOffices.length ? <div className="office-grid">{visibleOffices.map((office, index) => <article className="office-card" key={`${office.Name}-${office.Pincode}-${index}`}>
          <h3>{office.Name}</h3>
          <dl><div><dt>Pincode</dt><dd>{office.Pincode}</dd></div><div><dt>District</dt><dd>{office.District}</dd></div><div><dt>State</dt><dd>{office.State}</dd></div></dl>
        </article>)}</div> : <p className="empty" role="status">Couldn’t find the postal data you’re looking for…</p>}
      </section>}
      {!loading && !result && !error && <div className="initial-state"><span aria-hidden="true">⌖</span><p>Your search starts with six digits.</p><small>Enter a pincode above to find its post offices.</small></div>}
      <footer>Postal data provided by the Indian Postal Pincode API.</footer>
    </main>
  );
}
