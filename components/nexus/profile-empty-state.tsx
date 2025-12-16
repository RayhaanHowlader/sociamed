'use client';

import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ProfileEmptyStateProps {
  onCreateProfile: () => void;
}

export function ProfileEmptyState({ onCreateProfile }: ProfileEmptyStateProps) {
  return (
    <div className="px-6 py-16">
      <Card className="border-dashed border-2 border-slate-200">
        <CardContent className="py-12 flex flex-col items-center text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <PlusCircle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-1">
              Complete your profile
            </h2>
            <p className="text-slate-500 max-w-md">
              Add your personal details, bio, and images to personalize your Nexus presence.
            </p>
          </div>
          <Button onClick={onCreateProfile} className="bg-gradient-to-r from-blue-600 to-cyan-600">
            Start building your profile
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}