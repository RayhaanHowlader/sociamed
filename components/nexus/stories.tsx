'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StoryCard } from './story-card';
import { StoryCreateModal } from './story-create-modal';
import { StoryViewerModal } from './story-viewer-modal';
import { StoryRateLimitModal } from './story-rate-limit-modal';
import { useStoryData } from './use-story-data';
import { useStoryInteractions } from './use-story-interactions';
import { useStoryViewer } from './use-story-viewer';

export function Stories() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Custom hooks
  const { storyGroups, loading, currentUserId, fetchStories } = useStoryData();
  
  const {
    storyType,
    setStoryType,
    textContent,
    setTextContent,
    mediaFiles,
    mediaPreviews,
    uploading,
    rateLimitError,
    setRateLimitError,
    editingStory,
    setEditingStory,
    handleFileChange,
    handleVideoRecorded,
    removeMedia,
    resetForm,
    handleCreateStory,
    handleEditStory,
    handleDeleteStory,
    openEditModal,
  } = useStoryInteractions(fetchStories);

  const {
    viewerOpen,
    setViewerOpen,
    activeStoryGroup,
    activeStoryIndex,
    setActiveStoryIndex,
    activeMediaIndex,
    setActiveMediaIndex,
    progress,
    setProgress,
    updateProgress,
    mediaDuration,
    setMediaDuration,
    openStoryViewer,
    nextStory,
    prevStory,
  } = useStoryViewer();

  // Handle story creation
  const handleCreate = async () => {
    await handleCreateStory();
    setCreateModalOpen(false);
    resetForm();
  };

  // Handle story editing
  const handleEdit = async () => {
    await handleEditStory();
    setEditModalOpen(false);
    resetForm();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400 dark:text-slate-500" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Stories
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Share moments that disappear after 24 hours</p>
        </div>

        {/* Stories Row */}
        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-4">
            {/* Create Story Card */}
            <StoryCard
              isCreateCard={true}
              onCreateClick={() => setCreateModalOpen(true)}
            />

            {/* Story Cards */}
            {storyGroups.map((group) => (
              <StoryCard
                key={group.userId}
                group={group}
                onStoryClick={openStoryViewer}
              />
            ))}
          </div>
        </ScrollArea>

        {/* Empty State */}
        {storyGroups.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">No stories available. Create one to get started!</p>
          </div>
        )}
      </div>

      <StoryCreateModal
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open);
          if (!open) {
            // Reset form when modal is closed
            resetForm();
          }
        }}
        storyType={storyType}
        textContent={textContent}
        mediaFiles={mediaFiles}
        mediaPreviews={mediaPreviews}
        uploading={uploading}
        onStoryTypeChange={setStoryType}
        onTextContentChange={setTextContent}
        onFileChange={handleFileChange}
        onRemoveMedia={removeMedia}
        onCreateStory={handleCreate}
        onVideoRecorded={handleVideoRecorded}
      />

      <StoryRateLimitModal
        open={!!rateLimitError}
        onOpenChange={(open) => !open && setRateLimitError(null)}
        rateLimitError={rateLimitError}
      />

      <StoryViewerModal
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        activeStoryGroup={activeStoryGroup}
        activeStoryIndex={activeStoryIndex}
        activeMediaIndex={activeMediaIndex}
        progress={progress}
        currentUserId={currentUserId}
        onStoryIndexChange={setActiveStoryIndex}
        onMediaIndexChange={setActiveMediaIndex}
        onProgressReset={() => setProgress(0)}
        onProgressUpdate={updateProgress}
        onNextStory={nextStory}
        onPrevStory={prevStory}
        onEditStory={(story) => {
          openEditModal(story);
          setEditModalOpen(true);
        }}
        onDeleteStory={handleDeleteStory}
        onMediaDurationChange={setMediaDuration}
      />

      <StoryCreateModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) {
            // Reset form when modal is closed
            resetForm();
          }
        }}
        storyType={storyType}
        textContent={textContent}
        mediaFiles={mediaFiles}
        mediaPreviews={mediaPreviews}
        uploading={uploading}
        isEditing={true}
        onStoryTypeChange={setStoryType}
        onTextContentChange={setTextContent}
        onFileChange={handleFileChange}
        onRemoveMedia={removeMedia}
        onCreateStory={handleEdit}
        onVideoRecorded={handleVideoRecorded}
      />
    </div>
  );
}