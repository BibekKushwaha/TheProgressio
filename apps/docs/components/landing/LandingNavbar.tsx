// components/landing/Navbar.tsx
'use client';

import { selectCurrentUser, selectIsAuthenticated, useAppSelector, useLogoutMutation } from '@repo/store';
import { motion } from 'framer-motion';
import { Sparkles, CreditCard, LogOut, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';

export function Navbar() {
  const user = useAppSelector(selectCurrentUser);
  const userlog = useAppSelector(selectIsAuthenticated);
  console.log(user);
  
  const [logout] = useLogoutMutation();
  const navLinks = ['Features', 'How it Works', 'Pricing'];
  const router = useRouter();


  const handleLogout = async () => {
    await logout();
    router.push('/'); // Redirect to homepage after logout
  };

   const handleDashboard = () => {
    router.push('/dashboard');
  };

  const handleSettings = () => {
    router.push('/settings');
  };
  
  

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 bg-slate-950/50 backdrop-blur-md border-b border-white/5"
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-400" />
            <span className="text-xl font-bold">Aura</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link}
                href={`#${link.toLowerCase().replace(' ', '-')}`}
                className="text-slate-300 hover:text-white transition-colors"
              >
                {link}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="text-slate-300 hover:bg-slate-700 transition-colors">
                    {user.username?.charAt(0).toUpperCase()}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="flex items-center gap-2" onClick={handleDashboard}>
                    <User className="w-4 h-4" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center gap-2" onClick={handleSettings}>
                    <Settings className="w-4 h-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="flex items-center gap-2" onClick={handleLogout}>
                    <LogOut className="w-4 h-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
              
                <Button
                onClick={()=> router.push("/login")}
                 className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300">
                  Get Started
                </Button>
              </>
            )}
            
          </div>
        </div>
      </div>

      
        {/* Mobile Menu */}
        
    </motion.nav>
  );
}

