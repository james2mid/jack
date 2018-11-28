import { ContentEntities } from "./contentEntities";

type Without<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
type BioEntities = Without<ContentEntities, 'userIds'>

/** The full profile scraped from `twitter.com/username`. */
export interface FullProfile extends Profile {
  /** The date which the user created their twitter account. */
  joinedAt: Date
  /** The location text chosen by the user to be shown on their profile. */
  geo?: string,
  /** The URL of the website chosen by the user to be visible on their profile. */
  websiteUrl?: string,
  /** The colour (as hex with '#') chosen by the user to be used on their profile page. */
  color: string
}

/** The partial profile scraped from `twitter.com/i/profiles/popup`. */
export interface Profile {
  /** Twitter's unique ID for this user. */
  userId: string
  /** The URL which links to the user's banner image. */
  bannerUrl?: string
  /** The URL which links to the user's avatar image. */
  avatarUrl?: string
  /** The full name of the user. */
  name: string
  /** The Twitter handle or screen name. */
  username: string,
  /** Whether the user has opted to make their tweets visible to only those which have a mutual following. */
  isProtected: boolean,
  /** Holds the text and entities within a user's bio. */
  bio: BioEntities,
  /** The time when this user's properties were last updated. */
  lastUpdated: Date,
  /** Properties of a user which change often. */
  stats: {
    /** The number of tweets the user has posted. */
    tweetCount: number,
    /** The number of users this account is following. */
    followingCount: number,
    /** The number of accounts following this user. */
    followersCount: number
  },
  /** The HTML which was parsed to generate this profile object. */
  html: string
}