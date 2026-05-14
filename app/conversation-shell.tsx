'use client';

import { ConversationProvider } from '@elevenlabs/react';

export function ConversationShell({ children }: { children: React.ReactNode }) {
  return <ConversationProvider>{children}</ConversationProvider>;
}
