import { ConnectorError, logger } from '@sailpoint/connector-sdk'
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

export class HTTPClient {
    private clientId: string
    private clientSecret: string
    private subKey: string
    private rootUrl: string
    private tokenUrl: string
    private audienceUrl: string
    private accessToken?: string
    private org: string

    constructor(config: any) {
        this.rootUrl = config.rootUrl
        this.clientId = config.clientId
        this.clientSecret = config.clientSecret
        this.subKey = config.subKey
        this.tokenUrl = config.tokenUrl
        this.audienceUrl = config.audienceUrl
        this.org = config.org

        if (config.ignoreSSL) {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
        }
    }

    async getAccessToken(): Promise<string | undefined> {
        const request: AxiosRequestConfig = {
            method: 'post',
            baseURL: this.tokenUrl,
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'Ocp-Apim-Subscription-Key': this.subKey,
            },
            data: {
                client_id: this.clientId,
                client_secret: this.clientSecret,
                grant_type: 'client_credentials',
                audience: this.audienceUrl,
            },
        }

        const response: AxiosResponse = await axios(request)
        this.accessToken = response.data.access_token

        return this.accessToken
    }

    getEndpoint(service: string): string {
        let endpoint: string = ''
        const baseUrl = this.rootUrl
        switch (service) {
            case 'user':
                endpoint = `${baseUrl}/clientadmin/v2/${this.org}/user/`
                break
            case 'users_products':
                endpoint = `${baseUrl}/clientadmin/v2/${this.org}/user/product/list?includeDisabled=true`
                break
            case 'product':
                endpoint = `${baseUrl}/clientadmin/v2/${this.org}/Product`
                break
            case 'group':
                endpoint = `${baseUrl}/clientadmin/v2/${this.org}/Group`
                break
            case 'containerPermissions':
                endpoint = `${baseUrl}/scim/v2/containerpermissions`
                break
            case 'directoryServiceQuery':
                endpoint = `${baseUrl}/UserMgmt/DirectoryServiceQuery`
                break
            case 'inviteUsers':
                endpoint = `${baseUrl}/UserMgmt/InviteUsers`
                break
            case 'role':
                endpoint = `${baseUrl}/Roles/GetRole`
                break
        }
        return endpoint
    }

    async getAllAccounts(): Promise<AxiosResponse> {
        const accessToken = await this.getAccessToken()

        let request: AxiosRequestConfig = {
            method: 'get',
            baseURL: this.getEndpoint('users_products'),
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
                'Ocp-Apim-Subscription-Key': this.subKey,
            },
        }

        return axios(request)
            .then((response) => {
                logger.info({
                    message: 'List Accounts - Success',
                    statusCode: response.status,
                    response: response.data,
                })
                return response
            })
            .catch((error) => {
                logger.error({
                    message: `Issue when trying to perform List Accounts`,
                    statusCode: error.response?.status,
                    response: error.response?.data,
                    stack: error.stack,
                })

                throw new ConnectorError(
                    `Issue when trying to perform List Accounts - ${error.response?.status} - ${JSON.stringify(
                        error.response?.data
                    )}`
                )
            })
    }

    async getAccount(email:string): Promise<AxiosResponse> {
        const accessToken = await this.getAccessToken()

        let request: AxiosRequestConfig = {
            method: 'get',
            baseURL: this.getEndpoint('user'),
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
                'Ocp-Apim-Subscription-Key': this.subKey,
            },
            url: email,
            validateStatus: (status) => {
                return (status >= 200 && status < 300) || status == 404
            }
        }

        return axios(request)
            .then((response) => {
                let message
                if (response.status !== 404) {
                    message = `Get Account ${email} - Success`
                } else message = `Get Account ${email} - 404 Response - Ignoring as this is expected when an account does not exist`

                logger.info({
                    message: message,
                    statusCode: response.status,
                    response: response.data,
                })
                return response
            })
            .catch((error) => {
                logger.error({
                    message: `Issue when trying to perform Get Account ${email}`,
                    statusCode: error.response?.status,
                    response: error.response?.data,
                    stack: error.stack,
                })

                throw new ConnectorError(
                    `Issue when trying to perform Get Account ${email} - ${error.response?.status} - ${JSON.stringify(
                        error.response?.data
                    )}`
                )
            })
    }

    async createOrUpdateAccount(requestBody:object,requestType:string): Promise<AxiosResponse> {
        const accessToken = await this.getAccessToken()

        let request: AxiosRequestConfig = {
            method: requestType,
            baseURL: this.getEndpoint('user'),
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
                'Ocp-Apim-Subscription-Key': this.subKey,
                'Content-Type': 'application/json',
            },
            data: requestBody
        }

        return axios(request)
            .then((response) => {
                logger.info({
                    message: `${requestType} Account - Success`,
                    statusCode: response.status,
                    response: response.data,
                })
                return response
            })
            .catch((error) => {
                logger.error({
                    message: `Issue when trying to perform ${requestType} Account`,
                    statusCode: error.response?.status,
                    response: error.response?.data,
                    requestBody: request.data,
                    stack: error.stack,
                })

                throw new ConnectorError(
                    `Issue when trying to perform ${requestType} Account - ${error.response?.status} - ${JSON.stringify(
                        error.response?.data
                    )}`
                )
            })
    }

    async getAllProducts(): Promise<AxiosResponse> {
        const accessToken = await this.getAccessToken()

        let request: AxiosRequestConfig = {
            method: 'get',
            baseURL: this.getEndpoint('product'),
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
                'Ocp-Apim-Subscription-Key': this.subKey,
            },
        }

        return axios(request)
            .then((response) => {
                logger.info({
                    message: 'List Products - Success',
                    statusCode: response.status,
                    response: response.data,
                })
                return response
            })
            .catch((error) => {
                logger.error({
                    message: `Issue when trying to perform List Products`,
                    statusCode: error.response?.status,
                    response: error.response?.data,
                    stack: error.stack,
                })

                throw new ConnectorError(
                    `Issue when trying to perform List Products - ${error.response?.status} - ${JSON.stringify(
                        error.response?.data
                    )}`
                )
            })
    }

    async getProductGroups(productId: string): Promise<AxiosResponse> {
        const accessToken = await this.getAccessToken()

        let request: AxiosRequestConfig = {
            method: 'get',
            baseURL: this.getEndpoint('group'),
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
                'Ocp-Apim-Subscription-Key': this.subKey,
            },
            url: productId,
            validateStatus: (status) => {
                return (status >= 200 && status < 300) || status == 404
            },
        }

        return axios(request)
            .then((response) => {
                let message
                if (response.status !== 404) {
                    message = 'List Product Groups - Success'
                } else message = 'List Product Groups - 404 Response - Ignoring as this is expected'

                logger.info({
                    message: message,
                    statusCode: response.status,
                    response: response.data,
                })
                return response
            })
            .catch((error) => {
                logger.error({
                    message: `Issue when trying to perform List Product Groups`,
                    statusCode: error.response?.status,
                    response: error.response?.data,
                    stack: error.stack,
                })

                throw new ConnectorError(
                    `Issue when trying to perform List Product Groups - ${error.response?.status} - ${JSON.stringify(
                        error.response?.data
                    )}`
                )
            })
    }

    async testConnection(): Promise<any> {
        const access_token = await this.getAccessToken()

        if (access_token) {
            logger.info(`Test connection succeeded... access token is ${access_token}`)
            return {}
        } else {
            throw new ConnectorError('Unable to retrieve access token, please see logs for more details')
        }
    }
}
