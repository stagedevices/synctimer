import { render, fireEvent } from '@testing-library/react';
import { AssignmentModal } from '../src/components/AssignmentModal';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  query: jest.fn(),
  orderBy: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
  addDoc: jest.fn(() => Promise.resolve({ id: 'a1' })),
  setDoc: jest.fn(() => Promise.resolve()),
  serverTimestamp: jest.fn(() => ({})),
  doc: jest.fn(),
}));

jest.mock('../src/lib/firebase', () => ({ auth: { currentUser: { uid: 'u1' } }, db: {} }));

jest.mock('../src/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }),
  });
});
test('renders AssignmentModal and submits', async () => {
  const { getByText } = render(
    <AssignmentModal open context="files" entityId="file1" onClose={() => {}} />
  );
  fireEvent.click(getByText('Next'));
});
