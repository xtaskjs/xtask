const namespace = "/chat";
let socket = createSocket();

const feed = document.getElementById("feed");
const status = document.getElementById("status");

function createSocket() {
  const client = io(namespace, {
    autoConnect: true,
  });

  client.on("connect", () => {
    appendFeed(`connected ${client.id}`);
    joinRoom();
  });

  client.on("disconnect", (reason) => {
    appendFeed(`disconnected ${reason}`);
  });

  client.on("connect_error", (error) => {
    appendFeed(`connect_error ${error.message}`);
  });

  client.on("room.joined", (payload) => {
    appendFeed(`room.joined ${payload.room} (${payload.user})`);
  });

  client.on("chat.message", (payload) => {
    appendFeed(`[${payload.room}] ${payload.user}: ${payload.text}`);
  });

  client.on("server.announcement", (payload) => {
    appendFeed(`announcement ${payload.message}`);
  });

  client.on("presence.updated", (payload) => {
    appendFeed(`presence ${payload.connectedClients} clients`);
  });

  client.on("server.state", (payload) => {
    renderStatus(payload);
  });

  return client;
}

function appendFeed(text) {
  if (!feed) {
    return;
  }

  const item = document.createElement("li");
  item.textContent = `${new Date().toLocaleTimeString()} ${text}`;
  feed.prepend(item);

  while (feed.children.length > 30) {
    feed.removeChild(feed.lastChild);
  }
}

function renderStatus(payload) {
  if (!status) {
    return;
  }

  status.textContent = JSON.stringify(payload, null, 2);
}

function valueOf(id, fallback = "") {
  const element = document.getElementById(id);
  if (!element) {
    return fallback;
  }

  return String(element.value || fallback).trim() || fallback;
}

function joinRoom() {
  if (!socket.connected) {
    return;
  }

  socket.emit(
    "chat.join",
    {
      room: valueOf("room", "lobby"),
      user: valueOf("user", "guest"),
    },
    (payload) => {
      appendFeed(`join ack ${JSON.stringify(payload)}`);
      refreshStatus();
    }
  );
}

function sendMessage() {
  const text = valueOf("message");
  if (!text) {
    return;
  }

  socket.emit(
    "chat.message",
    {
      room: valueOf("room", "lobby"),
      user: valueOf("user", "guest"),
      text,
    },
    (payload) => {
      appendFeed(`message ack ${JSON.stringify(payload)}`);
      document.getElementById("message").value = "";
      refreshStatus();
    }
  );
}

async function refreshStatus() {
  const response = await fetch("/socket/status");
  const payload = await response.json();
  renderStatus(payload);
}

async function announce() {
  const message = encodeURIComponent(`Server note at ${new Date().toLocaleTimeString()}`);
  const response = await fetch(`/socket/announce/${message}`);
  const payload = await response.json();
  appendFeed(`http announcement ${payload.message}`);
}

document.getElementById("connect")?.addEventListener("click", () => {
  if (socket.connected) {
    socket.disconnect();
  }

  socket = createSocket();
});

document.getElementById("join")?.addEventListener("click", () => {
  joinRoom();
});

document.getElementById("send")?.addEventListener("click", () => {
  sendMessage();
});

document.getElementById("announce")?.addEventListener("click", () => {
  void announce();
});

document.getElementById("refresh")?.addEventListener("click", () => {
  void refreshStatus();
});

document.getElementById("message")?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    sendMessage();
  }
});

void refreshStatus();