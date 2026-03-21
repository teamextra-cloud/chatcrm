# ChatCRM Database Upgrade Plan

This document defines how the database can evolve as ChatCRM grows.

The goal is to add new CRM features without breaking the current system.

Current production tables:

customers
messages

These tables must remain compatible with existing code.

New features will be implemented using additional tables.

---

# Current Database

## customers

Stores messaging platform users.

Fields:

id
platform
platform_id
name
avatar
last_message
created_at

---

## messages

Stores chat messages.

Fields:

id
customer_id
sender
message_type
text
file_url
file_name
file_size
created_at

---

# Upgrade Strategy

Rules:

1 Do not remove existing columns.

2 Do not rename columns used in production.

3 Add new tables instead of modifying core tables.

4 Maintain compatibility with existing API routes.

---

# Phase 1 Upgrade

Goal:

Support multiple agents.

New table:

agents

fields:

id
name
email
avatar
created_at

Purpose:

Allow multiple support agents to use the dashboard.

---

# Phase 2 Upgrade

Goal:

Conversation assignment.

New table:

conversations

fields:

id
customer_id
assigned_agent_id
status
created_at
updated_at

status values:

open
pending
closed

Purpose:

Track conversation state and assignment.

---

# Phase 3 Upgrade

Goal:

Customer tagging.

New table:

tags

fields:

id
name
color

Example:

vip
lead
support

---

New table:

customer_tags

fields:

id
customer_id
tag_id

Purpose:

Attach tags to customers.

---

# Phase 4 Upgrade

Goal:

Internal notes for agents.

New table:

notes

fields:

id
customer_id
agent_id
content
created_at

Purpose:

Agents can leave notes about customers.

---

# Phase 5 Upgrade

Goal:

Automation features.

New table:

automation_rules

fields:

id
trigger_type
trigger_value
action_type
action_payload
created_at

Examples:

Trigger:

keyword

Action:

auto reply message

---

# Phase 6 Upgrade

Goal:

Broadcast messaging.

New table:

broadcasts

fields:

id
title
message
created_at

---

New table:

broadcast_recipients

fields:

id
broadcast_id
customer_id
status

status:

pending
sent
failed

---

# Phase 7 Upgrade

Goal:

Analytics.

New table:

analytics_events

fields:

id
event_type
customer_id
agent_id
metadata
created_at

Example events:

message_received
message_sent
conversation_closed

---

# Futur
