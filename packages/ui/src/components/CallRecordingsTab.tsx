import React, { useState, useEffect } from 'react';
import { Play, Pause, Download, Headphones, Volume2, Clock, FileText, BarChart3 } from 'lucide-react';

interface CallRecording {
  id: string;
  call_sid: string;
  recording_url: string;
  duration: number;
  transcript?: string;
  sentiment_score?: number;
  call_date: string;
  lead_phone: string;
  campaign_name: string;
  call_outcome: string;
  recording_status: 'processing' | 'completed' | 'failed';
  transcript_status: 'pending' | 'processing' | 'completed' | 'failed';
  audio_quality_score?: number;
}

interface CallRecordingsTabProps {
  campaignId: string;
}

export default function CallRecordingsTab({ campaignId }: CallRecordingsTabProps) {
  const [recordings, setRecordings] = useState<CallRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingRecording, setPlayingRecording] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState<{ [key: string]: number }>({});
  const [selectedRecording, setSelectedRecording] = useState<CallRecording | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    fetchRecordings();
  }, [campaignId]);

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch recordings from the analytics_call_summary view which includes recording_url
      const response = await fetch(`/api/campaigns/${campaignId}/analytics/calls`);
      if (!response.ok) {
        throw new Error('Failed to fetch recordings');
      }

      const data = await response.json();
      
      // Filter calls that have recording URLs
      const recordingsData = data.filter((call: any) => call.recording_url)
        .map((call: any) => ({
          id: call.call_id,
          call_sid: call.call_sid,
          recording_url: call.recording_url,
          duration: call.duration_seconds || 0,
          transcript: call.transcript || '',
          sentiment_score: call.sentiment_score,
          call_date: call.started_at,
          lead_phone: call.phone_number,
          campaign_name: call.campaign_name,
          call_outcome: call.call_outcome || call.call_status,
          recording_status: 'completed',
          transcript_status: call.transcript ? 'completed' : 'pending',
          audio_quality_score: 0.8 // Default score
        }));

      setRecordings(recordingsData);
    } catch (error) {
      console.error('Error fetching recordings:', error);
      setError('Failed to load recordings');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSentimentColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score > 0.1) return 'text-green-600';
    if (score < -0.1) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getSentimentLabel = (score?: number) => {
    if (!score) return 'Unknown';
    if (score > 0.1) return 'Positive';
    if (score < -0.1) return 'Negative';
    return 'Neutral';
  };

  const playRecording = async (recording: CallRecording) => {
    try {
      // Stop current audio if playing
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }

      if (playingRecording === recording.id) {
        setPlayingRecording(null);
        setCurrentAudio(null);
        return;
      }

      const audio = new Audio(recording.recording_url);
      
      audio.addEventListener('loadedmetadata', () => {
        setPlayingRecording(recording.id);
        setCurrentAudio(audio);
        audio.play();
      });

      audio.addEventListener('timeupdate', () => {
        const progress = (audio.currentTime / audio.duration) * 100;
        setPlaybackProgress(prev => ({
          ...prev,
          [recording.id]: progress
        }));
      });

      audio.addEventListener('ended', () => {
        setPlayingRecording(null);
        setCurrentAudio(null);
        setPlaybackProgress(prev => ({
          ...prev,
          [recording.id]: 0
        }));
      });

      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        setError('Failed to play recording');
        setPlayingRecording(null);
        setCurrentAudio(null);
      });

    } catch (error) {
      console.error('Error playing recording:', error);
      setError('Failed to play recording');
    }
  };

  const downloadRecording = async (recording: CallRecording) => {
    try {
      const response = await fetch(recording.recording_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `recording-${recording.call_sid}-${new Date(recording.call_date).toISOString().split('T')[0]}.mp3`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading recording:', error);
      setError('Failed to download recording');
    }
  };

  const viewTranscript = (recording: CallRecording) => {
    setSelectedRecording(recording);
    setShowTranscript(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading recordings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading recordings</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={fetchRecordings}
              className="mt-2 bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Headphones className="w-5 h-5 mr-2" />
              Call Recordings
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {recordings.length} recordings available
            </p>
          </div>
          <button
            onClick={fetchRecordings}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Recordings List */}
      {recordings.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <Headphones className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No recordings found</h3>
          <p className="text-gray-500">
            Recordings will appear here after outbound calls are completed.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h4 className="text-sm font-medium text-gray-900">Recording Library</h4>
          </div>
          <div className="divide-y divide-gray-200">
            {recordings.map((recording) => (
              <div key={recording.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <button
                        onClick={() => playRecording(recording)}
                        className="flex items-center justify-center w-10 h-10 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors"
                      >
                        {playingRecording === recording.id ? (
                          <Pause className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Play className="w-4 h-4 text-blue-600" />
                        )}
                      </button>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {recording.lead_phone}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(recording.call_date).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {playingRecording === recording.id && (
                      <div className="mb-3 ml-13">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                            style={{ width: `${playbackProgress[recording.id] || 0}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    <div className="ml-13 space-y-2">
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {formatDuration(recording.duration)}
                        </span>
                        <span className="flex items-center">
                          <Volume2 className="w-4 h-4 mr-1" />
                          {recording.call_outcome}
                        </span>
                        <span className={`flex items-center ${getSentimentColor(recording.sentiment_score)}`}>
                          <BarChart3 className="w-4 h-4 mr-1" />
                          {getSentimentLabel(recording.sentiment_score)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {recording.transcript && (
                      <button
                        onClick={() => viewTranscript(recording)}
                        className="text-gray-400 hover:text-gray-600 p-2 rounded"
                        title="View Transcript"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => downloadRecording(recording)}
                      className="text-gray-400 hover:text-gray-600 p-2 rounded"
                      title="Download Recording"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transcript Modal */}
      {showTranscript && selectedRecording && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Call Transcript</h3>
                  <p className="text-sm text-gray-500">
                    {selectedRecording.lead_phone} • {new Date(selectedRecording.call_date).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setShowTranscript(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
              {selectedRecording.transcript ? (
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap text-gray-700">
                    {selectedRecording.transcript}
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No transcript available for this recording</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
