import cheerio from 'cheerio'
import { parseTweetEntities } from './entities';
import { toCheerio, Cheerioable } from './common';
import { minify } from 'html-minifier'
import { Tweet } from '../types/tweet';

/** Parses the first tweet found using the selector on the provided cheerioable. */
export function parseTweet (tweet: Cheerioable, selector: string = '.tweet'): Tweet {
  
  const $tweet = toCheerio(tweet, selector).first()

  if ($tweet.length === 0) {
    throw new Error('No tweet found in `tweet` paremeter')
  }

  const tweetId: string  = $tweet.attr('data-tweet-id')
  const userId: string = $tweet.attr('data-user-id')
  const username: string = $tweet.attr('data-screen-name')
  
  const timestamp: Date = (() => {
    const msEpoch = $tweet.find('span._timestamp').attr('data-time-ms')
    return new Date(parseInt(msEpoch))
  })()

  const mentionedTweet: string | undefined = (() => {
    const $quotedTweet = $tweet.find('.QuoteTweet-link')
    if ($quotedTweet.length > 0) {
      // get tweet id of quoted tweet
      return $quotedTweet.attr('data-conversation-id')
    } else {
      return undefined
    }
  })()

  const content = parseTweetEntities($tweet, '.tweet-text')

  const html: string = minify(cheerio.load($tweet[0]).html($tweet))

  const lastUpdated = new Date()

  const stats = {
    replyCount: parseInt($tweet.find('.ProfileTweet-action--reply [data-tweet-stat-count]').attr('data-tweet-stat-count')),
    retweetCount: parseInt($tweet.find('.ProfileTweet-action--retweet [data-tweet-stat-count]').attr('data-tweet-stat-count')),
    likeCount: parseInt($tweet.find('.ProfileTweet-action--favorite [data-tweet-stat-count]').attr('data-tweet-stat-count')),
  }

  return { tweetId, userId, username, timestamp, mentionedTweet, content, html, lastUpdated, stats }
}
