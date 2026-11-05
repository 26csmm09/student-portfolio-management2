STUDENT PORTFOLIO MANAGEMENT SYSTEM
===================================

TECHNOLOGIES
- HTML
- CSS
- Browser JavaScript
- Node.js (built-in http, fs, path and crypto modules)
- MongoDB
- mongodb package
- Visual Studio Code

IMPORTANT
This project does NOT use Express.js or any frontend framework.

BEFORE YOU START
1. Install Node.js (LTS).
2. Install MongoDB Community Server.
3. Install MongoDB Compass (recommended).
4. Open this StudentPortfolio folder in VS Code.

FIRST-TIME SETUP
1. Open VS Code Terminal: Terminal > New Terminal.
2. Make sure the terminal is inside the StudentPortfolio folder.
3. Run:

   npm install

This installs the MongoDB driver and creates node_modules and package-lock.json.

START MONGODB
Make sure the MongoDB service is running on your computer.
Open MongoDB Compass and connect using:

   mongodb://127.0.0.1:27017

START THE WEBSITE
In the VS Code terminal, run:

   node server.js

When the terminal says the website is running, open:

   http://localhost:3000

Keep the terminal open while using the website. Press Ctrl + C to stop the server.

HOW TO TEST
1. Open the home page.
2. Click Get Started and register with your name, email and password.
3. Log in using the same email and password.
4. Add your course and About Me information, then save the profile.
5. Add skills, achievements and projects.
6. Use Edit and Delete to test the CRUD functions.
7. Click Logout.
8. Open MongoDB Compass and refresh the database.

MONGODB DATABASE
Database: studentPortfolioDB
Collections:
- users
- portfolio

The database and collections are created automatically when the first user registers.

PROJECT FILES
server.js          Node.js backend and MongoDB operations
public/index.html  Home page
public/register.html Registration page
public/login.html Login page
public/dashboard.html Portfolio dashboard
public/style.css  Website design
public/script.js  Browser-side JavaScript

HOW THE PROJECT WORKS
Browser pages -> Node.js HTTP server -> MongoDB database

SECURITY / CLASSROOM PROJECT NOTE
Passwords are hashed using Node.js's built-in crypto module. Login sessions are stored in server memory, so restarting the server logs everyone out. This is a simple local classroom demonstration, not a production-ready authentication system.
