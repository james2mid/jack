import { getTweet } from "./tweet";
import { Tweet } from "../types/tweet";

describe('getTweet', () => {

  const tweets = [
    '378675940261261312',
    '1064437357359726592',
    '1064472353453867008',
    '1067373627266555904'
  ]

  const deletedTweets = [
    '1064484063510179840'
  ]

  it('rejects immediately for an invalid tweetId', () => {
    const promise = getTweet('invalid id')
    return expect(promise).rejects.toThrowError()
  }, 5)

  it('rejects with 404 for deleted tweets', async () => {
    const promises = deletedTweets.map(x => getTweet(x))
    await Promise.all(promises.map(x => expect(x).rejects.toMatchObject({
      response: {
        status: 404
      }
    })))
  })


  let results: Tweet[]

  beforeAll(async () => {
    results = await Promise.all(tweets.map(x => getTweet(x)))
  }, 1000 * tweets.length)

  it('gets the expected objects', () => {
    results.forEach(tweet => {
      expect(tweet).toMatchSnapshot({
        html: expect.any(String),
        lastUpdated: expect.any(Date),
        stats: {
          likeCount: expect.any(Number),
          replyCount: expect.any(Number),
          retweetCount: expect.any(Number)
        }
      })
    })
  })

})