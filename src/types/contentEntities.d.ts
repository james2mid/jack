export interface ContentEntities {
  /** The text of the content with placeholders. */
  text: string
  /** URLs within within the content. (:) */
  urls: string[]
  /** Hashtags used within the content. (#) */
  hashtags: string[]
  /** Cashtags used within the content. ($) */
  cashtags: string[]
  /** The usernames mentioned in the content. (@) */
  usernames: string[]
  /** The id of each user mentioned within the content. */
  userIds: string[]
}