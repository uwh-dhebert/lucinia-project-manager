import { useState, useEffect } from 'react';
import { Zap, Plus, Trash2 } from 'lucide-react';

interface Story {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
}

interface StoriesTabProps {
  projectId: string;
  designDocContent: string;
  onStoriesGenerated?: (stories: Story[]) => void;
}

export function StoriesTab({ projectId, designDocContent, onStoriesGenerated }: StoriesTabProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedStory, setExpandedStory] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load stories from database
  useEffect(() => {
    loadStories();
  }, [projectId]);

  const loadStories = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/stories-save`);
      if (response.ok) {
        const data = await response.json();
        setStories(data.stories || []);
      }
    } catch (err) {
      console.error('Error loading stories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshStoryList = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/stories-save`);
      if (response.ok) {
        const data = await response.json();
        setStories(data.stories || []);
      }
      await fetch(`/api/projects/${projectId}/todos/sync-stories`, { method: 'POST' });
    } catch (err) {
      setError('Failed to refresh story list');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateStories = async () => {
    if (!designDocContent) {
      setError('Please generate a design document first');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/stories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          designDoc: designDocContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate stories');
      }

      const data = await response.json();
      const newStories = data.stories || [];

      const allStories = [...stories, ...newStories];

      // Save new stories to database
      await saveStoriesToDatabase(allStories);

      // Sync story subtasks into the todo list
      await fetch(`/api/projects/${projectId}/todos/sync-stories`, { method: 'POST' });

      setStories(allStories);
      onStoriesGenerated?.(allStories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Story generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveStoriesToDatabase = async (storiesToSave: Story[]) => {
    try {
      await fetch(`/api/projects/${projectId}/stories-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stories: storiesToSave }),
      });
    } catch (err) {
      console.error('Error saving stories to database:', err);
    }
  };

  const handleRemoveStory = async (index: number) => {
    const storyToRemove = stories[index];
    try {
      await fetch(`/api/projects/${projectId}/stories-save`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId: storyToRemove.id }),
      });
      setStories(stories.filter((_, i) => i !== index));
    } catch (err) {
      setError('Error deleting story');
      console.error(err);
    }
  };

  const handleUpdateStory = async (index: number) => {
    const updatedStory = stories[index];

    // If story doesn't have an ID, save it as a new story first
    if (!updatedStory.id) {
      try {
        const response = await fetch(`/api/projects/${projectId}/stories-save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stories: [updatedStory] }),
        });
        if (response.ok) {
          const data = await response.json();
          const savedStory = data.stories?.[0];
          if (savedStory) {
            const updated = [...stories];
            updated[index].id = savedStory.id;
            setStories(updated);
            return;
          }
        }
      } catch (err) {
        setError('Error saving story');
        console.error(err);
        return;
      }
    }

    // If story has an ID, update it via PUT
    try {
      await fetch(`/api/projects/${projectId}/stories-save`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId: updatedStory.id,
          title: updatedStory.title,
          description: updatedStory.description,
          acceptanceCriteria: updatedStory.acceptanceCriteria,
        }),
      });
    } catch (err) {
      setError('Error updating story');
      console.error(err);
    }
  };

  const handleAddStory = () => {
    const newStory: Story = {
      id: '',
      title: 'New Story',
      description: '',
      acceptanceCriteria: [''],
    };
    setStories([...stories, newStory]);
  };

  if (stories.length === 0 && !isGenerating && !isLoading) {
    return (
      <div className="bg-lucina-white border border-lucina-rose rounded-2xl p-6 min-h-96 flex flex-col items-center justify-center">
        <div className="text-4xl mb-4">📖</div>
        <h3 className="text-lg font-semibold text-lucina-primary mb-2">Generate User Stories</h3>
        <p className="text-lucina-muted text-center mb-6">
          Use Grok's reasoning model to automatically generate user stories from your design document
        </p>
        {error && (
          <div className="bg-red-50 border border-red-800 rounded-lg p-3 mb-6 w-full">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
        <button
          onClick={handleGenerateStories}
          disabled={!designDocContent}
          className="px-8 py-3 bg-gradient-to-r from-lucina-rose to-lucina-rose-hover text-lucina-primary font-medium rounded-full hover:from-lucina-rose-hover hover:to-lucina-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Zap size={18} />
          Generate Stories from Design Doc
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-lucina-primary">User Stories ({stories.length})</h3>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleRefreshStoryList}
            disabled={isLoading}
            className="px-4 py-2 bg-lucina-surface text-lucina-primary border border-lucina-rose rounded-lg hover:bg-lucina-rose-hover transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Refreshing...' : '🔄 Refresh Story List'}
          </button>
          <button
            onClick={handleAddStory}
            className="px-4 py-2 bg-green-600 text-lucina-primary rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Add Story
          </button>
          <button
            onClick={handleGenerateStories}
            disabled={isGenerating || !designDocContent}
            className="px-4 py-2 bg-lucina-rose text-lucina-primary rounded-lg hover:bg-lucina-rose-hover transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-lucina-cream border-t-transparent rounded-full"></div>
                Generating...
              </>
            ) : (
              <>
                <Zap size={18} />
                Regenerate
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-800 rounded-lg p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {stories.map((story, index) => (
          <div
            key={index}
            className="bg-lucina-surface border border-lucina-rose rounded-lg overflow-hidden"
          >
            <button
              onClick={() => setExpandedStory(expandedStory === index ? null : index)}
              className="w-full px-6 py-4 text-left hover:bg-lucina-rose-hover/50 transition-colors flex justify-between items-center"
            >
              <div>
                <h4 className="font-semibold text-lucina-primary">{story.title}</h4>
                <p className="text-sm text-lucina-secondary mt-1 line-clamp-2">{story.description}</p>
              </div>
              <div className="text-2xl">
                {expandedStory === index ? '▼' : '▶'}
              </div>
            </button>

             {expandedStory === index && (
               <div className="border-t border-lucina-rose px-6 py-4 bg-lucina-white space-y-4">
                 <div>
                   <label className="block text-sm font-semibold text-lucina-secondary mb-2">
                     Title
                   </label>
                   <input
                     type="text"
                     value={story.title}
                     onChange={(e) => {
                       const updated = [...stories];
                       updated[index].title = e.target.value;
                       setStories(updated);
                       handleUpdateStory(index);
                     }}
                     className="w-full px-3 py-2 bg-lucina-white border border-lucina-rose rounded-lg text-lucina-primary text-sm placeholder-lucina-muted focus:outline-none focus:ring-2 focus:ring-lucina-secondary"
                   />
                 </div>

                 <div>
                   <label className="block text-sm font-semibold text-lucina-secondary mb-2">
                     Description
                   </label>
                   <textarea
                     value={story.description}
                     onChange={(e) => {
                       const updated = [...stories];
                       updated[index].description = e.target.value;
                       setStories(updated);
                       handleUpdateStory(index);
                     }}
                     className="w-full px-3 py-2 bg-lucina-white border border-lucina-rose rounded-lg text-lucina-primary text-sm placeholder-lucina-muted focus:outline-none focus:ring-2 focus:ring-lucina-secondary"
                     rows={3}
                   />
                 </div>

                <div>
                  <label className="block text-sm font-semibold text-lucina-secondary mb-2">
                    Acceptance Criteria
                  </label>
                  <div className="space-y-2">
                    {story.acceptanceCriteria.map((criterion, idx) => (
                      <input
                        key={idx}
                        type="text"
                        value={criterion}
                        onChange={(e) => {
                          const updated = [...stories];
                          updated[index].acceptanceCriteria[idx] = e.target.value;
                          setStories(updated);
                          handleUpdateStory(index);
                        }}
                        placeholder={`Criterion ${idx + 1}`}
                        className="w-full px-3 py-2 bg-lucina-white border border-lucina-rose rounded-lg text-lucina-primary text-sm placeholder-lucina-muted focus:outline-none focus:ring-2 focus:ring-lucina-secondary"
                      />
                    ))}
                     <button
                       onClick={() => {
                         const updated = [...stories];
                         updated[index].acceptanceCriteria.push('');
                         setStories(updated);
                         handleUpdateStory(index);
                       }}
                       className="text-sm text-lucina-secondary hover:text-lucina-secondary"
                     >
                       + Add Criterion
                     </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => handleRemoveStory(index)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    Remove Story
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

