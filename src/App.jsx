import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/config';

// Components
import LoginScreen from './components/auth/LoginScreen';
import Navigation from './components/layout/Navigation';
import ProfileScreen from './components/profile/ProfileScreen';
import PlanScreen from './components/plan/PlanScreen';
import WorkoutScreen from './components/workout/WorkoutScreen';
import ProgressScreen from './components/progress/ProgressScreen';
import LoadingSpinner from './components/ui/LoadingSpinner';
import ScheduledWorkoutsScreen from './components/plan/ScheduledWorkoutsScreen';

// Context
import { AuthProvider } from './contexts/AuthContext';
import { UserDataProvider } from './contexts/UserDataContext';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <AuthProvider>
      <UserDataProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            {!user ? (
              <LoginScreen />
            ) : (
              <>
                <div className="pb-16"> {/* Space for bottom navigation */}
                  <Routes>
                    <Route path="/" element={<Navigate to="/profile" replace />} />
                    <Route path="/profile" element={<ProfileScreen />} />
                    <Route path="/plan" element={<PlanScreen />} />
                    <Route path="/workout" element={<WorkoutScreen />} />
                    <Route path="/progress" element={<ProgressScreen />} />
                     <Route path="/scheduled" element={<ScheduledWorkoutsScreen/>} />
                  </Routes>
                </div>
                <Navigation />
              </>
            )}
          </div>
        </Router>
      </UserDataProvider>
    </AuthProvider>
  );
}

export default App;
