import { Observable, from, empty } from "rxjs";
import cheerio from 'cheerio'
import axios from "axios";
import { map, expand, concatMap, tap, last } from "rxjs/operators";
import { Tweet } from "../types/tweet";
import { parseTweet } from "../parse/tweet";
import * as joi from 'joi'
import { Profile, FullProfile } from "../types/profile";
import { parseFullProfile } from "../parse/profile";

/*
  This scraping mechanism can have two directions: ascending or descending.

  Ascending specifies min_position in requests and uses the max_position from the response.
  Descending specifies max_position in requests and uses the min_position from the response.

  If no initial cursor is specified (max or min) then the default is descending.

  Both min and max are exclusive with regards to results.

  N.B. Used to use promises to get the final max and min but if 
*/

interface Options {
  /** Params to be provided in the GET request. */
  params?: { [key: string]: any }
  /** The initial value for min_position. */
  initialMin?: string
  /** The initial value for max_position. */
  initialMax?: string
}

export interface Output {
  /** The observable emitting the tweets. */
  observable: Observable<Tweet>
  /** A getter for the cursor value at the min end of the tweets. */
  getMin: () => string | null
  /** A getter for the cursor value at the max end of the tweets. */
  getMax: () => string | null
}

/** Returns an observable of tweets from the provided URL. */
export function scrapeTweets (path: string, options: Options = {}): Output {
  const { initialMin, initialMax, params = {} } = options

  // scraping in only one direction
  if (typeof initialMin !== 'undefined' && typeof initialMax !== 'undefined') {
    throw new Error('Initial cursor values must not be defined together.')
  }
  
  // don't screw up our params
  if (params && (params.min_position || params.max_position)) {
    throw new Error("Neither `min_position` or `max_position` should be set in `options.params`")
  }

  // form url from path
  if (!path.startsWith('/'))
    path = '/' + path
  /** The URL used for requests. */
  const url: string = 'http://twitter.com/i' + path

  /** Flag indicating whether the scrape is in the ascending direction. */
  const ascending: boolean = !!initialMin

  /** The beginning position of the scrape. Value is `null` when no tweets are available. */
  let startPosition: string | null = null

  /** The most recent cursor to receive a response. Value is `null` if no successful requests. */
  let endPosition: string | null = null

  /** Gets a single page of tweets with the specified cursor. */
  const nextPage$ = (cursor: string = initialMin || initialMax || '') => {
    // form params with new cursor
    const nextParams = Object.assign({}, params, 
      ascending ?
        { min_position: cursor, max_position: '' } :
        { max_position: cursor, min_position: '' }
    )

    // make the request
    const promise = axios.get(url, { params: nextParams })

    // update endPosition on successful response
    promise.then(response => {
      endPosition = (
        ascending ? 
          response.data.max_position :
          response.data.min_position
      ) || endPosition
    })

    return from(promise)
  }
  
  const observable = nextPage$().pipe(
    // set startPosition from property in first response
    tap(response => {
      startPosition = ascending ?
        response.data.min_position :
        response.data.max_position
    }),
    // keep getting the next page until end is reached
    expand(response => {
      /** The cursor to be potentially used for the next request. */
      const nextCursor = ascending ?
        response.data.max_position :
        response.data.min_position

      // has_more_items was not chosen to be used because when scraping quickly,
      // it returns false even when there are more items available

      // becomes null when no more items in timelines but remains the same in search
      // and new_latent_count of zero means that this response contains no tweets
      if (nextCursor === null || nextCursor === endPosition || response.data.new_latent_count === 0) {
        // complete observable when no more tweets available
        return empty()
      }

      // get the next page with the new cursor
      return nextPage$(nextCursor)
    }),
    // map to the html in response
    map(response => response.data.items_html),
    // map to the non-promoted tweet elements
    concatMap(html => cheerio.load(html)('.tweet:not(.promoted-tweet)').toArray()),
    // map each element to parsed tweet
    map(el => parseTweet(el))
  )

  /** Helper fn to get the return value for a cursor. */
  const out = (x: string | null) => x && !x.endsWith('--') ?
      x : null
  
  const getStartCursor = () => out(startPosition)
  const getEndCursor = () => out(endPosition)

  return ascending ? 
    { observable, getMin: getStartCursor, getMax: getEndCursor } :
    { observable, getMax: getStartCursor, getMin: getEndCursor }
}

