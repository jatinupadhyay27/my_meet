import { Routes, Route, NavLink } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CreateMeetingPage from './pages/CreateMeetingPage';
import JoinMeetingPage from './pages/JoinMeetingPage';
import MeetingPage from './pages/MeetingPage';

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="text-lg font-semibold tracking-tight">
            My<span className="text-sky-400">Meet</span>
          </span>
          <div className="flex gap-4 text-sm">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `hover:text-sky-400 ${isActive ? 'text-sky-400' : 'text-slate-200'}`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/create"
              className={({ isActive }) =>
                `hover:text-sky-400 ${isActive ? 'text-sky-400' : 'text-slate-200'}`
              }
            >
              Create Meeting
            </NavLink>
            <NavLink
              to="/join"
              className={({ isActive }) =>
                `hover:text-sky-400 ${isActive ? 'text-sky-400' : 'text-slate-200'}`
              }
            >
              Join Meeting
            </NavLink>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreateMeetingPage />} />
          <Route path="/join" element={<JoinMeetingPage />} />
          <Route path="/meet/:meetingCode" element={<MeetingPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;


