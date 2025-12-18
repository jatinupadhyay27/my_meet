/**
 * Generates a random meeting code (8-10 characters)
 * Uses alphanumeric characters, excluding confusing characters like 0, O, I, l
 */
export function generateMeetingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes 0, O, I, 1, l
  const length = 8 + Math.floor(Math.random() * 3); // 8-10 characters
  
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return code;
}

