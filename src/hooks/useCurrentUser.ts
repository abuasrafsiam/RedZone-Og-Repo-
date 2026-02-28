import { useState, useEffect } from "react";

export interface CurrentUser {
  id: string;
  nickname: string;
  uid: string;
  rank: string;
  kd_ratio: string;
  role: string;
  play_time: string;
  language: string;
  is_vip: boolean;
}

const STORAGE_KEY = "redzone_user_id";

export const useCurrentUser = () => {
  const [userId, setUserId] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY);
  });

  const saveUserId = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setUserId(id);
  };

  const clearUser = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUserId(null);
  };

  return { userId, saveUserId, clearUser };
};
