import { Cheerioable, toCheerio } from "./common";
import { FullProfile } from "../types/profile";
import { Tweet } from "../types/tweet";
import { ContentEntities } from "../types/contentEntities";

export function parseTweetEntities (parent: Cheerioable, selector: string): Tweet['content'] {
  const entities = parseEntities(parent, selector)
  return entities
}

export function parseBioEntities (parent: Cheerioable, selector: string): FullProfile['bio'] {
  const entities = parseEntities(parent, selector)
  // remove the `userIds` property
  // all mentions have userId as '0' in html so pointless
  delete entities.userIds
  return entities
}

function parseEntities(parent: Cheerioable, selector: string): ContentEntities {

  const $parent = toCheerio(parent, selector).first()

  let text: string = ""
  const urls: string[] = []
  const hashtags: string[] = []
  const cashtags: string[] = []
  const userIds: string[] = []
  const usernames: string[] = []

  // go through each element and append to each accordingly
  const elements = $parent.contents()

  elements.each((_, el) => {
    const $el: Cheerio = elements.filter(el)

    // text node, add to text
    // text is <strong> for matching query words
    if (el.type === 'text' || el.tagName === 'strong') {
      // replace existing '${' with '\${' and '\' at the end of the string with '\ '
      text += $el.text().replace('${', '\\${').replace(/\\$/, '\\ ')
    }
    else if (el.type === 'tag') {
      if (el.tagName === 'img') {
        // emojis are embedded as imgs
        // twitter keeps the emoji character in the alt attribute
        if ($el.hasClass('Emoji')) {
          text += $el.attr('alt')
        }
      }
      else if (el.tagName === 'a') {
        // #hashtag (converted to lowercase)
        if ($el.hasClass('twitter-hashtag')) {
          const tag = $el.text().slice(1).toLowerCase()
          text += '${#' + hashtags.length + '}' // add to text with hashtag
          hashtags.push(tag) // add name to hashtags
        }
        // @handle (converted to lowercase)
        else if ($el.hasClass('twitter-atreply')) {
          const userId = $el.attr('data-mentioned-user-id')
          const username = $el.text().slice(1)
          text += '${@' + userIds.length + '}'
          userIds.push(userId)
          usernames.push(username)
        }
        // $cashtag (converted to uppercase)
        else if ($el.hasClass('twitter-cashtag')) {
          const symbol = $el.text().slice(1).toUpperCase()
          text += '${$' + cashtags.length + '}'
          cashtags.push(symbol)
        }
        // any url shown in the text, hidden URL are confusing
        // TODO: and corresponding objects are to be parsed from cards
        else if ($el.hasClass('twitter-timeline-link') && !$el.hasClass('u-hidden')) {
          text += '${:' + urls.length + '}'
          urls.push($el.attr('data-expanded-url'))
        }
      }
    }
  })

  return { text, urls, cashtags, hashtags, userIds, usernames }
}
