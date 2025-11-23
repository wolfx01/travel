// إظهار وإخفاء نافذة الشات
// إظهار وإخفاء نافذة الشات
document.getElementById("chat-icon").addEventListener("click", () => {
  const win = document.getElementById("chat-window");
  const icon = document.getElementById("chat-icon");
  
  win.style.display = "flex";
  icon.style.display = "none";

  // Add welcome message if chat is empty
  const chatbox = document.getElementById("chatbox");
  if (chatbox.children.length === 0) {
    appendMessage("Hello! I am your AI Travel Guide. 🌍✈️\nAsk me anything about destinations, planning, or culture!", "bot-msg");
  }
});


if (!document.getElementById("close-chat-btn")) {
  const win = document.getElementById("chat-window");
  const closeBtn = document.createElement("button");
  closeBtn.id = "close-chat-btn";
  closeBtn.className = "close-btn-style"; // Add class for CSS styling
  closeBtn.innerHTML = "×"; // Use HTML entity for multiplication sign (looks better)
  // Remove inline styles to use CSS instead
  // closeBtn.style.cssText = ... 
  win.prepend(closeBtn);

  closeBtn.addEventListener("click", () => {
    win.style.display = "none";
    document.getElementById("chat-icon").style.display = "flex"; // أو block حسب التنسيق
  });
}
// إرسال الرسالة
document.getElementById("sendBtn").addEventListener("click", sendMessage);
document.getElementById("message").addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

async function sendMessage() {
  const message = document.getElementById("message").value;
  const chatbox = document.getElementById("chatbox");

  if (!message.trim()) return;

  chatbox.innerHTML += `<p class="user-msg"><strong></strong> ${message}</p>`;
  document.getElementById("message").value = "";

  const res = await fetch("http://localhost:3000/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });

  const data = await res.json();
  chatbox.innerHTML += `<p class="bot-msg"><strong></strong> ${data.reply}</p>`;

  chatbox.scrollTop = chatbox.scrollHeight;
}

function appendMessage(text, className) {
  const chatbox = document.getElementById("chatbox");
  const formattedText = text.replace(/\n/g, "<br>");
  chatbox.innerHTML += `<p class="${className}"><strong></strong> ${formattedText}</p>`;
  chatbox.scrollTop = chatbox.scrollHeight;
}
