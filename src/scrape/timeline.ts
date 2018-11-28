import { Observable } from "rxjs";
import { scrapeTweets, validId } from "./common";
import { Tweet } from "../types/tweet";

interface Options {
  after?: string
  before?: string
}

/** Gets the Tweet objects from the specified user's timeline as an observable. */
export function scrapeTimeline$ (username: string, options: Options = {}): Observable<Tweet> {
  // min and max position are just the tweet ids for the timelines
  if (options.after && !validId(options.after)) {
    throw new Error(`Invalid tweet id for after: '${options.after}'`)
  } else if (options.before && !validId(options.before)) {
    throw new Error(`Invalid tweet id for before: '${options.before}'`)
  }

  return scrapeTweets(`/profiles/show/${username}/timeline/tweets`)
}