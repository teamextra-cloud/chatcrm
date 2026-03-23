# ChatCRM AI Context

ChatCRM is a lightweight multi-platform CRM chat dashboard.

Supported platforms:

- LINE Official Account
- Facebook Messenger

Agents can respond to customer messages from a single dashboard.

---

# Tech Stack

Frontend

- Next.js (App Router)
- React
- Tailwind CSS

Backend

- Supabase
- Node.js webhook handlers

Realtime

- Supabase Realtime
- Socket events

---

# System Architecture

Customer Message

Platform → Webhook → API → Supabase → Realtime → Dashboard UI

Agent Reply

Dashboard → API → Platform API → Customer

---

# Supported Platforms

LINE

- Messaging API
- Webhook events

Facebook

- Messenger Webhook
- Graph API

---

# Main UI Components

CustomersList

Shows:

- customer avatar
- name
- last message
- platform icon
- unread count

---

ChatWindow

Displays:

- message bubbles
- images
- files
- timestamps

---

MessageBubble

Handles:

- text
- images
- file preview

---

# Message Types

text

image

file

---

# Database Tables

customers

stores customer profile

messages

stores chat messages

---

# Platform Identification

customers.platform values:

line

facebook

---

# File Messages

File messages store:

file_url

file_name

file_size

---

# Realtime Updates

Dashboard subscribes to:

messages INSERT

messages UPDATE

customers UPDATE

---

# Project Goal

Build a simple multi-channel chat CRM similar to:

Chatwoot

Respond.io

ManyChat