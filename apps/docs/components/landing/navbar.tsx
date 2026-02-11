"use client";
import { useAppSelector, selectIsAuthenticated, logout, useAppDispatch, useLogoutMutation, selectCurrentUser } from '@repo/store';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const router = useRouter();
  const [logoutApi] = useLogoutMutation();


  const [isOpen, setIsOpen] = useState(false);
  const handleLogout = async () => {
    try {
      await logoutApi().unwrap();
    } catch (error) {
      console.error('Logout failed:', error);
    }
    dispatch(logout());
    setIsOpen(false);
    router.replace('/login');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-100 shadow-sm">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/20 via-violet-400/20 to-blue-400/20 animate-gradient-shift" />
      <div className="absolute inset-0 bg-gradient-to-tl from-blue-400/10 via-violet-400/10 to-indigo-400/10 animate-gradient-shift-reverse" />

      <div className="relative z-10 max-w-8xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center group"
          >
            <span className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 transition-all duration-300 tracking-tight">
              transition
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3">
            {!isAuthenticated && (
              <>
                <Link
                  href="/login"
                  className="px-6 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="px-6 py-2 text-sm font-semibold text-white bg-black rounded-full hover:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  Sign Up
                </Link>
              </>
            )}
            {isAuthenticated && (
              <div className="relative" >
                {/* Avatar */}
                <div
                  onClick={() => setIsOpen(!isOpen)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-white font-semibold">
                    {user?.username?.[0]?.toUpperCase()}
                  </div>
                </div>

                {/* Popup */}
                {isOpen && (
                  <div className="absolute right-0 mt-2 w-44 rounded-xl bg-white shadow-lg border border-gray-100 z-50">
                    <button
                      onClick={() => {
                        router.push("/dashboard");
                        setIsOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded-t-xl"
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={() => {
                        router.push("/profile");
                        setIsOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded-t-xl"
                    >
                      Profile
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 rounded-b-xl"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-3 -mr-2 rounded-xl hover:bg-black/5 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            aria-label="Toggle menu"
            aria-expanded={isOpen}
          >
            <div className="w-6 h-5 flex flex-col justify-between relative">
              <span
                className={`w-full h-0.5 bg-gray-800 rounded-full transition-all duration-300 ease-in-out ${isOpen ? 'rotate-45 translate-y-2' : ''
                  }`}
              />
              <span
                className={`w-full h-0.5 bg-gray-800 rounded-full transition-all duration-300 ease-in-out ${isOpen ? 'opacity-0 translate-x-3' : ''
                  }`}
              />
              <span
                className={`w-full h-0.5 bg-gray-800 rounded-full transition-all duration-300 ease-in-out ${isOpen ? '-rotate-45 -translate-y-2' : ''
                  }`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`relative z-20 md:hidden overflow-hidden transition-all duration-300 ease-in-out shadow-2xl ${isOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
          }`}
      >
        <div className="px-6 pt-4 pb-8 space-y-3 bg-white/95 backdrop-blur-xl border-t border-gray-100/50">
          {!isAuthenticated && (<>
            <Link
              href="/login"
              className="block w-full px-6 py-3 text-center text-gray-600 font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 transition-all duration-200"
              onClick={() => setIsOpen(false)}
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="block w-full px-6 py-3 text-center text-white font-semibold rounded-xl bg-black hover:bg-gray-800 shadow-md transition-all duration-200"
              onClick={() => setIsOpen(false)}
            >
              Sign Up
            </Link>
          </>)}
          {isAuthenticated && (
            <>
              <button
                onClick={() => {
                  router.push("/dashboard");
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded-t-xl"
              >
                Dashboard
              </button>
              <button
                onClick={() => {
                  router.push("/profile");
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded-t-xl"
              >
                Profile
              </button>

              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 text-white font-semibold rounded-xl bg-red-600 hover:bg-red-700 shadow-md transition-all duration-200"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}