# ChatCRM API Context

The backend receives webhooks from messaging platforms.

---

# LINE Webhook

Endpoint

/api/webhook/line

Events handled:

message

follow

unfollow

Message types supported:

text

image

file

---

When message received:

1 receive webhook
2 find customer by platform_id
3 create customer if not exists
4 store message in database

---

# Facebook Messenger Webhook

Endpoint

/api/webhook/facebook

Events handled:

messages

messaging_postbacks

User info fetched using Graph API.

Fields used:

name

profile_pic

---

# Agent Reply API

Endpoint

/api/send-message

Payload

customer_id

platform

text

file

---

Process

1 save message in database
2 send message to platform API