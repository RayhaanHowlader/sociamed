'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Clock, Users, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface PollOption {
  id: string;
  text: string;
  votes: number;
  voters: string[];
}

interface Poll {
  _id: string;
  groupId?: string;
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
  anonymous: boolean;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  totalVotes: number;
  author: {
    name: string;
    username: string;
    avatarUrl: string;
  };
}

interface PollMessageProps {
  poll: Poll;
  currentUserId: string;
  onVote: (pollId: string, optionIds: string[]) => void;
  className?: string;
}

export function PollMessage({ poll, currentUserId, onVote, className }: PollMessageProps) {
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [hasVoted, setHasVoted] = useState(false);
  const [voting, setVoting] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  // Debug: Log when poll data changes
  useEffect(() => {
    console.log('Poll data updated:', {
      pollId: poll._id,
      totalVotes: poll.totalVotes,
      options: poll.options.map(opt => ({ id: opt.id, text: opt.text, votes: opt.votes }))
    });
  }, [poll]);

  // Check if user has already voted
  useEffect(() => {
    const userHasVoted = poll.options.some(option => 
      option.voters && option.voters.includes(currentUserId)
    );
    setHasVoted(userHasVoted);
  }, [poll.options, currentUserId]);

  // Update time left
  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date();
      const expires = new Date(poll.expiresAt);
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeLeft(`${days}d ${hours % 24}h left`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m left`);
      } else {
        setTimeLeft(`${minutes}m left`);
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [poll.expiresAt]);

  const isExpired = new Date() > new Date(poll.expiresAt);
  const canVote = !hasVoted && !isExpired;

  const handleOptionToggle = (optionId: string) => {
    if (!canVote || voting) return;

    setSelectedOptions(prev => {
      const newSet = new Set(prev);
      
      if (poll.allowMultiple) {
        if (newSet.has(optionId)) {
          newSet.delete(optionId);
        } else {
          newSet.add(optionId);
        }
      } else {
        newSet.clear();
        newSet.add(optionId);
      }
      
      return newSet;
    });
  };

  const handleVote = async () => {
    if (selectedOptions.size === 0 || voting) return;

    setVoting(true);
    
    // Optimistic update - immediately show that user has voted
    const selectedOptionsArray = Array.from(selectedOptions);
    setHasVoted(true);
    setSelectedOptions(new Set());
    
    try {
      console.log('Voting on poll:', poll._id, 'options:', selectedOptionsArray);
      await onVote(poll._id, selectedOptionsArray);
      console.log('Vote successful');
    } catch (error) {
      console.error('Failed to vote:', error);
      // Revert optimistic update on error
      setHasVoted(false);
      setSelectedOptions(new Set(selectedOptionsArray));
      // Show error to user
      alert('Failed to vote: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setVoting(false);
    }
  };

  const getOptionPercentage = (option: PollOption) => {
    if (poll.totalVotes === 0) return 0;
    return Math.round((option.votes / poll.totalVotes) * 100);
  };

  const getUserVotedOptions = () => {
    return poll.options.filter(option => 
      option.voters && option.voters.includes(currentUserId)
    ).map(option => option.id);
  };

  const userVotedOptions = getUserVotedOptions();

  return (
    <div className={cn(
      'bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 space-y-3 max-w-md shadow-sm',
      className
    )}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
          <BarChart3 className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="font-medium">{poll.author.name}</span>
            <span>•</span>
            <span className="text-purple-600 font-medium">Poll</span>
          </div>
          <h3 className="font-medium text-slate-900 mt-1 break-words">
            {poll.question}
          </h3>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {poll.options.map((option) => {
          const percentage = getOptionPercentage(option);
          const isSelected = selectedOptions.has(option.id);
          const isUserVoted = userVotedOptions.includes(option.id);
          const showResults = hasVoted || isExpired;

          return (
            <div key={option.id} className="relative">
              {showResults ? (
                // Results view
                <div className="relative bg-white rounded-lg p-3 border border-slate-300">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">
                        {option.text}
                      </span>
                      {isUserVoted && (
                        <Check className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    <div className="text-sm font-medium text-slate-700">
                      {percentage}% ({option.votes})
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2 bg-slate-200" />
                </div>
              ) : (
                // Voting view
                <button
                  onClick={() => handleOptionToggle(option.id)}
                  disabled={!canVote || voting}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border transition-colors',
                    isSelected
                      ? 'bg-blue-50 border-blue-200 text-blue-900'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-900',
                    (!canVote || voting) && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                      isSelected
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-slate-400 bg-white'
                    )}>
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-slate-900">{option.text}</span>
                  </div>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Vote Button */}
      {canVote && selectedOptions.size > 0 && (
        <Button
          onClick={handleVote}
          disabled={voting}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          size="sm"
        >
          {voting ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Voting...
            </div>
          ) : (
            `Vote${poll.allowMultiple && selectedOptions.size > 1 ? ` (${selectedOptions.size})` : ''}`
          )}
        </Button>
      )}



      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>{poll.totalVotes} vote{poll.totalVotes !== 1 ? 's' : ''}</span>
          </div>
          {poll.allowMultiple && (
            <span>Multiple choice</span>
          )}
          {poll.anonymous && (
            <span>Anonymous</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span className={cn(
            isExpired && 'text-red-500'
          )}>
            {timeLeft}
          </span>
        </div>
      </div>
    </div>
  );
}