import { useState } from 'react';
import { createMeeting } from '../services/meetingApi';
import CopyLink from '../components/CopyLink';

const CreateMeetingPage = () => {
  const [title, setTitle] = useState('');
  const [password, setPassword] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meetingData, setMeetingData] = useState<{
    meetingCode: string;
    joinUrl: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await createMeeting({
        title: title.trim(),
        password: password.trim() || undefined,
        scheduledAt: scheduledAt || undefined,
      });

      setMeetingData({
        meetingCode: response.meetingCode,
        joinUrl: response.joinUrl,
      });
      
      // Reset form
      setTitle('');
      setPassword('');
      setScheduledAt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create meeting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-10">
      <h2 className="text-2xl font-semibold tracking-tight">Create a new meeting</h2>
      
      {meetingData ? (
        <div className="flex flex-col gap-6 rounded-lg border border-slate-700 bg-slate-900/60 p-6">
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-medium text-slate-200">Meeting Created Successfully!</h3>
            <p className="text-sm text-slate-400">
              Share this link with participants to join the meeting.
            </p>
          </div>
          
          <CopyLink url={meetingData.joinUrl} />
          
          <div className="flex gap-2">
            <button
              onClick={() => {
                setMeetingData(null);
                setError(null);
              }}
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Create Another Meeting
            </button>
            <a
              href={meetingData.joinUrl}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Join Meeting
            </a>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 rounded-lg border border-slate-700 bg-slate-900/60 p-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="title" className="text-sm font-medium text-slate-300">
              Meeting Title <span className="text-red-400">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Enter meeting title"
              className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-slate-200 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="scheduledAt" className="text-sm font-medium text-slate-300">
              Schedule Date & Time (Optional)
            </label>
            <input
              id="scheduledAt"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-slate-200 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-300">
              Password (Optional)
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave empty for no password"
              className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-slate-200 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
            />
            <p className="text-xs text-slate-400">
              If set, participants will need this password to join the meeting.
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-900/20 border border-red-700 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Meeting'}
          </button>
        </form>
      )}
    </section>
  );
};

export default CreateMeetingPage;
