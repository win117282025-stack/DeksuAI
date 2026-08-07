import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Dimensions,
  Modal,
  SafeAreaView,
  Animated,
  PanResponder,
} from "react-native";
import { MessageSquare, Settings2, Plus, Sparkles, LogOut } from "./components/Icons";
import { apiUrl } from "./utils/api";
import AnonymousLogin from "./components/AnonymousLogin";
import Sidebar from "./components/Sidebar";
import ChatView from "./components/ChatView";
import SettingsManager from "./components/SettingsManager";
import ProfileModal from "./components/ProfileModal";
import { UserSession, ChatSession, KnowledgeDocument } from "./types";

import { supabase } from "./lib/supabase";

const storage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {}
    return null;
  },
  setItem: (key: string, val: string) => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, val);
      }
    } catch (e) {}
  },
  removeItem: (key: string) => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {}
  },
};

export default function App() {
  // Application theme
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = storage.getItem("deksu_theme");
    return saved !== null ? saved === "dark" : true;
  });

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      storage.setItem("deksu_theme", next ? "dark" : "light");
      return next;
    });
  };

  // Active language state (defaulting to Indonesian "id")
  const [language, setLanguage] = useState<"id" | "en">(() => {
    const saved = storage.getItem("deksu_language");
    return saved === "en" ? "en" : "id";
  });

  const handleToggleLanguage = () => {
    const nextLang = language === "en" ? "id" : "en";
    setLanguage(nextLang);
    storage.setItem("deksu_language", nextLang);
  };

  // Deep Research mode
  const [isDeepResearch, setIsDeepResearch] = useState(() => {
    const saved = storage.getItem("deksu_deep_research");
    return saved !== null ? saved === "true" : true;
  });

  const handleToggleDeepResearch = (val: boolean) => {
    setIsDeepResearch(val);
    storage.setItem("deksu_deep_research", String(val));
  };

  // AI Engine Provider (Defaults to "groq")
  const [aiEngine, setAiEngine] = useState<"gemini" | "groq">("groq");

  const handleToggleAiEngine = (val: "gemini" | "groq") => {
    setAiEngine(val);
    storage.setItem("deksu_ai_engine", val);
  };

  // User auth state
  const [user, setUser] = useState<UserSession | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // App tabs & panels
  const [currentTab, setCurrentTab] = useState<"chat" | "settings">("chat");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  // Window dimension for responsive sidebar vs drawer
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get("window").width
  );

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  const isDesktop = screenWidth >= 768;

  // Chat & KB States
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);

  // Progress states
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isAppLoading, setIsAppLoading] = useState(false);

  // Auto-persist chats to localStorage whenever they change
  useEffect(() => {
    if (user && !isAppLoading) {
      storage.setItem("deksu_chats_" + user.id, JSON.stringify(chats));
    }
  }, [chats, user, isAppLoading]);

  // Auto-persist activeChatId to localStorage whenever it changes
  useEffect(() => {
    if (user && activeChatId && !isAppLoading) {
      storage.setItem("deksu_active_chat_" + user.id, activeChatId);
    }
  }, [activeChatId, user, isAppLoading]);

  // Auto-persist documents to localStorage whenever they change
  useEffect(() => {
    if (user && !isAppLoading) {
      storage.setItem("deksu_docs_" + user.id, JSON.stringify(documents));
    }
  }, [documents, user, isAppLoading]);

  // Auth checking on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          const userMeta = session.user.user_metadata || {};
          const mappedUser: UserSession = {
            id: session.user.id,
            email: session.user.email || "",
            username: userMeta.username || "User",
            avatar: userMeta.avatar || "🤖",
            createdAt: session.user.created_at || new Date().toISOString(),
          };
          setUser(mappedUser);
          storage.setItem("deksu_userId", mappedUser.id);
          storage.setItem("deksu_user", JSON.stringify(mappedUser));
          await loadInitialData(mappedUser.id);
        } else {
          // fallback to local offline mode if needed, or just clear user
          storage.removeItem("deksu_userId");
          storage.removeItem("deksu_user");
        }
      } catch (err) {
        console.error("Could not check Supabase auth:", err);
      } finally {
        setIsAuthChecking(false);
      }
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT") {
          performLogout();
        } else if (session && session.user) {
           // We can handle sign in via handleLoginSuccess instead,
           // but keeping it in sync here is good.
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const loadInitialData = async (userId: string) => {
    setIsAppLoading(true);
    try {
      // 1. Check localStorage first
      const cachedChatsRaw = storage.getItem("deksu_chats_" + userId);
      let localChats: ChatSession[] = [];
      if (cachedChatsRaw) {
        try {
          const parsed = JSON.parse(cachedChatsRaw);
          if (Array.isArray(parsed)) localChats = parsed;
        } catch (e) {}
      }

      // 2. Fetch from server
      const [chatsRes, kbRes] = await Promise.all([
        fetch(apiUrl(`/api/chats?userId=${userId}`)).then((r) => r.json()).catch(() => ({ success: false })),
        fetch(apiUrl(`/api/kb?userId=${userId}`)).then((r) => r.json()).catch(() => ({ success: false })),
      ]);

      let mergedChats: ChatSession[] = [];

      if (chatsRes.success && Array.isArray(chatsRes.chats) && chatsRes.chats.length > 0) {
        mergedChats = [...chatsRes.chats];

        // Merge any local chats or extra local messages that aren't on server yet
        localChats.forEach((localChat) => {
          const serverIndex = mergedChats.findIndex((c) => c.id === localChat.id);
          if (serverIndex === -1) {
            mergedChats.push(localChat);
          } else {
            // Pick whichever chat session has more messages
            if (localChat.messages && localChat.messages.length > mergedChats[serverIndex].messages.length) {
              mergedChats[serverIndex] = localChat;
            }
          }
        });
      } else if (localChats.length > 0) {
        // Server returned empty or error, but we have local chats saved in localStorage!
        mergedChats = localChats;
      }

      setChats(mergedChats);
      storage.setItem("deksu_chats_" + userId, JSON.stringify(mergedChats));

      // Restore activeChatId from localStorage if valid, or default to the last chat
      const savedActiveId = storage.getItem("deksu_active_chat_" + userId);
      if (savedActiveId && mergedChats.some((c) => c.id === savedActiveId)) {
        setActiveChatId(savedActiveId);
      } else if (mergedChats.length > 0) {
        setActiveChatId(mergedChats[mergedChats.length - 1].id);
      } else {
        setActiveChatId(null);
      }

      // 3. Knowledge Base Documents
      const cachedDocsRaw = storage.getItem("deksu_docs_" + userId);
      let localDocs: KnowledgeDocument[] = [];
      if (cachedDocsRaw) {
        try {
          const parsed = JSON.parse(cachedDocsRaw);
          if (Array.isArray(parsed)) localDocs = parsed;
        } catch (e) {}
      }

      if (kbRes.success && Array.isArray(kbRes.documents) && kbRes.documents.length > 0) {
        setDocuments(kbRes.documents);
        storage.setItem("deksu_docs_" + userId, JSON.stringify(kbRes.documents));
      } else if (localDocs.length > 0) {
        setDocuments(localDocs);
      }
    } catch (err) {
      console.error("Error loading workspace data", err);
    } finally {
      setIsAppLoading(false);
    }
  };

  const handleLoginSuccess = async (session: UserSession) => {
    setUser(session);
    storage.setItem("deksu_userId", session.id);
    storage.setItem("deksu_user", JSON.stringify(session));
    await loadInitialData(session.id);
  };

  const handleLogout = () => {
    setIsLogoutConfirmOpen(true);
  };

  const isLoggingOutRef = useRef(false);

  const performLogout = async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    
    storage.removeItem("deksu_userId");
    storage.removeItem("deksu_user");
    setUser(null);
    setChats([]);
    setActiveChatId(null);
    setDocuments([]);
    setIsDrawerOpen(false);
    setIsProfileOpen(false);
    setIsLogoutConfirmOpen(false);
    
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error("Logout error", err);
    } finally {
      isLoggingOutRef.current = false;
    }
  };

  const handleUpdateProfile = (updatedUser: UserSession) => {
    setUser(updatedUser);
    storage.setItem("deksu_user", JSON.stringify(updatedUser));
  };

  // Chat Session Management
  const handleCreateChat = async () => {
    if (!user) return;
    const newChatId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newChat: ChatSession = {
      id: newChatId,
      userId: user.id,
      title: "New Dialogue",
      createdAt: new Date().toISOString(),
      messages: [],
    };

    setChats((prev) => [...prev, newChat]);
    setActiveChatId(newChatId);
    setCurrentTab("chat");
    setIsDrawerOpen(false);

    try {
      const response = await fetch(apiUrl("/api/chats"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, title: "New Dialogue", id: newChatId }),
      });
      const data = await response.json();
      if (data.success && data.chat) {
        setChats((prev) =>
          prev.map((c) => (c.id === newChatId ? data.chat : c))
        );
        setActiveChatId(data.chat.id);
      }
    } catch (err) {
      console.error("Failed to sync chat creation to server, saved locally", err);
    }
  };

  const handleDeleteChat = async (id: string) => {
    if (!user) return;
    setChats((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      if (activeChatId === id) {
        setActiveChatId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
      }
      return remaining;
    });

    try {
      await fetch(apiUrl(`/api/chats/${id}?userId=${user.id}`), {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Failed to sync chat deletion to server, removed locally", err);
    }
  };

  const handleRenameChat = async (id: string, newTitle: string) => {
    if (!user) return;
    setChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
    );
    try {
      await fetch(apiUrl(`/api/chats/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, title: newTitle }),
      });
    } catch (err) {
      console.error("Failed to sync chat rename to server, updated locally", err);
    }
  };

  const handleSendMessage = async (text: string, overrideChatId?: string) => {
    const targetChatId = overrideChatId || activeChatId;
    if (!user || !targetChatId) return;

    setIsSendingMessage(true);

    const tempUserMsg = {
      id: `optimistic_${Date.now()}`,
      role: "user" as const,
      text,
      createdAt: new Date().toISOString(),
    };

    setChats((prev) =>
      prev.map((c) => {
        if (c.id === targetChatId) {
          return { ...c, messages: [...c.messages, tempUserMsg] };
        }
        return c;
      })
    );

    try {
      const response = await fetch(apiUrl(`/api/chats/${targetChatId}/messages`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          text,
          deepResearch: isDeepResearch,
          language,
          aiEngine,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setChats((prev) =>
          prev.map((c) => {
            if (c.id === targetChatId) {
              const filtered = c.messages.filter((m) => m.id !== tempUserMsg.id);
              return {
                ...c,
                title: data.chatTitle || c.title,
                messages: [...filtered, data.userMessage, data.modelMessage],
              };
            }
            return c;
          })
        );
      } else {
        throw new Error(
          data.error || "An error occurred during response generation."
        );
      }
    } catch (err: any) {
      console.error("Message send failure:", err);
      const errorMsg = {
        id: `err_${Date.now()}`,
        role: "model" as const,
        text:
          err.message ||
          "Unable to send message. Please ensure the server is fully running and connected.",
        createdAt: new Date().toISOString(),
        matchedSources: [],
      };
      setChats((prev) =>
        prev.map((c) => {
          if (c.id === targetChatId) {
            const filtered = c.messages.filter((m) => m.id !== tempUserMsg.id);
            return {
              ...c,
              messages: [
                ...filtered,
                { ...tempUserMsg, id: `msg_${Date.now()}` },
                errorMsg,
              ],
            };
          }
          return c;
        })
      );
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSelectSuggestion = async (text: string) => {
    if (!user) return;
    if (!activeChatId) {
      const newChatId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newChat: ChatSession = {
        id: newChatId,
        userId: user.id,
        title: "New Dialogue",
        createdAt: new Date().toISOString(),
        messages: [],
      };

      setChats((prev) => [...prev, newChat]);
      setActiveChatId(newChatId);
      setCurrentTab("chat");
      setIsDrawerOpen(false);

      handleSendMessage(text, newChatId);

      try {
        await fetch(apiUrl("/api/chats"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, title: "New Dialogue", id: newChatId }),
        });
      } catch (err) {
        console.error("Failed to sync suggestion chat session creation to server", err);
      }
    } else {
      handleSendMessage(text);
    }
  };

  // Knowledge Base Document Management
  const handleAddDocument = async (doc: {
    title: string;
    content: string;
    category: string;
  }) => {
    if (!user) return;
    const response = await fetch(apiUrl("/api/kb"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, ...doc }),
    });
    const data = await response.json();
    if (data.success) {
      setDocuments((prev) => [...prev, data.document]);
    } else {
      throw new Error(data.error || "Could not deploy document");
    }
  };

  const handleUpdateDocument = async (
    id: string,
    doc: { title: string; content: string; category: string }
  ) => {
    if (!user) return;
    const response = await fetch(apiUrl(`/api/kb/${id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, ...doc }),
    });
    const data = await response.json();
    if (data.success) {
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? data.document : d))
      );
    } else {
      throw new Error(data.error || "Could not update document");
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!user) return;
    const response = await fetch(apiUrl(`/api/kb/${id}?userId=${user.id}`), {
      method: "DELETE",
    });
    const data = await response.json();
    if (data.success) {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } else {
      throw new Error(data.error || "Could not delete document");
    }
  };

  const stateRef = useRef({ currentTab, isDrawerOpen, isDesktop });
  useEffect(() => {
    stateRef.current = { currentTab, isDrawerOpen, isDesktop };
  }, [currentTab, isDrawerOpen, isDesktop]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 40 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2;
      },
      onPanResponderRelease: (evt, gestureState) => {
        const state = stateRef.current;
        if (gestureState.dx > 50) {
          // Swipe Right
          if (state.isDrawerOpen) {
            setIsDrawerOpen(false);
          } else if (state.currentTab === "chat") {
            setCurrentTab("settings");
          }
        } else if (gestureState.dx < -50) {
          // Swipe Left
          if (state.currentTab === "settings") {
            setCurrentTab("chat");
          } else if (state.currentTab === "chat" && !state.isDesktop && !state.isDrawerOpen) {
            setIsDrawerOpen(true);
          }
        }
      },
    })
  ).current;

  const activeChat = chats.find((c) => c.id === activeChatId) || null;
  const isDark = isDarkMode;

  // Animated transition for tabs
  const tabSlideAnim = useRef(new Animated.Value(currentTab === "chat" ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(tabSlideAnim, {
      toValue: currentTab === "chat" ? 0 : 1,
      duration: 250,
      useNativeDriver: false, // Since we interpolate layout widths
    }).start();
  }, [currentTab]);

  const workspaceWidth = isDesktop ? screenWidth - 280 : screenWidth;

  const chatTranslateX = tabSlideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, workspaceWidth], // Moves chat right when settings is active
  });

  const settingsTranslateX = tabSlideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-workspaceWidth, 0], // Settings is on left, moves in from left
  });

  // Render initial auth loading state
  if (isAuthChecking) {
    return (
      <View style={[styles.loadingScreen, isDark ? styles.bgDark : styles.bgLight]}>
        <ActivityIndicator color="#0078D4" size="large" />
        <Text style={styles.loadingText}>Initializing DeksuAI Mobile...</Text>
      </View>
    );
  }

  // Auth Screen View
  if (!user) {
    return (
      <SafeAreaView style={[styles.appWrapper, isDark ? styles.bgDark : styles.bgLight]}>
        <AnonymousLogin
          onLoginSuccess={handleLoginSuccess}
          language={language}
          onToggleLanguage={handleToggleLanguage}
          isDarkMode={isDarkMode}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.appWrapper, isDark ? styles.bgDark : styles.bgLight]}>
      <View style={styles.layoutRow} {...panResponder.panHandlers}>
        {/* Permanent Desktop Sidebar */}
        {isDesktop && (
          <View style={[styles.desktopSidebarContainer, isDark ? styles.borderDark : styles.borderLight]}>
            <Sidebar
              user={user}
              chats={chats}
              activeChatId={activeChatId}
              onSelectChat={(id) => {
                setActiveChatId(id);
                setCurrentTab("chat");
              }}
              onCreateChat={handleCreateChat}
              onDeleteChat={handleDeleteChat}
              currentTab={currentTab}
              onChangeTab={setCurrentTab}
              onLogout={handleLogout}
              onEditProfile={() => setIsProfileOpen(true)}
              language={language}
              onToggleLanguage={handleToggleLanguage}
              isDarkMode={isDarkMode}
            />
          </View>
        )}

        {/* Slide-out Sidebar Drawer Overlay */}
        <Modal
          transparent
          visible={isDrawerOpen}
          animationType="fade"
          onRequestClose={() => setIsDrawerOpen(false)}
        >
          <View style={styles.drawerOverlay}>
            <TouchableOpacity
              style={styles.drawerBackdrop}
              onPress={() => setIsDrawerOpen(false)}
              activeOpacity={1}
            />
            <View style={[styles.drawerContent, isDark ? styles.bgDark : styles.bgLight]}>
              <Sidebar
                user={user}
                chats={chats}
                activeChatId={activeChatId}
                onSelectChat={(id) => {
                  setActiveChatId(id);
                  setCurrentTab("chat");
                  setIsDrawerOpen(false);
                }}
                onCreateChat={handleCreateChat}
                onDeleteChat={handleDeleteChat}
                currentTab={currentTab}
                onChangeTab={(tab) => {
                  setCurrentTab(tab);
                  setIsDrawerOpen(false);
                }}
                onLogout={handleLogout}
                onEditProfile={() => {
                  setIsDrawerOpen(false);
                  setIsProfileOpen(true);
                }}
                onClose={() => setIsDrawerOpen(false)}
                language={language}
                onToggleLanguage={handleToggleLanguage}
                isDarkMode={isDarkMode}
              />
            </View>
          </View>
        </Modal>

        {/* Central Workspace View */}
        <View style={styles.mainWorkspace}>
          {isAppLoading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator color="#0078D4" size="large" />
              <Text style={styles.loadingText}>Loading Records...</Text>
            </View>
          ) : (
            <View style={{ flex: 1, position: 'relative' }}>
              <Animated.View style={{ flex: 1, position: 'absolute', width: '100%', height: '100%', transform: [{ translateX: settingsTranslateX }] }}>
                <SettingsManager
                  user={user}
                  documents={documents}
                  onAddDocument={handleAddDocument}
                  onUpdateDocument={handleUpdateDocument}
                  onDeleteDocument={handleDeleteDocument}
                  deepResearch={isDeepResearch}
                  onToggleDeepResearch={handleToggleDeepResearch}
                  aiEngine={aiEngine}
                  onChangeAiEngine={handleToggleAiEngine}
                  language={language}
                  onToggleLanguage={handleToggleLanguage}
                  isDarkMode={isDarkMode}
                  onLogout={handleLogout}
                />
              </Animated.View>
              <Animated.View style={{ flex: 1, position: 'absolute', width: '100%', height: '100%', transform: [{ translateX: chatTranslateX }] }}>
                <ChatView
                  session={activeChat}
                  onSendMessage={handleSendMessage}
                  isSending={isSendingMessage}
                  onSelectSuggestion={handleSelectSuggestion}
                  onMenuClick={() => setIsDrawerOpen(true)}
                  isDarkMode={isDarkMode}
                  onToggleTheme={handleToggleTheme}
                  language={language}
                  onToggleLanguage={handleToggleLanguage}
                  onDeleteChat={handleDeleteChat}
                  onRenameChat={handleRenameChat}
                />
              </Animated.View>
            </View>
          )}

          {/* Bottom Navigation Tabs on Mobile */}
          {!isDesktop && (
            <View style={[styles.bottomNav, isDark ? styles.bottomNavDark : styles.bottomNavLight]}>
              <TouchableOpacity
                onPress={() => {
                  setCurrentTab("chat");
                  if (!activeChatId && chats.length > 0) {
                    setActiveChatId(chats[chats.length - 1].id);
                  } else if (chats.length === 0) {
                    handleCreateChat();
                  }
                }}
                style={styles.bottomNavTab}
              >
                <MessageSquare
                  color={currentTab === "chat" ? "#0078D4" : "#A0A0A0"}
                  size={20}
                />
                <Text
                  style={[
                    styles.bottomNavText,
                    currentTab === "chat" && styles.bottomNavTextActive,
                  ]}
                >
                  Dialogue
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCreateChat}
                style={styles.bottomNavPlusBtn}
              >
                <Plus color="#FFFFFF" size={20} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setCurrentTab("settings")}
                style={styles.bottomNavTab}
              >
                <Settings2
                  color={currentTab === "settings" ? "#0078D4" : "#A0A0A0"}
                  size={20}
                />
                <Text
                  style={[
                    styles.bottomNavText,
                    currentTab === "settings" && styles.bottomNavTextActive,
                  ]}
                >
                  Settings
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Customize Profile Modal Overlay */}
      {isProfileOpen && (
        <ProfileModal
          user={user}
          onClose={() => setIsProfileOpen(false)}
          onUpdate={handleUpdateProfile}
          isDarkMode={isDarkMode}
          language={language}
          onLogout={handleLogout}
        />
      )}

      {/* Logout Confirmation Modal Overlay */}
      {isLogoutConfirmOpen && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 99999, elevation: 2 }]}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.logoutModalBackdrop}
            onPress={() => setIsLogoutConfirmOpen(false)}
          />
          <View style={styles.logoutModalOverlay} pointerEvents="box-none">
            <View style={[styles.logoutModalCard, isDark ? styles.cardDarkModal : styles.cardLightModal]}>
              <View style={styles.logoutIconBadge}>
                <LogOut color="#E11D48" size={26} />
              </View>
              <Text style={[styles.logoutModalTitle, isDark ? styles.textWhite : styles.textDark]}>
                {language === "id" ? "Keluar dari DeksuAI?" : "Sign Out of DeksuAI?"}
              </Text>
              <Text style={[styles.logoutModalBody, isDark ? styles.textMutedDark : styles.textMutedLight]}>
                {language === "id"
                  ? "Sesi aktif Anda akan diakhiri dan token masuk lokal akan dihapus dari perangkat ini."
                  : "Your active session will end and local login tokens will be cleared from this device."}
              </Text>
              <View style={styles.logoutModalActions}>
                <TouchableOpacity
                  onPress={() => setIsLogoutConfirmOpen(false)}
                  style={[styles.logoutCancelBtn, isDark ? styles.btnDarkModal : styles.btnLightModal]}
                >
                  <Text style={[styles.logoutCancelText, isDark ? styles.textMutedDark : styles.textMutedLight]}>
                    {language === "id" ? "Batal" : "Cancel"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={performLogout} style={styles.logoutConfirmBtn}>
                  <LogOut color="#FFFFFF" size={15} />
                  <Text style={styles.logoutConfirmText}>
                    {language === "id" ? "Ya, Keluar" : "Sign Out"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  appWrapper: {
    flex: 1,
    height: "100%",
    width: "100%",
    overflow: "hidden",
  },
  layoutRow: {
    flex: 1,
    flexDirection: "row",
    height: "100%",
    overflow: "hidden",
  },
  bgDark: {
    backgroundColor: "#202020",
  },
  bgLight: {
    backgroundColor: "#f3f3f3",
  },
  borderDark: {
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  borderLight: {
    borderColor: "#E5E5E5",
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  centerLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#A0A0A0",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  desktopSidebarContainer: {
    width: 280,
    height: "100%",
    borderRightWidth: 1,
  },
  mainWorkspace: {
    flex: 1,
    height: "100%",
    overflow: "hidden",
  },
  drawerOverlay: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  drawerBackdrop: {
    flex: 1,
  },
  drawerContent: {
    width: 280,
    height: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  bottomNav: {
    height: 64,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 16,
  },
  bottomNavDark: {
    backgroundColor: "#282828",
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  bottomNavLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5E5",
  },
  bottomNavTab: {
    alignItems: "center",
    gap: 2,
  },
  bottomNavText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#A0A0A0",
    textTransform: "uppercase",
  },
  bottomNavTextActive: {
    color: "#0078D4",
  },
  bottomNavPlusBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#0078D4",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0078D4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  logoutModalBackdrop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  logoutModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  logoutModalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 8,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDarkModal: {
    backgroundColor: "#282828",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  cardLightModal: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5E5",
  },
  logoutIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: "rgba(225, 29, 72, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoutModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  logoutModalBody: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 20,
  },
  logoutModalActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
  },
  logoutCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  btnDarkModal: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  btnLightModal: {
    backgroundColor: "#F3F3F3",
    borderColor: "#E5E5E5",
  },
  logoutCancelText: {
    fontSize: 13,
    fontWeight: "700",
  },
  logoutConfirmBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#E11D48",
  },
  logoutConfirmText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  textWhite: {
    color: "#f3f3f3",
  },
  textDark: {
    color: "#282828",
  },
  textMutedDark: {
    color: "#A0A0A0",
  },
  textMutedLight: {
    color: "#616161",
  },
});
