/**
 * Facebook Messenger webhook handler
 *
 * Follows same architecture as LINE:
 * - Upsert customer in Supabase
 * - Insert message into messages table
 * - Upload media to Supabase Storage
 * - Emit Socket.io events (new_message, customer_list_update)
 */

import axios from "axios"

import { supabase } from "./supabase.js"
import { getIO } from "./socket.js"
import { uploadBufferToSupabase } from "./uploadHandler.js"

const PLATFORM = "facebook"

/**
 * Simple in-memory dedupe for webhook retries / duplicates.
 * (DB-level dedupe is attempted first when schema supports it.)
 */
const seenMessageMids = new Map() // mid -> timestamp
const DEDUPE_TTL_MS = 24 * 60 * 60 * 1000
const DEDUPE_MAX_SIZE = 10_000

function rememberMid(mid) {
  const now = Date.now()
  seenMessageMids.set(mid, now)

  // opportunistic cleanup
  if (seenMessageMids.size > DEDUPE_MAX_SIZE) {
    for (const [k, ts] of seenMessageMids) {
      if (now - ts > DEDUPE_TTL_MS) seenMessageMids.delete(k)
      if (seenMessageMids.size <= DEDUPE_MAX_SIZE) break
    }
  }
}

function hasSeenMid(mid) {
  const ts = seenMessageMids.get(mid)
  if (!ts) return false
  if (Date.now() - ts > DEDUPE_TTL_MS) {
    seenMessageMids.delete(mid)
    return false
  }
  return true
}

async function findMessageByMid(mid) {
  if (!mid) return false

  /**
   * DB dedupe (preferred): messages.platform_message_id (recommended column)
   * If the column doesn't exist yet, Supabase will return an error; we fall back to memory dedupe.
   */
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("id")
      .eq("platform_message_id", mid)
      .limit(1)

    if (error) throw error
    return Array.isArray(data) && data.length > 0
  } catch (_err) {
    return hasSeenMid(mid)
  }
}


/**
 * Fetch Facebook profile (name + avatar)
 */
async function getFacebookProfile(psid, pageAccessToken) {

  if (!pageAccessToken) {
    // No token → we cannot call Graph API
    // Signal "no data" so we don't overwrite existing real profile
    return {
      name: null,
      avatar: null
    }
  }

  const url =
    `https://graph.facebook.com/${psid}` +
    `?fields=name,profile_pic&access_token=${encodeURIComponent(pageAccessToken)}`

  try {

    const res = await axios.get(url)
    console.log("FB PROFILE RESPONSE:", res.data)
    // Return raw values (or null) so caller can decide how to merge
    return {
      name: res.data?.name || null,
      avatar: res.data?.profile_pic || null
    }

  }
  catch (err) {

    console.log("[facebook] profile error:", err.message)

    // On error, signal "no data" rather than a fake name
    return {
      name: null,
      avatar: null
    }

  }

}


/**
 * Download attachment from Facebook CDN and upload to Supabase
 */
async function downloadAndUploadAttachment(attachment) {

  if (!attachment?.payload?.url) return {
    fileUrl: null,
    fileSize: null,
    fileName: null,
    mimeType: null
  }

  const url = attachment.payload.url

  const res = await axios.get(url, {
    responseType: "arraybuffer"
  })

  const buffer = Buffer.from(res.data)

  const mimeType =
    res.headers["content-type"] || "application/octet-stream"

  const contentLength =
    Number(res.headers["content-length"]) || buffer.length

  const originalName =
    attachment.payload.name ||
    `fb-${attachment.type}-${Date.now()}`

  const publicUrl =
    await uploadBufferToSupabase(
      buffer,
      originalName,
      mimeType
    )

  return {
    fileUrl: publicUrl,
    fileSize: contentLength,
    fileName: originalName,
    mimeType
  }

}


/**
 * Map Messenger attachment type → messages.message_type
 */
function mapAttachmentType(type) {

  if (type === "image") return "image"
  if (type === "video") return "video"

  // audio + generic → file
  return "file"

}


/**
 * Process single Facebook messaging event
 */
