import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import App from './App.jsx';

const offices = [
  { Name: 'Connaught Place', Pincode: '110001', District: 'Central Delhi', State: 'Delhi' },
  { Name: 'Baroda House', Pincode: '110001', District: 'Central Delhi', State: 'Delhi' },
];
const success = { ok: true, json: async () => [{ Status: 'Success', Message: 'Number of pincode(s) found: 2', PostOffice: offices }] };

async function submit(user, code = '110001') {
  await user.type(screen.getByLabelText('Enter Pincode'), code);
  await user.click(screen.getByRole('button', { name: 'Lookup' }));
}

describe('Pincode lookup', () => {
  it('rejects invalid inputs without calling the API', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup(); render(<App />);
    for (const code of ['12345', '1234567', 'abcdef', '12.456']) {
      await user.clear(screen.getByLabelText('Enter Pincode'));
      await submit(user, code);
      expect(screen.getByRole('alert')).toHaveTextContent('6-digit');
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows loading, displays all fields, and filters locally without another fetch', async () => {
    let resolve;
    const fetchMock = vi.fn(() => new Promise(done => { resolve = done; }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup(); render(<App />); await submit(user);
    expect(screen.getByRole('status')).toHaveTextContent('Fetching postal data');
    expect(screen.getByRole('button')).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledWith('https://api.postalpincode.in/pincode/110001', expect.objectContaining({ signal: expect.any(AbortSignal) }));
    resolve(success);
    expect(await screen.findByRole('heading', { name: 'Connaught Place' })).toBeInTheDocument();
    expect(screen.queryByText('Fetching postal data…')).not.toBeInTheDocument();
    expect(screen.getAllByText('Central Delhi')).toHaveLength(2);
    expect(screen.getAllByText('Delhi')).toHaveLength(2);
    expect(screen.getAllByText('110001')).toHaveLength(3);
    const filter = screen.getByLabelText('Filter by post office name');
    await user.type(filter, 'CONNAUGHT');
    expect(screen.queryByRole('heading', { name: 'Baroda House' })).not.toBeInTheDocument();
    await user.clear(filter); await user.type(filter, 'missing');
    expect(screen.getByText('Couldn’t find the postal data you’re looking for…')).toBeInTheDocument();
    await user.clear(filter);
    expect(screen.getByRole('heading', { name: 'Baroda House' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['API error', { ok: true, json: async () => [{ Status: 'Error', Message: 'No records found', PostOffice: null }] }, 'No records found'],
    ['HTTP error', { ok: false, status: 503 }, 'HTTP 503'],
    ['malformed response', { ok: true, json: async () => [] }, 'unexpected response'],
    ['empty result', { ok: true, json: async () => [{ Status: 'Success', PostOffice: [] }] }, 'No postal data found'],
  ])('handles %s and removes the loader', async (_name, response, message) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    const user = userEvent.setup(); render(<App />); await submit(user);
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.queryByText('Fetching postal data…')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lookup' })).toBeEnabled();
  });

  it('allows retry after a network error and clears the error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(success));
    const user = userEvent.setup(); render(<App />); await submit(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('Check your connection');
    await user.click(screen.getByRole('button', { name: 'Lookup' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Connaught Place' })).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
