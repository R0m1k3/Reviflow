import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './stores/useAuth';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { NewRevisionPage } from './features/ingest/NewRevisionPage';
import { AnalyzePage } from './features/ingest/AnalyzePage';
import { ReviewPage } from './features/ingest/ReviewPage';
import { QuizPage } from './features/quiz/QuizPage';
import { RevisionViewPage } from './features/quiz/RevisionViewPage';
import DashboardPage from './pages/DashboardPage';
import { ParentalGate } from './features/auth/ParentalGate';
import { ProfileSelectionPage } from './features/auth/ProfileSelectionPage';
import { ParentHubPage } from './pages/ParentHubPage';
import { HistoryPage } from './features/quiz/HistoryPage';


function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, checkAuth } = useAuth();

  useEffect(() => {
    checkAuth();
  }, []);

  if (isLoading) return (
    <div className="flex justify-center items-center h-screen bg-[#FDFCF8]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  if (!isAuthenticated) return <Navigate to="/login" />;
  return <>{children}</>;
}

function MainRedirect() {
  const { user, activeLearner } = useAuth();

  // 1. If parent and no learner selected -> Parent Hub
  if (user?.role === 'parent' && !activeLearner) {
    return <Navigate to="/parent-hub" replace />;
  }

  // 2. If learner (auto-active) or parent with selection -> Dashboard
  return <Navigate to="/dashboard" replace />;
}

function LearnerProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, activeLearner, isLoading } = useAuth();

  if (isLoading) return null; // Or spinner
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!activeLearner) return <Navigate to="/select-profile" />;

  return <>{children}</>;
}

function ParentalProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isParentalModeActive } = useAuth();
  const [showGate, setShowGate] = React.useState(!isParentalModeActive);

  if (isParentalModeActive) return <>{children}</>;

  if (showGate) {
    return (
      <ParentalGate
        onSuccess={() => setShowGate(false)}
        onCancel={() => window.history.back()}
      />
    );
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/select-profile" element={
          <ProtectedRoute>
            <ProfileSelectionPage />
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <LearnerProtectedRoute>
              <DashboardPage />
            </LearnerProtectedRoute>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <ParentalProtectedRoute>
              <SettingsPage />
            </ParentalProtectedRoute>
          </ProtectedRoute>
        } />
        <Route path="/new" element={
          <ProtectedRoute>
            <LearnerProtectedRoute>
              <NewRevisionPage />
            </LearnerProtectedRoute>
          </ProtectedRoute>
        } />
        <Route path="/analyze" element={
          <ProtectedRoute>
            <LearnerProtectedRoute>
              <AnalyzePage />
            </LearnerProtectedRoute>
          </ProtectedRoute>
        } />
        <Route path="/review" element={
          <ProtectedRoute>
            <LearnerProtectedRoute>
              <ReviewPage />
            </LearnerProtectedRoute>
          </ProtectedRoute>
        } />
        <Route path="/quiz" element={
          <ProtectedRoute>
            <LearnerProtectedRoute>
              <QuizPage />
            </LearnerProtectedRoute>
          </ProtectedRoute>
        } />
        <Route path="/revision/:id" element={
          <ProtectedRoute>
            <LearnerProtectedRoute>
              <RevisionViewPage />
            </LearnerProtectedRoute>
          </ProtectedRoute>
        } />
        <Route path="/play/:revisionId" element={
          <ProtectedRoute>
            <LearnerProtectedRoute>
              <QuizPage />
            </LearnerProtectedRoute>
          </ProtectedRoute>
        } />
        <Route path="/parent-hub" element={
          <ProtectedRoute>
            <ParentalProtectedRoute>
              <ParentHubPage />
            </ParentalProtectedRoute>
          </ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute>
            <LearnerProtectedRoute>
              <HistoryPage />
            </LearnerProtectedRoute>
          </ProtectedRoute>
        } />
        <Route path="/" element={<MainRedirect />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
