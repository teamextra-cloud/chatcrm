/**
 * Socket.io client for realtime updates
 * Events:
 * new_message
 * agent_reply
 * customer_list_update
 */

import { io } from "socket.io-client"

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  "http://localhost:4000"

let socket = null


/**
 * GET SOCKET INSTANCE
 */
export function getSocket() {

  if (typeof window === "undefined") return null

  if (!socket) {

    socket = io(SOCKET_URL, {

      // IMPORTANT
      path: "/socket.io",

      transports: ["websocket"],

      autoConnect: true

    })

    /**
     * DEBUG LOGS
     */

    socket.on("connect", () => {
      console.log("🟢 socket connected", socket.id)
    })

    socket.on("disconnect", () => {
      console.log("🔴 socket disconnected")
    })

  }

  return socket
}


/**
 * SUBSCRIBE new_message
 */
export function onNewMessage(cb) {

  const s = getSocket()

  if (s) s.on("new_message", cb)

  return () => s?.off("new_message", cb)

}


/**
 * SUBSCRIBE agent_reply
 */
export function onAgentReply(cb) {

  const s = getSocket()

  if (s) s.on("agent_reply", cb)

  return () => s?.off("agent_reply", cb)

}


/**
 * SUBSCRIBE customer_list_update
 */
export function onCustomerListUpdate(cb) {

  const s = getSocket()

  if (s) s.on("customer_list_update", cb)

  return () => s?.off("customer_list_update", cb)

}


/**
 * SUBSCRIBE customer_typing (for typing indicator)
 */
export function onCustomerTyping(cb) {

  const s = getSocket()

  if (s) s.on("customer_typing", cb)

  return () => s?.off("customer_typing", cb)

}