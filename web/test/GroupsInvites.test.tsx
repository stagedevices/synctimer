import { render, fireEvent, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Groups } from '../src/components/Groups';
import { MemoryRouter } from 'react-router-dom';

const mockOnSnapshot = jest.fn();
const mockSetDoc = jest.fn(() => Promise.resolve());
const mockUpdateDoc = jest.fn(() => Promise.resolve());
const mockDeleteDoc = jest.fn(() => Promise.resolve());
const mockGetDoc = jest.fn();

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: (...args: any[]) => mockOnSnapshot(...args),
  doc: jest.fn(),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  setDoc: () => {
    mockSetDoc();
    return Promise.resolve();
  },
  updateDoc: () => {
    mockUpdateDoc();
    return Promise.resolve();
  },
  deleteDoc: () => {
    mockDeleteDoc();
    return Promise.resolve();
  },
  serverTimestamp: jest.fn(() => ({})),
  increment: jest.fn(() => ({})),
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
          data: () => ({ groupId: 'g1', invitedBy: 'u2', inviteAt: { toDate: () => new Date() } }),
        },
      ],
    });
  });

  const btn = await screen.findByText('Accept');
  await act(async () => {
    fireEvent.click(btn);
  });
  expect(mockSetDoc).toHaveBeenCalled();
  expect(mockUpdateDoc).toHaveBeenCalled();
  expect(mockDeleteDoc).toHaveBeenCalled();
  expect(screen.queryByText('Group')).not.toBeInTheDocument();
});



