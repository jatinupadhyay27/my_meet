import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinMeeting, getMeetingByCode } from '../services/meetingApi';

/**
 * Extract meeting code from a URL or return the input if it's already a code
 * Examples:
 * - "http://localhost:5173/meet/ABC12345" -> "ABC12345"
 * - "https://example.com/meet/XYZ98765" -> "XYZ98765"
 * - "ABC12345" -> "ABC12345"
 */
function extractMeetingCode(input: string): string {
  const trimmed = input.trim();
  
  // If it looks like a URL, try to extract the meeting code
  if (trimmed.includes('/')) {
    try {
      const url = new URL(trimmed);
      // Extract the last segment from the pathname (e.g., "/meet/ABC12345" -> "ABC12345")
      const pathSegments = url.pathname.split('/').filter(Boolean);
      const lastSegment = pathSegments[pathSegments.length - 1];
      
      // If the last segment looks like a meeting code (alphanumeric, 6-10 chars)
      if (lastSegment && /^[A-Z0-9]{6,10}$/i.test(lastSegment)) {
        return lastSegment.toUpperCase();
      }
    } catch {
      // If URL parsing fails, try to extract from string pattern
      // Match pattern like "/meet/ABC12345" or "meet/ABC12345"
      const match = trimmed.match(/(?:^|\/)(?:meet\/)?([A-Z0-9]{6,10})(?:\/|$)/i);
      if (match && match[1]) {
        return match[1].toUpperCase();
      }
    }
  }
  
  // If it's not a URL, return the input as-is (already a code)
  return trimmed.toUpperCase();
}

const JoinMeetingPage = () => {
  const [meetingCode, setMeetingCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const navigate = useNavigate();

  // Check if meeting requires password when meeting code changes
  useEffect(() => {
    const checkMeeting = async () => {
      const extractedCode = extractMeetingCode(meetingCode);
      
      if (extractedCode.length >= 6) {
        setChecking(true);
        setError(null);
        try {
          const meeting = await getMeetingByCode(extractedCode);
          setHasPassword(meeting.hasPassword);
          if (!meeting.hasPassword) {
            setPassword(''); // Clear password if not needed
          }
        } catch (err) {
          setHasPassword(null);
          // Don't show error for invalid codes while typing
          if (extractedCode.length >= 8) {
            setError(err instanceof Error ? err.message : 'Meeting not found');
          }
        } finally {
          setChecking(false);
        }
      } else {
        setHasPassword(null);
        setError(null);
      }
    };

    const timeoutId = setTimeout(checkMeeting, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [meetingCode]);

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    const extractedCode = extractMeetingCode(pastedText);
    
    // Only update if we successfully extracted a code
    if (extractedCode && extractedCode.length >= 6) {
      e.preventDefault(); // Prevent default paste
      setMeetingCode(extractedCode);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // If the value looks like a URL, extract the code
    if (value.includes('/') || value.includes('http')) {
      const extractedCode = extractMeetingCode(value);
      setMeetingCode(extractedCode);
    } else {
      setMeetingCode(value.toUpperCase());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const code = extractMeetingCode(meetingCode);
      await joinMeeting({
        meetingCode: code,
        password: password.trim() || undefined,
      });

      // Navigate to meeting page on success
      navigate(`/meet/${code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join meeting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-10">
      <h2 className="text-2xl font-semibold tracking-tight">Join a meeting</h2>
      <p className="text-sm text-slate-300">
        Enter the meeting code or paste the full meeting link to join. If the meeting is password-protected, you&apos;ll be prompted for the password.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 rounded-lg border border-slate-700 bg-slate-900/60 p-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="meetingCode" className="text-sm font-medium text-slate-300">
            Meeting Code <span className="text-red-400">*</span>
          </label>
          <input
            id="meetingCode"
            type="text"
            value={meetingCode}
            onChange={handleCodeChange}
            onPaste={handlePaste}
            required
            placeholder="Enter meeting code or paste meeting link"
            className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-slate-200 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none uppercase"
            maxLength={200}
          />
          <p className="text-xs text-slate-400">
            Tip: You can paste the full meeting link (e.g., http://localhost:5173/meet/ABC12345) and the code will be extracted automatically.
          </p>
          {checking && (
            <p className="text-xs text-slate-400">Checking meeting...</p>
          )}
          {hasPassword === true && !checking && (
            <p className="text-xs text-amber-400">This meeting requires a password.</p>
          )}
          {hasPassword === false && !checking && (
            <p className="text-xs text-green-400">Meeting found. No password required.</p>
          )}
        </div>

        {(hasPassword === true || (hasPassword === null && meetingCode.trim().length >= 6)) && (
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-300">
              Password {hasPassword === true && <span className="text-red-400">*</span>}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={hasPassword === true}
              placeholder={hasPassword === true ? "Enter password" : "Enter password (if required)"}
              className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-slate-200 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
            />
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-900/20 border border-red-700 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || checking || !meetingCode.trim()}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Joining...' : 'Join Meeting'}
        </button>
      </form>
    </section>
  );
};

export default JoinMeetingPage;
