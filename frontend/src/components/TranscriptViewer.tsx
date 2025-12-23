interface TranscriptViewerProps {
  transcriptText?: string | null;
  isLoading?: boolean;
  error?: string | null;
}

/**
 * Simple transcript viewer for Day 6.
 * Speaker diarization added in Day 7.
 * Summary generation added in Day 7.
 * Audio summary (TTS) added in Day 8.
 */
const TranscriptViewer = ({ transcriptText, isLoading, error }: TranscriptViewerProps) => {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300">
        Processing recording...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-700 bg-red-900/20 p-4 text-sm text-red-200">
        {error}
      </div>
    );
  }

  if (!transcriptText) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-400">
        Transcript will appear here after processing.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
      <h3 className="text-lg font-semibold text-slate-100">Transcript</h3>
      <div className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md bg-slate-950/60 p-3 text-sm text-slate-200">
        {transcriptText}
      </div>
    </div>
  );
};

export default TranscriptViewer;

