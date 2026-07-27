import { loadSalonConfig } from "../../lib/config.js";
import ChatClient from "../../components/ChatClient.jsx";

export default function ChatPage() {
  const config = loadSalonConfig();
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <ChatClient salonName={config.salonName} />
    </div>
  );
}
