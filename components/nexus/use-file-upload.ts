'use client';

import { useState } from 'react';

interface FilePreviewData {
  url: string;
  type: 'image' | 'video' | 'audio';
  file: File;
}

export function useFileUpload() {
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filePreview, setFilePreview] = useState<FilePreviewData | null>(null);
  const [error, setError] = useState('');

  const handleFileChange = (file: File) => {
    // Show preview for images, videos, and audio
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview({ url: e.target?.result as string, type: 'image', file });
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview({ url: e.target?.result as string, type: 'video', file });
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('audio/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview({ url: e.target?.result as string, type: 'audio', file });
      };
      reader.readAsDataURL(file);
    } else {
      // For other file types, upload immediately without preview
      return { shouldUploadImmediately: true, file };
    }
    
    return { shouldUploadImmediately: false };
  };

  const uploadFile = async (file: File) => {
    setError('');
    setUploadingFile(true);
    setUploadProgress(0);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    try {
      const form = new FormData();
      form.append('file', file);
      
      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise<{ url: string; fileName: string; mimeType: string; isImage: boolean; publicId?: string }>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            setUploadProgress(percentComplete);
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve(data);
            } catch (err) {
              console.error('Failed to parse upload response:', err);
              reject(new Error('Invalid response from server'));
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText);
              reject(new Error(error.error || `Upload failed with status ${xhr.status}`));
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });
        
        xhr.addEventListener('abort', () => {
          reject(new Error('Upload was cancelled'));
        });
        
        xhr.open('POST', '/api/chat/upload');
        xhr.withCredentials = true;
        xhr.send(form);
      });
      
      const data = await uploadPromise;
      
      const mimeType = data.mimeType || file.type || '';
      const isImage = data.isImage ?? mimeType.startsWith('image/');
      
      setFilePreview(null);
      setUploadProgress(0);
      
      return {
        fileUrl: data.url,
        fileName: data.fileName || file.name,
        mimeType: mimeType,
        filePublicId: data.publicId,
        isImage: isImage,
      };
    } catch (err) {
      console.error('Upload error:', err);
      const errorMessage = err instanceof Error ? err.message : 'File upload failed. Please try again.';
      setError(errorMessage);
      throw err;
    } finally {
      setUploadingFile(false);
    }
  };

  const cancelPreview = () => {
    setFilePreview(null);
    setUploadProgress(0);
  };

  const clearError = () => {
    setError('');
  };

  return {
    uploadingFile,
    uploadProgress,
    filePreview,
    error,
    handleFileChange,
    uploadFile,
    cancelPreview,
    clearError,
  };
}