/** Returns whether the twitter user or tweet id provided is of the valid form. */
export function validId (id: string): boolean {
  return /^[0-9]+$/.test(id)
}

/** Asserts that an object is a valid tweet. */
export function assertTweet (tweet: Tweet): void {
  const username = joi.string().regex(/^\w{1,15}$/)
  const hashtag = joi.string().regex(/^([a-z0-9_\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u00ff\u0100-\u024f\u0253-\u0254\u0256-\u0257\u0300-\u036f\u1e00-\u1eff\u0400-\u04ff\u0500-\u0527\u2de0-\u2dff\ua640-\ua69f\u0591-\u05bf\u05c1-\u05c2\u05c4-\u05c5\u05d0-\u05ea\u05f0-\u05f4\ufb12-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb40-\ufb41\ufb43-\ufb44\ufb46-\ufb4f\u0610-\u061a\u0620-\u065f\u066e-\u06d3\u06d5-\u06dc\u06de-\u06e8\u06ea-\u06ef\u06fa-\u06fc\u0750-\u077f\u08a2-\u08ac\u08e4-\u08fe\ufb50-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\u200c-\u200c\u0e01-\u0e3a\u0e40-\u0e4e\u1100-\u11ff\u3130-\u3185\ua960-\ua97f\uac00-\ud7af\ud7b0-\ud7ff\uffa1-\uffdc\u30a1-\u30fa\u30fc-\u30fe\uff66-\uff9f\uff10-\uff19\uff21-\uff3a\uff41-\uff5a\u3041-\u3096\u3099-\u309e\u3400-\u4dbf\u4e00-\u9fff\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2f800-\u2fa1f]*[a-z_\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u00ff\u0100-\u024f\u0253-\u0254\u0256-\u0257\u0300-\u036f\u1e00-\u1eff\u0400-\u04ff\u0500-\u0527\u2de0-\u2dff\ua640-\ua69f\u0591-\u05bf\u05c1-\u05c2\u05c4-\u05c5\u05d0-\u05ea\u05f0-\u05f4\ufb12-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb40-\ufb41\ufb43-\ufb44\ufb46-\ufb4f\u0610-\u061a\u0620-\u065f\u066e-\u06d3\u06d5-\u06dc\u06de-\u06e8\u06ea-\u06ef\u06fa-\u06fc\u0750-\u077f\u08a2-\u08ac\u08e4-\u08fe\ufb50-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\u200c-\u200c\u0e01-\u0e3a\u0e40-\u0e4e\u1100-\u11ff\u3130-\u3185\ua960-\ua97f\uac00-\ud7af\ud7b0-\ud7ff\uffa1-\uffdc\u30a1-\u30fa\u30fc-\u30fe\uff66-\uff9f\uff10-\uff19\uff21-\uff3a\uff41-\uff5a\u3041-\u3096\u3099-\u309e\u3400-\u4dbf\u4e00-\u9fff\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2f800-\u2fa1f][a-z0-9_\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u00ff\u0100-\u024f\u0253-\u0254\u0256-\u0257\u0300-\u036f\u1e00-\u1eff\u0400-\u04ff\u0500-\u0527\u2de0-\u2dff\ua640-\ua69f\u0591-\u05bf\u05c1-\u05c2\u05c4-\u05c5\u05d0-\u05ea\u05f0-\u05f4\ufb12-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb40-\ufb41\ufb43-\ufb44\ufb46-\ufb4f\u0610-\u061a\u0620-\u065f\u066e-\u06d3\u06d5-\u06dc\u06de-\u06e8\u06ea-\u06ef\u06fa-\u06fc\u0750-\u077f\u08a2-\u08ac\u08e4-\u08fe\ufb50-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\u200c-\u200c\u0e01-\u0e3a\u0e40-\u0e4e\u1100-\u11ff\u3130-\u3185\ua960-\ua97f\uac00-\ud7af\ud7b0-\ud7ff\uffa1-\uffdc\u30a1-\u30fa\u30fc-\u30fe\uff66-\uff9f\uff10-\uff19\uff21-\uff3a\uff41-\uff5a\u3041-\u3096\u3099-\u309e\u3400-\u4dbf\u4e00-\u9fff\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2f800-\u2fa1f]*)$/)
  const cashtag = joi.string().max(6).regex(/^([a-zA-Z]+[a-zA-Z_]*)?[a-zA-Z]+$/)
  const id = joi.string().regex(/^[0-9]+$/)
  // timestamp between 21/03/2006 (first tweet) and current time
  const stat = joi.number().positive().integer().allow(0)

  joi.assert(tweet, {
    tweetId:    id,
    userId:     id,
    username:   username,
    timestamp:  joi.date().min(1142899200000).max('now'),
    content: {
      text: joi.string().allow(''),
      urls: joi.array().items(joi.string().uri()).sparse(),
      hashtags: joi.array().items(hashtag).sparse(),
      cashtags: joi.array().items(cashtag).sparse(),
      usernames: joi.array().items(username).length(tweet.content.userIds.length),
      userIds: joi.array().items(id).length(tweet.content.usernames.length)
    },
    conversationId: id.optional(),
    mentionedTweet: id.optional(),
    html: joi.string(),
    lastUpdated: joi.date(),
    stats: {
      replyCount: stat,
      retweetCount: stat,
      likeCount: stat
    }
  })
}

