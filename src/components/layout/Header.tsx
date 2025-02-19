import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GraduationCap, Bell, LogOut, Users, Gift } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { getUserRole } from '../../lib/api';

export function Header() {
  const { signOut, user } = useAuthStore();
  const location = useLocation();

  const { data: userRole } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: () => getUserRole(user?.id || ''),
    enabled: !!user?.id
  });

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path ? 'text-indigo-600' : 'text-gray-700 hover:text-indigo-600';
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to={userRole === 'parent' ? '/parent' : '/'} className="flex items-center space-x-2">
              <GraduationCap className="h-8 w-8 text-indigo-600" />
              <span className="text-xl font-bold text-gray-900">GradeTracker</span>
            </Link>
          </div>
          
          <nav className="hidden md:flex space-x-8">
            {userRole === 'parent' ? (
              <>
                <Link to="/parent" className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${isActive('/parent')}`}>
                  <Users className="h-4 w-4 mr-2" />
                  Students
                </Link>
                <Link to="/rewards" className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${isActive('/rewards')}`}>
                  <Gift className="h-4 w-4 mr-2" />
                  Rewards
                </Link>
              </>
            ) : (
              <>
                <Link to="/" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/')}`}>
                  Dashboard
                </Link>
                <Link to="/classes" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/classes')}`}>
                  Classes
                </Link>
                <Link to="/rewards" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/rewards')}`}>
                  Rewards
                </Link>
              </>
            )}
          </nav>

          <div className="flex items-center space-x-4">
            <button className="text-gray-600 hover:text-indigo-600">
              <Bell className="h-6 w-6" />
            </button>
            {user && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">{user.email}</span>
                <button
                  onClick={handleSignOut}
                  className="text-gray-600 hover:text-indigo-600"
                >
                  <LogOut className="h-6 w-6" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}