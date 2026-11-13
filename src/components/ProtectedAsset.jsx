import { useEffect, useState } from 'react';
import { Avatar, Box, Skeleton, Typography } from '@mui/material';
import { fetchProtectedBlobUrl } from '../api/client.js';

function useProtectedBlob(src) {
  const [blobUrl, setBlobUrl] = useState('');
  const [loading, setLoading] = useState(() => Boolean(src && !src.startsWith('blob:') && !src.startsWith('data:')));

  useEffect(() => {
    if (!src) {
      return undefined;
    }

    if (src.startsWith('blob:') || src.startsWith('data:')) {
      return undefined;
    }

    let cancelled = false;
    let created = '';

    fetchProtectedBlobUrl(src)
      .then((url) => {
        if (cancelled) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        created = url;
        setBlobUrl(url);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (created) {
        URL.revokeObjectURL(created);
      }
    };
  }, [src]);

  if (!src) {
    return { url: '', loading: false };
  }

  if (src.startsWith('blob:') || src.startsWith('data:')) {
    return { url: src, loading: false };
  }

  return { url: blobUrl, loading };
}

export function ProtectedAvatar({ src, children, ...props }) {
  const { url } = useProtectedBlob(src);
  return (
    <Avatar src={url || undefined} {...props}>
      {children}
    </Avatar>
  );
}

export function ProtectedMediaPreview({ src, mimeType = '', alt = 'Attachment' }) {
  const { url, loading } = useProtectedBlob(src);

  if (loading) {
    return <Skeleton variant="rounded" height={220} sx={{ width: '100%' }} />;
  }

  if (!url) {
    return (
      <Typography variant="body2" color="text.secondary">
        Preview unavailable. Use Download to open this file.
      </Typography>
    );
  }

  if (mimeType === 'application/pdf' || src.toLowerCase().includes('.pdf')) {
    return (
      <Box
        component="iframe"
        src={url}
        title={alt}
        className="job-card__pdf"
      />
    );
  }

  return (
    <Box
      component="img"
      src={url}
      alt={alt}
      className="job-card__doc-image"
    />
  );
}
