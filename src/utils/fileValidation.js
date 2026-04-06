const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const JOB_DOC_TYPES = ['application/pdf', ...IMAGE_TYPES];

export function validateImage(file, maxSizeMb = 2) {
  if (!file) {
    return '';
  }

  if (!IMAGE_TYPES.includes(file.type)) {
    return 'Profile photo must be JPG, PNG, or WEBP.';
  }

  if (file.size > maxSizeMb * 1024 * 1024) {
    return `Profile photo must be ${maxSizeMb}MB or smaller.`;
  }

  return '';
}

export function validateJobDocument(file, maxSizeMb = 5) {
  if (!file) {
    return 'Upload a job description document.';
  }

  if (!JOB_DOC_TYPES.includes(file.type)) {
    return 'Job document must be PDF, JPG, PNG, or WEBP.';
  }

  if (file.size > maxSizeMb * 1024 * 1024) {
    return `Job document must be ${maxSizeMb}MB or smaller.`;
  }

  return '';
}

export function createPreview(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        url: reader.result,
      });
    };
    reader.onerror = () => reject(new Error('Unable to read the selected file.'));
    reader.readAsDataURL(file);
  });
}
