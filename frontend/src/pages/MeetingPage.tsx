import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getMeetingByCode } from '../services/meetingApi';

const MeetingPage = () => {
  const { meetingCode } = useParams<{ meetingCode: string }>();
  const [meeting, setMeeting] = useState<{
    id: string;
    title: string;
    meetingCode: string;
    scheduledAt?: string;
    createdAt: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMeeting = async () => {
      if (!meetingCode) {
        setError('Meeting code is required');
        setLoading(false);
        return;
      }

      try {
        const data = await getMeetingByCode(meetingCode);
        setMeeting({
          id: data.id,
          title: data.title,
          meetingCode: data.meetingCode,
          scheduledAt: data.scheduledAt,
          createdAt: data.createdAt,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load meeting');
      } finally {
        setLoading(false);
      }
    };

    fetchMeeting();
  }, [meetingCode]);

  if (loading) {
    return (
      <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-10">
        <div className="text-center text-slate-400">Loading meeting...</div>
      </section>
    );
  }

  if (error || !meeting) {
    return (
      <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-10">
        <div className="rounded-lg border border-red-700 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          {error || 'Meeting not found'}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-10">
      <h2 className="text-2xl font-semibold tracking-tight">{meeting.title}</h2>
      
      <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-6">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm text-slate-400">Meeting Code</p>
            <p className="text-lg font-mono font-semibold text-slate-200">{meeting.meetingCode}</p>
          </div>
          
          {meeting.scheduledAt && (
            <div>
              <p className="text-sm text-slate-400">Scheduled At</p>
              <p className="text-slate-200">
                {new Date(meeting.scheduledAt).toLocaleString()}
              </p>
            </div>
          )}
          
          <div className="mt-4 rounded-lg border border-dashed border-slate-700 bg-slate-800/40 p-6 text-center text-sm text-slate-400">
            <p>Meeting room interface will be implemented in future days.</p>
            <p className="mt-2">WebRTC, video, audio, and screen sharing features coming soon.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MeetingPage;

