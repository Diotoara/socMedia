import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { postsAPI } from '../utils/api';

const PostSelector = ({ onSelectionChange }) => {
  const { toast } = useApp();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState(new Set());
  const [monitorAll, setMonitorAll] = useState(false);
  const [saving, setSaving] = useState(false);

  const notifyParent = useCallback((nextMonitorAll, postIds) => {
    onSelectionChange?.({ monitorAll: nextMonitorAll, selectedPostIds: postIds });
  }, [onSelectionChange]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const response = await postsAPI.getPosts({ limit: 100 });
      const data = response.data;

      if (data.success) {
        setPosts(data.posts || []);
        if (data.tokenExpired) {
          toast.showWarning('Instagram token expired. Please reconnect your Instagram account in Configuration.');
        } else if ((data.posts?.length ?? 0) === 0 && data.message) {
          toast.showInfo(data.message);
        }
      } else {
        toast.showError(data.error || 'Failed to load posts');
      }
    } catch (err) {
      console.error('Failed to load posts:', err);
      toast.showError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedPosts = async () => {
    try {
      const response = await postsAPI.getSelectedPosts();
      const data = response.data;

      if (data.success && Array.isArray(data.selectedPosts)) {
        const selected = new Set(data.selectedPosts);
        const isMonitoringAll = !!data.monitorAll;
        setSelectedPosts(selected);
        setMonitorAll(isMonitoringAll);
        notifyParent(isMonitoringAll, isMonitoringAll ? [] : data.selectedPosts);
      }
    } catch (err) {
      console.error('Failed to load selected posts:', err);
    }
  };

  useEffect(() => {
    loadPosts();
    loadSelectedPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const saveSelectedPosts = useCallback(async (postIds, shouldMonitorAll) => {
    setSaving(true);
    try {
      const response = await postsAPI.saveSelectedPosts(postIds, shouldMonitorAll);
      const data = response.data;

      if (data.success) {
        toast.showSuccess('Selected posts saved');
      } else {
        toast.showError(data.error || 'Failed to save selection');
      }
    } catch (err) {
      console.error('Failed to save selected posts:', err);
      toast.showError('Failed to save selection');
    } finally {
      setSaving(false);
    }
  }, [toast]);

  const togglePostSelection = (postId) => {
    if (monitorAll) {
      setMonitorAll(false);
    }
    const newSelected = new Set(selectedPosts);
    if (newSelected.has(postId)) {
      newSelected.delete(postId);
    } else {
      newSelected.add(postId);
    }
    setSelectedPosts(newSelected);
    const postIds = Array.from(newSelected);
    notifyParent(false, postIds);
    saveSelectedPosts(postIds, false);
  };

  const selectAll = () => {
    const allPostIds = posts.map(p => p.id);
    setMonitorAll(false);
    setSelectedPosts(new Set(allPostIds));
    notifyParent(false, allPostIds);
    saveSelectedPosts(allPostIds, false);
  };

  const clearSelection = () => {
    setMonitorAll(false);
    setSelectedPosts(new Set());
    notifyParent(false, []);
    saveSelectedPosts([], false);
  };

  const handleMonitorAllToggle = async (nextValue) => {
    setMonitorAll(nextValue);
    const postIds = nextValue ? [] : Array.from(selectedPosts);
    notifyParent(nextValue, postIds);
    await saveSelectedPosts(postIds, nextValue);
    if (nextValue) {
      setSelectedPosts(new Set());
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getMediaTypeIcon = (type) => {
    switch (type) {
      case 'VIDEO':
        return '🎥';
      case 'CAROUSEL_ALBUM':
        return '📸';
      default:
        return '🖼️';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            {monitorAll ? 'Monitoring all posts' : `Select Posts to Monitor (${selectedPosts.size} selected)`}
            {saving && <span className="ml-2 text-sm text-gray-500">Saving...</span>}
          </h3>
          {monitorAll && (
            <p className="text-sm text-gray-500">
              Automation will track the latest posts automatically. Deselect to choose specific posts instead.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={monitorAll}
              onChange={(e) => handleMonitorAllToggle(e.target.checked)}
              disabled={saving}
            />
            Monitor all posts
          </label>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              disabled={saving || monitorAll || posts.length === 0}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition disabled:opacity-50"
            >
              Select All
            </button>
            <button
              onClick={clearSelection}
              disabled={saving || monitorAll || selectedPosts.size === 0}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No posts found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {posts.map((post) => (
            <div
              key={post.id}
              onClick={() => !monitorAll && togglePostSelection(post.id)}
              className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                monitorAll
                  ? 'border-gray-200 opacity-60 cursor-not-allowed'
                  : selectedPosts.has(post.id)
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Thumbnail */}
              <div className="aspect-square bg-gray-100 relative">
                <img
                  src={post.thumbnailUrl}
                  alt={post.caption?.substring(0, 50) || 'Instagram post'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';
                  }}
                />
                
                {/* Media type badge */}
                <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs">
                  {getMediaTypeIcon(post.type)}
                </div>

                {/* Selection indicator */}
                {!monitorAll && selectedPosts.has(post.id) && (
                  <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                    <div className="bg-blue-500 text-white rounded-full p-2">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Post info */}
              <div className="p-2 bg-white">
                <p className="text-xs text-gray-600 truncate">
                  {post.caption || 'No caption'}
                </p>
                <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                  <span>💬 {post.commentCount}</span>
                  <span>{formatDate(post.timestamp)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PostSelector;
