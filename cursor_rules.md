# Cursor AI Rules for ChatCRM

These rules guide AI assistants (Cursor AI, Copilot, GPT) when generating or modifying code in this project.

The goal is to ensure code is safe, consistent, and production-ready.

---

# General Rules

1. Always output FULL copy-paste ready code files.

Do not output partial snippets unless explicitly asked.

2. Never remove existing functionality unless instructed.

3. When modifying code, preserve all current features.

4. If adding a feature, extend existing code rather than rewriting.

---

# Project Stack

Frontend

* Next.js (App Router)
* React
* Tailwind CSS

Backend

* Supabase
* Node.js API routes

Realtime

* Supabase Realtime
* Socket events

---

# Code Style

Use:

* React functional components
* async / await
* modern JavaScript (ES6+)

Avoid:

* callbacks
* class components

---

# Component Structure

Components must be modular and small.

Example components:

CustomersList
ChatWindow
MessageBubble
FileMessage
ImageMessage

Each component should handle one responsibility.

---

# Database Safety Rules

The database schema must NOT be changed automatically.

Tables currently used:

customers
messages

Do not:

* drop columns
* rename columns
* change relationships

unless explicitly requested.

---

# Customer Platform

customers.platform values:

line
facebook

The UI must display a platform icon for each customer.

---

# Messages

messages.sender values:

customer
agent

messages.message_type values:

text
image
file

---

# File Messages

File messages must support:

file_name
file_size
file_url

The UI must display:

file icon
file name
file size
download link

---

# Chat UI Rules

ChatWindow must support:

text messages
image preview
file preview
timestamps

Agent messages appear on the right.

Customer messages appear on the left.

---

# Customer List UI

CustomersList must display:

avatar
name
platform icon
last message
unread indicator

---

# Realtime Updates

The dashboard must update automatically when:

new message inserted
message updated
customer updated

Use Supabase realtime events.

---

# API Rules

All API routes must:

validate input
handle errors
return JSON

---

# Error Handling

Always wrap async operations with try/catch.

Example:

try {
// operation
} catch (error) {
console.error(error)
}

---

# Performance

Avoid unnecessary re-renders.

Use:

useEffect
useMemo
useCallback

when appropriate.

---

# Code Quality

Avoid large files.

Recommended:

max 300–400 lines per file.

Split logic into smaller components or utilities.

---

# When Generating New Features

AI must:

1 analyze existing code
2 follow project structure
3 avoid breaking current features
4 maintain compatibility with LINE and Facebook

---

# Important

This project is a SaaS CRM dashboard.

Code must be:

clean
maintainable
scalable
