import { useLocalSearchParams } from 'expo-router';
import { ChatScreen } from '@/components/modules/chat/chat-screen';

export default function Chat() {
  const params = useLocalSearchParams<{ new?: string; draft?: string }>();
  return <ChatScreen resetKey={params.new} initialDraft={params.draft} />;
}
