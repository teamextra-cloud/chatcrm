# ChatCRM Database Context

Database: Supabase (PostgreSQL)

---

# Table: customers

Stores messaging platform users.

columns

id
uuid
primary key

platform
text
line or facebook

platform_id
text
LINE userId or Facebook PSID

name
text
customer display name

avatar
text
profile image URL

last_message
text
last message preview

created_at
timestamp

---

# Table: messages

Stores all chat messages.

id
uuid
primary key

customer_id
uuid
references customers.id

sender
text
customer or agent

message_type
text
text, image, file

text
text
message body

file_url
text

file_name
text

file_size
integer

created_at
timestamp

---

# Relationships

customers.id
↓

messages.customer_id

One customer
Many messages