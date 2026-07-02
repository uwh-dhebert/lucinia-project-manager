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

      // Save new stories to database
      await saveStoriesToDatabase([...stories, ...newStories]);

      setStories([...stories, ...newStories]);
      onStoriesGenerated?.([...stories, ...newStories]);
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
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 min-h-96 flex flex-col items-center justify-center">
        <div className="text-4xl mb-4">📖</div>
        <h3 className="text-lg font-semibold text-white mb-2">Generate User Stories</h3>
        <p className="text-slate-400 text-center mb-6">
          Use Grok's reasoning model to automatically generate user stories from your design document
        </p>
        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 mb-6 w-full">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        <button
          onClick={handleGenerateStories}
          disabled={!designDocContent}
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-full hover:from-blue-500 hover:to-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
        <h3 className="text-xl font-bold text-white">User Stories ({stories.length})</h3>
        <div className="flex gap-3">
          <button
            onClick={handleAddStory}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Add Story
          </button>
          <button
            onClick={handleGenerateStories}
            disabled={isGenerating || !designDocContent}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
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
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {stories.map((story, index) => (
          <div
            key={index}
            className="bg-slate-700 border border-slate-600 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => setExpandedStory(expandedStory === index ? null : index)}
              className="w-full px-6 py-4 text-left hover:bg-slate-600/50 transition-colors flex justify-between items-center"
            >
              <div>
                <h4 className="font-semibold text-white">{story.title}</h4>
                <p className="text-sm text-slate-300 mt-1 line-clamp-2">{story.description}</p>
              </div>
              <div className="text-2xl">
                {expandedStory === index ? '▼' : '▶'}
              </div>
            </button>

             {expandedStory === index && (
               <div className="border-t border-slate-600 px-6 py-4 bg-slate-800 space-y-4">
                 <div>
                   <label className="block text-sm font-semibold text-slate-300 mb-2">
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
                     className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                   />
                 </div>

                 <div>
                   <label className="block text-sm font-semibold text-slate-300 mb-2">
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
                     className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                     rows={3}
                   />
                 </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
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
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ))}
                     <button
                       onClick={() => {
                         const updated = [...stories];
                         updated[index].acceptanceCriteria.push('');
                         setStories(updated);
                         handleUpdateStory(index);
                       }}
                       className="text-sm text-blue-400 hover:text-blue-300"
                     >
                       + Add Criterion
                     </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => handleRemoveStory(index)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-2"
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

