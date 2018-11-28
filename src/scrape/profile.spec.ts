import { scrapeProfile, scrapeFullProfile } from "./profile";
import { Profile, FullProfile } from "../types/profile";
import axios from "axios";
import { assertProfile, assertFullProfile } from "./common";

const invalidUsername = 'kasjdoijasodij'
const invalidUserId = '182093801923'
const usernames = ['bb_test_01', 'mobile_test', 'james2mid']

describe('scrapeProfile', () => {

  it('rejects when no user specifier is defined', () => {
    return expect(scrapeProfile(<any> {})).rejects.toThrowError()
  })

  it('rejects when both username and userId are specified', () => {
    return expect(scrapeProfile({username: 'user', userId: '12345'})).rejects.toThrowError()
  })

  it('resolves if valid username and rejects if invalid', async () => {
    await expect(scrapeProfile({username: 'dfowfjoijwf'})).rejects.toThrowError()
    await expect(scrapeProfile({username: 'jack'})).resolves.toBeDefined()
  })

  it('rejects with a 404 for an invalid username', async () => {
    await expect(scrapeProfile({username: invalidUsername})).rejects.toMatchObject({
      response: {
        status: 404
      }
    })
  })

  it('rejects with a 404 for an invalid userId', async () => {
    const userId = '128971293871230'
    await expect(scrapeProfile({userId: invalidUserId})).rejects.toMatchObject({
      response: {
        status: 404
      }
    })
  })


  let results: Profile[]

  beforeAll(async () => {
    results = await Promise.all(usernames.map(username => scrapeProfile({username})))
  }, 1000 * usernames.length)

  it('gets valid profiles', () => {
    results.forEach(assertProfile)
  })

  it('matches profile snapshots', () => {
    results.forEach(x => expect(x).toMatchSnapshot({
      lastUpdated: expect.any(Date),
      stats: {
        tweetCount: expect.any(Number),
        followingCount: expect.any(Number),
        followersCount: expect.any(Number)
      }
    }))
  })

  it('has image urls pointing to accessible images', async () => {
    const urls = <string[]> results
      .reduce<(string | undefined)[]>((acc, x) => acc.concat(x.avatarUrl, x.bannerUrl), [])
      .filter(x => !!x)

    const requests = urls.map(url => axios.get(url)
      .then(resp => {
        // content-type should be image/*
        expect(resp.headers['content-type']).toMatch(/^image\/[a-z]+$/)
      }))

    return Promise.all(requests)
  })

  it('gets the same profiles when using userId', async () => {
    const userIds = results.map(x => x.userId)
    userIds.forEach(userId => expect(userId).toMatch(/^[0-9]+$/))
    const profiles = await Promise.all(userIds.map(userId => scrapeProfile({userId})))
    profiles.forEach((profile, i) => {
      expect(profile).toMatchObject(
        Object.assign({}, results[i], { lastUpdated: expect.any(Date) })
      )
    })
  })
})

describe('scrapeFullProfile', () => {
  it('rejects for an undefined username', () => {
    return expect(scrapeFullProfile(<any> undefined)).rejects.toThrowError()
  })

  it('rejects with a 404 for an invalid username', async () => {
    await expect(scrapeFullProfile('aoisdjiaosjd')).rejects.toMatchObject({
      response: {
        status: 404
      }
    })
  })

  let results: FullProfile[]

  beforeAll(async () => {
    results = await Promise.all(usernames.map(username => scrapeFullProfile(username)))
  })

  it('gets valid full profiles', () => {
    results.forEach(assertFullProfile)
  })

  it('matches full profile snapshots', () => {
    results.forEach(x => expect(x).toMatchSnapshot({
      lastUpdated: expect.any(Date),
      stats: {
        tweetCount: expect.any(Number),
        followingCount: expect.any(Number),
        followersCount: expect.any(Number)
      },
      html: expect.any(String)
    }))
  })
})