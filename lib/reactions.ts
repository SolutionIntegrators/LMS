// Fixed reaction palette for community threads/replies — kept in sync with
// the check constraint on community_reactions.emoji (0015_community_reactions_profile.sql).
export const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '🤔', '👀'] as const
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number]

export interface ReactionSummary {
  emoji: string
  count: number
  reactedByMe: boolean
}
