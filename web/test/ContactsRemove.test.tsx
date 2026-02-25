import { render, fireEvent, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Contacts } from '../src/components/Contacts';
import { Modal } from 'antd';
import { toast } from '../src/lib/toast';

const mockRemoveFriend = jest.fn().mockResolvedValue(undefined);
const mockRefetch = jest.fn(() => Promise.resolve());
const mockRemoveLocal = jest.fn();

jest.mock('../src/hooks/useFriends', () => ({
  useFriends: () => ({
    contacts: [
      { id: 'f1', displayName: 'Friend', email: 'friend@example.com' },
    ],
    incoming: [],
    outgoing: [],
    loading: false,
    refetch: mockRefetch,
    removeLocal: mockRemoveLocal,
  }),
}));

jest.mock('../src/lib/friends', () => ({
  removeFriend: (uid: string) => mockRemoveFriend(uid),
}));

jest.mock('../src/lib/toast', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('../src/lib/firebase', () => ({ auth: {} }));
jest.mock('react-firebase-hooks/auth', () => ({ useAuthState: () => [{ uid: 'u0' }] }));


beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }),
  });
});

test('removes friend when confirmed', async () => {
  jest.spyOn(Modal, 'confirm').mockImplementation(({ onOk }: any) => {
    onOk();
    return {} as any;
  });

  await act(async () => {
    render(<Contacts />);
  });

  await act(async () => {
    fireEvent.click(screen.getByText('Remove'));
  });

  await waitFor(() => expect(mockRemoveFriend).toHaveBeenCalledWith('f1'));
  expect(mockRemoveLocal).toHaveBeenCalledWith('f1');
  expect((toast.success as jest.Mock)).toHaveBeenCalledWith(
    'Removed Friend from your contacts.',
  );
});