export function assertProfile (profile: Profile): void {
  const username = joi.string().regex(/^\w{1,15}$/)
  const hashtag = joi.string().regex(/^([a-z0-9_\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u00ff\u0100-\u024f\u0253-\u0254\u0256-\u0257\u0300-\u036f\u1e00-\u1eff\u0400-\u04ff\u0500-\u0527\u2de0-\u2dff\ua640-\ua69f\u0591-\u05bf\u05c1-\u05c2\u05c4-\u05c5\u05d0-\u05ea\u05f0-\u05f4\ufb12-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb40-\ufb41\ufb43-\ufb44\ufb46-\ufb4f\u0610-\u061a\u0620-\u065f\u066e-\u06d3\u06d5-\u06dc\u06de-\u06e8\u06ea-\u06ef\u06fa-\u06fc\u0750-\u077f\u08a2-\u08ac\u08e4-\u08fe\ufb50-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\u200c-\u200c\u0e01-\u0e3a\u0e40-\u0e4e\u1100-\u11ff\u3130-\u3185\ua960-\ua97f\uac00-\ud7af\ud7b0-\ud7ff\uffa1-\uffdc\u30a1-\u30fa\u30fc-\u30fe\uff66-\uff9f\uff10-\uff19\uff21-\uff3a\uff41-\uff5a\u3041-\u3096\u3099-\u309e\u3400-\u4dbf\u4e00-\u9fff\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2f800-\u2fa1f]*[a-z_\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u00ff\u0100-\u024f\u0253-\u0254\u0256-\u0257\u0300-\u036f\u1e00-\u1eff\u0400-\u04ff\u0500-\u0527\u2de0-\u2dff\ua640-\ua69f\u0591-\u05bf\u05c1-\u05c2\u05c4-\u05c5\u05d0-\u05ea\u05f0-\u05f4\ufb12-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb40-\ufb41\ufb43-\ufb44\ufb46-\ufb4f\u0610-\u061a\u0620-\u065f\u066e-\u06d3\u06d5-\u06dc\u06de-\u06e8\u06ea-\u06ef\u06fa-\u06fc\u0750-\u077f\u08a2-\u08ac\u08e4-\u08fe\ufb50-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\u200c-\u200c\u0e01-\u0e3a\u0e40-\u0e4e\u1100-\u11ff\u3130-\u3185\ua960-\ua97f\uac00-\ud7af\ud7b0-\ud7ff\uffa1-\uffdc\u30a1-\u30fa\u30fc-\u30fe\uff66-\uff9f\uff10-\uff19\uff21-\uff3a\uff41-\uff5a\u3041-\u3096\u3099-\u309e\u3400-\u4dbf\u4e00-\u9fff\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2f800-\u2fa1f][a-z0-9_\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u00ff\u0100-\u024f\u0253-\u0254\u0256-\u0257\u0300-\u036f\u1e00-\u1eff\u0400-\u04ff\u0500-\u0527\u2de0-\u2dff\ua640-\ua69f\u0591-\u05bf\u05c1-\u05c2\u05c4-\u05c5\u05d0-\u05ea\u05f0-\u05f4\ufb12-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb40-\ufb41\ufb43-\ufb44\ufb46-\ufb4f\u0610-\u061a\u0620-\u065f\u066e-\u06d3\u06d5-\u06dc\u06de-\u06e8\u06ea-\u06ef\u06fa-\u06fc\u0750-\u077f\u08a2-\u08ac\u08e4-\u08fe\ufb50-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\u200c-\u200c\u0e01-\u0e3a\u0e40-\u0e4e\u1100-\u11ff\u3130-\u3185\ua960-\ua97f\uac00-\ud7af\ud7b0-\ud7ff\uffa1-\uffdc\u30a1-\u30fa\u30fc-\u30fe\uff66-\uff9f\uff10-\uff19\uff21-\uff3a\uff41-\uff5a\u3041-\u3096\u3099-\u309e\u3400-\u4dbf\u4e00-\u9fff\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2f800-\u2fa1f]*)$/)
  const cashtag = joi.string().max(6).regex(/^([a-zA-Z]+[a-zA-Z_]*)?[a-zA-Z]+$/)
  const id = joi.string().regex(/^[0-9]+$/)
  // timestamp between 21/03/2006 (first tweet) and current time
  const stat = joi.number().positive().integer().allow(0)

  joi.assert(profile, {
    userId: id,
    bannerUrl: joi.string().optional().uri(),
    avatarUrl: joi.string().optional().uri(),
    name: joi.string(),
    username: joi.string(),
    isProtected: joi.boolean(),
    bio: {
      text: joi.string().allow(''),
      urls: joi.array().items(joi.string().uri()).sparse(),
      hashtags: joi.array().items(hashtag).sparse(),
      cashtags: joi.array().items(cashtag).sparse(),
      usernames: joi.array().items(username)
    },
    lastUpdated: joi.date().max('now'),
    stats: {
      tweetCount: stat,
      followingCount: stat,
      followersCount: stat
    },
    html: joi.string()
  })
}

