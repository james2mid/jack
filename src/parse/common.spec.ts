import { twitterTimeToDate, toCheerio } from "./common";
import cheerio from 'cheerio'

describe('twitterTimeToDate', () => {
  it('throws for an unparsable date', () => {
    [
      '',
      'hello',
      '111:26 PM - 25 Sep 2016',
      '1:26 PM - 25 Sepp 2016',
      '1:26 M - 25 Sep 2016',
      '1:26 PM - 34 Sep 2016',
      '42:26 PM - 25 Sep 2016',
      '1:26 PM - 25 Sep 201'
    ].forEach(x => {
      expect(() => twitterTimeToDate(x)).toThrow()
    })
  })

  it('returns the valid date', () => {
    (<[string, Date][]> [
      ['1:26 PM - 25 Sep 2016', new Date('2016-09-25T13:26Z')],
      ['4:51 AM - 17 Feb 2018', new Date('2018-02-17T04:51Z')],
      ['8:28 PM - 08 Jun 2019', new Date('2019-06-08T20:28Z')]
    ]).forEach(([input, expected]) => {
      expect(twitterTimeToDate(input)).toEqual(expected)
    })
  })
})

describe('toCheerio', () => {
  let tests: any[]

  beforeAll(() => {
    tests = [
      cheerio.load('<a class="test">Hi</a>').root(),
      cheerio.load('<a class="test">Hi</a>').root().children()[0],
      '<a class="test">Hi</a>'
    ]
  })

  it('accepts all of Cheerio, CheerioElement and string', () => {
    tests.forEach(x => {
      expect(() => toCheerio(x, '.test')).not.toThrow()
    })
  })

  it('throws for an un-cheerioable value', () => {
    expect(() => toCheerio(<any> 22, '.selector')).toThrow()
    expect(() => toCheerio(<any> {}, '.selector')).toThrow()
    expect(() => toCheerio(<any> false, '.selector')).toThrow()
  })

  it('converts all to Cheerio with a single element', () => {
    tests.forEach(x => {
      const result = toCheerio(x, '.test')
      expect(result.find).toBeInstanceOf(Function)
      expect(result.length).toEqual(1)
    })
  })

  it('used the right selector', () => {
    tests.forEach(x => {
      const result = toCheerio(x, '.test')
      expect(result[0].tagName).toBe('a')
    })
  })
})