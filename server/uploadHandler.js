import { supabase } from './supabase.js'
import { v4 as uuid } from 'uuid'
import mime from 'mime-types'


/**
 * Upload buffer → Supabase Storage
 * Returns public URL
 */
export async function uploadBufferToSupabase(buffer, fileName, mimeType) {

  const ext = mime.extension(mimeType) || 'bin'

  const safeName = `${Date.now()}-${uuid()}.${ext}`

  const { error } = await supabase
    .storage
    .from('chatcrm-files')
    .upload(safeName, buffer, {
      contentType: mimeType,
      upsert: false
    })

  if (error) {
    console.error('[upload]', error)
    throw error
  }

  const { data } = supabase
    .storage
    .from('chatcrm-files')
    .getPublicUrl(safeName)

  return data.publicUrl
}