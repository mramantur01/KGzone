import { useEffect, useSyncExternalStore } from 'react';
import { call } from './admin';

// Buyer ↔ seller messages and seller reviews.

export interface ConversationSummary {
  id: string;
  kind: 'parts' | 'cars';
  listingId: string;
  listingTitle: string;
  listingImage: string;
  role: 'buyer' | 'seller';
  otherName: string;
  lastMessage: { text: string; at: string; from: string } | null;
  lastAt: string;
  unread: number;
}

export interface ChatMessage {
  id: string;
  text: string;
  at: string;
  mine: boolean;
}

export const startConversation = (kind: 'parts' | 'cars', listingId: string, text: string) =>
  call<{ conversation: ConversationSummary }>('/api/conversations', { method: 'POST', body: JSON.stringify({ kind, listingId, text }) }).then((r) => {
    refreshUnread();
    return r.conversation;
  });

export const listConversations = () =>
  call<{ conversations: ConversationSummary[]; unread: number }>('/api/conversations').then((r) => {
    setUnread(r.unread);
    return r.conversations;
  });

export const getConversation = (id: string) =>
  call<{ conversation: ConversationSummary; messages: ChatMessage[] }>(`/api/conversations/${encodeURIComponent(id)}`).then((r) => {
    refreshUnread();
    return r;
  });

export const sendMessage = (id: string, text: string) =>
  call<{ messages: ChatMessage[] }>(`/api/conversations/${encodeURIComponent(id)}/messages`, { method: 'POST', body: JSON.stringify({ text }) }).then((r) => r.messages);

// Unread counter (polled while signed in)
let unread = 0;
const listeners = new Set<() => void>();
const setUnread = (n: number) => {
  if (n === unread) return;
  unread = n;
  listeners.forEach((l) => l());
};
export function refreshUnread() {
  call<{ unread: number }>('/api/conversations').then((r) => setUnread(r.unread)).catch(() => setUnread(0));
}

export function useUnreadMessages(signedIn: boolean): number {
  useEffect(() => {
    if (!signedIn) { setUnread(0); return; }
    refreshUnread();
    const t = setInterval(() => { if (document.visibilityState === 'visible') refreshUnread(); }, 30_000);
    return () => clearInterval(t);
  }, [signedIn]);
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => unread,
    () => unread
  );
}

// Seller reviews
export interface SellerReviewsInfo {
  seller: { id: string; name: string; accountType: 'individual' | 'legal'; verified: boolean; since: string };
  rating: number | null;
  reviews: { id: string; authorName: string; rating: number; text: string; listingTitle: string; createdAt: string }[];
  canReview: boolean;
}

export const getSellerReviews = (sellerId: string) => call<SellerReviewsInfo>(`/api/sellers/${encodeURIComponent(sellerId)}/reviews`);

export const postSellerReview = (sellerId: string, rating: number, text: string) =>
  call(`/api/sellers/${encodeURIComponent(sellerId)}/reviews`, { method: 'POST', body: JSON.stringify({ rating, text }) });

// Lets any component ask App to show the sign-in window
export const requestSignIn = (notice: string) => window.dispatchEvent(new CustomEvent('kgz:open-auth', { detail: { notice } }));
