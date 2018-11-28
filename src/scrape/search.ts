import { mergeMap, map, take, takeWhile, filter } from "rxjs/operators";
import { Observable } from "rxjs";
import { Tweet } from "../types/tweet";
import { parseTweet } from "../parse/tweet";
import { compareNumbers } from "jtools";

/** Gets the Tweet objects from Twitter search with the specified query as an observable. */
export function scrapeSearch$ (query: string, options?: {
  /** Specifies whether the latest tweets should be scraped or most popular. */
  latest?: boolean
  /** Limits the number of tweets (including invalid) scraped. */
  limit?: number
  /** Scrapes tweets which are older than this ID. */
  fromId?: string
  /** Scrapes tweets which are newer than this ID. Only effective when limit is true. */
  untilId?: string
  /** The max number of consecutive invalid tweets. */
  maxConsecutiveInvalidTweets?: number
  /** Function returning whether the tweet should be emitted from the observable and counted against the limit. */
  valid?: (tweet: Tweet) => boolean
  /** Callback to perform an action when an invalid tweet is found. */
  onInvalid?: (tweet: Tweet) => void
  /** Max number of retries (caught errors) before erroring (and finishing). */
  maxRetries?: number
  /** Callback to perform an action when an error is caught. Only called when `maxRetries` is positive. */
  onCaughtError?: (err: any) => void
}): Observable<Tweet> {

  const {
    latest = true,
    limit = 100000,
    fromId = undefined,
    untilId = undefined,
    maxConsecutiveInvalidTweets = 100,
    valid = undefined,
    onInvalid = () => {},
    maxRetries = 0,
    onCaughtError = () => {}
  } = options || {}

  let invalidCounter = 0

  return getPages$('https://twitter.com/i/search/timeline', {
    q: query,
    f: latest ? 'tweets' : undefined
  })
    .pipe(
      // merge all tweet elements found in html
      mergeMap(html => $getTweets(html)),
      // map each element to a parsed tweet object
      map(el => parseTweet(el)),
      // limit scraped tweets including invalid ones
      take(limit),
      // complete when scraping passes untilId (tweetId is less than untilId)
      takeWhile(tweet => !untilId ? true : compareNumbers(tweet.tweetId, untilId) < 0),
      // increment counter if invalid or reset
      filter(!valid ? () => true : tweet => {
        const isValid = valid(tweet)
        if (isValid) {
          invalidCounter = 0
        } else {
          invalidCounter++
          onInvalid(tweet)
        }
        return isValid
      }),
      // complete observable when counter reaches max
      takeWhile(() => invalidCounter < maxConsecutiveInvalidTweets)
    )
}