import {
    Context,
    ConnectorError,
    createConnector,
    readConfig,
    Response,
    StdAccountCreateInput,
    StdAccountCreateOutput,
    StdAccountListInput,
    StdAccountListOutput,
    StdAccountReadInput,
    StdAccountReadOutput,
    StdAccountUpdateInput,
    StdAccountUpdateOutput,
    StdEntitlementListOutput,
    StdEntitlementReadOutput,
    StdEntitlementReadInput,
    StdTestConnectionInput,
    StdTestConnectionOutput,
    AttributeChangeOp,
    StdAccountDisableInput,
    StdAccountDisableOutput,
    StdAccountEnableOutput,
    StdAccountEnableInput,
    AttributeChange,
    logger,
} from '@sailpoint/connector-sdk'
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { Account } from './model/account'
import { ProductRole } from './model/productRole'
import { ProductGroup } from './model/productGroup'
import { PlatformRight } from './model/platformRight'
import { AccountRequest, Product } from './model/interfaces'
import { HTTPClient } from './http-client'

// Connector must be exported as module property named connector
export const connector = async () => {
    // Get connector source config
    const config = await readConfig()

    // Use the vendor SDK, or implement own client as necessary, to initialize a client
    const httpClient = new HTTPClient(config)

    const readAccount = async (id: string): Promise<Account> => {
        const platformAccount = await httpClient.getAccount(id)
        const acctRes: Account = new Account({
            email: platformAccount.data.email,
            isEnabled: platformAccount.data.isEnabled,
            productRoles:
                platformAccount.data.products?.flatMap(
                    (product: any) => product.roles?.map((role: any) => `${product.id}:${role.id}`) || []
                ) || [],
            productGroups:
                platformAccount.data.products?.flatMap(
                    (product: any) => product.groups?.map((group: any) => `${product.id}:${group.id}`) || []
                ) || [],
            platformRights: platformAccount.data.isAdmin ? ['Platform Administrator'] : [],
        })

        return acctRes
    }

    const modifyAccount = async (change: AttributeChange, accountRequest: AccountRequest): Promise<AccountRequest> => {
        switch (change.op) {
            case AttributeChangeOp.Add:
                if (change.attribute === 'productRoles') {
                    const product_id = change.value.substring(0, change.value.indexOf(':'))
                    const role_id = change.value.substring(change.value.indexOf(':') + 1)

                    //Checks to see if the user is already assigned the product and adds the new role if it doesn't already exist
                    const matchingProductIndex = accountRequest.products.findIndex(
                        (product) => product.id === product_id
                    )
                    if (matchingProductIndex !== -1) {
                        const matchingRoleIndex = accountRequest.products[matchingProductIndex].roles.findIndex(
                            (role) => role.id === role_id
                        )
                        if (matchingRoleIndex === -1) {
                            accountRequest.products[matchingProductIndex].roles.push({ id: role_id })
                        }
                    } else {
                        accountRequest.products.push({
                            id: product_id,
                            groups: [],
                            roles: [{ id: role_id }],
                        })
                    }
                }
                if (change.attribute === 'productGroups') {
                    const product_id = change.value.substring(0, change.value.indexOf(':'))
                    const group_id = change.value.substring(change.value.indexOf(':') + 1)

                    const matchingProduct = accountRequest.products.find((product) => product.id === product_id)
                    if (matchingProduct) {
                        accountRequest.products[product_id].groups.push({ id: group_id })
                    } else {
                        accountRequest.products.push({ id: product_id, groups: [{ id: group_id }], roles: [] })
                    }
                }
                if (change.attribute === 'platformRights') {
                    accountRequest.isAdmin = true
                }
                break

            case AttributeChangeOp.Remove:
                if (change.attribute === 'productRoles') {
                    const product_id = change.value.substring(0, change.value.indexOf(':'))
                    const role_id = change.value.substring(change.value.indexOf(':') + 1)
                    const productIndex = accountRequest.products.findIndex((product) => product.id === product_id)

                    if (productIndex !== -1) {
                        const roleIndex = accountRequest.products[productIndex].roles.findIndex(
                            (role) => role.id === role_id
                        )

                        if (roleIndex !== -1) {
                            accountRequest.products[productIndex].roles.splice(roleIndex, 1)
                        }

                        // If roles array is empty after deleting the role, remove the product
                        if (accountRequest.products[productIndex].roles.length === 0) {
                            accountRequest.products.splice(productIndex, 1)
                        }
                    }
                }
                if (change.attribute === 'productGroups') {
                    const product_id = change.value.substring(0, change.value.indexOf(':'))
                    const group_id = change.value.substring(change.value.indexOf(':') + 1)
                    const productIndex = accountRequest.products.findIndex((product) => product.id === product_id)

                    if (productIndex !== -1) {
                        const roleIndex = accountRequest.products[productIndex].groups.findIndex(
                            (group) => group.id === group_id
                        )

                        if (roleIndex !== -1) {
                            accountRequest.products[productIndex].groups.splice(roleIndex, 1)
                        }

                        // If roles array is empty after deleting the role, remove the product
                        if (accountRequest.products[productIndex].groups.length === 0) {
                            accountRequest.products.splice(productIndex, 1)
                        }
                    }
                }
                if (change.attribute === 'platformRights') {
                    accountRequest.isAdmin = false
                }
                break
        }

        return accountRequest
    }

    return createConnector()
        .stdTestConnection(
            async (context: Context, input: StdTestConnectionInput, res: Response<StdTestConnectionOutput>) => {
                logger.info('Running test connection')
                res.send(await httpClient.testConnection())
            }
        )
        .stdAccountList(async (context: Context, input: StdAccountListInput, res: Response<StdAccountListOutput>) => {
            const accounts: AxiosResponse = await httpClient.getAllAccounts()

            for (const acct of accounts.data) {
                const acctRes: Account = new Account({
                    email: acct.email,
                    isEnabled: acct.isEnabled,
                    productRoles:
                        acct.products?.flatMap(
                            (product: any) => product.roles?.map((role: any) => `${product.id}:${role.id}`) || []
                        ) || [],
                    productGroups:
                        acct.products?.flatMap(
                            (product: any) => product.groups?.map((group: any) => `${product.id}:${group.id}`) || []
                        ) || [],
                    platformRights: acct.isAdmin ? ['Platform Administrator'] : [],
                })
                res.send(acctRes)
            }
        })
        .stdAccountCreate(
            async (context: Context, input: StdAccountCreateInput, res: Response<StdAccountCreateOutput>) => {
                logger.info(`${JSON.stringify(input)}`)
                let accountRequest: AccountRequest = {
                    firstName: input.attributes.firstName,
                    lastName: input.attributes.lastName,
                    email: input.identity !== null ? input.identity : input.attributes.email,
                    isEnabled: true,
                    isAdmin: false,
                    products: [],
                }

                const platformAccount = await httpClient.getAccount(input.attributes.email)
                const existing_account = platformAccount.status === 404 ? false : true

                if (existing_account) {
                    accountRequest = {
                        firstName: platformAccount.data.firstName,
                        lastName: platformAccount.data.lastName,
                        email: platformAccount.data.email,
                        isEnabled: platformAccount.data.isEnabled,
                        isAdmin: platformAccount.data.isAdmin,
                        products: platformAccount.data.products,
                    }
                    logger.info(`Existing Account Found - ${JSON.stringify(accountRequest)}`)
                }

                if (input.attributes.productGroups) {
                    if (Array.isArray(input.attributes.productGroups)) {
                        for (const productGroup of input.attributes.productGroups) {
                            const product_id = productGroup.substring(0, productGroup.indexOf(':'))
                            const group_id = productGroup.substring(productGroup.indexOf(':') + 1)

                            const matchingProduct = accountRequest.products.find((product) => product.id === product_id)
                            if (matchingProduct) {
                                accountRequest.products[product_id].groups.push({ id: group_id })
                            } else {
                                accountRequest.products.push({
                                    id: product_id,
                                    groups: [{ id: group_id }],
                                    roles: [],
                                })
                            }
                        }
                    } else if (typeof input.attributes.productGroups === 'string') {
                        const product_id = input.attributes.productGroups.substring(
                            0,
                            input.attributes.productGroups.indexOf(':')
                        )
                        const group_id = input.attributes.productGroups.substring(
                            input.attributes.productGroups.indexOf(':') + 1
                        )

                        const matchingProduct = accountRequest.products.find((product) => product.id === product_id)
                        if (matchingProduct) {
                            accountRequest.products[product_id].groups.push({ id: group_id })
                        } else {
                            accountRequest.products.push({ id: product_id, groups: [{ id: group_id }], roles: [] })
                        }
                    }
                }
                if (input.attributes.productRoles) {
                    if (Array.isArray(input.attributes.productRoles)) {
                        for (const productRole of input.attributes.productRoles) {
                            const product_id = productRole.substring(0, productRole.indexOf(':'))
                            const role_id = productRole.substring(productRole.indexOf(':') + 1)

                            const matchingProductIndex = accountRequest.products.findIndex(
                                (product) => product.id === product_id
                            )
                            if (matchingProductIndex !== -1) {
                                const matchingRoleIndex = accountRequest.products[matchingProductIndex].roles.findIndex(
                                    (role) => role.id === role_id
                                )
                                if (matchingRoleIndex === -1) {
                                    accountRequest.products[matchingProductIndex].roles.push({ id: role_id })
                                }
                            } else {
                                accountRequest.products.push({
                                    id: product_id,
                                    groups: [],
                                    roles: [{ id: role_id }],
                                })
                            }
                        }
                    } else if (typeof input.attributes.productRoles === 'string') {
                        const product_id = input.attributes.productRoles.substring(
                            0,
                            input.attributes.productRoles.indexOf(':')
                        )
                        const role_id = input.attributes.productRoles.substring(
                            input.attributes.productRoles.indexOf(':') + 1
                        )

                        //Checks to see if the user is already assigned the product and adds the new role if it doesn't already exist
                        const matchingProductIndex = accountRequest.products.findIndex(
                            (product) => product.id === product_id
                        )
                        if (matchingProductIndex !== -1) {
                            const matchingRoleIndex = accountRequest.products[matchingProductIndex].roles.findIndex(
                                (role) => role.id === role_id
                            )
                            if (matchingRoleIndex === -1) {
                                accountRequest.products[matchingProductIndex].roles.push({ id: role_id })
                            }
                        } else {
                            accountRequest.products.push({
                                id: product_id,
                                groups: [],
                                roles: [{ id: role_id }],
                            })
                        }
                    }
                }
                if (input.attributes.platformRights === 'Platform Administrator') {
                    accountRequest.isAdmin = true
                }

                let requestType: string = ''
                if (!existing_account) {
                    requestType = 'post'
                }
                if (existing_account) {
                    requestType = 'put'
                }

                const account_response: AxiosResponse = await httpClient.createOrUpdateAccount(
                    accountRequest,
                    requestType
                )
                const account: Account = new Account({
                    email: account_response.data.email,
                    isEnabled: account_response.data.isEnabled,
                    productRoles:
                        account_response.data.products?.flatMap(
                            (product: any) => product.roles?.map((role: any) => `${product.id}:${role.id}`) || []
                        ) || [],
                    productGroups:
                        account_response.data.products?.flatMap(
                            (product: any) => product.groups?.map((group: any) => `${product.id}:${group.id}`) || []
                        ) || [],
                    platformRights: account_response.data.isAdmin ? ['Platform Administrator'] : [],
                })
                res.send(account)
            }
        )
        .stdAccountRead(async (context: Context, input: StdAccountReadInput, res: Response<StdAccountReadOutput>) => {
            const acctRes = await readAccount(input.identity)
            res.send(acctRes)
        })
        .stdAccountUpdate(
            async (context: Context, input: StdAccountUpdateInput, res: Response<StdAccountUpdateOutput>) => {
                const platformAccount = await httpClient.getAccount(input.identity)
                let accountRequest: AccountRequest = {
                    firstName: platformAccount.data.firstName,
                    lastName: platformAccount.data.lastName,
                    email: platformAccount.data.email,
                    isEnabled: platformAccount.data.isEnabled,
                    isAdmin: platformAccount.data.isAdmin,
                    products: platformAccount.data.products,
                }

                for (const change of input.changes) {
                    accountRequest = await modifyAccount(change, accountRequest)
                }

                const account_response: AxiosResponse = await httpClient.createOrUpdateAccount(accountRequest, 'put')
                const account = await readAccount(input.identity)
                res.send(account)
            }
        )
        .stdAccountEnable(
            async (context: Context, input: StdAccountEnableInput, res: Response<StdAccountEnableOutput>) => {
                const platformAccount = await httpClient.getAccount(input.identity)
                let accountRequest: AccountRequest = {
                    firstName: platformAccount.data.firstName,
                    lastName: platformAccount.data.lastName,
                    email: platformAccount.data.email,
                    isEnabled: true,
                    isAdmin: platformAccount.data.isAdmin,
                    products: platformAccount.data.products,
                }

                const account_response: AxiosResponse = await httpClient.createOrUpdateAccount(accountRequest, 'put')
                const account = await readAccount(input.identity)
                res.send(account)
            }
        )
        .stdAccountDisable(
            async (context: Context, input: StdAccountDisableInput, res: Response<StdAccountDisableOutput>) => {
                const platformAccount = await httpClient.getAccount(input.identity)
                let accountRequest: AccountRequest = {
                    firstName: platformAccount.data.firstName,
                    lastName: platformAccount.data.lastName,
                    email: platformAccount.data.email,
                    isEnabled: false,
                    isAdmin: platformAccount.data.isAdmin,
                    products: platformAccount.data.products,
                }

                const account_response: AxiosResponse = await httpClient.createOrUpdateAccount(accountRequest, 'put')
                const account = await readAccount(input.identity)
                res.send(account)
            }
        )
        .stdEntitlementList(async (context: Context, input: any, res: Response<StdEntitlementListOutput>) => {
            const products: AxiosResponse = await httpClient.getAllProducts()

            if (input.type == 'productRole') {
                for (const product of products.data) {
                    for (const role of product.roles) {
                        const roleRes: ProductRole = new ProductRole({
                            id: `${product.id}:${role.id}`,
                            displayName: `${product.name} - ${role.description}`,
                        })
                        res.send(roleRes)
                    }
                }
            }
            if (input.type == 'productGroup') {
                for (const product of products.data) {
                    const groups: AxiosResponse = await httpClient.getProductGroups(product.id)
                    for (const group of Array.isArray(groups.data) ? groups.data : []) {
                        const groupRes: ProductGroup = new ProductGroup({
                            id: `${product.id}:${group.id}`,
                            displayName: `${product.name} - ${group.name}`,
                        })
                        res.send(groupRes)
                    }
                }
            }
            if (input.type == 'platformRight') {
                const rightRes: PlatformRight = new PlatformRight({
                    displayName: 'Platform Administrator',
                })
                res.send(rightRes)
            }
        })
}
