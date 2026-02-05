'use client';

import { useAppSelector, selectCurrentUser, selectIsAuthenticated, logout, useAppDispatch, useLogoutMutation } from '@repo/store';

export default function UserNav() {
  const user = useAppSelector(selectCurrentUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const dispatch = useAppDispatch();
  const [logoutApi] = useLogoutMutation();

  const handleLogout = async () => {
    try {
      await logoutApi().unwrap();
    } catch {
      // Ignore API errors; still clear local session
    }
    dispatch(logout());
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth:hasSession');
    }
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium text-gray-700">
        Welcome, {user.username}
      </span>
      <button
        onClick={handleLogout}
        className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
      >
        Logout
      </button>
    </div>
  );
}
