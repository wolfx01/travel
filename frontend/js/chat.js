// Load chat history on startup
document.addEventListener("DOMContentLoaded", () => {
  loadChatHistory();
});

// Show/Hide chat window
document.getElementById("chat-icon").addEventListener("click", () => {
  const win = document.getElementById("chat-window");
  const icon = document.getElementById("chat-icon");
  
  win.style.display = "flex";
  icon.style.display = "none";
  
  // Scroll to bottom when opening
  const chatbox = document.getElementById("chatbox");
  chatbox.scrollTop = chatbox.scrollHeight;
});

if (!document.getElementById("close-chat-btn")) {
  const win = document.getElementById("chat-window");
  const closeBtn = document.createElement("button");
  closeBtn.id = "close-chat-btn";
  closeBtn.className = "close-btn-style"; 
  closeBtn.innerHTML = "×"; 
  win.prepend(closeBtn);

  closeBtn.addEventListener("click", () => {
    win.style.display = "none";
    document.getElementById("chat-icon").style.display = "flex"; 
  });
}

// Send Message
document.getElementById("sendBtn").addEventListener("click", sendMessage);
document.getElementById("message").addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

async function sendMessage() {
  const messageInput = document.getElementById("message");
  const message = messageInput.value.trim();
  
  if (!message) return;

  // 1. Add User Message
  appendMessage(message, "user-msg");
  saveMessage("user-msg", message);
  
  messageInput.value = "";

  try {
    const res = await fetch("https://travel-backend-gamma-ten.vercel.app/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    const data = await res.json();

    if (!res.ok) {
      // If server returned an error message (like our 429 message), use it
      if (data.reply) {
        appendMessage(data.reply, "bot-msg");
        saveMessage("bot-msg", data.reply);
      } else {
        throw new Error(res.statusText);
      }
      return;
    }
    
    // 2. Add Bot Message
    appendMessage(data.reply, "bot-msg");
    saveMessage("bot-msg", data.reply);

  } catch (error) {
    console.error("Chat Error:", error);
    const errorMsg = "Sorry, something went wrong. Please try again.";
    appendMessage(errorMsg, "bot-msg");
    // Optional: Don't save error messages? Or save them so user knows what happened.
  }
}

function appendMessage(text, className) {
  const chatbox = document.getElementById("chatbox");
  // Simple check to avoid duplicate welcome messages if calling multiple times
  // but for user messages, duplicates are possible if user types same thing.
  
  const formattedText = text.replace(/\n/g, "<br>");
  chatbox.innerHTML += `<p class="${className}"><strong></strong> ${formattedText}</p>`;
  chatbox.scrollTop = chatbox.scrollHeight;
}

// --- Persistence Logic ---

function saveMessage(className, text) {
  const history = JSON.parse(localStorage.getItem("chatHistory")) || [];
  history.push({ className, text });
  localStorage.setItem("chatHistory", JSON.stringify(history));
}

function loadChatHistory() {
  const chatbox = document.getElementById("chatbox");
  const history = JSON.parse(localStorage.getItem("chatHistory")) || [];

  if (history.length > 0) {
    chatbox.innerHTML = ""; // Clear existing (e.g. static HTML placeholders)
    history.forEach(msg => {
      appendMessage(msg.text, msg.className);
    });
  } else {
    // Default Welcome Message if no history
    const welcomeMsg = "Hello! I am your AI Travel Guide. 🌍✈️\nAsk me anything about destinations, planning, or culture!";
    appendMessage(welcomeMsg, "bot-msg");
    saveMessage("bot-msg", welcomeMsg);
  }
}
