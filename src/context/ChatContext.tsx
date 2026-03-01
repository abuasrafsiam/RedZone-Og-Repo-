import React, { createContext, useContext, useState } from "react";

interface ChatContextType {
  isInConversation: boolean;
  setIsInConversation: (value: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInConversation, setIsInConversation] = useState(false);

  return (
    <ChatContext.Provider value={{ isInConversation, setIsInConversation }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChatContext must be used within ChatProvider");
  }
  return context;
};
