const EMOJI = /\p{Extended_Pictographic}|\p{Emoji_Presentation}/u

export function containsEmoji(value) {
  return EMOJI.test(String(value ?? ''))
}
