import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/layout/Header';
import { GradeOverview } from './components/dashboard/GradeOverview';
import { SubjectPage } from './pages/SubjectPage';
import { ClassManagementPage } from './pages/ClassManagementPage';
import { ParentDashboard } from './pages/ParentDashboard';
import { RewardsPage } from './pages/RewardsPage';
import { AuthForm } from './components/auth/AuthForm';
import { AuthGuard } from './components/auth/AuthGuard';
import { useAuthStore } from './stores/authStore';
import { supabase } from './lib/auth';
import { ArrowLeft } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function StudentDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const studentEmail = searchParams.get('student');

  return (
    <>
      {studentEmail && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <button
            onClick={() => navigate('/parent')}
            className="flex items-center text-gray-600 hover:text-indigo-600 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Parent Dashboard
          </button>
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-2 mb-6">
            <p className="text-indigo-700">
              Viewing dashboard for: <span className="font-medium">{studentEmail}</span>
            </p>
          </div>
        </div>
      )}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <GradeOverview />
        </div>
      </main>
    </>
  );
}

function App() {
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/login" element={<AuthForm mode="signin" />} />
            <Route path="/signup" element={<AuthForm mode="signup" />} />
            <Route
              path="/"
              element={
                <AuthGuard>
                  <>
                    <Header />
                    <StudentDashboard />
                  </>
                </AuthGuard>
              }
            />
            <Route
              path="/subjects/:id"
              element={
                <AuthGuard>
                  <>
                    <Header />
                    <SubjectPage />
                  </>
                </AuthGuard>
              }
            />
            <Route
              path="/classes"
              element={
                <AuthGuard>
                  <>
                    <Header />
                    <ClassManagementPage />
                  </>
                </AuthGuard>
              }
            />
            <Route
              path="/parent"
              element={
                <AuthGuard>
                  <>
                    <Header />
                    <ParentDashboard />
                  </>
                </AuthGuard>
              }
            />
            <Route
              path="/rewards"
              element={
                <AuthGuard>
                  <>
                    <Header />
                    <RewardsPage />
                  </>
                </AuthGuard>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;