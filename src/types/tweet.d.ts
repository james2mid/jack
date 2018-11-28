import { ContentEntities } from "./contentEntities";

export interface Tweet {
  /** Twitter's unique ID for this tweet. */
  tweetId: string
  /** The unique Twitter ID for the user posting this tweet. */
  userId: string
  /** The username of the user who posted this tweet. */
  username: string
  /** The time the tweet was posted. */
  timestamp: Date
  /** Holds tweet text and entities. */
  content: ContentEntities
  /** The id of the tweet which is the root of this conversation. */
  conversationId?: string
  /** The id of the tweet which this one is replying to. */
  mentionedTweet?: string
  /** The HTML of the scraped tweet. */
  html: string
  /** The time when the tweet's `stats` properties were last updated. */
  lastUpdated: Date
  /** An object containing values about the tweet which change with time. */
  stats: {
    /** The number of replies to this tweet. */
    replyCount: number
    /** The number of times this tweet has been retweeted. */
    retweetCount: number
    /** The number of times this tweet has been liked. */
    likeCount: number
  }
}