async function processFacebookMessage(senderId, message, pageAccessToken, messageMid) {

  if (!message) return


  /**
   * load existing customer (if any)
   * so we don't overwrite real profile with placeholders
   */
  const { data: existingCustomer } =
    await supabase
      .from("customers")
      .select("*")
      .eq("platform", PLATFORM)
      .eq("platform_id", senderId)
      .maybeSingle()


  /**
   * get latest profile from Facebook
   */
  const profile =
    await getFacebookProfile(
      senderId,
      pageAccessToken
    )


  /**
   * upsert customer
   */

  const fallbackName =
    existingCustomer?.name ||
    `Facebook ${senderId.slice(0, 8)}`

  const upsertName =
    profile.name ||
    fallbackName

  const upsertAvatar =
    profile.avatar ||
    existingCustomer?.avatar ||
    null

  const { data: customer } =
    await supabase
      .from("customers")
      .upsert({

        platform: PLATFORM,
        platform_id: senderId,
        // Always try to keep the best-known profile data:
        // - Prefer fresh Graph API data
        // - Fall back to existing customer record
        // - Finally fall back to "Facebook 12345678" style label
        name: upsertName,
        avatar: upsertAvatar,
        last_message_at: new Date().toISOString()

      },
      {
        onConflict: "platform,platform_id"
      })
      .select()
      .single()


  let content = ""
  let fileUrl = null
  let fileSize = null
  let messageType = "text"


  /**
   * TEXT
   */
  if (message.text) {

    content = message.text
    messageType = "text"

  }

  /**
   * ATTACHMENTS (image / video / file)
   */
  else if (
    Array.isArray(message.attachments) &&
    message.attachments.length > 0
  ) {

    const att = message.attachments[0]

    const uploaded =
      await downloadAndUploadAttachment(att)

    fileUrl = uploaded.fileUrl
    fileSize = uploaded.fileSize
    content =
      uploaded.fileName ||
      att.payload?.name ||
      att.type ||
      "Attachment"

    messageType =
      mapAttachmentType(att.type)

    console.log("[facebook] file received", {
      name: uploaded.fileName,
      size: uploaded.fileSize,
      type: att.type
    })

  }


  /**
   * Insert message
   */

  const { data: msg } =
    await (async () => {
      const payload = {
        customer_id: customer.id,
        sender_type: "customer",
        message_type: messageType,
        content,
        file_url: fileUrl,
        file_size: fileSize,
        // recommended for dedupe (schema may or may not include this column)
        platform_message_id: messageMid || null
      }

      const first = await supabase
        .from("messages")
        .insert(payload)
        .select()
        .single()

      if (!first.error) return first

      // If DB doesn't support platform_message_id yet, retry without it.
      const msg = (first.error?.message || "").toLowerCase()
      if (msg.includes("platform_message_id")) {
        const { platform_message_id: _drop, ...fallbackPayload } = payload
        return await supabase
          .from("messages")
          .insert(fallbackPayload)
          .select()
          .single()
      }

      return first
    })()


  /**
   * update last message + unread counter
   */

  await supabase
    .from("customers")
    .update({

      last_message: content,
      last_message_at: new Date().toISOString(),
      unread_count:
        (customer.unread_count || 0) + 1

    })
    .eq("id", customer.id)


  /**
   * realtime socket
   */

  getIO().emit("new_message", {
    message: msg,
    customer
  })

  getIO().emit("customer_list_update", {})

}


/**
 * GET: webhook verification
 */
export function handleFacebookVerify(req, res) {

  const mode = req.query["hub.mode"]
  const token = req.query["hub.verify_token"]
  const challenge = req.query["hub.challenge"]

  const verifyToken =
    process.env.FACEBOOK_VERIFY_TOKEN

  if (
    mode === "subscribe" &&
    token === verifyToken
  ) {

    return res.status(200).send(challenge)

  }

  res.status(403).send("Forbidden")

}


/**
 * POST: incoming Facebook events
 */
export async function handleFacebookWebhook(req, res) {

  const body = req.body

  if (body.object !== "page") {
    return res.status(200).send("OK")
  }

  const pageAccessToken =
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN

  for (const entry of body.entry || []) {

    for (const event of entry.messaging || []) {

      console.log("EVENT TYPE:", Object.keys(event))

      const senderId = event.sender?.id

      if (!senderId) continue

      // ONLY process actual text messages (ignore delivery/read/postback/etc)
      if (event.message && event.message.text) {

        const messageId = event.message.mid
        const exists = await findMessageByMid(messageId)
        if (exists) continue
        if (messageId) rememberMid(messageId)

        try {

          await processFacebookMessage(
            senderId,
            event.message,
            pageAccessToken,
            messageId
          )

        }
        catch (err) {

          console.error("[facebook] message error:", err)

        }

      }

    }

  }

  res.status(200).send("OK")

}
