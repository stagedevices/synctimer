import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Files } from '../src/components/Files';

jest.mock('../src/components/ReshareModal', () => ({
  ReshareModal: () => <div>ReshareModal</div>,
}));

const mockOnSnapshot = jest.fn();

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  query: jest.fn((...args) => args),
  orderBy: jest.fn(),
  onSnapshot: (...args: any[]) => mockOnSnapshot(...args),
}));

jest.mock('../src/lib/firebase', () => ({ auth: { currentUser: { uid: 'u1' } }, db: {} }));
jest.mock('react-firebase-hooks/auth', () => ({ useAuthState: () => [{ uid: 'u1' }, false] }));

jest.mock('../src/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }),
  });
});

const received = {
  id: 'r1',
  title: 'Received File',
  yaml: 'a: b',
  createdAt: { toDate: () => new Date('2025-06-30T15:45:00Z') },
  size: 8,
  origin: 'peer',
  originName: 'alice',
  type: 'part',
};

const sent = {
  id: 's1',
  title: 'Sent File',
  yaml: 'c: d',
  createdAt: { toDate: () => new Date('2025-06-30T15:45:00Z') },
  size: 12,
};

const assignment = {
  id: 'as1',
  fileId: 'r1',
  partIds: ['1'],
  assignedBy: 'u2',
  assignedAt: { toDate: () => new Date('2025-06-30T15:45:00Z') },
};

beforeEach(() => {
  let call = 0;
  mockOnSnapshot.mockImplementation((_q, next) => {
    call += 1;
    if (call === 1) next({ docs: [{ id: received.id, data: () => received }] });
    else if (call === 2) next({ docs: [{ id: sent.id, data: () => sent }] });
    else if (call === 3) next({ docs: [{ id: assignment.id, data: () => assignment }] });
    return () => {};
  });
});

test('renders tabs with data', async () => {
  render(<Files />);
  expect(await screen.findByText('Received File')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Sent' }));
  expect(await screen.findByText('Sent File')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Assigned' }));
  expect(await screen.findByText(/Parts:/)).toBeInTheDocument();
});

test('action buttons work', async () => {
  const createObjectURL = jest.fn(() => 'blob:');
  const revokeObjectURL = jest.fn();
  (globalThis as any).URL = { createObjectURL, revokeObjectURL };
  const writeText = jest.fn(() => Promise.resolve());
  (navigator as any).clipboard = { writeText };

  render(<Files />);
  await screen.findByText('Received File');
  fireEvent.click(screen.getByLabelText('copy-r1'));
  expect(writeText).toHaveBeenCalled();
  fireEvent.click(screen.getByLabelText('download-r1'));
  expect(createObjectURL).toHaveBeenCalled();
  fireEvent.click(screen.getByLabelText('reshare-r1'));
  expect(screen.getByText('ReshareModal')).toBeInTheDocument();
});
