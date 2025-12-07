'use client';

interface UploadProgressProps {
  progress: number;
  isUploading: boolean;
}

export function UploadProgress({ progress, isUploading }: UploadProgressProps) {
  if (!isUploading) return null;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>Sending...</span>
        {progress > 0 ? (
          <span>{Math.round(progress)}%</span>
        ) : (
          <span>Preparing...</span>
        )}
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
        {progress > 0 ? (
          <div
            className="bg-gradient-to-r from-blue-600 to-cyan-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        ) : (
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 h-2 rounded-full animate-pulse" style={{ width: '30%' }} />
        )}
      </div>
    </div>
  );
}

