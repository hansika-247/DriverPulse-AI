import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext';
import { AuthProvider } from './AuthContext';
import { LanguageProvider } from './LanguageContext';
import AppLayout from './Components/Layout/AppLayout';
import Dashboard from './Pages/Dashboard';
import DriverProfile from './Pages/DriverProfile';
import TripSummary from './Pages/TripSummary';
import FlaggedMoments from './Pages/FlaggedMoments';
import RouteAnalytics from './Pages/RouteAnalytics';
import AIInsights from './Pages/AIInsights';
import Leaderboard from './Pages/Leaderboard';
import AIAssistant from './Pages/AIAssistant';
import Settings from './Pages/Settings';
import Login from './Pages/Login';
import Signup from './Pages/Signup';
import DriverAssessmentForm from './Pages/DriverAssessmentForm';
import ProtectedRoute from './Components/ProtectedRoute';
import PublicRoute from './Components/PublicRoute';

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } />
              <Route path="/signup" element={
                <PublicRoute>
                  <Signup />
                </PublicRoute>
              } />

              {/* Protected App Routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard"   element={<Dashboard />} />
                <Route path="profile"     element={<DriverProfile />} />
                <Route path="trips"       element={<TripSummary />} />
                <Route path="flags"       element={<FlaggedMoments />} />
                <Route path="routes"      element={<RouteAnalytics />} />
                <Route path="insights"    element={<AIInsights />} />
                <Route path="leaderboard" element={<Leaderboard />} />
                <Route path="assistant"   element={<AIAssistant />} />
                <Route path="settings"    element={<Settings />} />
                {/* Standalone assessment route — also embedded in Dashboard when needsAssessment */}
                <Route path="assessment"  element={<DriverAssessmentForm standalone />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
