/**
 * LINE Messaging API webhook handler
 * Production-safe file handling
 */

import crypto from "crypto"
import axios from "axios"
import mime from "mime-types"

import { supabase } from "./supabase.js"
import { getIO } from "./socket.js"
import { uploadBufferToSupabase } from "./uploadHandler.js"

const LINE_CONTENT_API = "https://api-data.line.me/v2/bot/message"
const LINE_PROFILE_API = "https://api.line.me/v2/bot/profile"

const PLATFORM = "line"



/**
 * Verify LINE signature
 */
function verifySignature(bodyRaw, signature, secret) {

  if (!secret) return true

  const hash = crypto
    .createHmac("sha256", secret)
    .update(bodyRaw)
    .digest("base64")

  return hash === signature

}



/**
 * Fetch LINE user profile
 */
async function getLineProfile(userId, token) {

  try {

    const res = await axios.get(
      `${LINE_PROFILE_API}/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    return {
      name: res.data.displayName,
      avatar: res.data.pictureUrl
    }

  }
  catch (err) {

    console.log("LINE profile error:", err.message)

    return {
      name: `LINE ${userId.slice(0,6)}`,
      avatar: null
    }

  }

}



/**
 * Download media from LINE
 */
async function downloadLineMedia(messageId, accessToken) {

  const url = `${LINE_CONTENT_API}/${messageId}/content`

  const res = await axios.get(url, {
    responseType: "arraybuffer",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })

  const buffer = Buffer.from(res.data)

  const mimeType = res.headers["content-type"]

  const ext = mime.extension(mimeType) || "bin"

  return {
    buffer,
    mimeType,
    ext,
    size: buffer.length
  }

}



/**
 * Process LINE event
 */
async function processLineEvent(event, accessToken) {

  if (event.type !== "message") return

  const message = event.message
  const userId = event.source?.userId

  if (!userId) return



  /**
   * get LINE profile
   */

  const profile =
    await getLineProfile(userId, accessToken)



  /**
   * upsert customer
   */

  const { data: customer } =
    await supabase
      .from("customers")
      .upsert({

        platform: PLATFORM,
        platform_id: userId,
        name: profile.name,
        avatar: profile.avatar,
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
   * TEXT MESSAGE
   */

  if (message.type === "text") {

    content = message.text
    messageType = "text"

  }



  /**
   * IMAGE / VIDEO / FILE
   */

  else {

    const media =
      await downloadLineMedia(
        message.id,
        accessToken
      )

    /**
     * ORIGINAL filename from LINE
     */
    const originalName =
      message.fileName ||
      `line-${message.id}.${media.ext}`

    /**
     * filesize from LINE
     * fallback → downloaded buffer size
     */
    const size =
      typeof message.fileSize === "number"
        ? message.fileSize
        : media.size


    /**
     * Upload to Supabase
     */
    const publicUrl =
      await uploadBufferToSupabase(
        media.buffer,
        originalName,
        media.mimeType
      )


    fileUrl = publicUrl
    fileSize = size
    content = originalName


    /**
     * Detect message type
     */
    if (message.type === "image")
      messageType = "image"

    else if (message.type === "video")
      messageType = "video"

    else
      messageType = "file"


    /**
     * Debug (useful for troubleshooting)
     */
    console.log("LINE FILE RECEIVED")
    console.log("name:", originalName)
    console.log("size:", size)
    console.log("mime:", media.mimeType)

  }



  /**
   * Insert message
   */

  const { data: msg } =
    await supabase
      .from("messages")
      .insert({

        customer_id: customer.id,
        sender_type: "customer",
        message_type: messageType,
        content,
        file_url: fileUrl,
        file_size: fileSize

      })
      .select()
      .single()



  /**
   * update last message
   */

  await supabase
    .from("customers")
    .update({

      last_message: content,
      last_message_at: new Date().toISOString(),

      /**
       * increment unread counter
       * (null / undefined → 0)
       */
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
 * LINE webhook entry
 */
export async function handleLineWebhook(req, res) {

  const signature =
    req.headers["x-line-signature"]

  const secret =
    process.env.LINE_CHANNEL_SECRET



  if (
    secret &&
    !verifySignature(
      req.rawBody || "",
      signature,
      secret
    )
  ) {

    return res.status(401).send("Invalid signature")

  }



  const events = req.body.events || []

  const accessToken =
    process.env.LINE_CHANNEL_ACCESS_TOKEN



  for (const event of events) {

    try {

      await processLineEvent(
        event,
        accessToken
      )

    }
    catch (err) {

      console.error("LINE event error:", err)

    }

  }



  res.status(200).send("OK")

}