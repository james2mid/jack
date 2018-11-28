const css = require('css')
import { Cheerioable, toCheerio, twitterTimeToDate, getOuterHTML } from "./common";
import { parseBioEntities } from "./entities";
import { deleteUndefined, tryOr } from 'jtools'
import { FullProfile, Profile } from "../types/profile";

export function parseProfile (popup: Cheerioable): Profile {

  const $profile = toCheerio(popup, '.profile-card')

  const bannerUrl: string | undefined = (() => {
    const fullString = $profile.find('.ProfileCard-bg').css('background-image')

    const result = /^url\(\'(.+)\/.+\'\)$/.exec(fullString)
    if (!result)
      return undefined

    // used to just use result[1] but with older accounts returned a 404
    // 1500x500 is the largest known available size
    return result[1] + '/1500x500'
  })()
  const avatarUrl: string | undefined = (() => {
    const src = $profile.find('.ProfileCard-avatarLink > img').attr('src')
    if (!src || src.includes('default_profile')) {
      return undefined
    } else {
      // URL here looks like https://pbs.twimg.com/profile_images/[somenumbers]/[imagename]_bigger.jpg
      // but the '_bigger' actually refers to a smaller image, remove it to get the original :)

      return src.replace('_bigger', '')
    }
  })()

  const $userActions = $profile.find('.user-actions').first()
  const $stats = $profile.find('.ProfileCardStats-statValue')

  return deleteUndefined({
    bannerUrl,
    avatarUrl,

    userId: $userActions.attr('data-user-id'),
    name: $userActions.attr('data-name'),
    username: $userActions.attr('data-screen-name'),
    isProtected: $userActions.attr('data-protected') === 'true',

    bio: parseBioEntities($profile, '.bio'),

    lastUpdated: new Date(),
    stats: {
      tweetCount: parseInt($stats.get(0).attribs['data-count']),
      followingCount: parseInt($stats.get(1).attribs['data-count']),
      followersCount: parseInt($stats.get(2).attribs['data-count'])
    },
    
    html: getOuterHTML($profile)
  })
}

export function parseFullProfile (profile: Cheerioable): FullProfile {

  const $profile = toCheerio(profile, '#page-container')

  const bannerUrl: string | undefined = $profile.find('.ProfileCanopy-headerBg > img').attr('src')
  const avatarUrl: string | undefined = (() => {
    const src = $profile.find('.ProfileAvatar-image').attr('src')
    if (!src || src.includes('default_profile')) {
      return undefined
    } else {
      return src
    }
  })()

  const geo = (() => {
    const text = $profile.find('.ProfileHeaderCard-locationText').text().trim()
    return text === '' ? undefined : text
  })()
  const websiteUrl = tryOr(
    () => $profile.find('.ProfileHeaderCard-urlText > a').attr('title') || undefined
  )
  
  const styles = css.parse($profile.find('style[id^="user-style-"]')[0].children[0].data)
  const color = styles.stylesheet.rules
    .find(
      (x: any) => tryOr(
        () => x.selectors.includes('a'), false
      )
    )
  .declarations[0].value

  return deleteUndefined({
    bannerUrl,
    avatarUrl,

    userId: $profile.find('.ProfileNav').attr('data-user-id'),
    name: $profile.find('.ProfileHeaderCard-nameLink').text(),
    username: $profile.find('.ProfileHeaderCard-screennameLink > span.username > b').text(),
    isProtected: $profile.find('.ProfileHeaderCard-badges > a > .Icon--protected').length === 1,

    bio: parseBioEntities($profile, '.ProfileHeaderCard-bio'),

    lastUpdated: new Date(),
    stats: {
      tweetCount: parseInt($profile.find('.ProfileNav-item--tweets [data-count]').attr('data-count')),
      followingCount: parseInt($profile.find('.ProfileNav-item--following [data-count]').attr('data-count')),
      followersCount: parseInt($profile.find('.ProfileNav-item--followers [data-count]').attr('data-count'))
    },
    
    html: getOuterHTML($profile),

    joinedAt: twitterTimeToDate($profile.find('.ProfileHeaderCard-joinDateText').attr('title')),
    geo,
    websiteUrl,
    color
  })
}
