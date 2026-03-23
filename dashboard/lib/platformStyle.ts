export function getPlatformStyle(platform?: string) {
  switch (platform) {
    case 'line':
      return {
        bg: 'bg-green-50',
        text: 'text-green-600',
        badge: 'bg-green-100 text-green-700',
      };
    case 'facebook':
    case 'messenger':
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-600',
        badge: 'bg-blue-100 text-blue-700',
      };
    case 'whatsapp':
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        badge: 'bg-emerald-100 text-emerald-800',
      };
    default:
      return {
        bg: 'bg-gray-50',
        text: 'text-gray-600',
        badge: 'bg-gray-100 text-gray-700',
      };
  }
}