export function assertFullProfile (profile: FullProfile) {

  const username = joi.string().regex(/^\w{1,15}$/)
  const hashtag = joi.string().regex(/^([a-z0-9_\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u00ff\u0100-\u024f\u0253-\u0254\u0256-\u0257\u0300-\u036f\u1e00-\u1eff\u0400-\u04ff\u0500-\u0527\u2de0-\u2dff\ua640-\ua69f\u0591-\u05bf\u05c1-\u05c2\u05c4-\u05c5\u05d0-\u05ea\u05f0-\u05f4\ufb12-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb40-\ufb41\ufb43-\ufb44\ufb46-\ufb4f\u0610-\u061a\u0620-\u065f\u066e-\u06d3\u06d5-\u06dc\u06de-\u06e8\u06ea-\u06ef\u06fa-\u06fc\u0750-\u077f\u08a2-\u08ac\u08e4-\u08fe\ufb50-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\u200c-\u200c\u0e01-\u0e3a\u0e40-\u0e4e\u1100-\u11ff\u3130-\u3185\ua960-\ua97f\uac00-\ud7af\ud7b0-\ud7ff\uffa1-\uffdc\u30a1-\u30fa\u30fc-\u30fe\uff66-\uff9f\uff10-\uff19\uff21-\uff3a\uff41-\uff5a\u3041-\u3096\u3099-\u309e\u3400-\u4dbf\u4e00-\u9fff\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2f800-\u2fa1f]*[a-z_\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u00ff\u0100-\u024f\u0253-\u0254\u0256-\u0257\u0300-\u036f\u1e00-\u1eff\u0400-\u04ff\u0500-\u0527\u2de0-\u2dff\ua640-\ua69f\u0591-\u05bf\u05c1-\u05c2\u05c4-\u05c5\u05d0-\u05ea\u05f0-\u05f4\ufb12-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb40-\ufb41\ufb43-\ufb44\ufb46-\ufb4f\u0610-\u061a\u0620-\u065f\u066e-\u06d3\u06d5-\u06dc\u06de-\u06e8\u06ea-\u06ef\u06fa-\u06fc\u0750-\u077f\u08a2-\u08ac\u08e4-\u08fe\ufb50-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\u200c-\u200c\u0e01-\u0e3a\u0e40-\u0e4e\u1100-\u11ff\u3130-\u3185\ua960-\ua97f\uac00-\ud7af\ud7b0-\ud7ff\uffa1-\uffdc\u30a1-\u30fa\u30fc-\u30fe\uff66-\uff9f\uff10-\uff19\uff21-\uff3a\uff41-\uff5a\u3041-\u3096\u3099-\u309e\u3400-\u4dbf\u4e00-\u9fff\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2f800-\u2fa1f][a-z0-9_\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u00ff\u0100-\u024f\u0253-\u0254\u0256-\u0257\u0300-\u036f\u1e00-\u1eff\u0400-\u04ff\u0500-\u0527\u2de0-\u2dff\ua640-\ua69f\u0591-\u05bf\u05c1-\u05c2\u05c4-\u05c5\u05d0-\u05ea\u05f0-\u05f4\ufb12-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb40-\ufb41\ufb43-\ufb44\ufb46-\ufb4f\u0610-\u061a\u0620-\u065f\u066e-\u06d3\u06d5-\u06dc\u06de-\u06e8\u06ea-\u06ef\u06fa-\u06fc\u0750-\u077f\u08a2-\u08ac\u08e4-\u08fe\ufb50-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\u200c-\u200c\u0e01-\u0e3a\u0e40-\u0e4e\u1100-\u11ff\u3130-\u3185\ua960-\ua97f\uac00-\ud7af\ud7b0-\ud7ff\uffa1-\uffdc\u30a1-\u30fa\u30fc-\u30fe\uff66-\uff9f\uff10-\uff19\uff21-\uff3a\uff41-\uff5a\u3041-\u3096\u3099-\u309e\u3400-\u4dbf\u4e00-\u9fff\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2f800-\u2fa1f]*)$/)
  const cashtag = joi.string().max(6).regex(/^([a-zA-Z]+[a-zA-Z_]*)?[a-zA-Z]+$/)
  const id = joi.string().regex(/^[0-9]+$/)
  // timestamp between 21/03/2006 (first tweet) and current time
  const stat = joi.number().positive().integer().allow(0)

  joi.assert(profile, {
    userId: id,
    bannerUrl: joi.string().optional().uri(),
    avatarUrl: joi.string().optional().uri(),
    name: joi.string(),
    username: joi.string(),
    isProtected: joi.boolean(),
    bio: {
      text: joi.string().allow(''),
      urls: joi.array().items(joi.string().uri()).sparse(),
      hashtags: joi.array().items(hashtag).sparse(),
      cashtags: joi.array().items(cashtag).sparse(),
      usernames: joi.array().items(username)
    },
    lastUpdated: joi.date().max('now'),
    stats: {
      tweetCount: stat,
      followingCount: stat,
      followersCount: stat
    },
    html: joi.string(),
    
    joinedAt: joi.date().min(1142899200000).max('now'),
    geo: joi.string().optional(),
    websiteUrl: joi.string().uri().optional(),
    color: joi.string().regex(/^#[0-9A-F]{6}$/)
  })
}