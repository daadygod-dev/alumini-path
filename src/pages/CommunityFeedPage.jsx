import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  ChatBubbleOutlineRounded,
  DeleteOutlineRounded,
  EditRounded,
  FavoriteBorderRounded,
  FavoriteRounded,
  ForumOutlined,
  PhotoCameraRounded,
  RefreshRounded,
  SendRounded,
  VisibilityOffRounded,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import EmptyState from '../components/EmptyState.jsx';
import { ProtectedAvatar, ProtectedMediaPreview } from '../components/ProtectedAsset.jsx';
import { apiRequest } from '../api/client.js';
import { canModeratePosts, getRoleLabel } from '../data/platformConfig.js';
import '../styles/feature-pages.scss';

export default function CommunityFeedPage({ currentUser }) {
  const canModerate = canModeratePosts(currentUser);

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [bodyText, setBodyText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [posting, setPosting] = useState(false);

  const [commentsPost, setCommentsPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const [editTarget, setEditTarget] = useState(null);
  const [editBody, setEditBody] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('posts', { query: { page: 1, pageSize: 30 } });
      setPosts(Array.isArray(data?.posts) ? data.posts : []);
    } catch (err) {
      setError(err.message || 'Could not load community feed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handlePublish = async (event) => {
    event.preventDefault();
    if (!bodyText.trim()) {
      toast.error('Write something before posting.');
      return;
    }

    const formData = new FormData();
    formData.append('body', bodyText.trim());
    if (imageFile) {
      formData.append('image', imageFile);
    }

    setPosting(true);
    try {
      await apiRequest('post-create', { method: 'POST', body: formData });
      setBodyText('');
      setImageFile(null);
      toast.success('Update published to community feed.');
      await loadPosts();
    } catch (err) {
      toast.error(err.message || 'Could not publish post.');
    } finally {
      setPosting(false);
    }
  };

  const handleToggleLike = async (postId) => {
    try {
      const data = await apiRequest('post-like', {
        method: 'POST',
        query: { id: postId },
      });
      setPosts((prev) =>
        prev.map((post) =>
          Number(post.id) === Number(postId)
            ? {
                ...post,
                liked_by_me: data?.liked ? 1 : 0,
                like_count: Number(data?.like_count ?? post.like_count),
              }
            : post,
        ),
      );
    } catch (err) {
      toast.error(err.message || 'Could not update reaction.');
    }
  };

  const openComments = async (post) => {
    setCommentsPost(post);
    setCommentBody('');
    setCommentsLoading(true);
    try {
      const data = await apiRequest('post-comments', { query: { id: post.id } });
      setComments(Array.isArray(data?.comments) ? data.comments : []);
    } catch (err) {
      toast.error(err.message || 'Could not load comments.');
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleAddComment = async (event) => {
    event.preventDefault();
    if (!commentsPost || !commentBody.trim()) return;

    setSubmittingComment(true);
    try {
      await apiRequest('post-comment', {
        method: 'POST',
        query: { id: commentsPost.id },
        body: { body: commentBody.trim() },
      });
      setCommentBody('');
      await openComments(commentsPost);
      setPosts((prev) =>
        prev.map((post) =>
          Number(post.id) === Number(commentsPost.id)
            ? { ...post, comment_count: Number(post.comment_count || 0) + 1 }
            : post,
        ),
      );
    } catch (err) {
      toast.error(err.message || 'Could not post comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    if (!editTarget || !editBody.trim()) return;

    setSavingEdit(true);
    try {
      await apiRequest('post-update', {
        method: 'POST',
        query: { id: editTarget.id },
        body: { body: editBody.trim() },
      });
      setEditTarget(null);
      toast.success('Post updated.');
      await loadPosts();
    } catch (err) {
      toast.error(err.message || 'Could not update post.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleHidePost = async (post) => {
    try {
      await apiRequest('post-update', {
        method: 'POST',
        query: { id: post.id },
        body: { body: post.body, status: 'hidden' },
      });
      toast.success('Post hidden by moderator.');
      await loadPosts();
    } catch (err) {
      toast.error(err.message || 'Could not hide post.');
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      await apiRequest('post-delete', {
        method: 'DELETE',
        query: { id: postId },
      });
      toast.success('Post deleted.');
      await loadPosts();
    } catch (err) {
      toast.error(err.message || 'Could not delete post.');
    }
  };

  return (
    <Stack spacing={3}>
      <Box className="page-header reveal-block">
        <Box>
          <Typography variant="h4">Community Feed</Typography>
          <Typography variant="body1" color="text.secondary" className="page-header__copy">
            Career updates, project highlights, and industry discussions across RP Karongi alumni and students.
          </Typography>
        </Box>
      </Box>

      <Card className="reveal-block reveal-delay-1">
        <CardContent>
          <Box component="form" onSubmit={handlePublish}>
            <Stack spacing={1.5}>
              <TextField
                multiline
                minRows={3}
                placeholder="Share a career milestone, technical lesson, or alumni announcement..."
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                fullWidth
              />
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button variant="outlined" component="label" size="small" startIcon={<PhotoCameraRounded />}>
                    Attach image
                    <input
                      type="file"
                      hidden
                      accept=".png,.jpg,.jpeg,.webp"
                      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    />
                  </Button>
                  {imageFile ? (
                    <Typography variant="caption" color="text.secondary">
                      {imageFile.name}
                    </Typography>
                  ) : null}
                </Stack>
                <Button type="submit" variant="contained" disabled={posting || !bodyText.trim()} startIcon={<SendRounded />}>
                  {posting ? 'Publishing...' : 'Post Update'}
                </Button>
              </Stack>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {error ? (
        <Alert
          severity="error"
          action={
            <Button size="small" color="inherit" startIcon={<RefreshRounded />} onClick={loadPosts}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Stack spacing={2}>
          {[1, 2, 3].map((idx) => (
            <Skeleton key={idx} variant="rounded" height={150} />
          ))}
        </Stack>
      ) : posts.length > 0 ? (
        <Stack spacing={2}>
          {posts.map((post) => {
            const isAuthor = Number(post.author_id) === Number(currentUser.id);
            const liked = Boolean(Number(post.liked_by_me || 0));

            return (
              <Card key={post.id} className="reveal-block reveal-delay-2">
                <CardContent>
                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                        <ProtectedAvatar src={post.author_avatar_url} sx={{ width: 42, height: 42 }}>
                          {post.author_name?.slice(0, 1)}
                        </ProtectedAvatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Typography variant="subtitle2" fontWeight={700}>
                              {post.author_name}
                            </Typography>
                            <Chip label={getRoleLabel(post.author_role)} size="small" variant="outlined" />
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {[post.author_current_role, post.author_company].filter(Boolean).join(' · ')}
                            {post.created_at ? ` · ${String(post.created_at).slice(0, 16)}` : ''}
                          </Typography>
                        </Box>
                      </Stack>

                      <Stack direction="row" spacing={0.5}>
                        {isAuthor ? (
                          <IconButton
                            size="small"
                            aria-label="Edit post"
                            onClick={() => {
                              setEditTarget(post);
                              setEditBody(post.body);
                            }}
                          >
                            <EditRounded fontSize="small" />
                          </IconButton>
                        ) : null}
                        {canModerate && !isAuthor ? (
                          <IconButton size="small" color="warning" aria-label="Hide post" onClick={() => handleHidePost(post)}>
                            <VisibilityOffRounded fontSize="small" />
                          </IconButton>
                        ) : null}
                        {(isAuthor || canModerate) ? (
                          <IconButton size="small" color="error" aria-label="Delete post" onClick={() => handleDeletePost(post.id)}>
                            <DeleteOutlineRounded fontSize="small" />
                          </IconButton>
                        ) : null}
                      </Stack>
                    </Stack>

                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {post.body}
                    </Typography>

                    {post.image_url ? <ProtectedMediaPreview src={post.image_url} alt="Post attachment" /> : null}

                    <Divider />

                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Button
                        size="small"
                        color={liked ? 'error' : 'inherit'}
                        startIcon={liked ? <FavoriteRounded /> : <FavoriteBorderRounded />}
                        onClick={() => handleToggleLike(post.id)}
                      >
                        {Number(post.like_count || 0)} Like{Number(post.like_count || 0) === 1 ? '' : 's'}
                      </Button>
                      <Button
                        size="small"
                        color="inherit"
                        startIcon={<ChatBubbleOutlineRounded />}
                        onClick={() => openComments(post)}
                      >
                        {Number(post.comment_count || 0)} Comment{Number(post.comment_count || 0) === 1 ? '' : 's'}
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      ) : (
        <EmptyState
          icon={<ForumOutlined />}
          title="No posts in the feed yet"
          description="Be the first community member to share an update or discussion topic."
        />
      )}

      <Dialog open={Boolean(commentsPost)} onClose={() => setCommentsPost(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Comments · {commentsPost?.author_name}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {commentsLoading ? (
              <Skeleton variant="rounded" height={100} />
            ) : comments.length > 0 ? (
              <Stack spacing={1.25}>
                {comments.map((c) => (
                  <Box key={c.id} className="history-item">
                    <Typography variant="caption" fontWeight={700}>
                      {c.author_name} · {String(c.created_at || '').slice(0, 16)}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.25 }}>
                      {c.body}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No comments yet. Start the discussion below.
              </Typography>
            )}

            <Box component="form" onSubmit={handleAddComment}>
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  placeholder="Write a comment..."
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  fullWidth
                  required
                />
                <Button type="submit" variant="contained" disabled={submittingComment || !commentBody.trim()}>
                  Send
                </Button>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommentsPost(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(editTarget)} onClose={() => setEditTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Post</DialogTitle>
        <Box component="form" onSubmit={handleSaveEdit}>
          <DialogContent dividers>
            <TextField
              multiline
              minRows={3}
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              fullWidth
              required
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={savingEdit}>
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
