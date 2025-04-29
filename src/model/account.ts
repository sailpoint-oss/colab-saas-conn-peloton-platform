import { Attributes, StdAccountReadOutput } from '@sailpoint/connector-sdk'

export class Account {
    identity: string
    uuid: string
    attributes: Attributes
    disabled: boolean

    constructor(object: any) {
        this.attributes = {
            email: object.email?.toString(),
            isEnabled: object.isEnabled,
            productRoles: object.productRoles,
            productGroups: object.productGroups,
            platformRights: object.platformRights
        }
        this.identity = this.attributes.email?.toString() as string
        this.uuid = this.attributes.email as string
        this.disabled = object.isEnabled ? false : true
    }
}