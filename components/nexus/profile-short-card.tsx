'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Play,
  Heart,
  Eye,
  MessageCircle,
  Share2,
  MoreVertical,
  Calendar,
  Clock,
  Trash2,
  Edit,
} from 'lucide-react';
import { format } from 'date-fns';

interface UserShort {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  title: string;
  description?: string;
  createdAt: string;
  stats: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
  liked?: boolean;
}

interface ProfileShortCardProps {
  short: UserShort;
  isOwnProfile?: boolean;
  onView: (shortId: string) => void;
  onEdit?: (short: UserShort) => void;
  onDelete?: (shortId: string) => void;
}

export function ProfileShortCard({ 
  short, 
  isOwnProfile = false, 
  onView, 
  onEdit, 
  onDelete 
}: ProfileShortCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatViews = (views: number) => {
    if (views < 1000) return views.toString();
    if (views < 1000000) return `${(views / 1000).toFixed(1)}K`;
    return `${(views / 1000000).toFixed(1)}M`;
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return format(date, 'MMM d, yyyy');
  };

  return (
    <Card className="group border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
      <CardContent className="p-0">
        {/* Video Preview */}
        <div 
          className="aspect-[9/16] relative overflow-hidden cursor-pointer bg-black"
          onClick={() => onView(short.id)}
        >
          {short.videoUrl ? (
            <video
              src={short.videoUrl}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              muted
              playsInline
              preload="metadata"
              loop
              onMouseEnter={(e) => {
                const video = e.currentTarget;
                video.play().then(() => {
                  setIsPlaying(true);
                }).catch(() => {
                  // Ignore autoplay errors
                });
              }}
              onMouseLeave={(e) => {
                const video = e.currentTarget;
                video.pause();
                video.currentTime = 0;
                setIsPlaying(false);
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTouchStart={(e) => {
                // On mobile, play on touch
                const video = e.currentTarget;
                video.play().then(() => {
                  setIsPlaying(true);
                }).catch(() => {
                  // Ignore autoplay errors
                });
              }}
              onTouchEnd={(e) => {
                // On mobile, pause when touch ends
                const video = e.currentTarget;
                video.pause();
                video.currentTime = 0;
                setIsPlaying(false);
              }}
              onError={() => setImageError(true)}
            />
          ) : short.thumbnailUrl && !imageError ? (
            <img
              src={short.thumbnailUrl}
              alt={short.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 flex items-center justify-center">
              <div className="text-white text-center p-4">
                <div className="w-12 h-12 mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Play className="w-6 h-6 ml-1" fill="currentColor" />
                </div>
                <p className="text-sm font-medium truncate">{short.title}</p>
              </div>
            </div>
          )}

          {/* Play Button Overlay - Only show if not video or video failed to load */}
          {(!short.videoUrl || imageError) && (
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Play className="w-8 h-8 text-slate-900 ml-1" fill="currentColor" />
              </div>
            </div>
          )}

          {/* Video Play Indicator */}
          {short.videoUrl && !imageError && (
            <div className="absolute top-2 left-2">
              <div className={`text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 transition-all duration-300 ${
                isPlaying ? 'bg-red-600/90' : 'bg-black/70'
              }`}>
                <Play className="w-3 h-3" fill="currentColor" />
                <span>{isPlaying ? 'Playing...' : 'Hover to preview'}</span>
              </div>
            </div>
          )}

          {/* Duration Badge */}
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="bg-black/70 text-white text-xs px-2 py-1">
              <Clock className="w-3 h-3 mr-1" />
              {formatDuration(60)} {/* Default duration, can be made dynamic */}
            </Badge>
          </div>

          {/* Stats Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3">
            <div className="flex items-center justify-between text-white text-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Heart className="w-3 h-3" fill={short.liked ? "currentColor" : "none"} />
                  <span>{formatViews(short.stats.likes)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span>{formatViews(short.stats.views)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" />
                  <span>{short.stats.comments}</span>
                </div>
              </div>
              
              {isOwnProfile && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-white hover:bg-white/20"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    {onEdit && (
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(short);
                        }}
                        className="flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(short.id);
                        }}
                        className="flex items-center gap-2 text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>

        {/* Short Details */}
        <div className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 
              className="font-semibold text-sm text-slate-900 line-clamp-2 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={() => onView(short.id)}
            >
              {short.title}
            </h3>
          </div>

          {short.description && (
            <p className="text-xs text-slate-600 line-clamp-2">
              {short.description}
            </p>
          )}

          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{getTimeAgo(short.createdAt)}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs hover:bg-slate-100"
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle share
                }}
              >
                <Share2 className="w-3 h-3 mr-1" />
                Share
              </Button>
            </div>
          </div>

          {/* Performance Metrics for Own Profile */}
          {isOwnProfile && (
            <div className="pt-2 border-t border-slate-100">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-900">{formatViews(short.stats.views)}</p>
                  <p className="text-xs text-slate-500">Views</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-900">{short.stats.likes}</p>
                  <p className="text-xs text-slate-500">Likes</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-900">
                    {short.stats.views > 0 ? ((short.stats.likes / short.stats.views) * 100).toFixed(1) : 0}%
                  </p>
                  <p className="text-xs text-slate-500">Engagement</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}