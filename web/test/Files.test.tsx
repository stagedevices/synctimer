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

const files = [
  {
    id: 'f1',
    title: 'File 1',
    yaml: 'a: 1',
    createdAt: { toDate: () => new Date('2025-06-30T15:45:00Z') },
    size: 8,
    type: 'bundle',
    origin: 'peer',
    originName: 'alice',
  },
  {
    id: 'f2',
    title: 'File 2',
    yaml: 'b: 2',
    createdAt: { toDate: () => new Date('2025-06-30T15:45:00Z') },
    size: 12,
  },
  {
    id: 'f3',
    title: 'File 3',
    yaml: 'c: 3',
    createdAt: { toDate: () => new Date('2025-06-30T15:45:00Z') },
    size: 4,
  },
];

beforeEach(() => {
  let call = 0;
  mockOnSnapshot.mockImplementation((_q, next) => {
    call += 1;
    if (call === 1) {
      next({ docs: files.map(f => ({ id: f.id, data: () => f })) });
    } else if (call === 2) {
      next({ docs: [] });
    }
    return () => {};
  });
});

test('renders cards count and empty state', async () => {
  render(<Files />);
  const cards = await screen.findAllByLabelText(/view-/);
  expect(cards).toHaveLength(3);
  fireEvent.click(screen.getByRole('tab', { name: 'Sent Files' }));
  expect(await screen.findByText('No files yet — go validate one!')).toBeInTheDocument();
});

