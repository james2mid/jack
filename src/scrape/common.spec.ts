import { scrapeTweets, assertTweet } from "./common";
import { promiseObservable, uniqueArray } from "jtools";
import { take } from "rxjs/operators";
import { Tweet } from "../types/tweet";

describe('scrapeTweets', () => {

  describe('params', () => {
    it('throws if min_position or max_position is defined in params', () => {
      expect(() => scrapeTweets('', { params: { min_position: 'defined' } })).toThrowError()
      expect(() => scrapeTweets('', { params: { max_position: 'defined' } })).toThrowError()
      expect(() => scrapeTweets('', { params: {
        min_position: 'defined',
        max_position: 'defined'
      } })).toThrowError()
    })

    it('throws if initialMin and initialMax are both defined', () => {
      expect(() => scrapeTweets('', <any> { initialMin: '', initialMax: '' })).toThrowError()
    })

    it('works without initial slash of path', async () => {
      const limit = 10
      const obs = scrapeTweets('search/timeline', { params: { q: 'hello' } }).observable.pipe(take(limit))
      const result = await promiseObservable(obs)
      expect(result).toHaveLength(limit)
      result.forEach(assertTweet)
    })

    it('observable errors with 404 when invalid endpoint is specified', async () => {
      const output = scrapeTweets('/invalidpath')
      const next = jest.fn()
      const promise = promiseObservable(output.observable, next)
      await expect(promise).rejects.toMatchObject({
        response: {
          status: 404
        }
      })
      expect(next).not.toHaveBeenCalled()
      expect(output.getMin()).toBeNull()
      expect(output.getMax()).toBeNull()
    }, 1000)
  })

  const tests = {
    'no tweets search': scrapeTweets('/search/timeline', { params: { q: '$NOTWEETS' }}),
    'no tweets timeline': scrapeTweets('/profiles/show/bb_test_01/timeline/tweets'),
    'no tweets timeline min': scrapeTweets('/profiles/show/test_user0018/timeline/tweets', { initialMin: '248276519913394176' }),
    'less than one page timeline': scrapeTweets('/profiles/show/test_lab_user2/timeline/tweets'),
    'multiple pages timeline': scrapeTweets('/profiles/show/73s7U53r/timeline/tweets')
  }

  const filter = (s: string) => Object.entries(tests).filter(([k]) => k.includes(s))
  
  filter('no tweets').forEach(([k, v]) => {
    describe(`with no tweets: ${k}`, () => {
      const output = v
      const tweets = promiseObservable(output.observable)
  
      it('completes without emitting', async () => {
        expect(await tweets).toHaveLength(0)
      })
  
      it('has null for both cursor values', async () => {
        await tweets
        expect(output.getMin()).toBeNull()
        expect(output.getMax()).toBeNull()
      })
    })
  })

  describe('with less than one page of tweets', () => {
    const output = tests['less than one page timeline']
    const observable = output.observable
    let tweets: Tweet[]

    beforeAll(async () => {
      tweets = await promiseObservable(observable)
    })

    it('gets valid tweets', () => {
      tweets.forEach(x => assertTweet(x))
    })

    it('contains no duplicate tweets', async () => {
      // check by the tweet's id
      const tweetIds = tweets.map(x => x.tweetId)
      expect(uniqueArray(tweetIds)).toHaveLength(0)
    })

    it('has non-null cursors', async () => {
      const [min, max] = [output.getMin(), output.getMax()]

      expect(min).not.toBeNull()
      expect(typeof min).toBe('string')

      expect(max).not.toBeNull()
      expect(typeof max).toBe('string')
    })

    it('has cursors with different values', async () => {
      expect(output.getMin()).not.toBe(output.getMax())
    })
  })
})
