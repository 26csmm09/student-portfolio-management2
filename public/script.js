// Browser-side JavaScript for forms and dashboard actions.

async function sendForm(url, form) {
  const response = await fetch(url, {
    method: "POST",
    body: new URLSearchParams(new FormData(form))
  });
  const result = await response.json();
  return { response, result };
}

const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const message = document.getElementById("registerMessage");
    try {
      const { response, result } = await sendForm("/api/register", registerForm);
      message.textContent = result.message;
      message.className = response.ok ? "message success" : "message error";
      if (response.ok) {
        registerForm.reset();
        setTimeout(() => window.location.href = "/login.html", 1200);
      }
    } catch {
      message.textContent = "Could not connect to the server.";
      message.className = "message error";
    }
  });
}

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const message = document.getElementById("loginMessage");
    try {
      const { response, result } = await sendForm("/api/login", loginForm);
      message.textContent = result.message;
      message.className = response.ok ? "message success" : "message error";
      if (response.ok) window.location.href = result.redirect;
    } catch {
      message.textContent = "Could not connect to the server.";
      message.className = "message error";
    }
  });
}

async function loadPortfolio() {
  const response = await fetch("/api/portfolio");
  if (!response.ok) {
    window.location.href = "/login.html";
    return;
  }
  const data = await response.json();
  const portfolio = data.portfolio;

  document.getElementById("welcomeName").textContent = portfolio.name || data.user.name;
  document.getElementById("navName").textContent = data.user.email;
  document.getElementById("profileName").value = portfolio.name || "";
  document.getElementById("profileEmail").value = portfolio.email || "";
  document.getElementById("course").value = portfolio.course || "";
  document.getElementById("about").value = portfolio.about || "";

  ["skills", "achievements", "projects"].forEach(type => {
    const items = portfolio[type] || [];
    document.getElementById(type + "Count").textContent = items.length;
    const list = document.getElementById(type + "List");
    list.innerHTML = "";

    if (items.length === 0) {
      list.innerHTML = '<p class="empty-state">Nothing added yet. Add your first one above.</p>';
    }

    items.forEach(item => {
      const card = document.createElement("div");
      card.className = "item-card";

      const details = document.createElement("div");
      details.className = "item-details";
      const title = document.createElement("strong");
      title.textContent = item.title;
      const description = document.createElement("p");
      description.textContent = item.description || "";
      details.append(title, description);

      const actions = document.createElement("div");
      actions.className = "item-actions";
      const editButton = document.createElement("button");
      editButton.className = "plain-button";
      editButton.textContent = "Edit";
      editButton.addEventListener("click", () => editItem(type, item));
      const deleteButton = document.createElement("button");
      deleteButton.className = "plain-button delete-button";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", () => deleteItem(type, item.id));
      actions.append(editButton, deleteButton);
      card.append(details, actions);
      list.appendChild(card);
    });
  });
}

const profileForm = document.getElementById("profileForm");
if (profileForm) {
  loadPortfolio();

  profileForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const { response, result } = await sendForm("/api/profile", profileForm);
    const message = document.getElementById("profileMessage");
    message.textContent = result.message;
    message.className = response.ok ? "message success" : "message error";
    if (response.ok) loadPortfolio();
  });

  document.querySelectorAll(".item-form").forEach(form => {
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const values = new FormData(form);
      values.append("type", form.dataset.type);
      const response = await fetch("/api/item", {
        method: "POST",
        body: new URLSearchParams(values)
      });
      const result = await response.json();
      if (!response.ok) {
        alert(result.message);
        return;
      }
      form.reset();
      loadPortfolio();
    });
  });

  document.getElementById("logoutButton").addEventListener("click", async function () {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login.html";
  });
}

async function editItem(type, item) {
  const title = prompt("Edit title:", item.title);
  if (title === null) return;
  if (!title.trim()) {
    alert("Title cannot be empty.");
    return;
  }
  const description = prompt("Edit description:", item.description || "");
  if (description === null) return;

  const values = new URLSearchParams({ type, id: item.id, title: title.trim(), description: description.trim() });
  const response = await fetch("/api/item/update", { method: "POST", body: values });
  const result = await response.json();
  alert(result.message);
  if (response.ok) loadPortfolio();
}

async function deleteItem(type, id) {
  if (!confirm("Are you sure you want to delete this item?")) return;
  const values = new URLSearchParams({ type, id });
  const response = await fetch("/api/item/delete", { method: "POST", body: values });
  const result = await response.json();
  if (!response.ok) alert(result.message);
  loadPortfolio();
}
