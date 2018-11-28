import { Profile, FullProfile } from "../types/profile";
import axios from "axios";
import { parseProfile, parseFullProfile } from "../parse/profile";

/*
    Normally, you'd use the typical twitter.com/${username} to get the user's profile.
    You'll find shortly that Twitter rate-limits your usage of this method and so it's not suitable for scraping.

    The profile popups which are shown when hovering over a user are part of Twitter's internal API (twitter.com/i/) and are not rate-limited.
    These do not contain all the fields of the full profile but they will do for most cases.
    The only excluded properties are the date they joined, the location, their website and the colour of their profile.
    The popup method also allows getting a user by both ID and the screen name.

    This is the difference between the `Profile` and the `FullProfile` type.
*/

/** Gets the full profile for the specified username. */
export async function scrapeFullProfile (username: string): Promise<FullProfile> {
  if (!username) {
    throw new Error('`username` must be defined.')
  }

  const response = await axios.get(`https://twitter.com/${username}`)
  const html = response.data
  return parseFullProfile(html)
}

type Options = 
  { username: string } |
  { userId: string }

/** Gets the partial profile for the specified username or user ID. */
export async function scrapeProfile (options: Options): Promise<Profile> {
  const { username, userId } = options as { username: string, userId: string }

  // ensure only one is defined
  if (!( username || userId ) || ( username && userId )) {
    throw new Error('Either `username` or `userId` must be defined but not both.')
  }

  const params = username ?
    { screen_name: username } :
    { user_id: userId }

  const response = await axios.get(`https://twitter.com/i/profiles/popup`, { params })
  const { html } = response.data
  return parseProfile(html)
}