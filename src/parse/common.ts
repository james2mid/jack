import * as cheerio from 'cheerio'
import moment from 'moment'
import { minify } from 'html-minifier';

/** Returns a Date object from a string of the format "1:26 PM - 25 Sep 2016" */
export function twitterTimeToDate (text: string): Date {
  const m = moment.utc(text, 'h:m A - D MMM YYYY', true)

  if (!m.isValid()) {
    throw new Error(`Unparsable date '${text}'`)
  }

  return m.toDate()
}

export type Cheerioable = Cheerio | CheerioElement | string

/** Gets the Cheerio object from a Cheerio, CheerioElement or a string. */
export function toCheerio (cheerioable: Cheerioable, selector: string): Cheerio {

  if (typeof cheerioable === 'object') {
    if ('each' in cheerioable) {
      // its a Cheerio type
      return cheerioable.find(selector)
    }
    else if ('attribs' in cheerioable) {
      // its a CheerioElement type
      return cheerio.load(cheerioable)(selector)
    }
  }
  else if (typeof cheerioable === 'string') {
    return cheerio.load(cheerioable)(selector)
  }

  throw new Error('Failed to convert an object to `Cheerio`')
}

/** Gets the outer HTML for the first element of the Cheerio object. */
export function getOuterHTML ($cheerio: Cheerio): string {
  return minify(cheerio.load($cheerio[0]).html($cheerio))
}