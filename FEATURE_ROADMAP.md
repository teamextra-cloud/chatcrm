# ChatCRM Feature Roadmap

This document defines the development roadmap for ChatCRM.

The goal is to evolve ChatCRM from a simple chat dashboard into a scalable SaaS CRM platform.

---

# Current Stage

ChatCRM v1

Supported platforms:

LINE Official Account
Facebook Messenger

Core functionality:

Unified inbox for customer conversations.

---

# Version 1 (MVP)

Goal:

Build a working multi-platform chat dashboard.

Features:

Customer List
Display customers from LINE and Facebook.

Chat Window
View conversation history.

Send Messages
Agents can reply to customers.

Message Types

text
image
file

Realtime Updates

New messages appear instantly using Supabase realtime.

Customer Profile

Display:

name
avatar
platform icon

File Support

Preview file messages
Display file name and size.

---

# Version 1.5

Goal:

Improve usability and stability.

Features:

Unread Message Indicator

Show unread count per customer.

Message Status

sent
delivered
read

Message Timestamp Formatting

Human readable time.

Search Conversations

Search by:

customer name
last message

Customer Sorting

Sort by latest message.

Basic Error Handling

Handle API failures gracefully.

---

# Version 2

Goal:

Support multiple agents and team collaboration.

Features:

Multi-Agent Support

Multiple agents can log in.

Conversation Assignment

Assign conversation to agent.

Agent Presence

Show which agent is replying.

Internal Notes

Agents can leave notes on customers.

Conversation Status

open
pending
closed

---

# Version 2.5

Goal:

Improve CRM capabilities.

Features:

Customer Tags

Examples:

vip
lead
support

Customer Profile Panel

Show:

name
platform
conversation history
tags

Conversation Filters

Filter by:

tag
agent
status

---

# Version 3

Goal:

Add marketing and automation features.

Features:

Broadcast Messages

Send messages to multiple customers.

Automation Rules

Example:

Auto reply when customer sends message.

Keyword Triggers

Example:

"price" → send product info.

Welcome Messages

Auto message when new user follows.

---

# Version 3.5

Goal:

Analytics and reporting.

Features:

Message Volume Analytics

Daily message counts.

Agent Performance

Response time
messages handled.

Customer Activity Tracking

Last active time.

Conversation Metrics

Open vs closed.

---

# Version 4

Goal:

Expand platform integrations.

New Platforms

Instagram
WhatsApp
Telegram

Unified Platform API

All platforms use a common message interface.

---

# Version 5

Goal:

Full SaaS CRM platform.

Features:

User Accounts

Organizations

Team Management

Billing System

Subscription Plans

Example:

Starter
Pro
Enterprise

---

# Long-Term Vision

ChatCRM becomes a lightweight alternative to:

Chatwoot
Respond.io
ManyChat

Focused on:

simplicity
speed
automation

---

# Development Principles

Build features incrementally.

Avoid overengineering.

Always maintain realtime messaging performance.

Never break existing message history.

---

# Immediate Priority

Focus on completing
