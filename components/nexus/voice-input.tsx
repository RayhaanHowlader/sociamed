'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Square, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface VoiceInputProps {
  onTextReceived: (text: string) => void;
  onVoiceMessageSent?: (audioBlob: Blob, duration: number) => void;
  children: React.ReactNode;
}

export function VoiceInput({ onTextReceived, onVoiceMessageSent, children }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [mode, setMode] = useState<'speech-to-text' | 'voice-message'>('speech-to-text');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      if (recognitionRef.current) {
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          setTranscript(finalTranscript + interimTranscript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setError(`Speech recognition error: ${event.error}`);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startSpeechToText = async () => {
    if (!recognitionRef.current) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    try {
      setError('');
      setTranscript('');
      setIsListening(true);
      recognitionRef.current.start();
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      setError('Failed to start speech recognition');
      setIsListening(false);
    }
  };

  const stopSpeechToText = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const duration = (Date.now() - recordingStartTimeRef.current) / 1000;
        onVoiceMessageSent?.(audioBlob, duration);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      recordingStartTimeRef.current = Date.now();
      setRecordingTime(0);
      setIsRecording(true);
      setError('');
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      mediaRecorderRef.current.start();
    } catch (err) {
      console.error('Error starting voice recording:', err);
      setError('Failed to access microphone');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const sendTranscript = () => {
    if (transcript.trim()) {
      onTextReceived(transcript.trim());
      setTranscript('');
      setOpen(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Voice Input</h3>
            <div className="flex gap-1">
              <Button
                variant={mode === 'speech-to-text' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('speech-to-text')}
                className="text-xs"
              >
                Speech to Text
              </Button>
              <Button
                variant={mode === 'voice-message' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('voice-message')}
                className="text-xs"
              >
                Voice Message
              </Button>
            </div>
          </div>

          {mode === 'speech-to-text' && (
            <div className="space-y-3">
              <div className="flex items-center justify-center">
                <Button
                  variant={isListening ? 'destructive' : 'default'}
                  size="lg"
                  onClick={isListening ? stopSpeechToText : startSpeechToText}
                  className="rounded-full w-16 h-16"
                >
                  {isListening ? (
                    <MicOff className="w-6 h-6" />
                  ) : (
                    <Mic className="w-6 h-6" />
                  )}
                </Button>
              </div>
              
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-2">
                  {isListening ? 'Listening... Click to stop' : 'Click to start speaking'}
                </p>
                {isListening && (
                  <div className="flex justify-center">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                )}
              </div>

              {transcript && (
                <div className="space-y-2">
                  <div className="p-3 bg-slate-50 rounded-lg border">
                    <p className="text-sm">{transcript}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTranscript('')}
                      className="flex-1"
                    >
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={sendTranscript}
                      className="flex-1"
                    >
                      <Send className="w-3 h-3 mr-1" />
                      Send
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === 'voice-message' && (
            <div className="space-y-3">
              <div className="flex items-center justify-center">
                <Button
                  variant={isRecording ? 'destructive' : 'default'}
                  size="lg"
                  onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                  className="rounded-full w-16 h-16"
                >
                  {isRecording ? (
                    <Square className="w-6 h-6" />
                  ) : (
                    <Mic className="w-6 h-6" />
                  )}
                </Button>
              </div>
              
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-2">
                  {isRecording ? `Recording... ${formatTime(recordingTime)}` : 'Click to start recording voice message'}
                </p>
                {isRecording && (
                  <div className="flex justify-center">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                )}
              </div>

              {onVoiceMessageSent && (
                <p className="text-xs text-slate-400 text-center">
                  Voice messages will be sent automatically when you stop recording
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              {error}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Extend Window interface for speech recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}