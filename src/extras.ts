import axios from 'axios'
import cheerio from 'cheerio'

/** Gets the screenname of the user who has the provided id. */
export async function getScreenName (userId: string): Promise<string> {
  const response = await axios.get('https://twitter.com/intent/user', { params: { user_id: userId }, responseType: 'text' })
  const $ = cheerio.load(response.data)
  const screenName = $('span.nickname').text().slice(1) // remove the '@'
  return screenName
}

/** Gets the id of the user who has the provided screenname. */
export async function getUserId (screenName: string): Promise<string> {
  const response = await axios.get('https://twitter.com/' + screenName, { responseType: 'text' })
  const $ = cheerio.load(response.data)
  const id = $('div.ProfileNav').attr('data-user-id')
  return id
}
