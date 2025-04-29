import { Attributes } from "@sailpoint/connector-sdk";

export class ProductRole {
    identity: string
    uuid: string
    type: string = 'productRole'
    attributes: Attributes

    constructor(object: any) {
        this.attributes = {
            id: object.id?.toString(),
            displayName: object.displayName,
            description: object.description
        }
        this.identity = this.attributes.id as string
        this.uuid = this.attributes.displayName as string
    }
}