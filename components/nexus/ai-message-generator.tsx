'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface AIMessageGeneratorProps {
  onMessageGenerated: (message: string) => void;
  children: React.ReactNode;
}

export function AIMessageGenerator({ onMessageGenerated, children }: AIMessageGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setGenerating(true);
    try {
      const response = await fetch('/api/ai/generate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setGeneratedMessage(data.message);
      } else {
        console.error('Failed to generate message:', data.error);
        alert(data.error || 'Failed to generate message');
      }
    } catch (error) {
      console.error('Error generating message:', error);
      alert('Failed to generate message. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleUseMessage = () => {
    if (generatedMessage) {
      onMessageGenerated(generatedMessage);
      setOpen(false);
      setPrompt('');
      setGeneratedMessage('');
    }
  };

  const handleRegenerate = () => {
    setGeneratedMessage('');
    handleGenerate();
  };

  return (
    <>
      <div onClick={() => setOpen(true)}>
        {children}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px] dark:bg-slate-900 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 dark:text-white">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              AI Message Generator
            </DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              Describe what you want to say, and AI will generate a message for you.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="prompt" className="dark:text-slate-300">
                What do you want to say?
              </Label>
              <Textarea
                id="prompt"
                placeholder="E.g., Ask about weekend plans, Thank them for help, Apologize for being late..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                disabled={generating}
              />
            </div>

            {generatedMessage && (
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Generated Message</Label>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {generatedMessage}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              {!generatedMessage ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={generating}
                    className="dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || generating}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={handleRegenerate}
                    disabled={generating}
                    className="dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Regenerate
                  </Button>
                  <Button
                    onClick={handleUseMessage}
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                  >
                    Use Message
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
