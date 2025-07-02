import { render, fireEvent, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Groups } from '../src/components/Groups';
import { MemoryRouter } from 'react-router-dom';

const mockOnSnapshot = jest.fn();
const mockBatchSet = jest.fn();
const mockBatchDelete = jest.fn();
const mockBatchCommit = jest.fn(() => Promise.resolve());
const mockDeleteDoc = jest.fn(() => Promise.resolve());
const mockGetDoc = jest.fn();

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  collectionGroup: jest.fn(() => ({})),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: (...args: any[]) => mockOnSnapshot(...args),
  doc: jest.fn(),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  writeBatch: () => ({ set: mockBatchSet, delete: mockBatchDelete, commit: mockBatchCommit }),
  deleteDoc: () => {
    mockDeleteDoc();
    return Promise.resolve();
  },
  serverTimestamp: jest.fn(() => ({})),
}));

jest.mock('../src/lib/firebase', () => ({ auth: { currentUser: { uid: 'u1' } }, db: {} }));
jest.mock('react-firebase-hooks/auth', () => ({ useAuthState: () => [{ uid: 'u1' }, false] }));

jest.mock('../src/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }),
  });
});

test('accept invite updates Firestore and UI', async () => {
  mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ name: 'Group' }) });
  mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ displayName: 'Bob' }) });

  const callbacks: ((snap: any) => void)[] = [];
  mockOnSnapshot.mockImplementation((_q, next) => {
    callbacks.push(next);
    next({ docs: [] });
    return () => {};
  });

  render(
    <MemoryRouter>
      <Groups />
    </MemoryRouter>
  );

  const cb = callbacks[callbacks.length - 1];
  await act(async () => {
    cb({
      docs: [
        {
          id: 'inv1',
          data: () => ({ groupId: 'g1', inviterUid: 'u2', invitedAt: { toDate: () => new Date() } }),
        },
      ],
    });
  });

  const btn = await screen.findByText('Accept');
  await act(async () => {
    fireEvent.click(btn);
  });
  expect(mockBatchSet).toHaveBeenCalled();
  expect(mockBatchDelete).toHaveBeenCalled();
  expect(mockBatchCommit).toHaveBeenCalled();
  expect(screen.queryByText('Group')).not.toBeInTheDocument();
});



