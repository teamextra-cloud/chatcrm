# ChatCRM System Architecture

This document explains how the ChatCRM system works end-to-end.

It helps AI assistants understand message flow, database usage, and system design.

---

# System Purpose

ChatCRM is a multi-platform chat dashboard.

Agents can reply to customers from:

LINE Official Account
Facebook Messenger

All conversations are centralized in a single dashboard.

---

# High Level Architecture

Customer
↓
Messaging Platform
↓
Webhook
↓
Backend API
↓
Supabase Database
↓
Realtime Subscription
↓
Dashboard UI

---

# Messaging Platforms

Currently supported platforms:

LINE Official Account
Facebook Messenger

Each platform sends webhook events when customers send messages.

---

# LINE Message Flow

Customer sends message
↓
LINE sends webhook to server

Endpoint:

/api/webhook/line

Webhook payload contains:

userId
message type
message content

Server processes webhook:

1 identify customer using userId
2 fetch profile from LINE API
3 create customer if not exists
4 store message in database

---

# Facebook Messenger Flow

Customer sends message
↓
Messenger sends webhook

Endpoint:

/api/webhook/facebook

Webhook payload contains:

PSID (page scoped id)
message text or attachment

Server processes webhook:

1 identify customer using PSID
2 fetch profile using Graph API
3 create customer if not exists
4 store message in database

---

# Database Layer

All messages are stored in Supabase.

Tables used:

customers
messages

Relationship:

customers.id
→ messages.customer_id

One customer can have many messages.

---

# Customer Record

Each customer represents a messaging platform user.

Fields include:

platform
platform_id
name
avatar

Example:

platform = line
platform_id = U123456789

or

platform = facebook
platform_id = 987654321

---

# Message Record

Each message is stored with:

customer_id
sender
message_type
text or file data
timestamp

Example message types:

text
image
file

---

# Agent Reply Flow

Agent sends message from dashboard

Dashboard UI
↓
API endpoint

/api/send-message

API performs:

1 save message to database
2 send message to platform API

Platform APIs used:

LINE Messaging API
Facebook Graph API

---

# Realtime Updates

Supabase realtime events are used to update the dashboard.

Subscribed events:

messages INSERT
messages UPDATE
customers UPDATE

When new message arrives:

dashboard updates automatically.

---

# Frontend Dashboard

Main components:

CustomersList
ChatWindow
MessageBubble

---

# CustomersList

Displays all conversations.

Each row shows:

customer avatar
customer name
platform icon
last message
unread indicator

---

# ChatWindow

Displays conversation with selected customer.

Supports:

text messages
image preview
file preview
timestamps

Message alignment:

customer messages → left
agent messages → right

---

# File Handling

File messages store:

file_url
file_name
file_size

UI must show:

file icon
file name
file size
download link

---

# Realtime Message Update Flow

Customer sends message
↓
Webhook saves message
↓
Supabase emits realtime event
↓
Dashboard receives event
↓
Chat UI updates instantly

---

# Platform Identification

Customer platform stored in:

customers.platform

Possible values:

line
facebook

The dashboard must display the platform icon.

---

# System Design Goals

The system should be:

simple
reliable
realtime
extensible

Future platforms may include:

Instagram
WhatsApp
Telegram

---

# Scalability Goal

The architecture should support:

multiple agents
message assignment
automation
tags
CRM features

without major database redesign.

---

# Important Implementation Rule

Never process business logic in the frontend.

All message handling must happen in backend APIs.

Frontend only displays data and sends agent replies.
