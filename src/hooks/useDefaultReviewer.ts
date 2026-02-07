import { useState, useCallback } from 'react';

const STORAGE_KEY = 'default_peer_reviewer_email';

export const useDefaultReviewer = () => {
  const [defaultEmail, setDefaultEmail] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );

  const setDefault = useCallback((email: string) => {
    localStorage.setItem(STORAGE_KEY, email);
    setDefaultEmail(email);
  }, []);

  const clearDefault = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setDefaultEmail(null);
  }, []);

  const isDefault = useCallback(
    (email: string) => defaultEmail === email,
    [defaultEmail]
  );

  return { defaultEmail, setDefault, clearDefault, isDefault };
};
