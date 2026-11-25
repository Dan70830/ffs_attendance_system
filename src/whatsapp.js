// Format a phone number into a clickable WhatsApp DM link (https://wa.me/...)
// Defaults local Nigerian numbers starting with '0' (e.g. 0810...) to +234.
export function getWhatsAppUrl(phone) {
  if (!phone) return null
  const digits = String(phone).replace(/\D/g, '')
  if (!digits) return null

  let normalized = digits
  if (digits.startsWith('0') && digits.length === 11) {
    normalized = `234${digits.slice(1)}`
  }

  return `https://wa.me/${normalized}`
}
