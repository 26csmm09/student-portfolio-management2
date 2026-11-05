// Student Portfolio Management System
// Backend made with Node.js built-in modules. No Express.js is used.

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { MongoClient, ObjectId } = require("mongodb");

const PORT = 3000;
const MONGO_URL = "mongodb://127.0.0.1:27017";
const client = new MongoClient(MONGO_URL);

let users;
let portfolios;
const sessions = {}; // Simple in-memory sessions for this classroom project.

function sendJson(res, statusCode, data, extraHeaders = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    ...extraHeaders
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk.toString();
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function getSessionUser(req) {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/sessionId=([^;]+)/);
  if (!match) return null;
  return sessions[match[1]] || null;
}

function makePasswordHash(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function sendPublicFile(res, fileName, contentType) {
  const filePath = path.join(__dirname, "public", fileName);
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("File not found");
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    // Serve the website files.
    if (req.method === "GET" && req.url === "/") {
      return sendPublicFile(res, "index.html", "text/html");
    }
    if (req.method === "GET" && req.url === "/register.html") {
      return sendPublicFile(res, "register.html", "text/html");
    }
    if (req.method === "GET" && req.url === "/login.html") {
      return sendPublicFile(res, "login.html", "text/html");
    }
    if (req.method === "GET" && req.url === "/dashboard.html") {
      return sendPublicFile(res, "dashboard.html", "text/html");
    }
    if (req.method === "GET" && req.url === "/style.css") {
      return sendPublicFile(res, "style.css", "text/css");
    }
    if (req.method === "GET" && req.url === "/script.js") {
      return sendPublicFile(res, "script.js", "text/javascript");
    }

    // Register a new user.
    if (req.method === "POST" && req.url === "/api/register") {
      const form = new URLSearchParams(await readBody(req));
      const name = (form.get("name") || "").trim();
      const email = (form.get("email") || "").trim().toLowerCase();
      const password = form.get("password") || "";

      if (!name || !email || password.length < 6) {
        return sendJson(res, 400, {
          message: "Enter your name, a valid email and a password with at least 6 characters."
        });
      }

      const existingUser = await users.findOne({ email });
      if (existingUser) {
        return sendJson(res, 400, { message: "This email is already registered. Please log in." });
      }

      const salt = crypto.randomBytes(16).toString("hex");
      const passwordHash = makePasswordHash(password, salt);

      const result = await users.insertOne({
        name,
        email,
        salt,
        passwordHash,
        createdAt: new Date()
      });

      await portfolios.insertOne({
        userId: result.insertedId,
        name,
        email,
        course: "",
        about: "",
        skills: [],
        achievements: [],
        projects: [],
        updatedAt: new Date()
      });

      return sendJson(res, 201, { message: "Registration successful. Please log in." });
    }

    // Log in an existing user.
    if (req.method === "POST" && req.url === "/api/login") {
      const form = new URLSearchParams(await readBody(req));
      const email = (form.get("email") || "").trim().toLowerCase();
      const password = form.get("password") || "";
      const user = await users.findOne({ email });

      if (!user || makePasswordHash(password, user.salt) !== user.passwordHash) {
        return sendJson(res, 401, { message: "Incorrect email or password." });
      }

      const sessionId = crypto.randomBytes(24).toString("hex");
      sessions[sessionId] = {
        id: user._id.toString(),
        name: user.name,
        email: user.email
      };

      return sendJson(res, 200, {
        message: "Login successful.",
        redirect: "/dashboard.html"
      }, {
        "Set-Cookie": `sessionId=${sessionId}; HttpOnly; SameSite=Lax; Path=/`
      });
    }

    // Log out.
    if (req.method === "POST" && req.url === "/api/logout") {
      const cookie = req.headers.cookie || "";
      const match = cookie.match(/sessionId=([^;]+)/);
      if (match) delete sessions[match[1]];
      return sendJson(res, 200, { message: "Logged out." }, {
        "Set-Cookie": "sessionId=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"
      });
    }

    // All portfolio routes below require login.
    const currentUser = getSessionUser(req);
    if (req.url.startsWith("/api/") && !currentUser) {
      return sendJson(res, 401, { message: "Please log in first." });
    }

    if (req.method === "GET" && req.url === "/api/portfolio") {
      const portfolio = await portfolios.findOne({ userId: new ObjectId(currentUser.id) });
      return sendJson(res, 200, {
        user: { name: currentUser.name, email: currentUser.email },
        portfolio
      });
    }

    // Update profile information.
    if (req.method === "POST" && req.url === "/api/profile") {
      const form = new URLSearchParams(await readBody(req));
      const name = (form.get("name") || "").trim();
      const course = (form.get("course") || "").trim();
      const about = (form.get("about") || "").trim();

      if (!name) return sendJson(res, 400, { message: "Name is required." });

      await portfolios.updateOne(
        { userId: new ObjectId(currentUser.id) },
        { $set: { name, course, about, updatedAt: new Date() } }
      );
      await users.updateOne(
        { _id: new ObjectId(currentUser.id) },
        { $set: { name } }
      );
      sessions[Object.keys(sessions).find(key => sessions[key].id === currentUser.id)].name = name;

      return sendJson(res, 200, { message: "Profile saved successfully." });
    }

    // Add a skill, achievement or project.
    if (req.method === "POST" && req.url === "/api/item") {
      const form = new URLSearchParams(await readBody(req));
      const type = form.get("type");
      const title = (form.get("title") || "").trim();
      const description = (form.get("description") || "").trim();

      if (!["skills", "achievements", "projects"].includes(type)) {
        return sendJson(res, 400, { message: "Invalid section." });
      }
      if (!title) return sendJson(res, 400, { message: "Please enter a title." });

      await portfolios.updateOne(
        { userId: new ObjectId(currentUser.id) },
        { $push: { [type]: { id: crypto.randomUUID(), title, description } } }
      );
      return sendJson(res, 201, { message: "Item added successfully." });
    }

    // Edit an item.
    if (req.method === "POST" && req.url === "/api/item/update") {
      const form = new URLSearchParams(await readBody(req));
      const type = form.get("type");
      const id = form.get("id");
      const title = (form.get("title") || "").trim();
      const description = (form.get("description") || "").trim();

      if (!["skills", "achievements", "projects"].includes(type) || !id || !title) {
        return sendJson(res, 400, { message: "Please provide valid item details." });
      }

      await portfolios.updateOne(
        { userId: new ObjectId(currentUser.id), [`${type}.id`]: id },
        { $set: {
          [`${type}.$.title`]: title,
          [`${type}.$.description`]: description,
          updatedAt: new Date()
        } }
      );
      return sendJson(res, 200, { message: "Item updated successfully." });
    }

    // Delete an item.
    if (req.method === "POST" && req.url === "/api/item/delete") {
      const form = new URLSearchParams(await readBody(req));
      const type = form.get("type");
      const id = form.get("id");

      if (!["skills", "achievements", "projects"].includes(type) || !id) {
        return sendJson(res, 400, { message: "Invalid item." });
      }

      await portfolios.updateOne(
        { userId: new ObjectId(currentUser.id) },
        { $pull: { [type]: { id } } }
      );
      return sendJson(res, 200, { message: "Item deleted successfully." });
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Page not found.");
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { message: "Something went wrong. Check the terminal for details." });
  }
});

async function startServer() {
  await client.connect();
  const db = client.db("studentPortfolioDB");
  users = db.collection("users");
  portfolios = db.collection("portfolio");

  server.listen(PORT, () => {
    console.log("MongoDB connected successfully.");
    console.log(`Website running at http://localhost:${PORT}`);
  });
}

startServer().catch(error => {
  console.error("Could not start the project. Make sure MongoDB is running.");
  console.error(error);
});
