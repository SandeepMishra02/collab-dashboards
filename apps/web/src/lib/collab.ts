import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Awareness } from 'y-protocols/awareness';

const WS = process.env.NEXT_PUBLIC_COLLAB_WS || 'ws://localhost:1234';

export function connectRoom(room: string) {
  const doc = new Y.Doc();
  const provider = new WebsocketProvider(WS, room, doc);
  const awareness = new Awareness(doc);
  provider.awareness.setLocalState({
    name: `user-${Math.random().toString(36).slice(2, 6)}`
  });
  return { doc, provider, awareness };
}
