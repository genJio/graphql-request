import { ClientError, Headers, Params, Options, Variables } from './types'
export { ClientError } from './types'
import 'cross-fetch/polyfill'

export class GraphQLClient {
  private url: string
  private options: Options
  private enableUglifyQuery: Boolean

  constructor(params: Params | string) {
    if (typeof params === 'string') {
      this.url = params
      this.options = {}
      this.enableUglifyQuery = true
    } else {
      const {
        url,
        options = {},
        enableUglifyQuery = true
      } = params

      this.url = url
      this.options = options
      this.enableUglifyQuery = enableUglifyQuery
    }
  }

  async request<T extends any>(
    query: string,
    variables?: Variables,
  ): Promise<T> {
    const { headers, ...others } = this.options

    const body = JSON.stringify({
      query: this.enableUglifyQuery ? query
        .replace(/#.*\n/g, '')
        .replace(/[\s|,]*\n+[\s|,]*/g, ' ') : query,
      variables: variables ? variables : undefined,
    })

    const response = await fetch(this.url, {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
      body,
      ...others,
    })

    const result = await getResult(response)

    if (response.ok && !result.errors && result.data) {
      return result.data
    } else {
      const errorResult =
        typeof result === 'string' ? { error: result } : result
      throw new ClientError(
        { ...errorResult, status: response.status },
        { query, variables },
      )
    }
  }

  setHeaders(headers: Headers): GraphQLClient {
    this.options.headers = headers

    return this
  }

  setHeader(key: string, value: string): GraphQLClient {
    const { headers } = this.options

    if (headers) {
      headers[key] = value
    } else {
      this.options.headers = { [key]: value }
    }
    return this
  }
}

export async function request<T extends any>(
  url: string,
  query: string,
  variables?: Variables,
): Promise<T> {
  const client = new GraphQLClient(url)

  return client.request<T>(query, variables)
}

export default request

async function getResult(response: Response): Promise<any> {
  const contentType = response.headers.get('Content-Type')
  if (contentType && contentType.startsWith('application/json')) {
    return response.json()
  } else {
    return response.text()
  }
}
