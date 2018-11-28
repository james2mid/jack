import axios from "axios";
import { Tweet } from "../types/tweet";
import { validId } from "./common";
import { parseTweet } from "../parse/tweet";

/** Scrapes a single tweet by its id. */
export async function getTweet (tweetId: string): Promise<Tweet> {
  if (!validId(tweetId)) {
    throw new Error(`This tweet id is not a valid one: '${tweetId}'`)
  }

  const url = `https://twitter.com/i/web/status/${tweetId}`

  const response = await axios.get(url)
  const html = response.data
  return parseTweet(html, '.permalink-tweet')
}