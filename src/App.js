import { useState, useEffect, useCallback, useRef } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { supabase } from './components/supabaseClient'
import AdminLogin from './pages/AdminLogin'
import ReportsPage from './pages/ReportsPage'
import AssignmentsPage from './pages/AssignmentsPage'
import AnalysisPage from './pages/AnalysisPage'
import Sidebar from './components/Sidebar'
import './App.css';

const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

function useIdleLogout(timeoutMs) {
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(handleLogout, timeoutMs);
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach((event) => window.addEventListener(event, resetTimer));

    resetTimer(); // start the timer on mount

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      activityEvents.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [timeoutMs, handleLogout]);
}

function Dashboard() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activePage, setActivePage] = useState('dashboard');

  // Auto log out after 5 minutes of no user activity.
  useIdleLogout(SESSION_TIMEOUT_MS);

  const content = activePage === 'assignments'
    ? <AssignmentsPage selectedCategory={selectedCategory} />
    : activePage === 'analysis'
    ? <AnalysisPage />
    // 'dashboard' and 'reports' both show the same ReportsPage — there's
    // no separate overview page yet, so Dashboard just aliases Reports.
    : <ReportsPage selectedCategory={selectedCategory} />;

  return (
    <Sidebar
      activePage={activePage}
      onPageChange={setActivePage}
      selectedCategory={selectedCategory}
      onCategoryChange={setSelectedCategory}
    >
      {content}
    </Sidebar>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminLogin />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;